import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { initSocket } from './socket';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lastmile';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Wrap Express app in a plain HTTP server so Socket.io can handle the
    // WebSocket upgrade on the same port.
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Last Mile API running on http://localhost:${PORT}`);
      console.log(`📦 API docs available at http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.io server listening on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

startServer();
