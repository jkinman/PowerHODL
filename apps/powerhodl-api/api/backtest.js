/**
 * SIMPLIFIED Backtest API - Vercel Serverless Function
 * 
 * Uses SimpleBacktestEngine - no complex layers!
 * 
 * CRITICAL CONCEPTS:
 * 
 * 1. PARAMETER NORMALIZATION
 *    - Frontend might send different parameter names (historical baggage)
 *    - Always normalize to consistent internal names
 *    - rebalancePercent = rebalanceThreshold = deviation from 50/50
 *    - lookbackDays = lookbackWindow = Z-score calculation period
 * 
 * 2. REAL DATA ONLY
 *    - useRealData should ALWAYS be true in production
 *    - Test data was only for initial development
 *    - Real market behavior can't be simulated accurately
 * 
 * 3. BACKTEST PERIODS
 *    - 30 days = recent market behavior
 *    - 365 days = full year including seasonality
 *    - "ALL" = 4+ years to test different market regimes
 * 
 * 4. PERFORMANCE METRICS
 *    - btcGrowthPercent = primary metric (BTC accumulation) [[memory:9297280]]
 *    - tokenAccumulationPercent = total tokens (BTC + ETH) growth
 *    - totalFeesBTC = critical to track fee impact
 *    - trades array = for debugging and optimization
 * 
 * 5. FEE IMPACT IS CRITICAL
 *    - Every trade costs money
 *    - Too many trades = negative returns guaranteed
 *    - The optimizer must balance opportunity vs. costs
 */

import { SimpleBacktestEngine } from '../src/SimpleBacktestEngine.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const startTime = Date.now();

    try {
        let params, useRealData, backtestPeriod;

        if (req.method === 'GET') {
            // GET: Use default parameters
            params = {
                zScoreThreshold: 1.258,
                rebalanceThreshold: 49.79,
                transactionCost: 1.66,
                lookbackWindow: 15
            };
            useRealData = true;
            backtestPeriod = 30;

        } else if (req.method === 'POST') {
            // POST: Use custom parameters
            const body = req.body;
            
            if (!body.parameters) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing parameters in request body'
                });
            }

            params = body.parameters;
            useRealData = body.useRealData !== false;
            // Handle "ALL" or other non-numeric periods
            if (body.backtestPeriod === 'ALL') {
                backtestPeriod = 365 * 4; // 4 years of data
            } else {
                backtestPeriod = parseInt(body.backtestPeriod) || 30;
            }
        }

        console.log('🚀 [SIMPLE BACKTEST] Starting:', { params, useRealData, backtestPeriod });

        // Fetch real data from database
        const dbService = new DatabaseService();
        const rawData = await dbService.getHistoricalData(backtestPeriod);
        
        if (!rawData || rawData.length === 0) {
            throw new Error('No historical data available');
        }

        // Normalize data
        const marketData = SimpleBacktestEngine.normalizeMarketData(rawData);
        console.log(`✅ [SIMPLE BACKTEST] Processing ${marketData.length} data points`);

        // Convert parameters to SimpleBacktestEngine format
        const engineParams = {
            zScoreThreshold: params.zScoreThreshold || 1.5,
            rebalancePercent: params.rebalancePercent || params.rebalanceThreshold || 10,
            transactionCost: params.transactionCost || 0.1,
            lookbackDays: params.lookbackWindow || 15,
            maxAllocationShift: params.maxAllocationShift || 0.3 // Max 80/20 or 20/80 allocation
        };

        // Run the backtest
        const results = SimpleBacktestEngine.runBacktest(marketData, engineParams);

        // Format response
        const response = {
            success: true,
            data: {
                type: 'backtest',
                parameters: params,
                result: {
                    performance: {
                        btcGrowthPercent: results.metrics.totalReturnPercent,
                        tokenAccumulationPercent: results.metrics.tokenAccumulationPercent,
                        totalTrades: results.metrics.totalTrades,
                        sharpeRatio: results.metrics.sharpeRatio,
                        maxDrawdown: results.metrics.maxDrawdown,
                        totalFeesBTC: results.metrics.totalFeesBTC,
                        winRate: results.metrics.winRate,
                        winningTrades: results.metrics.winningTrades,
                        losingTrades: results.metrics.losingTrades,
                        avgWinBTC: results.metrics.avgWinBTC,
                        avgLossBTC: results.metrics.avgLossBTC,
                        profitFactor: results.metrics.profitFactor,
                        maxConsecutiveLosses: results.metrics.maxConsecutiveLosses
                    },
                    trades: results.trades.map(t => ({
                        timestamp: t.timestamp,
                        action: t.action,
                        zScore: t.zScore,
                        ratio: t.ratio,
                        ethAmount: t.ethAmount,
                        btcAmount: t.btcAmount,
                        fees: t.fees,
                        targetAllocation: t.targetAllocation,
                        portfolioValueBefore: t.portfolioValueBefore,
                        portfolioValueAfter: t.portfolioValueAfter
                    })),
                    portfolioHistory: results.portfolioHistory.map(p => ({
                        timestamp: p.timestamp,
                        totalValueBTC: p.totalValueBTC,
                        btcAmount: p.btcAmount,
                        ethAmount: p.ethAmount,
                        ethPercentage: p.ethPercentage,
                        zScore: p.zScore
                    })),
                    finalPortfolio: {
                        totalValueBTC: results.portfolioHistory[results.portfolioHistory.length - 1].totalValueBTC,
                        btcAmount: results.portfolio.btcAmount,
                        ethAmount: results.portfolio.ethAmount
                    }
                },
                metadata: {
                    processingTimeMs: Date.now() - startTime,
                    dataPoints: marketData.length,
                    backtestEngine: 'SimpleBacktestEngine',
                    version: '3.0.0',
                    period: backtestPeriod,
                    useRealData: useRealData,
                    actualDataSource: 'database'
                }
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ [SIMPLE BACKTEST] Error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Backtest failed',
            message: error.message,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }
        });
    }
}
