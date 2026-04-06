const socketIo = require('socket.io');

let io;

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:8080'],
      methods: ["GET", "POST", "PATCH"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a room based on the case ID or user ID for private updates
    socket.on('join_case', (caseId) => {
      socket.join(`case_${caseId}`);
      console.log(`Socket ${socket.id} joined room: case_${caseId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

function emitUpdate(caseId, data) {
  if (io) {
    // Only emit to users in the specific case room (private)
    io.to(`case_${caseId}`).emit('caseUpdate', data);
    console.log(`Emitted update to case_${caseId}:`, data.status);
  } else {
    console.warn('Socket.io not initialized.');
  }
}

// For final orders to be published
function emitPublicUpdate(data) {
  if (io) {
    io.emit('publicCaseUpdate', data);
  }
}

module.exports = {
  init,
  emitUpdate,
  emitPublicUpdate,
  getIo: () => io
};
