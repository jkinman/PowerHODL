/**
 * Historical Route Handler
 * 
 * Historical market data endpoint for dashboard charts
 */

import express from 'express';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import MegaOptimalStrategy from '../../src/strategy.js';

const router = express.Router();

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
            console.log('📥 [HISTORICAL API] Database unavailable, generating mock data...');
            
            historicalData = [];
            const now = new Date();
            for (let i = requestedDays - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const baseEthPrice = 2600 + (Math.sin(i * 0.1) * 200);
                const baseBtcPrice = 67000 + (Math.sin(i * 0.05) * 3000);
                historicalData.push({
                    collected_at: date.toISOString(),
                    eth_price_usd: baseEthPrice,
                    btc_price_usd: baseBtcPrice
                });
            }
            console.log(`📊 [HISTORICAL API] Generated ${historicalData.length} days of mock data`);
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
            
            return {
                date: item.collected_at.split('T')[0], // Date only
                timestamp: item.collected_at, // Full timestamp
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
                dataSource: historicalData.length > 50 ? 'database' : 'mock',
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
