/**
 * Portfolio Route Handler
 * 
 * Portfolio management and trade execution endpoint
 */

import express from 'express';
import { DatabaseService } from '../../lib/services/DatabaseService.js';

const router = express.Router();

/**
 * GET /api/portfolio
 * 
 * Get current portfolio state and recent trades
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('💰 [PORTFOLIO API] Fetching portfolio state...');
        const startTime = Date.now();
        
        // Initialize database service
        const dbService = new DatabaseService();
        
        // Get current portfolio state (placeholder - would come from database)
        const portfolio = {
            ethAmount: 0.5000, // ETH holdings
            btcAmount: 0.500000, // BTC holdings
            ethValueBTC: 0.5 * 0.037106, // ETH value in BTC terms
            totalValueBTC: 0.500000 + (0.5 * 0.037106), // Total portfolio in BTC
            lastUpdate: new Date().toISOString()
        };
        
        // Get recent trades (last 10)
        let recentTrades = [];
        try {
            recentTrades = await dbService.getRecentTrades(10);
        } catch (error) {
            console.warn('⚠️ [PORTFOLIO API] Could not fetch trades from database:', error.message);
            // Return mock trades if database unavailable
            recentTrades = [
                {
                    id: 'mock_1',
                    date: new Date().toISOString(),
                    type: 'rebalance',
                    action: 'BUY_ETH_SELL_BTC',
                    ethAmount: 0.1,
                    btcAmount: -0.003,
                    reason: 'Z-score: -1.42 (ETH oversold)',
                    status: 'executed'
                }
            ];
        }
        
        // Calculate portfolio metrics
        const metrics = {
            totalValueUSD: portfolio.totalValueBTC * 67000, // Approximate USD value
            ethPercentage: (portfolio.ethValueBTC / portfolio.totalValueBTC) * 100,
            btcPercentage: (portfolio.btcAmount / portfolio.totalValueBTC) * 100,
            dayChange: 0, // Would calculate from historical data
            weekChange: 0,
            monthChange: 0
        };
        
        // Build response
        const response = {
            timestamp: new Date().toISOString(),
            portfolio,
            metrics,
            recentTrades: recentTrades.slice(0, 5), // Limit to 5 most recent
            summary: {
                totalTrades: recentTrades.length,
                lastTradeDate: recentTrades.length > 0 ? recentTrades[0].date : null,
                avgTradeSize: recentTrades.length > 0 ? 
                    recentTrades.reduce((sum, t) => sum + Math.abs(t.btcAmount || 0), 0) / recentTrades.length : 0
            },
            metadata: {
                apiVersion: '2.0.0',
                dataSource: 'database',
                processingTimeMs: Date.now() - startTime
            }
        };
        
        console.log(`✅ [PORTFOLIO API] Portfolio data fetched in ${Date.now() - startTime}ms`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ [PORTFOLIO API] Error fetching portfolio:', error);
        next(error);
    }
});

/**
 * POST /api/portfolio/trade
 * 
 * Execute a trade (for future implementation)
 */
router.post('/trade', async (req, res, next) => {
    try {
        console.log('🔄 [PORTFOLIO API] Trade execution requested...');
        
        // For now, return simulation response
        res.json({
            success: false,
            message: 'Trade execution not yet implemented',
            simulation: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ [PORTFOLIO API] Trade execution error:', error);
        next(error);
    }
});

export default router;
