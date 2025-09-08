const AppDataSource = require('../data-source');
const User = require('../entities/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function writeEnv(updates) {
  const envPath = path.join(__dirname, '..', '.env');
  let content = '';
  try {
    content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  } catch (e) {
    content = '';
  }

  const lines = content.split(/\r?\n/).filter(Boolean);
  const map = {};
  for (const l of lines) {
    const idx = l.indexOf('=');
    if (idx > 0) {
      const k = l.substring(0, idx);
      const v = l.substring(idx + 1);
      map[k] = v;
    }
  }

  for (const k of Object.keys(updates)) {
    map[k] = updates[k];
  }

  const out = Object.keys(map).map(k => `${k}=${map[k]}`).join('\n') + '\n';
  fs.writeFileSync(envPath, out, { encoding: 'utf8' });
}

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOneBy({ id: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, refresh_token, ...out } = user;
    res.json(out);
  } catch (err) {
    console.error('getProfile error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password } = req.body;
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOneBy({ id: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email && email !== user.email) {
      // ensure unique
      const exists = await repo.findOneBy({ email });
      if (exists && exists.id !== userId) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      user.password = hash;
    }
    await repo.save(user);
    const { password: _p, refresh_token, ...out } = user;
    res.json(out);
  } catch (err) {
    console.error('updateProfile error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only: update server .env keys (appends/overwrites keys in .env)
exports.updateServerEnv = async (req, res) => {
  try {
    // minimal admin check: ensure user.role === 'admin'
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const allowed = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'AIML_API_KEY', 'AIML_MODEL', 'AIML_API_URL', 'ENABLE_RETENTION_JOB', 'RETENTION_DAYS', 'RETENTION_SCHEDULE'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined && req.body[k] !== null) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No valid keys provided' });
    writeEnv(updates);
    res.json({ success: true });
  } catch (err) {
    console.error('updateServerEnv error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only: test Gemini model/key connectivity
exports.testGemini = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const model = req.body.model || process.env.GEMINI_MODEL;
    const key = req.body.key || process.env.GEMINI_API_KEY;
    if (!model || !key) return res.status(400).json({ message: 'model and key required' });

    const axios = require('axios');
    const body = { prompt: { text: 'Test connectivity: hello' }, maxOutputTokens: 64 };
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
      `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(model)}:generateText?key=${encodeURIComponent(key)}`,
    ];

    const results = [];
    for (const ep of endpoints) {
      try {
        const r = await axios.post(ep, body, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        results.push({ endpoint: ep, status: r.status, ok: true, sample: r.data && (r.data.candidates || r.data.outputs || r.data).slice ? (r.data.candidates ? r.data.candidates[0] : r.data.outputs ? r.data.outputs[0] : r.data[0]) : r.data });
        return res.json({ success: true, endpoint: ep, data: results });
      } catch (err) {
        const status = err.response && err.response.status;
        const bodyResp = err.response && err.response.data;
        results.push({ endpoint: ep, ok: false, status, body: bodyResp });
      }
    }

    res.status(502).json({ success: false, message: 'All endpoints failed', results });
  } catch (err) {
    console.error('testGemini error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


