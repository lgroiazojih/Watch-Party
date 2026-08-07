const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const expressApp = express();

  expressApp.use(cors({ origin: dev ? 'http://localhost:3000' : true, credentials: true }));
  expressApp.use(express.json());
  expressApp.use(cookieParser());

  // API routes
  expressApp.use('/api', routes);

  // Next.js handles everything else
  expressApp.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const server = createServer(expressApp);

  const io = new Server(server, {
    cors: {
      origin: dev ? 'http://localhost:3000' : true,
      credentials: true
    }
  });

  // Socket.io
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

  server.listen(port, hostname, () => {
    console.log(`> WatchParty ready on http://${hostname}:${port}`);
  });
});
