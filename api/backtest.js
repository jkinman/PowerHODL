/**
 * ETH/BTC Strategy Backtesting API - Vercel Serverless Function
 * 
 * ENDPOINTS:
 * - GET  /api/backtest: Run backtest with mega-optimal parameters
 * - POST /api/backtest: Run backtest with custom parameters
 * 
 * DESCRIPTION:
 * Comprehensive backtesting system for ETH/BTC trading strategies.
 * Measures performance in crypto terms (BTC accumulation) rather than USD.
 * Uses historical data to simulate trading with transaction costs and slippage.
 * 
 * STRATEGY TESTING:
 * - Mean reversion with Z-score triggers
 * - Portfolio rebalancing optimization
 * - Transaction cost modeling
 * - Risk-adjusted returns (Sharpe ratio)
 * - Maximum drawdown analysis
 * 
 * GET REQUEST - Uses Mega-Optimal Parameters:
 * - Z-Score Threshold: 1.258
 * - Rebalance Amount: 49.79%
 * - Transaction Cost: 1.66%
 * - Lookback Window: 15 days
 * 
 * POST REQUEST BODY (Custom Parameters):
 * {
 *   rebalanceThreshold: number,   // 0.0-1.0 (percentage of portfolio)
 *   transactionCost: number,      // 0.0-0.1 (as decimal, e.g., 0.01 = 1%)
 *   zScoreThreshold: number       // 0.5-3.0 (standard deviations)
 * }
 * 
 * RESPONSE STRUCTURE:
 * {
 *   timestamp: string,
 *   parameters: {
 *     rebalanceThreshold: string,   // Human-readable percentage
 *     transactionCost: string,      // Human-readable percentage
 *     zScoreThreshold: string       // Formatted to 3 decimals
 *   },
 *   dataInfo: {
 *     totalDays: number,            // Total days of data
 *     startDate: string,            // Backtest start date
 *     endDate: string,              // Backtest end date
 *     backtestPeriod: string        // Trading days description
 *   },
 *   performance: {
 *     strategyReturn: string,       // Strategy total return %
 *     benchmarkReturn: string,      // Buy & hold return %
 *     excessReturn: string,         // Strategy vs benchmark %
 *     sharpeRatio: string,          // Risk-adjusted return
 *     maxDrawdown: string,          // Maximum portfolio decline %
 *     totalTrades: number           // Number of trades executed
 *   },
 *   cryptoAccumulation: {
 *     startingBTC: string,          // Initial BTC equivalent
 *     strategyBTC: string,          // Final BTC with strategy
 *     buyHoldBTC: string,           // Final BTC with buy & hold
 *     cryptoGained: string,         // Additional satoshis gained
 *     cryptoOutperformance: string  // % better crypto accumulation
 *   },
 *   opportunities: {
 *     total: number,                // Total trading opportunities
 *     profitable: number,           // Profitable trades
 *     winRate: string,              // Success rate %
 *     avgReturn: string             // Average return per trade %
 *   },
 *   summary: {
 *     isProfit: boolean,            // Strategy is profitable
 *     beatsBenchmark: boolean,      // Outperforms buy & hold
 *     cryptoAccumulated: boolean,   // Accumulated more crypto
 *     recommendation: string        // Trading recommendation
 *   }
 * }
 * 
 * ERROR RESPONSES:
 * - 405: Method not allowed (non-GET/POST requests)
 * - 400: Invalid parameters (POST requests)
 * - 500: Backtest execution failure
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Quick backtest with optimal parameters:
 *    GET /api/backtest
 * 
 * 2. Custom parameter testing:
 *    POST /api/backtest
 *    Content-Type: application/json
 *    {
 *      "rebalanceThreshold": 0.3,
 *      "transactionCost": 0.02,
 *      "zScoreThreshold": 1.5
 *    }
 * 
 * 3. Parameter optimization loop:
 *    for (let threshold = 0.5; threshold <= 2.0; threshold += 0.1) {
 *      const result = await fetch('/api/backtest', {
 *        method: 'POST',
 *        headers: { 'Content-Type': 'application/json' },
 *        body: JSON.stringify({ zScoreThreshold: threshold })
 *      }).then(r => r.json());
 *      console.log(`Threshold ${threshold}: ${result.performance.excessReturn}`);
 *    }
 * 
 * PERFORMANCE NOTES:
 * - Backtest typically takes 2-10 seconds
 * - Uses cached historical data when available
 * - Memory usage ~50MB for 1 year of data
 * - Vercel timeout: 10 seconds (Hobby), 60 seconds (Pro)
 * 
 * @author ETH/BTC Trading System
 * @version 1.0.0
 * @since 2024-09-24
 */

import ETHBTCDataCollector from '../src/dataCollector.js';
import ETHBTCAnalyzer from '../src/analyzer.js';
import MegaOptimalStrategy from '../src/strategy.js';

/**
 * Vercel serverless function handler for strategy backtesting
 * 
 * @param {Object} req - Vercel request object
 * @param {string} req.method - HTTP method (GET or POST)
 * @param {Object} req.body - Request body for POST (custom parameters)
 * @param {number} req.body.rebalanceThreshold - Portfolio rebalance percentage (0.0-1.0)
 * @param {number} req.body.transactionCost - Trading fee percentage (0.0-0.1)
 * @param {number} req.body.zScoreThreshold - Z-score trigger threshold (0.5-3.0)
 * @param {Object} res - Vercel response object
 * @returns {Promise<void>} JSON response with backtest results or error
 * 
 * @example
 * // GET /api/backtest - Uses mega-optimal parameters
 * // POST /api/backtest - Custom parameters in request body
 * 
 * @throws {405} Method not allowed - Only GET and POST accepted
 * @throws {400} Invalid parameters - POST body validation failed
 * @throws {500} Backtest failure - Data or computation error
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

    // Validate HTTP method
    if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'This endpoint accepts GET and POST requests only',
            allowedMethods: ['GET', 'POST'],
            timestamp: new Date().toISOString()
        });
    }

    try {
        console.log(`📊 [BACKTEST API] Starting ${req.method} backtest...`);
        const startTime = Date.now();
        
        // Initialize core components
        // DataCollector: Multi-exchange historical data
        // Strategy: Mega-optimal parameters from 250-iteration optimization
        // Analyzer: Comprehensive backtesting engine
        const collector = new ETHBTCDataCollector();
        const strategy = new MegaOptimalStrategy();
        
        // Parameter selection: Mega-optimal defaults or custom from POST body
        let parameters = { ...strategy.parameters }; // Clone to avoid mutation
        
        if (req.method === 'POST' && req.body) {
            const { rebalanceThreshold, transactionCost, zScoreThreshold, backtestPeriod } = req.body;
            
            // Validate and apply custom parameters with bounds checking
            if (rebalanceThreshold !== undefined) {
                const value = parseFloat(rebalanceThreshold);
                if (isNaN(value) || value < 0 || value > 1) {
                    return res.status(400).json({
                        error: 'Invalid rebalanceThreshold',
                        message: 'Must be a number between 0 and 1',
                        received: rebalanceThreshold
                    });
                }
                parameters.rebalanceThreshold = value;
            }
            
            if (transactionCost !== undefined) {
                const value = parseFloat(transactionCost);
                if (isNaN(value) || value < 0 || value > 0.1) {
                    return res.status(400).json({
                        error: 'Invalid transactionCost',
                        message: 'Must be a number between 0 and 0.1 (10%)',
                        received: transactionCost
                    });
                }
                parameters.transactionCost = value;
            }
            
            if (zScoreThreshold !== undefined) {
                const value = parseFloat(zScoreThreshold);
                if (isNaN(value) || value < 0.1 || value > 5.0) {
                    return res.status(400).json({
                        error: 'Invalid zScoreThreshold',
                        message: 'Must be a number between 0.1 and 5.0',
                        received: zScoreThreshold
                    });
                }
                parameters.zScoreThreshold = value;
            }
            
            console.log('🔧 [BACKTEST API] Using custom parameters:', parameters);
        } else {
            console.log('🎯 [BACKTEST API] Using mega-optimal parameters:', parameters);
        }
        
        // Load historical ETH/BTC data for backtesting
        // Load historical data from database (seeded with real Binance data)
        let data;
        try {
            const { DatabaseService } = await import('../lib/services/DatabaseService.js');
            const dbService = new DatabaseService();
            
            // Determine backtest period from request
            let requestedDays;
            if (req.method === 'POST' && req.body && req.body.backtestPeriod) {
                if (req.body.backtestPeriod === "ALL") {
                    requestedDays = 2000; // All available data
                } else {
                    requestedDays = parseInt(req.body.backtestPeriod) || 365; // Default 1 year
                }
            } else {
                requestedDays = 2000; // Default to all data for GET requests
            }
            
            const dbData = await dbService.getRecentMarketData(requestedDays);
            console.log(`📊 [BACKTEST API] Loaded ${dbData.length} days from database (requested: ${requestedDays} days)`);
            
            if (dbData.length > 50) {
                // Convert database format to analyzer format
                data = dbData.map(d => ({
                    timestamp: new Date(d.collected_at),
                    eth_price: d.eth_price_usd,
                    btc_price: d.btc_price_usd,
                    close: d.eth_price_usd / d.btc_price_usd, // ETH/BTC ratio
                    volume: d.volume_24h || 0
                }));
                console.log(`📊 [BACKTEST API] Using ${data.length} days of real Binance data`);
            } else {
                // Fallback to cached data if database has insufficient data
                console.log('📥 [BACKTEST API] Insufficient database data, falling back to cached data...');
                data = await collector.loadData('eth_btc_data_2025-09-24.json');
                console.log(`📊 [BACKTEST API] Using ${data.length} days of cached data`);
            }
        } catch (error) {
            throw new Error(`Historical data not available for backtesting: ${error.message}`);
        }
        
        // Validate data sufficiency for backtesting
        const minDaysRequired = Math.max(50, parameters.lookbackWindow * 2);
        if (data.length < minDaysRequired) {
            throw new Error(`Insufficient data: ${data.length} days available, ${minDaysRequired} required for meaningful backtest`);
        }
        
        // Run analyzer backtest
        const analyzer = new ETHBTCAnalyzer(data);
        const backtest = analyzer.backtestStrategy(
            parameters.rebalanceThreshold,
            parameters.transactionCost
        );
        
        // Find trading opportunities
        const opportunities = analyzer.findTradingOpportunities(
            parameters.zScoreThreshold,
            parameters.lookbackWindow || 30
        );
        
        // Calculate crypto-focused metrics
        const startRatio = data[15].eth_price / data[15].btc_price; // After lookback
        const endRatio = data[data.length - 1].eth_price / data[data.length - 1].btc_price;
        
        // Simulate crypto accumulation
        const startingBTC = 0.01540; // Example starting portfolio in BTC terms
        const buyHoldBTC = startingBTC * (0.5 + 0.5 * (endRatio / startRatio));
        const strategyBTC = startingBTC * (1 + backtest.strategyReturnPercent / 100);
        
        // Handle edge cases where calculations might result in NaN or division by zero
        let cryptoOutperformance = 0;
        if (buyHoldBTC > 0 && !isNaN(buyHoldBTC) && !isNaN(strategyBTC)) {
            cryptoOutperformance = ((strategyBTC - buyHoldBTC) / buyHoldBTC) * 100;
        } else {
            console.warn('[BACKTEST API] Invalid crypto accumulation calculation:', {
                startRatio, endRatio, buyHoldBTC, strategyBTC, strategyReturn: backtest.strategyReturnPercent
            });
            // Fallback: use strategy return as approximation
            cryptoOutperformance = backtest.strategyReturnPercent || 0;
        }
        
        // Ensure result is a valid number
        if (isNaN(cryptoOutperformance)) {
            cryptoOutperformance = 0;
        }
        
        const response = {
            timestamp: new Date().toISOString(),
            parameters: {
                rebalanceThreshold: `${(parameters.rebalanceThreshold * 100).toFixed(2)}%`,
                transactionCost: `${(parameters.transactionCost * 100).toFixed(2)}%`,
                zScoreThreshold: parameters.zScoreThreshold.toFixed(3)
            },
            dataInfo: {
                totalDays: data.length,
                startDate: data[0].date,
                endDate: data[data.length - 1].date,
                backtestPeriod: `${data.length - 15} trading days`
            },
            performance: {
                strategyReturn: `${backtest.strategyReturnPercent.toFixed(2)}%`,
                benchmarkReturn: `${backtest.buyHoldReturnPercent.toFixed(2)}%`,
                excessReturn: `${(backtest.strategyReturnPercent - backtest.buyHoldReturnPercent).toFixed(2)}%`,
                sharpeRatio: backtest.sharpeRatio.toFixed(3),
                maxDrawdown: `${Math.abs(backtest.maxDrawdownPercent).toFixed(2)}%`,
                totalTrades: backtest.numTrades
            },
            cryptoAccumulation: {
                startingBTC: startingBTC.toFixed(6),
                strategyBTC: strategyBTC.toFixed(6),
                buyHoldBTC: buyHoldBTC.toFixed(6),
                cryptoGained: `${((strategyBTC - startingBTC) * 100000).toFixed(0)} sats`,
                cryptoOutperformance: `${cryptoOutperformance.toFixed(2)}%`
            },
            opportunities: {
                total: opportunities.length,
                profitable: opportunities.filter(o => o.pnlPercent > 0).length,
                winRate: opportunities.length > 0 ? 
                    `${(opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length * 100).toFixed(1)}%` : 
                    '0%',
                avgReturn: opportunities.length > 0 ? 
                    `${(opportunities.reduce((sum, o) => sum + o.pnlPercent, 0) / opportunities.length).toFixed(2)}%` : 
                    '0%'
            },
            summary: {
                isProfit: backtest.strategyReturnPercent > 0,
                beatsBenchmark: backtest.strategyReturnPercent > backtest.buyHoldReturnPercent,
                cryptoAccumulated: strategyBTC > startingBTC,
                recommendation: backtest.strategyReturnPercent > backtest.buyHoldReturnPercent ? 
                    'Strategy outperforms - Recommended for live trading' :
                    'Strategy underperforms - Consider parameter optimization'
            },
            portfolioEvolution: {
                // Complete portfolio evolution for charting (sample every 5th day to show more detail)
                dates: backtest.portfolio.filter((_, i) => i % 5 === 0).map(p => p.date.toISOString().split('T')[0]),
                btcValues: backtest.portfolio.filter((_, i) => i % 5 === 0).map(p => p.totalBtcValue),
                trades: backtest.portfolio.filter(p => p.rebalanced).map(p => ({
                    date: p.date.toISOString().split('T')[0],
                    btcValue: p.totalBtcValue,
                    action: 'rebalance'
                })),
                // Debug info to see full data range
                fullDataRange: {
                    totalDays: backtest.portfolio.length,
                    startDate: backtest.portfolio[0].date.toISOString().split('T')[0],
                    endDate: backtest.portfolio[backtest.portfolio.length - 1].date.toISOString().split('T')[0],
                    totalTrades: backtest.portfolio.filter(p => p.rebalanced).length
                }
            }
        };
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ [BACKTEST API] Backtest complete in ${processingTime}ms: ${backtest.strategyReturnPercent.toFixed(2)}% return, ${backtest.numTrades} trades`);
        
        // Add performance metadata
        response.metadata = {
            processingTimeMs: processingTime,
            dataPoints: data.length,
            backtestEngine: 'ETHBTCAnalyzer',
            parameterSource: req.method === 'POST' ? 'custom' : 'mega-optimal',
            apiVersion: '1.0.0'
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ [BACKTEST API] Backtest failed:', error.message);
        console.error('❌ [BACKTEST API] Stack trace:', error.stack);
        
        // Categorize error types for better debugging
        let errorCategory = 'unknown';
        let statusCode = 500;
        
        if (error.message.includes('Invalid')) {
            errorCategory = 'parameter_validation';
            statusCode = 400;
        } else if (error.message.includes('data')) {
            errorCategory = 'data_availability';
        } else if (error.message.includes('timeout')) {
            errorCategory = 'timeout';
        } else if (error.message.includes('memory')) {
            errorCategory = 'memory_limit';
        }
        
        res.status(statusCode).json({
            error: 'Backtest failed',
            message: error.message,
            category: errorCategory,
            timestamp: new Date().toISOString(),
            suggestion: errorCategory === 'data_availability' ? 
                'Ensure historical data is available in the data directory' :
                errorCategory === 'parameter_validation' ?
                'Check parameter ranges in the API documentation' :
                'Try again with different parameters or contact support'
        });
    }
}
