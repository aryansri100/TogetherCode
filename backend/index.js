import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const url = `https://togethercode-f3iy.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios.get(url)
    .then(() => console.log("Website reloaded"))
    .catch(error => console.error(`Error : ${error.message}`));
}

setInterval(reloadWebsite, interval);

const io = new Server(server, {
    cors: { origin: '*' },
});

const rooms = new Map();
const roomLanguages = {};

// 🔹 Serve React static files
// Serve React static files
app.use(express.static(path.join(__dirname, "../client/dist")));

// Catch-all route for React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});


io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  let currentRoom = null;
  let currentUser = null;

  socket.on('join', ({ roomId, userName }) => {
      if (currentRoom) {
          socket.leave(currentRoom);
          rooms.get(currentRoom)?.users.delete(currentUser);
          io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom)?.users || []));
      }

      currentRoom = roomId;
      currentUser = userName;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
          rooms.set(roomId, { users: new Set(), code: "// start code here" });
          roomLanguages[roomId] = "javascript";
      }

      rooms.get(roomId).users.add(userName);

      socket.emit("codeUpdate", rooms.get(roomId).code);
      socket.emit("languageUpdate", roomLanguages[roomId]);

      io.to(roomId).emit('userJoined', Array.from(rooms.get(roomId).users));
  });

  socket.on('codeChange', ({ roomId, code }) => {
      if (rooms.has(roomId)) {
          rooms.get(roomId).code = code;
      }
      socket.to(roomId).emit('codeUpdate', code);
  });

  socket.on("languageChange", ({ roomId, language }) => {
      roomLanguages[roomId] = language;
      socket.to(roomId).emit("languageUpdate", language);
  });

  socket.on("typing", ({ roomId, userName }) => {
      socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("compileCode", async ({ code, roomId, language, version, input }) => {
      if (rooms.has(roomId)) {
          const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
              language,
              version,
              files: [{ content: code }],
              stdin: input,
          });
          rooms.get(roomId).output = response.data.run.output;
          io.to(roomId).emit("codeResponse", response.data);
      }
  });

  socket.on("leaveRoom", () => {
      if (currentRoom && currentUser) {
          rooms.get(currentRoom)?.users.delete(currentUser);
          io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)?.users || []));
          socket.leave(currentRoom);
          currentRoom = null;
          currentUser = null;
      }
  });

  socket.on("disconnect", () => {
      if (currentRoom && currentUser) {
          rooms.get(currentRoom)?.users.delete(currentUser);
          io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)?.users || []));
      }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
