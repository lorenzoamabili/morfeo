// ═══════════════════════════════════════════════════════════════
// MORFEO — server.js
// Express server: auth API + static file serving
// User data stored in users.json (pure-JS, no native deps)
// ═══════════════════════════════════════════════════════════════

'use strict';

const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const cookieParser = require('cookie-parser');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── JWT secret ────────────────────────────────────────────────────
// Set JWT_SECRET env var to a long random string in production.
const JWT_SECRET  = process.env.JWT_SECRET || 'morfeo-dev-secret-CHANGE-IN-PRODUCTION';
const COOKIE_NAME = 'morfeo_token';
const TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days

// ── User store (JSON file) ────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
}

function findUser(email) {
  return loadUsers().find(u => u.email === email) || null;
}

function createUser(email, passwordHash) {
  const users = loadUsers();
  const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const user = { id, email, passwordHash, createdAt: Date.now() };
  users.push(user);
  saveUsers(users);
  return user;
}

// ── Middleware ────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// Block access to the server directory (users.json, node_modules, etc.)
app.use('/server', (_req, res) => res.status(403).end());

// Serve all static files from morfeo-web root (parent of server/)
app.use(express.static(path.join(__dirname, '..')));

// ── Auth helpers ──────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
}

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_S });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge:   TOKEN_TTL_S * 1000,
    // secure: true  // uncomment when serving over HTTPS
  });
}

// ── POST /api/auth/register ───────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailNorm = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm))
    return res.status(400).json({ error: 'Invalid email address' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  if (findUser(emailNorm))
    return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser(emailNorm, passwordHash);

  setAuthCookie(res, { userId: user.id, email: user.email });
  res.json({ ok: true, email: user.email });
});

// ── POST /api/auth/login ──────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailNorm = email.trim().toLowerCase();
  const user = findUser(emailNorm);

  // Always run bcrypt to prevent timing attacks
  const hash = user ? user.passwordHash : '$2a$12$invalidhashforhashconsistency0000000000000000000';
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid)
    return res.status(401).json({ error: 'Invalid email or password' });

  setAuthCookie(res, { userId: user.id, email: user.email });
  res.json({ ok: true, email: user.email });
});

// ── POST /api/auth/logout ─────────────────────────────────────────
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });
  res.json({ ok: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});

// ── Ticker search helpers ─────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || null;

async function searchYahoo(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true&lang=en`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return (data.quotes || []).filter(q => q.symbol && q.quoteType);
}

async function searchWithGemini(query) {
  const prompt = `You are a financial assistant. The user is searching for a stock ticker.
Query: "${query}"
Return ONLY a JSON array (no markdown, no extra text) of up to 6 results:
[{"symbol":"MSFT","shortname":"Microsoft Corporation","exchange":"NASDAQ","quoteType":"EQUITY"}]
Valid quoteType values: EQUITY, ETF, CRYPTOCURRENCY, INDEX.
If nothing matches confidently, return [].`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
    }
  );
  if (!r.ok) return [];
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

// ── GET /api/search ───────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    if (GEMINI_KEY) {
      const [aiResults, yahooResults] = await Promise.all([
        searchWithGemini(q).catch(() => []),
        searchYahoo(q).catch(() => []),
      ]);
      const seen = new Set(aiResults.map(r => r.symbol));
      const merged = [...aiResults, ...yahooResults.filter(r => !seen.has(r.symbol))];
      return res.json(merged.slice(0, 8));
    }
    res.json(await searchYahoo(q));
  } catch (err) {
    console.error('Search error:', err.message);
    res.json([]);
  }
});

// ── SPA fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ── Start (auto-find free port if preferred port is taken) ────────
function startServer(port) {
  const server = app.listen(port, () => {
    const actual = server.address().port;
    console.log(`Morfeo running → http://localhost:${actual}`);
    console.log(`Users store   → ${DB_PATH}`);
    if (JWT_SECRET.includes('CHANGE-IN-PRODUCTION')) {
      console.warn('[WARNING] Using default JWT secret — set JWT_SECRET env var in production!');
    }
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use — trying ${port + 1}…`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PORT);
