// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());               // allow cross-origin (frontend -> backend)
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",               // for development; you can restrict to your frontend origin
    methods: ["GET", "POST"]
  }
});

// In-memory users map: socketId -> { name, branch }
const users = {};

// Simple health route
app.get('/', (req, res) => {
  res.send('College Chat Backend is running');
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('New socket connected:', socket.id);

  // Client will emit 'join' with { name, branch }
  socket.on('join', (payload) => {
    const { name, branch } = payload || {};
    users[socket.id] = { name: name || 'Anonymous', branch: branch || '' };

    // notify this user
    socket.emit('systemMessage', { text: `Welcome ${users[socket.id].name}!` });

    // notify others
    socket.broadcast.emit('systemMessage', {
      text: `${users[socket.id].name} (${users[socket.id].branch}) has joined the chat.`
    });

    // update online list
    io.emit('users', Object.values(users));
  });

  // chat message from a client
  socket.on('chatMessage', (msg) => {
    const user = users[socket.id] || { name: 'Anonymous', branch: '' };
    const message = {
      name: user.name,
      branch: user.branch,
      text: msg,
      time: new Date().toISOString()
    };
    // broadcast to all
    io.emit('chatMessage', message);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log('Socket disconnected:', socket.id, user.name);
      // inform everyone
      socket.broadcast.emit('systemMessage', {
        text: `${user.name} (${user.branch}) left the chat.`
      });
      delete users[socket.id];
      io.emit('users', Object.values(users));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
