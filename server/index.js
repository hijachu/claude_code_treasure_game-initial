const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'treasure-game-secret';

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);
  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/scores', authMiddleware, (req, res) => {
  const { score } = req.body;
  if (score === undefined) return res.status(400).json({ error: 'Score is required' });
  const result = score > 0 ? 'win' : score === 0 ? 'tie' : 'lose';
  db.prepare('INSERT INTO scores (user_id, score, result) VALUES (?, ?, ?)').run(req.user.id, score, result);
  res.json({ success: true });
});

app.get('/api/scores', authMiddleware, (req, res) => {
  const scores = db.prepare(
    'SELECT score, result, played_at FROM scores WHERE user_id = ? ORDER BY played_at DESC LIMIT 5'
  ).all(req.user.id);
  res.json(scores);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
