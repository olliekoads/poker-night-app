import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import passport from './config/auth';
import { HealthCheckResponse, ApiError } from './types/index';

// Initialize database (this will trigger PostgreSQL vs SQLite detection)
import './database/index';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy (required for Railway/Heroku/etc)
app.set('trust proxy', 1);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
    next();
  });
}

// Middleware
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

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`CORS blocked origin: ${origin}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // Prevent XSS attacks
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site cookies for OAuth
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import routes
import authRouter from './routes/auth';
import playersRouter from './routes/players';
import sessionsRouter from './routes/sessions';
import seatingChartsRouter from './routes/seatingCharts';
import metricsRouter from './routes/metrics';

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/players', playersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/seating-charts', seatingChartsRouter);
app.use('/api/metrics', metricsRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// API health check endpoint
app.get('/api/health', (req: Request, res: Response<HealthCheckResponse>) => {
  res.status(200).json({
    status: 'OK',
    message: 'Poker Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Database connectivity test endpoint
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const db = require('./database/index').default;

    // Test basic query
    const result = await db.get('SELECT 1 as test');

    res.json({
      status: 'Database connection successful',
      database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
      testResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'Database connection failed',
      error: error.message,
      database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Poker Night API',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: err.message || 'Something went wrong!' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`🃏 Poker Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('Server started successfully!');
});

server.on('error', (error: any) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
