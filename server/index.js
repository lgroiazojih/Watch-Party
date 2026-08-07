const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { verifyToken } = require('./auth');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000',
    credentials: true
  }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/.next');
  app.use(express.static(path.join(__dirname, '../client/.next/static')));
  app.use(express.static(path.join(__dirname, '../client/public')));
}

app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/.next/server/pages', req.path === '/' ? 'index.js' : `${req.path}.js`));
  } else {
    res.json({ message: 'WatchParty API is running. Use client for development.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const roomUsers = new Map();
const roomVideoStates = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, user } = data;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.user = user;

    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    roomUsers.get(roomId).set(socket.id, user);

    const users = Array.from(roomUsers.get(roomId).values());
    io.to(roomId).emit('room-users', users);

    if (roomVideoStates.has(roomId)) {
      socket.emit('video-state', roomVideoStates.get(roomId));
    }

    console.log(`${user.username} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    if (socket.roomId) {
      socket.leave(socket.roomId);
      if (roomUsers.has(socket.roomId)) {
        roomUsers.get(socket.roomId).delete(socket.id);
        const users = Array.from(roomUsers.get(socket.roomId).values());
        io.to(socket.roomId).emit('room-users', users);
      }
      socket.roomId = null;
      socket.user = null;
    }
  });

  socket.on('video-action', (data) => {
    const { roomId, action, time } = data;
    roomVideoStates.set(roomId, { action, time, timestamp: Date.now() });
    socket.to(roomId).emit('video-action', { action, time, user: socket.user });
  });

  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    io.to(roomId).emit('chat-message', {
      ...message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('reaction', (data) => {
    const { roomId, emoji } = data;
    io.to(roomId).emit('reaction', {
      emoji,
      user: socket.user,
      id: Date.now()
    });
  });

  socket.on('peer-id', (data) => {
    const { roomId, peerId } = data;
    socket.to(roomId).emit('peer-connected', {
      peerId,
      user: socket.user
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId && roomUsers.has(socket.roomId)) {
      roomUsers.get(socket.roomId).delete(socket.id);
      const users = Array.from(roomUsers.get(socket.roomId).values());
      io.to(socket.roomId).emit('room-users', users);
      io.to(socket.roomId).emit('peer-disconnected', { user: socket.user });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`WatchParty server running on port ${PORT}`);
});
