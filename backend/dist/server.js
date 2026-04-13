"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lastmile';
async function startServer() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');
        // Wrap Express app in a plain HTTP server so Socket.io can handle the
        // WebSocket upgrade on the same port.
        const httpServer = http_1.default.createServer(app_1.default);
        (0, socket_1.initSocket)(httpServer);
        httpServer.listen(PORT, () => {
            console.log(`🚀 Last Mile API running on http://localhost:${PORT}`);
            console.log(`📦 API docs available at http://localhost:${PORT}/api`);
            console.log(`🔌 Socket.io server listening on ws://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map