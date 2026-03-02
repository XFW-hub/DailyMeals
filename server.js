const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, '[]');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '{}');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${path.extname(file.originalname) || '.jpg'}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function verifyPassword(password, salt, storedHash) {
  return hashPassword(password, salt) === storedHash;
}

function readSessions() {
  return readJson(SESSIONS_FILE);
}
function writeSessions(sessions) {
  writeJson(SESSIONS_FILE, sessions);
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '请先登录' });
  const sessions = readSessions();
  const userId = sessions[token];
  if (!userId) return res.status(401).json({ error: '登录已过期，请重新登录' });
  req.userId = userId;
  next();
}

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, salt, ...rest } = u;
  return rest;
}

const DEFAULT_AVATAR = '🍳';

// ========== 认证 API（无需登录）==========
app.post('/api/auth/register', (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const { name, password, avatar } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请填写用户名' });
    if (!password || String(password).length < 4) return res.status(400).json({ error: '密码至少 4 位' });
    if (users.some(u => u.name.trim().toLowerCase() === name.trim().toLowerCase())) return res.status(400).json({ error: '该用户名已被注册' });
    const salt = crypto.randomBytes(16).toString('hex');
    const id = uuidv4();
    users.push({
      id,
      name: name.trim(),
      avatar: avatar != null && String(avatar).trim() ? String(avatar).trim() : DEFAULT_AVATAR,
      salt,
      passwordHash: hashPassword(String(password), salt),
      createdAt: new Date().toISOString()
    });
    writeJson(USERS_FILE, users);
    const token = uuidv4();
    const sessions = readSessions();
    sessions[token] = id;
    writeSessions(sessions);
    const user = users.find(u => u.id === id);
    res.json({ user: sanitizeUser(user), token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: '请填写用户名和密码' });
    const user = users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });
    if (!user.salt || !user.passwordHash) return res.status(401).json({ error: '该账号未设置密码，请先注册' });
    if (!verifyPassword(String(password), user.salt, user.passwordHash)) return res.status(401).json({ error: '用户名或密码错误' });
    const token = uuidv4();
    const sessions = readSessions();
    sessions[token] = user.id;
    writeSessions(sessions);
    res.json({ user: sanitizeUser(user), token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== 需登录的 API ==========
app.get('/api/me', authMiddleware, (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    res.json(sanitizeUser(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const sessions = readSessions();
      delete sessions[token];
      writeSessions(sessions);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/me', authMiddleware, (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const idx = users.findIndex(u => u.id === req.userId);
    if (idx === -1) return res.status(404).json({ error: '用户不存在' });
    const { name, avatar } = req.body;
    if (name !== undefined) users[idx].name = String(name).trim();
    if (avatar !== undefined) users[idx].avatar = String(avatar).trim() || DEFAULT_AVATAR;
    writeJson(USERS_FILE, users);
    res.json(sanitizeUser(users[idx]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== 记录 API（仅当前用户）==========
app.get('/api/records', authMiddleware, (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { date, mealType, dateFrom, dateTo } = req.query;
    let list = records.filter(r => r.userId === req.userId);
    if (date) list = list.filter(r => r.date === date);
    if (dateFrom) list = list.filter(r => r.date >= dateFrom);
    if (dateTo) list = list.filter(r => r.date <= dateTo);
    if (mealType) list = list.filter(r => r.mealType === mealType);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/records', authMiddleware, (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { date, mealType, foodDesc, rating, price, review } = req.body;
    if (!date || !mealType) return res.status(400).json({ error: '缺少 date / mealType' });
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'late_night'];
    if (!validTypes.includes(mealType)) return res.status(400).json({ error: '无效的 mealType' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating 为 1-5' });
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: '请填写有效价格（≥0）' });
    const record = {
      id: uuidv4(),
      userId: req.userId,
      date,
      mealType,
      foodDesc: foodDesc || '',
      rating: r,
      price: priceNum,
      review: review != null ? String(review).trim() : '',
      imageUrl: null,
      createdAt: new Date().toISOString()
    };
    records.push(record);
    writeJson(RECORDS_FILE, records);
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/records/:id', authMiddleware, (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const idx = records.findIndex(r => r.id === req.params.id && r.userId === req.userId);
    if (idx === -1) return res.status(404).json({ error: '记录不存在' });
    const { foodDesc, rating, mealType, date, price, review } = req.body;
    if (foodDesc !== undefined) records[idx].foodDesc = foodDesc;
    if (rating !== undefined) {
      const r = Number(rating);
      if (Number.isInteger(r) && r >= 1 && r <= 5) records[idx].rating = r;
    }
    if (mealType !== undefined) records[idx].mealType = mealType;
    if (date !== undefined) records[idx].date = date;
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isNaN(p) && p >= 0) records[idx].price = p;
    }
    if (review !== undefined) records[idx].review = String(review).trim();
    writeJson(RECORDS_FILE, records);
    res.json(records[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/records/:id', authMiddleware, (req, res) => {
  try {
    let records = readJson(RECORDS_FILE);
    const record = records.find(r => r.id === req.params.id && r.userId === req.userId);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    records = records.filter(r => r.id !== req.params.id);
    writeJson(RECORDS_FILE, records);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/records/:id/upload', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const records = readJson(RECORDS_FILE);
    const idx = records.findIndex(r => r.id === req.params.id && r.userId === req.userId);
    if (idx === -1) return res.status(404).json({ error: '记录不存在' });
    records[idx].imageUrl = '/uploads/' + req.file.filename;
    writeJson(RECORDS_FILE, records);
    res.json(records[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/records/with-image', authMiddleware, upload.single('image'), (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { date, mealType, foodDesc, rating, price, review } = req.body || {};
    if (!date || !mealType) return res.status(400).json({ error: '缺少 date / mealType' });
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'late_night'];
    if (!validTypes.includes(mealType)) return res.status(400).json({ error: '无效的 mealType' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating 为 1-5' });
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: '请填写有效价格（≥0）' });
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    const record = {
      id: uuidv4(),
      userId: req.userId,
      date,
      mealType,
      foodDesc: foodDesc || '',
      rating: r,
      price: priceNum,
      review: review != null ? String(review).trim() : '',
      imageUrl,
      createdAt: new Date().toISOString()
    };
    records.push(record);
    writeJson(RECORDS_FILE, records);
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`三餐记录服务已启动: http://localhost:${PORT}`));
