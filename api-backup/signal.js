/**
 * ETH/BTC Trading Signal API - Vercel Serverless Function
 * 
 * ENDPOINT: GET /api/signal
 * 
 * DESCRIPTION:
 * Returns the current trading signal for ETH/BTC pair based on the mega-optimal strategy.
 * Uses Z-score analysis with mean reversion to determine buy/sell/hold signals.
 * 
 * STRATEGY PARAMETERS (Mega-Optimal from 250-iteration optimization):
 * - Z-Score Threshold: 1.258 (trigger point for trades)
 * - Rebalance Amount: 49.79% (percentage of portfolio to trade)
 * - Transaction Cost: 1.66% (expected trading fees)
 * - Lookback Window: 15 days (for Z-score calculation)
 * 
 * RESPONSE STRUCTURE:
 * {
 *   timestamp: string,           // ISO 8601 timestamp
 *   currentMarket: {
 *     ethBtcRatio: number,         // Current ETH/BTC price ratio
 *     ethPrice: number,            // Current ETH price in USD
 *     btcPrice: number,            // Current BTC price in USD
 *     dataAge: number              // Age of data in milliseconds
 *   },
 *   signal: {
 *     action: string,              // 'BUY_ETH_SELL_BTC' | 'SELL_ETH_BUY_BTC' | 'HOLD'
 *     shouldTrade: boolean,        // Whether to execute trade
 *     zScore: number,              // Current Z-score value
 *     strength: string,            // Signal strength description
 *     confidence: number,          // Confidence level (0-1)
 *     reasoning: string|null       // Optional reasoning text
 *   },
 *   strategy: {
 *     zScoreThreshold: number,     // Z-score threshold used
 *     rebalanceAmount: string,     // Percentage to rebalance
 *     transactionCost: string      // Expected transaction cost
 *   },
 *   recommendation: string        // Human-readable recommendation
 * }
 * 
 * ERROR RESPONSES:
 * - 405: Method not allowed (non-GET requests)
 * - 500: Internal server error (data collection/analysis failure)
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Check current signal:
 *    GET /api/signal
 *    Returns current market analysis and trading recommendation
 * 
 * 2. Frontend integration:
 *    fetch('/api/signal')
 *      .then(res => res.json())
 *      .then(data => {
 *        if (data.signal.shouldTrade) {
 *          console.log(`Execute ${data.signal.action}`);
 *        }
 *      });
 * 
 * 3. Trading bot integration:
 *    const signal = await fetch('/api/signal').then(r => r.json());
 *    if (signal.signal.shouldTrade && signal.signal.confidence > 0.7) {
 *      await executeTrade(signal.signal.action, signal.strategy.rebalanceAmount);
 *    }
 * 
 * RATE LIMITING:
 * - Recommended: Maximum 1 request per minute
 * - Data is typically stable for 5-15 minutes
 * - Excessive requests may be throttled by Vercel
 * 
 * DEPENDENCIES:
 * - ../src/dataCollector.js: Historical data collection
 * - ../src/strategy.js: Mega-optimal trading strategy
 * 
 * @author ETH/BTC Trading System
 * @version 1.0.0
 * @since 2024-09-24
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import ETHBTCDataCollector from '../src/dataCollector.js';
import MegaOptimalStrategy from '../src/strategy.js';

/**
 * Vercel serverless function handler for trading signal generation
 * 
 * @param {Object} req - Vercel request object
 * @param {string} req.method - HTTP method (GET expected)
 * @param {Object} req.query - Query parameters (optional)
 * @param {Object} res - Vercel response object
 * @returns {Promise<void>} JSON response with trading signal or error
 * 
 * @example
 * // GET /api/signal
 * // Returns current ETH/BTC trading signal
 * 
 * @throws {405} Method not allowed - Only GET requests accepted
 * @throws {500} Internal server error - Data collection or analysis failure
 */
export default async function handler(req, res) {
    // Set CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests for signal generation
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'This endpoint only accepts GET requests',
            allowedMethods: ['GET'],
            timestamp: new Date().toISOString()
        });
    }

    try {
        console.log('🔍 [SIGNAL API] Generating trading signal...');
        const startTime = Date.now();
        
        // Initialize database service and mega-optimal strategy
        // DatabaseService: Live market data from database
        // Strategy: 250-iteration optimized parameters for maximum BTC accumulation
        const { DatabaseService } = await import('../lib/services/DatabaseService.js');
        const dbService = new DatabaseService();
        const strategy = new MegaOptimalStrategy();
        
        // Load historical ETH/BTC data from database for Z-score calculation
        let data;
        try {
            data = await dbService.getRecentMarketData(30); // Get last 30 days
            console.log(`📊 [SIGNAL API] Loaded ${data.length} days of database data`);
            
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
                zScoreThreshold: strategy.parameters.zScoreThreshold,
                rebalanceAmount: `${(strategy.parameters.rebalanceThreshold * 100).toFixed(2)}%`,
                transactionCost: `${(strategy.parameters.transactionCost * 100).toFixed(2)}%`
            },
            recommendation: signal.shouldTrade ? 
                `Execute ${signal.action.replace('_', ' ')} with ${(strategy.parameters.rebalanceThreshold * 100).toFixed(2)}% of portfolio` :
                'HOLD - Wait for stronger signal'
        };
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ [SIGNAL API] Signal generated in ${processingTime}ms: ${signal.action} (Z-Score: ${signal.zScore.toFixed(4)})`);
        
        // Add performance metadata to response
        response.metadata = {
            processingTimeMs: processingTime,
            dataPoints: data.length,
            dataSource: data[0]?.created_at ? 'database' : 'cached',
            apiVersion: '1.0.0'
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ [SIGNAL API] Signal generation failed:', error.message);
        console.error('❌ [SIGNAL API] Stack trace:', error.stack);
        
        // Categorize error types for better debugging
        let errorCategory = 'unknown';
        if (error.message.includes('data')) errorCategory = 'data_collection';
        if (error.message.includes('network')) errorCategory = 'network';
        if (error.message.includes('timeout')) errorCategory = 'timeout';
        if (error.message.includes('rate limit')) errorCategory = 'rate_limit';
        
        res.status(500).json({
            error: 'Failed to generate trading signal',
            message: error.message,
            category: errorCategory,
            timestamp: new Date().toISOString(),
            suggestion: errorCategory === 'data_collection' ? 
                'Try again in a few minutes or check exchange APIs' :
                'Check network connection and try again'
        });
    }
}
