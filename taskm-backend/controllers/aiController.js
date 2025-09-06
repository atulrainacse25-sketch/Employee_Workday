const AppDataSource = require('../data-source');
const jwt = require('jsonwebtoken');
const axios = require('axios');

function getDecodedToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '') || null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

async function callOpenAI(messages, max_tokens = 800) {
  // New provider: AIML (custom) — if configured, prefer it
  if (process.env.AIML_API_KEY && process.env.AIML_MODEL) {
    try {
      return await callAIML(messages, max_tokens);
    } catch (err) {
      console.warn('AIML provider failed, falling back to Gemini:', err.message || err);
      // continue to Gemini
    }
  }

  // Only Gemini provider is supported for this deployment (unless AIML used successfully).
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('No AI provider available: GEMINI_API_KEY not configured');
  }

  // Use cached working model if available
  if (cachedGeminiModel) {
    try {
      return await callGeminiWithModel(cachedGeminiModel, messages, max_tokens);
    } catch (err) {
      console.warn('Cached Gemini model failed, clearing cache and probing again:', err.message || err);
      cachedGeminiModel = null;
      // fall through to probe
    }
  }

  // Probe candidate models to find one that works
  const candidates = [];
  if (process.env.GEMINI_MODEL) candidates.push(process.env.GEMINI_MODEL);
  // common candidates to try
  candidates.push('gemini-2.0-flash');
  candidates.push('gemini-2.0');
  candidates.push('gemini-1.0');
  candidates.push('text-bison-001');

  for (const cand of candidates) {
    try {
      const resp = await callGeminiWithModel(cand, messages, Math.min(max_tokens, 256));
      // success: cache and return full call using desired max_tokens
      cachedGeminiModel = cand;
      // re-run with requested token limit
      return await callGeminiWithModel(cand, messages, max_tokens);
    } catch (err) {
      console.warn('Probe failed for model', cand, err.message || err);
      // try next
    }
  }

  throw new Error('Gemini provider error: all candidate models failed. Check GEMINI_MODEL, GEMINI_API_KEY and project access');
}

let cachedGeminiModel = null;

async function callGeminiWithModel(model, messages, max_tokens = 800) {
  // reuse previous body building logic but target a specific model
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');
  const promptText = (messages || []).map(m => (m.content || '')).join('\n');
  const body = {
    prompt: { text: promptText },
    temperature: 0.6,
    maxOutputTokens: Math.min(max_tokens, 2048),
  };
  // Try to use the official Google GenAI SDK first (if installed)
  try {
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey: key });
    // SDK supports passing a simple contents string or array
    let sdkResp;
    try {
      sdkResp = await client.models.generateContent({ model, contents: promptText });
    } catch (sdkErr) {
      // some SDK versions expect contents as array
      sdkResp = await client.models.generateContent({ model, contents: [{ type: 'text', text: promptText }] });
    }
    // Normalize SDK response
    let output = '';
    if (sdkResp) {
      if (sdkResp.text) output = sdkResp.text;
      else if (sdkResp.candidates && sdkResp.candidates[0]) output = sdkResp.candidates[0].content || sdkResp.candidates[0].output || '';
      else if (sdkResp.output && typeof sdkResp.output === 'string') output = sdkResp.output;
    }
    const aiRaw = { provider: 'gemini', model, raw: sdkResp, choices: [{ message: { content: String(output) } }] };
    return aiRaw;
  } catch (sdkErr) {
    // SDK not available or failed; fall back to REST endpoints
    // console.warn('Gemini SDK not available or failed, falling back to REST:', sdkErr && sdkErr.message);
  }

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
    `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
  ];
  for (const ep of endpoints) {
    try {
      const res = await axios.post(ep, body, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
      const data = res.data || {};
      // Normalize
      let output = '';
      if (Array.isArray(data.candidates) && data.candidates.length) {
        const c = data.candidates[0];
        output = c.output || c.content || c.text || (c.message && c.message.content) || '';
      } else if (Array.isArray(data.outputs) && data.outputs.length) {
        const o = data.outputs[0];
        output = o.content || o.text || (o?.structuredOutput?.text) || '';
      } else if (typeof data.result === 'string') {
        output = data.result;
      }
      if (!output && typeof data === 'string') output = data;
      const aiRaw = { provider: 'gemini', model, raw: data, choices: [{ message: { content: String(output) } }] };
      return aiRaw;
    } catch (err) {
      const status = err.response && err.response.status;
      console.warn('Gemini endpoint failed', ep, 'status:', status);
    }
  }
  throw new Error('Gemini model ' + model + ' failed on all endpoints');
}

async function callAIML(messages, max_tokens = 800) {
  // Call the custom AIML provider as configured by AIML_API_URL (optional)
  const key = process.env.AIML_API_KEY;
  const model = process.env.AIML_MODEL;
  // AIML_API_URL may be provided as a base URL (e.g. https://api.aimlapi.com/v1)
  // Build the full completions endpoint by appending the path if needed.
  const aimlBase = process.env.AIML_API_URL || 'https://api.aimlapi.com/v1';
  const url = aimlBase.replace(/\/$/, '') + '/chat/completions';
  if (!key || !model) throw new Error('Missing AIML configuration');
  try {
    const promptText = (messages || []).map(m => (m.content || '')).join('\n');
    const res = await axios.post(url, { model, prompt: promptText, max_tokens }, { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 });
    const data = res.data || {};
    const text = data.output || data.text || data.result || (data.choices && data.choices[0] && (data.choices[0].text || data.choices[0].message && data.choices[0].message.content)) || '';
    return { provider: 'aiml', model, raw: data, choices: [{ message: { content: String(text) } }] };
  } catch (err) {
    console.error('AIML provider error:', err.response ? err.response.data : err.message || err);
    throw new Error('AIML provider error');
  }
}

async function callGemini(messages, max_tokens = 800) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');
  const model = process.env.GEMINI_MODEL || 'gemini-1.0';

  // Build a simple prompt by concatenating messages
  const promptText = (messages || []).map(m => (m.content || '')).join('\n');

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`;
  const body = {
    prompt: { text: promptText },
    temperature: 0.6,
    maxOutputTokens: Math.min(max_tokens, 2048),
  };
  // Try multiple possible Gemini/Generative Language endpoints in case API surface differs
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
    `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.post(ep, body, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
      const data = res.data || {};
      // Normalize possible response shapes
      let output = '';
      if (Array.isArray(data.candidates) && data.candidates.length) {
        const c = data.candidates[0];
        output = c.output || c.content || c.text || (c.message && c.message.content) || '';
      } else if (Array.isArray(data.outputs) && data.outputs.length) {
        const o = data.outputs[0];
        output = o.content || o.text || (o?.structuredOutput?.text) || '';
      } else if (typeof data.result === 'string') {
        output = data.result;
      }
      if (!output && typeof data === 'string') output = data;

      const aiRaw = { provider: 'gemini', raw: data, choices: [{ message: { content: String(output) } }] };
      return aiRaw;
    } catch (err) {
      // If 404, try next endpoint; otherwise log and continue to next
      const status = err.response && err.response.status;
      console.warn('Gemini endpoint failed', ep, 'status:', status);
      if (err.response && err.response.data) console.warn('Gemini response body:', JSON.stringify(err.response.data).slice(0,200));
      // continue to next endpoint
    }
  }

  // If we reach here, all endpoints failed
  throw new Error('Gemini provider error: all endpoints failed (see logs)');
}

exports.chat = async (req, res) => {
  const { prompt, taskId } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant for task planning.' },
      { role: 'user', content: prompt },
    ];
    const aiRaw = await callOpenAI(messages);
    const reply = aiRaw.choices?.[0]?.message?.content || '';

    const result = await AppDataSource.query(
      `INSERT INTO ai_logs (user_id, task_id, prompt, response, action, created_at) VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP) RETURNING *`,
      [userId, taskId || null, prompt, JSON.stringify(aiRaw), 'chat']
    );
    res.json({ reply, log: result[0] });
  } catch (err) {
    console.error('Error in chat AI:', err.message || err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

exports.analyze = async (req, res) => {
  const { context } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const prompt = `Analyze the following context and provide a concise summary and top 3 recommendations:\n\n${context || 'No context provided.'}`;
    const messages = [
      { role: 'system', content: 'You are an expert productivity assistant.' },
      { role: 'user', content: prompt },
    ];
    const aiRaw = await callOpenAI(messages, 600);
    const summary = aiRaw.choices?.[0]?.message?.content || '';

    const result = await AppDataSource.query(
      `INSERT INTO ai_logs (user_id, prompt, response, action, created_at) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) RETURNING *`,
      [userId, context || '', JSON.stringify(aiRaw), 'analyze']
    );
    res.json({ analysis: { summary }, log: result[0] });
  } catch (err) {
    console.error('Error in analyze AI:', err.message || err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

exports.plan = async (req, res) => {
  const { preferences } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const prompt = `Create a day plan based on these preferences: ${JSON.stringify(preferences || {})}. Provide timeslots and brief descriptions.`;
    const messages = [
      { role: 'system', content: 'You are a helpful calendar and schedule planner.' },
      { role: 'user', content: prompt },
    ];
    const aiRaw = await callOpenAI(messages, 800);
    const planText = aiRaw.choices?.[0]?.message?.content || '';

    const result = await AppDataSource.query(
      `INSERT INTO ai_logs (user_id, prompt, response, action, created_at) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP) RETURNING *`,
      [userId, JSON.stringify(preferences || {}), JSON.stringify(aiRaw), 'plan']
    );
    res.json({ plan: { plan: planText }, log: result[0] });
  } catch (err) {
    console.error('Error in plan AI:', err.message || err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

exports.getLogs = async (req, res) => {
  // admin-only enforced in routes
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, parseInt(req.query.pageSize, 10) || 20);
    const offset = (page - 1) * pageSize;
    const action = req.query.action || null;
    const search = req.query.q || null;

    let where = '';
    const params = [];
    let idx = 1;
    if (action) {
      where += ` AND action = $${idx}`;
      params.push(action);
      idx++;
    }
    if (search) {
      where += ` AND (prompt ILIKE $${idx} OR response::text ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    // By default exclude archived logs unless includeArchived=true
    const includeArchived = req.query.includeArchived === 'true';
    if (!includeArchived) {
      where += ` AND (archived IS NULL OR archived = FALSE)`;
    }

    const rows = await AppDataSource.query(`SELECT * FROM ai_logs WHERE 1=1 ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, pageSize, offset]);
    const countRes = await AppDataSource.query(`SELECT count(1) as count FROM ai_logs WHERE 1=1 ${where}`, params);
    const total = parseInt(countRes[0].count, 10) || 0;
    res.json({ logs: rows, total, page, pageSize });
  } catch (err) {
    console.error('Error fetching ai logs:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.replay = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await AppDataSource.query(`SELECT * FROM ai_logs WHERE id = $1 LIMIT 1`, [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Log not found' });
    const log = rows[0];
    res.json(log);
  } catch (err) {
    console.error('Error fetching ai log:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.archive = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await AppDataSource.query(`UPDATE ai_logs SET archived = TRUE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error archiving ai log:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.unarchive = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await AppDataSource.query(`UPDATE ai_logs SET archived = FALSE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error unarchiving ai log:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLog = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await AppDataSource.query(`DELETE FROM ai_logs WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting ai log:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.archiveOld = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 90;
    const result = await AppDataSource.query(`UPDATE ai_logs SET archived = TRUE WHERE created_at < NOW() - INTERVAL '${days} days' AND (archived IS NULL OR archived = FALSE)`);
    // result may not contain affected row count depending on driver; fetch count
    const countRes = await AppDataSource.query(`SELECT count(1) as c FROM ai_logs WHERE archived = TRUE AND created_at < NOW() - INTERVAL '${days} days'`);
    const archivedCount = parseInt(countRes[0].c, 10) || 0;
    res.json({ success: true, archived: archivedCount });
  } catch (err) {
    console.error('Error archiving old ai logs:', err.message || err);
    res.status(500).json({ message: 'Server error' });
  }
};


