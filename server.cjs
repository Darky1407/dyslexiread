const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const app = express();
app.use(express.static(path.join(__dirname, 'haptics-public')));
const server = require('http').createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join', (role) => socket.join(role));
  socket.on('pulse', (pattern) => io.to('phone').emit('pulse', pattern));
});

app.get('/test', (req, res) => {
  io.to('phone').emit('pulse', [80, 60, 80]);
  res.send('pulse sent');
});

server.listen(3001, '0.0.0.0', () => console.log('haptics server running on port 3001'));