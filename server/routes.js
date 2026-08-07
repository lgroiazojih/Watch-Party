const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');

// Register
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

// Login
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

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' });
  }
  res.json({ user });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'با موفقیت خارج شدید' });
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email, avatar, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    // Check if username is taken by another user
    if (username && username !== user.username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (existing) {
        return res.status(400).json({ error: 'این نام کاربری قبلا استفاده شده' });
      }
    }

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existing) {
        return res.status(400).json({ error: 'این ایمیل قبلا استفاده شده' });
      }
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'رمز عبور فعلی الزامی است' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' });
      }
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    }

    // Update username, email, avatar
    const newUsername = username || user.username;
    const newEmail = email || user.email;
    const newAvatar = avatar || user.avatar;

    db.prepare('UPDATE users SET username = ?, email = ?, avatar = ? WHERE id = ?').run(newUsername, newEmail, newAvatar, userId);

    // Update creator_name in rooms
    db.prepare('UPDATE rooms SET creator_name = ? WHERE creator_id = ?').run(newUsername, userId);

    // Update username in messages
    db.prepare('UPDATE messages SET username = ? WHERE user_id = ?').run(newUsername, userId);

    const updatedUser = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(userId);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی پروفایل' });
  }
});

// Get rooms
router.get('/rooms', (req, res) => {
  const rooms = db.prepare(`
    SELECT r.id, r.name, r.video_url, r.creator_id, r.creator_name, r.is_private, r.created_at,
      (SELECT COUNT(*) FROM messages WHERE room_id = r.id) as message_count
    FROM rooms r 
    ORDER BY r.created_at DESC
  `).all();
  
  // Don't expose password in list
  const safeRooms = rooms.map(r => ({
    ...r,
    is_private: !!r.is_private
  }));
  
  res.json({ rooms: safeRooms });
});

// Create room
router.post('/rooms', authMiddleware, (req, res) => {
  const { name, video_url, is_private, password } = req.body;

  if (!name || !video_url) {
    return res.status(400).json({ error: 'نام اتاق و لینک ویدیو الزامی هستند' });
  }

  if (is_private && !password) {
    return res.status(400).json({ error: 'اتاق خصوصی باید رمز داشته باشد' });
  }

  const { v4: uuidv4 } = require('uuid');
  const roomId = uuidv4().slice(0, 8);

  const hashedPassword = is_private ? bcrypt.hashSync(password, 10) : null;

  db.prepare('INSERT INTO rooms (id, name, video_url, creator_id, creator_name, is_private, password) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    roomId, name, video_url, req.user.id, req.user.username, is_private ? 1 : 0, hashedPassword
  );

  const room = db.prepare('SELECT id, name, video_url, creator_id, creator_name, is_private, created_at FROM rooms WHERE id = ?').get(roomId);
  res.json({ room: { ...room, is_private: !!room.is_private } });
});

// Get room by ID (with password check)
router.get('/rooms/:id', (req, res) => {
  const room = db.prepare('SELECT id, name, video_url, creator_id, creator_name, is_private, created_at FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }
  res.json({ room: { ...room, is_private: !!room.is_private } });
});

// Verify room password
router.post('/rooms/:id/verify', (req, res) => {
  const { password } = req.body;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }

  if (!room.is_private) {
    return res.json({ verified: true });
  }

  if (!password) {
    return res.status(400).json({ error: 'رمز عبور الزامی است', requiresPassword: true });
  }

  const valid = bcrypt.compareSync(password, room.password);
  if (!valid) {
    return res.status(401).json({ error: 'رمز عبور اشتباه است' });
  }

  res.json({ verified: true });
});

// Delete room
router.delete('/rooms/:id', authMiddleware, (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }

  if (room.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'فقط سازنده اتاق می‌تواند آن را حذف کند' });
  }

  db.prepare('DELETE FROM messages WHERE room_id = ?').run(req.params.id);
  db.prepare('DELETE FROM room_controls WHERE room_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);

  res.json({ message: 'اتاق حذف شد' });
});

// Grant control to user
router.post('/rooms/:id/grant-control', authMiddleware, (req, res) => {
  const { userId } = req.body;
  const roomId = req.params.id;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }

  if (room.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'فقط سازنده اتاق می‌تواند دسترسی بدهد' });
  }

  try {
    db.prepare('INSERT INTO room_controls (room_id, user_id, granted_by) VALUES (?, ?, ?)').run(roomId, userId, req.user.id);
    res.json({ message: 'دسترسی کنترل داده شد' });
  } catch (e) {
    res.status(400).json({ error: 'این کاربر قبلا دسترسی دارد' });
  }
});

// Revoke control from user
router.post('/rooms/:id/revoke-control', authMiddleware, (req, res) => {
  const { userId } = req.body;
  const roomId = req.params.id;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'اتاق یافت نشد' });
  }

  if (room.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'فقط سازنده اتاق می‌تواند دسترسی را لغو کند' });
  }

  db.prepare('DELETE FROM room_controls WHERE room_id = ? AND user_id = ?').run(roomId, userId);
  res.json({ message: 'دسترسی کنترل لغو شد' });
});

// Get users with control in room
router.get('/rooms/:id/controls', (req, res) => {
  const controls = db.prepare(`
    SELECT rc.user_id, rc.granted_by, rc.created_at, u.username, u.avatar
    FROM room_controls rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.room_id = ?
  `).all(req.params.id);
  res.json({ controls });
});

// Get all users (for granting control)
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, avatar FROM users WHERE id != ?').all(req.user.id);
  res.json({ users });
});

module.exports = router;
