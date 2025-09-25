/**
 * PowerHODL API - Express App
 * 
 * Unified Express application for all PowerHODL API endpoints
 * Deployed on Vercel with serverless functions
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import route handlers
import signalRoutes from './routes/signal.js';
import backtestRoutes from './routes/backtest.js';
import portfolioRoutes from './routes/portfolio.js';
import historicalRoutes from './routes/historical.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow Vercel's CSP
    crossOriginEmbedderPolicy: false // Allow cross-origin requests
}));

// CORS middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('combined'));
} else {
    app.use(requestLogger);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/signal', signalRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/historical', historicalRoutes);

// 404 handler for unknown routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/signal',
            'GET|POST /api/backtest', 
            'GET /api/portfolio',
            'GET /api/historical'
        ]
    });
});

// Global error handler (must be last)
app.use(errorHandler);

// Export for Vercel
export default app;
