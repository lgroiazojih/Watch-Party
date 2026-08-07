const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Health check - must be fast and simple
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Fallback to index.html for client-side routing (SPA style)
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
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
