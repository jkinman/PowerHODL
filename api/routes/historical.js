/**
 * Historical Route Handler
 * 
 * Historical market data endpoint for dashboard charts
 */

import express from 'express';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import MegaOptimalStrategy from '../../src/strategy.js';

const router = express.Router();

// Date handling utilities (inline for API compatibility)
const normalizeDate = (dateInput) => {
    if (!dateInput) return null;
    try {
        if (typeof dateInput === 'string') {
            return dateInput;
        } else if (dateInput instanceof Date) {
            return dateInput.toISOString();
        } else {
            return new Date(dateInput).toISOString();
        }
    } catch (error) {
        console.error('Failed to normalize date:', dateInput, error);
        return null;
    }
};

const extractDateOnly = (dateInput) => {
    const normalized = normalizeDate(dateInput);
    return normalized ? normalized.split('T')[0] : null;
};

/**
 * GET /api/historical
 * 
 * Get historical market data for charts (ETH/BTC ratio, Z-score)
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('📊 [HISTORICAL API] Fetching historical data for charts...');
        console.log('🔧 [HISTORICAL API] Environment check:', {
            hasDbUrl: !!process.env.DATABASE_URL,
            nodeEnv: process.env.NODE_ENV
        });
        
        const startTime = Date.now();
        
        // Query parameters
        const days = parseInt(req.query.days) || 30; // Default 30 days
        const maxDays = 90; // Limit to prevent performance issues
        const requestedDays = Math.min(days, maxDays);
        
        console.log(`📊 [HISTORICAL API] Requesting ${requestedDays} days of data`);
        
        // Try to get data from database first
        let historicalData;
        try {
            console.log('🔄 [HISTORICAL API] Attempting database connection...');
            const dbService = new DatabaseService();
            
            historicalData = await dbService.getRecentMarketData(requestedDays);
            console.log(`📊 [HISTORICAL API] Retrieved ${historicalData.length} records from database`);
            
            if (historicalData.length === 0) {
                throw new Error('No data in database');
            }
            
        } catch (dbError) {
            console.error('❌ [HISTORICAL API] Database error:', {
                message: dbError.message,
                stack: dbError.stack?.substring(0, 200)
            });
            
            // Return error instead of mock data
            return res.status(503).json({
                success: false,
                error: 'Historical data unavailable',
                message: 'Database connection failed - no historical data can be provided',
                details: dbError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Transform data for frontend charts
        const strategy = new MegaOptimalStrategy();
        const lookbackWindow = strategy.parameters.lookbackWindow;
        
        console.log(`🧮 [HISTORICAL API] Processing data for Z-score calculation (lookback: ${lookbackWindow})`);
        
        const processedData = historicalData.map((item, index) => {
            const ethBtcRatio = item.eth_price_usd / item.btc_price_usd;
            
            // Calculate Z-score using rolling window
            let zScore = 0;
            if (index >= lookbackWindow - 1) {
                const window = historicalData.slice(index - lookbackWindow + 1, index + 1);
                const ratios = window.map(d => d.eth_price_usd / d.btc_price_usd);
                const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
                const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
                const stdDev = Math.sqrt(variance);
                
                if (stdDev > 0) {
                    zScore = (ethBtcRatio - mean) / stdDev;
                }
            }
            
            // Use date handling utilities for consistent formatting
            const timestamp = normalizeDate(item.collected_at);
            const dateOnly = extractDateOnly(item.collected_at);
            
            return {
                date: dateOnly, // Date only
                timestamp: timestamp, // Full timestamp
                ethBtcRatio: ethBtcRatio,
                zScore: zScore,
                ethPrice: item.eth_price_usd,
                btcPrice: item.btc_price_usd
            };
        });
        
        const response = {
            success: true,
            data: processedData,
            metadata: {
                requestedDays: requestedDays,
                actualDays: processedData.length,
                dataSource: 'database',
                lookbackWindow: lookbackWindow,
                processingTimeMs: Date.now() - startTime,
                apiVersion: '2.0.0'
            },
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ [HISTORICAL API] Processed ${processedData.length} data points in ${Date.now() - startTime}ms`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ [HISTORICAL API] Error:', error);
        next(error);
    }
});

export default router;
