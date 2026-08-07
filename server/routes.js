const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'همه فیلدها الزامی هستند' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(400).json({ error: 'ایمیل یا نام کاربری قبلا استفاده شده' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatars = ['😀', '😎', '🤩', '😊', '🎮', '🎬', '🍿', '🎵'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const result = db.prepare('INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, avatar);

    const user = { id: result.lastInsertRowid, username, email, avatar };
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ user: { id: user.id, username, email, avatar }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطا در ثبت نام' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی هستند' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'با موفقیت خارج شدید' });
});

router.get('/rooms', (req, res) => {
  const rooms = db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as message_count
    FROM rooms r 
    ORDER BY r.created_at DESC
  `).all();
  res.json({ rooms });
});

router.post('/rooms', authMiddleware, (req, res) => {
  const { name, video_url } = req.body;

  if (!name || !video_url) {
    return res.status(400).json({ error: 'نام اتاق و لینک ویدیو الزامی هستند' });
  }

  const { v4: uuidv4 } = require('uuid');
  const roomId = uuidv4().slice(0, 8);

  db.prepare('INSERT INTO rooms (id, name, video_url, creator_id, creator_name) VALUES (?, ?, ?, ?, ?)').run(
    roomId, name, video_url, req.user.id, req.user.username
  );

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  res.json({ room });
});

router.get('/rooms/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }
  res.json({ room });
});

router.delete('/rooms/:id', authMiddleware, (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }

  if (room.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'فقط سازنده اتاق می‌تواند آن را حذف کند' });
  }

  db.prepare('DELETE FROM messages WHERE room_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);

  res.json({ message: 'اتاق حذف شد' });
});

module.exports = router;
