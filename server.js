const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 确保目录存在
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, '[]');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

// 图片上传配置
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

// ========== 用户 API ==========
app.get('/api/users', (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const DEFAULT_AVATAR = '🍳';

app.post('/api/users', (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const { name, avatar } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请填写用户名' });
    const id = uuidv4();
    users.push({
      id,
      name: name.trim(),
      avatar: avatar != null && String(avatar).trim() ? String(avatar).trim() : DEFAULT_AVATAR,
      createdAt: new Date().toISOString()
    });
    writeJson(USERS_FILE, users);
    res.json(users.find(u => u.id === id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/:id', (req, res) => {
  try {
    const users = readJson(USERS_FILE);
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '用户不存在' });
    const { name, avatar } = req.body;
    if (name !== undefined) users[idx].name = String(name).trim();
    if (avatar !== undefined) users[idx].avatar = String(avatar).trim() || DEFAULT_AVATAR;
    writeJson(USERS_FILE, users);
    res.json(users[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== 记录 API ==========
app.get('/api/records', (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { userId, date, mealType, dateFrom, dateTo } = req.query;
    let list = records;
    if (userId) list = list.filter(r => r.userId === userId);
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

app.post('/api/records', (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { userId, date, mealType, foodDesc, rating, price, review } = req.body;
    if (!userId || !date || !mealType) return res.status(400).json({ error: '缺少 userId / date / mealType' });
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'late_night'];
    if (!validTypes.includes(mealType)) return res.status(400).json({ error: '无效的 mealType' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating 为 1-5' });
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: '请填写有效价格（≥0）' });
    const record = {
      id: uuidv4(),
      userId,
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

app.patch('/api/records/:id', (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const idx = records.findIndex(r => r.id === req.params.id);
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

app.delete('/api/records/:id', (req, res) => {
  try {
    let records = readJson(RECORDS_FILE);
    const record = records.find(r => r.id === req.params.id);
    if (!record) return res.status(404).json({ error: '记录不存在' });
    records = records.filter(r => r.id !== req.params.id);
    writeJson(RECORDS_FILE, records);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 上传图片并关联到记录
app.post('/api/records/:id/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择图片' });
    const records = readJson(RECORDS_FILE);
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '记录不存在' });
    const imageUrl = '/uploads/' + req.file.filename;
    records[idx].imageUrl = imageUrl;
    writeJson(RECORDS_FILE, records);
    res.json(records[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新建记录并带图（一步完成）
app.post('/api/records/with-image', upload.single('image'), (req, res) => {
  try {
    const records = readJson(RECORDS_FILE);
    const { userId, date, mealType, foodDesc, rating, price, review } = req.body || {};
    if (!userId || !date || !mealType) return res.status(400).json({ error: '缺少 userId / date / mealType' });
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'late_night'];
    if (!validTypes.includes(mealType)) return res.status(400).json({ error: '无效的 mealType' });
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'rating 为 1-5' });
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: '请填写有效价格（≥0）' });
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    const record = {
      id: uuidv4(),
      userId,
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
