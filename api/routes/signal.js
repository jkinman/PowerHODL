/**
 * Signal Route Handler
 * 
 * Real-time trading signal generation endpoint
 */

const express = require('express');
const router = express.Router();

// Import existing services
const MegaOptimalStrategy = require('../../src/strategy.js').default;
const { DatabaseService } = require('../../lib/services/DatabaseService.js');
const ETHBTCDataCollector = require('../../src/dataCollector.js').default;

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

/**
 * GET /api/signal
 * 
 * Generate real-time trading signal based on current market conditions
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('🎯 [SIGNAL API] Generating trading signal...');
        const startTime = Date.now();
        
        // Initialize strategy with mega-optimal parameters
        const strategy = new MegaOptimalStrategy();
        console.log(`📊 [SIGNAL API] Strategy initialized: Z-Score ±${strategy.parameters.zScoreThreshold}, ${strategy.parameters.lookbackWindow}d lookback`);
        
        // Fetch market data from database
        let data;
        try {
            console.log('🔄 [SIGNAL API] Fetching market data from database...');
            const dbService = new DatabaseService();
            data = await dbService.getRecentMarketData(strategy.parameters.lookbackWindow + 5);
            console.log(`📊 [SIGNAL API] Retrieved ${data.length} days from database`);
            
            if (data.length === 0) {
                throw new Error('No market data found in database');
            }
        } catch (error) {
            console.log('📥 [SIGNAL API] Database data unavailable, falling back to cached data...');
            // Fallback to cached data if database is unavailable
            const collector = new ETHBTCDataCollector();
            data = await collector.loadData('eth_btc_data_2025-09-24.json');
            console.log(`📊 [SIGNAL API] Collected ${data.length} days of fresh data`);
        }
        
        // Validate data availability
        if (data.length === 0) {
            throw new Error('No market data available from any exchange');
        }
        
        if (data.length < strategy.parameters.lookbackWindow) {
            throw new Error(`Insufficient data: ${data.length} days available, ${strategy.parameters.lookbackWindow} required`);
        }
        
        // Extract current market state and calculate ETH/BTC ratio
        const latestData = data[data.length - 1];
        const currentRatio = latestData.eth_price_usd / latestData.btc_price_usd;
        const historicalRatios = data.map(d => d.eth_price_usd / d.btc_price_usd);
        
        console.log(`📈 [SIGNAL API] Current ETH/BTC ratio: ${currentRatio.toFixed(6)}`);
        
        // Generate mega-optimal trading signal using Z-score mean reversion
        const signal = strategy.getSignal(currentRatio, historicalRatios);
        
        console.log(`🎯 [SIGNAL API] Signal: ${signal.action} (Z-Score: ${signal.zScore.toFixed(4)})`);
        
        // Prepare response
        const response = {
            timestamp: new Date().toISOString(),
            currentMarket: {
                ethBtcRatio: currentRatio,
                ethPrice: latestData.eth_price_usd,
                btcPrice: latestData.btc_price_usd,
                dataAge: new Date() - new Date(latestData.collected_at)
            },
            signal: {
                action: signal.action,
                shouldTrade: signal.shouldTrade,
                zScore: signal.zScore,
                strength: signal.strength,
                confidence: signal.confidence,
                reasoning: signal.reasoning || null
            },
            strategy: {
                name: 'Mega-Optimal ETH/BTC',
                parameters: strategy.parameters,
                lastOptimized: '2024-09-24'
            },
            metadata: {
                apiVersion: '2.0.0',
                dataPoints: data.length,
                dataSource: data.length > 50 ? 'database' : 'cache',
                processingTimeMs: Date.now() - startTime
            }
        };
        
        console.log(`✅ [SIGNAL API] Signal generated successfully in ${Date.now() - startTime}ms`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ [SIGNAL API] Error generating signal:', error);
        next(error);
    }
});

module.exports = router;
