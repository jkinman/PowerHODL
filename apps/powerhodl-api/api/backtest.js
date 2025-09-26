/**
 * SIMPLIFIED Backtest API - Vercel Serverless Function
 * 
 * Uses SimpleBacktestEngine - no complex layers!
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
                        totalFeesBTC: results.metrics.totalFeesBTC
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
