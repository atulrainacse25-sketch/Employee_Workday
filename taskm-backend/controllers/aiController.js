const AppDataSource = require('../data-source');
const jwt = require('jsonwebtoken');
const axios = require('axios');

/* ------------------------ Auth ------------------------ */
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

/* --------------------- Prompt helpers --------------------- */
function buildPromptFromMessages(messages = []) {
  return messages
    .map((m) => `[${(m.role || 'user').toUpperCase()}]: ${m.content || ''}`)
    .join('\n');
}

/* -------------------- AI Providers -------------------- */
let cachedGeminiModel = null;

async function callOpenAI(messages, max_tokens = 800) {
  if (process.env.AIML_API_KEY && process.env.AIML_MODEL) {
    try {
      return await callAIML(messages, max_tokens);
    } catch {
      console.warn('AIML failed, falling back to Gemini');
    }
  }

  if (!process.env.GEMINI_API_KEY) throw new Error('No AI provider available');

  if (cachedGeminiModel) {
    try {
      return await callGeminiWithModel(cachedGeminiModel, messages, max_tokens);
    } catch {
      cachedGeminiModel = null;
    }
  }

  const candidates = [
    process.env.GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-1.5-pro',
    'text-bison-001'
  ].filter(Boolean);

  for (const cand of candidates) {
    try {
      await callGeminiWithModel(cand, messages, Math.min(max_tokens, 256));
      cachedGeminiModel = cand;
      return await callGeminiWithModel(cand, messages, max_tokens);
    } catch {}
  }

  throw new Error('Gemini provider error');
}

async function callGeminiWithModel(model, messages, max_tokens = 800) {
  const key = process.env.GEMINI_API_KEY;
  const promptText = buildPromptFromMessages(messages);

  const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: Math.min(max_tokens, 2048) }
  };

  const res = await axios.post(restUrl, body, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });
  const output = res?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { provider: 'gemini', model, raw: res.data, choices: [{ message: { content: output } }] };
}

async function callAIML(messages, max_tokens = 800) {
  const key = process.env.AIML_API_KEY;
  const model = process.env.AIML_MODEL;
  const url = `${process.env.AIML_API_URL || 'https://api.aimlapi.com/v1'}/chat/completions`;

  const promptText = buildPromptFromMessages(messages);
  const res = await axios.post(url, { model, prompt: promptText, max_tokens }, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: 20000
  });

  const text = res?.data?.choices?.[0]?.message?.content || '';
  return { provider: 'aiml', model, raw: res.data, choices: [{ message: { content: text } }] };
}

/* ----------------------- AI Endpoints ----------------------- */
exports.chat = async (req, res) => {
  const { prompt, taskId } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant for task planning. Structure your answers clearly.' },
      { role: 'user', content: prompt || '' }
    ];

    const aiRaw = await callOpenAI(messages);
    const reply = aiRaw?.choices?.[0]?.message?.content || '';

    if (userId) {
      await AppDataSource.query(
        `INSERT INTO ai_logs (user_id, task_id, prompt, response, action, created_at)
         VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)`,
        [userId, taskId || null, prompt || '', JSON.stringify(aiRaw), 'chat']
      );
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

exports.analyze = async (req, res) => {
  const { context } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const prompt = `Analyze the following context and provide:
## Summary
- Key points
## Top 3 Recommendations
1. First
2. Second
3. Third
Context: ${context || 'No context provided.'}`;

    const messages = [
      { role: 'system', content: 'You are an expert productivity assistant.' },
      { role: 'user', content: prompt }
    ];

    const aiRaw = await callOpenAI(messages, 600);
    const summary = aiRaw?.choices?.[0]?.message?.content || '';

    if (userId) {
      await AppDataSource.query(
        `INSERT INTO ai_logs (user_id, prompt, response, action, created_at)
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)`,
        [userId, context || '', JSON.stringify(aiRaw), 'analyze']
      );
    }

    res.json({ analysis: { summary } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

exports.plan = async (req, res) => {
  const { preferences } = req.body;
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const prompt = `Create a daily plan based on: ${JSON.stringify(preferences || {})}
Format:
### Morning
- Time range: Activity
### Work Blocks
- Time range: Activity
### Breaks
- Time range: Activity
### Evening
- Time range: Activity`;

    const messages = [
      { role: 'system', content: 'You are a helpful calendar and schedule planner.' },
      { role: 'user', content: prompt }
    ];

    const aiRaw = await callOpenAI(messages, 800);
    const planText = aiRaw?.choices?.[0]?.message?.content || '';

    if (userId) {
      await AppDataSource.query(
        `INSERT INTO ai_logs (user_id, prompt, response, action, created_at)
         VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)`,
        [userId, JSON.stringify(preferences || {}), JSON.stringify(aiRaw), 'plan']
      );
    }

    res.json({ plan: { plan: planText } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI error or server error' });
  }
};

/* ----------------------- SmartPlanner ----------------------- */
exports.getSmartPlanner = async (req, res) => {
  const decoded = getDecodedToken(req);
  const userId = decoded?.id || null;

  try {
    const logs = userId
      ? await AppDataSource.query(
          `SELECT * FROM ai_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
          [userId]
        )
      : [];

    return res.status(200).json({
      success: true,
      data: {
        welcomeMessage: '🤖 Welcome to SmartPlanner AI!',
        recentLogs: logs, // empty if not logged in
        tips: [
          'Check your daily plan',
          'Use AI to optimize tasks',
          'Review past suggestions'
        ]
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error fetching SmartPlanner AI data' });
  }
};
