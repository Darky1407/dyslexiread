const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const app = express();
app.use(express.static(path.join(__dirname, 'haptics-public')));
const server = require('http').createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  socket.on('join', (role) => {
    socket.join(role);
    console.log(`[Socket] ${socket.id} joined role/room: '${role}'`);
  });

  socket.on('join-room', (roomId) => {
    if (roomId) {
      socket.join(roomId);
      console.log(`[Socket] ${socket.id} joined session room: '${roomId}'`);
    }
  });

  socket.on('pulse', (payload) => {
    let pattern = [200, 100, 200];
    let roomId = null;

    if (Array.isArray(payload)) {
      pattern = payload;
    } else if (payload && typeof payload === 'object') {
      pattern = payload.pattern || [200, 100, 200];
      roomId = payload.roomId;
    }

    console.log(`[Haptics] Pulse signal received for room '${roomId || 'all'}': ${JSON.stringify(pattern)}`);

    if (roomId) {
      io.to(roomId).emit('pulse', pattern);
    } else {
      io.to('phone').emit('pulse', pattern);
      io.emit('pulse', pattern);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

app.get('/test', (req, res) => {
  const pattern = [200, 100, 200];
  console.log('[Haptics Test] Triggering test pulse...');
  io.to('phone').emit('pulse', pattern);
  io.emit('pulse', pattern);
  res.send('Test pulse sent to phone!');
});

server.listen(3001, '0.0.0.0', () => console.log('DyslexiRead Haptics Server running on port 3001'));
