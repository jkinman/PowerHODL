/**
 * Local Development Server for PowerHODL API
 * 
 * This server emulates the Vercel serverless environment locally
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import serverless functions
import signalHandler from './api/signal.js';
import backtestHandler from './api/backtest.js';
import portfolioHandler from './api/portfolio.js';
import historicalHandler from './api/historical.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Wrapper function to adapt Vercel handlers to Express
function adaptVercelHandler(handler) {
    return async (req, res) => {
        try {
            // Create a mock Vercel request/response object
            const vercelReq = {
                ...req,
                query: req.query,
                body: req.body,
                method: req.method,
                headers: req.headers,
                url: req.url
            };

            const vercelRes = {
                ...res,
                setHeader: (key, value) => res.setHeader(key, value),
                status: (code) => {
                    res.statusCode = code;
                    return vercelRes;
                },
                json: (data) => res.json(data),
                send: (data) => res.send(data)
            };

            await handler(vercelReq, vercelRes);
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: error.message
            });
        }
    };
}

// API Routes
app.get('/api/signal', adaptVercelHandler(signalHandler));
app.post('/api/backtest', adaptVercelHandler(backtestHandler));
app.get('/api/backtest', adaptVercelHandler(backtestHandler));
app.get('/api/portfolio', adaptVercelHandler(portfolioHandler));
app.get('/api/historical', adaptVercelHandler(historicalHandler));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PowerHODL API Development Server',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 PowerHODL API Development Server Started`);
    console.log(`📊 API: http://localhost:${PORT}`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('\nAvailable API endpoints:');
    console.log('   GET  /api/signal     - Current trading signal');
    console.log('   POST /api/backtest   - Run backtest');
    console.log('   GET  /api/portfolio  - Portfolio status');
    console.log('   GET  /api/historical - Historical data');
    console.log(`\n🌐 Frontend should connect to: http://localhost:${PORT}`);
});

export default app;
