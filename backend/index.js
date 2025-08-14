// index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Example: keep alive ping to prevent server sleep
const url = `https://togethercode-f3iy.onrender.com`;
const interval = 300000; // 5 minutes

setInterval(async () => {
  try {
    await axios.get(url);
    console.log(`Pinged ${url} at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('Ping failed:', err.message);
  }
}, interval);

// Socket.io example
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('message', (data) => {
    console.log('Message from client:', data);
    io.emit('message', data); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Serve static files if needed
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
