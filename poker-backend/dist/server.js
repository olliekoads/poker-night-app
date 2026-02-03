"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./config/auth"));
require("./database/index");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        }
        else {
            next();
        }
    });
}
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
        next();
    });
}
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://poker-night-app.vercel.app',
    'https://poker-player-manager.vercel.app',
    'https://pokernight.famylin.com',
    'https://edwinpokernight.com',
    'https://www.edwinpokernight.com',
    'http://localhost:5173',
    'http://localhost:5175'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`CORS blocked origin: ${origin}`);
            }
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));
app.use(auth_1.default.initialize());
app.use(auth_1.default.session());
const auth_2 = __importDefault(require("./routes/auth"));
const players_1 = __importDefault(require("./routes/players"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const seatingCharts_1 = __importDefault(require("./routes/seatingCharts"));
const metrics_1 = __importDefault(require("./routes/metrics"));
app.use('/api/auth', auth_2.default);
app.use('/api/players', players_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/seating-charts', seatingCharts_1.default);
app.use('/api/metrics', metrics_1.default);
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Poker Backend API is running',
        timestamp: new Date().toISOString()
    });
});
app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./database/index').default;
        const result = await db.get('SELECT 1 as test');
        res.json({
            status: 'Database connection successful',
            database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
            testResult: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({
            status: 'Database connection failed',
            error: error.message,
            database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Poker Night API',
        health: '/api/health',
        timestamp: new Date().toISOString()
    });
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Something went wrong!' });
});
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
const server = app.listen(PORT, () => {
    console.log(`🃏 Poker Backend API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log('Server started successfully!');
});
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    }
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map