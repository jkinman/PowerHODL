/**
 * Vercel Serverless Function - Backtest API
 * 
 * Strategy backtesting endpoint with parameter optimization
 */

import ETHBTCDataCollector from '../src/dataCollector.js';
import ETHBTCAnalyzer from '../src/analyzer.js';
import MegaOptimalStrategy from '../src/strategy.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            // GET: Run backtest with mega-optimal parameters
            console.log('🧪 [BACKTEST API] Running mega-optimal backtest...');
            
            const strategy = new MegaOptimalStrategy();
            const params = {
                rebalanceThreshold: strategy.parameters.rebalanceThreshold,
                transactionCost: strategy.parameters.transactionCost,
                zScoreThreshold: strategy.parameters.zScoreThreshold,
                lookbackWindow: strategy.parameters.lookbackWindow,
                volatilityFilter: strategy.parameters.volatilityFilter
            };
            
            const result = await runBacktest(params);
            return res.json(result);
            
        } else if (req.method === 'POST') {
            // POST: Run backtest with custom parameters
            console.log('🧪 [BACKTEST API] Running custom backtest...');
            
            // Extract and validate parameters
            const { parameters, useRealData = true, backtestPeriod = 'ALL' } = req.body;
            
            if (!parameters) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing parameters in request body'
                });
            }

            // Validate required parameters
            const requiredParams = ['zScoreThreshold', 'rebalanceThreshold', 'transactionCost', 'lookbackWindow'];
            const missingParams = requiredParams.filter(param => 
                parameters[param] === undefined || parameters[param] === null
            );
            
            if (missingParams.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required parameters: ${missingParams.join(', ')}`
                });
            }

            // Set defaults for optional parameters
            const backtestParams = {
                zScoreThreshold: parameters.zScoreThreshold,
                rebalanceThreshold: parameters.rebalanceThreshold,
                transactionCost: parameters.transactionCost,
                lookbackWindow: parameters.lookbackWindow,
                volatilityFilter: parameters.volatilityFilter || 0.5
            };

            const result = await runBacktest(backtestParams, useRealData, backtestPeriod);
            return res.json({
                success: true,
                data: result
            });
            
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
    } catch (error) {
        console.error('❌ [BACKTEST API] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Backtest failed',
            message: error.message
        });
    }
}

/**
 * Core backtest runner function
 */
async function runBacktest(params, useRealData = true, period = 'ALL') {
    const startTime = Date.now();
    console.log('🚀 [BACKTEST] Starting backtest with parameters:', params);
    
    // Fetch market data
    let data;
    try {
        if (useRealData) {
            console.log('📊 [BACKTEST] Fetching real market data from database...');
            const dbService = new DatabaseService();
            data = await dbService.getHistoricalData();
            
            if (!data || data.length === 0) {
                throw new Error('No historical data found in database');
            }
            
            console.log(`📈 [BACKTEST] Retrieved ${data.length} data points from database`);
        } else {
            throw new Error('Using cached data');
        }
    } catch (error) {
        console.log('📥 [BACKTEST] Database unavailable, using cached data...');
        const collector = new ETHBTCDataCollector();
        data = await collector.loadData('eth_btc_data_2025-09-24.json');
        console.log(`📈 [BACKTEST] Loaded ${data.length} data points from cache`);
    }
    
    // Validate data
    if (!data || data.length < params.lookbackWindow + 10) {
        throw new Error(`Insufficient data: need at least ${params.lookbackWindow + 10} days, got ${data?.length || 0}`);
    }
    
    // Filter data by period if specified
    if (period !== 'ALL') {
        const daysToKeep = parseInt(period);
        if (!isNaN(daysToKeep) && daysToKeep > 0) {
            data = data.slice(-daysToKeep);
            console.log(`📅 [BACKTEST] Using last ${daysToKeep} days of data`);
        }
    }
    
    // Run backtest analysis using UNIFIED TRADING ENGINE
    const analyzer = new ETHBTCAnalyzer(data);
    const backtest = analyzer.backtestStrategyUnified(
        params.rebalanceThreshold, 
        params.transactionCost,
        params.zScoreThreshold,
        params.lookbackWindow
    );
    
    // Calculate crypto accumulation metrics (close field is ETH/BTC ratio)
    const initialUSD = 1000; // Starting with $1000
    const initialRatio = data[0].close; // ETH/BTC ratio at start
    const finalRatio = data[data.length - 1].close; // ETH/BTC ratio at end
    
    // Assuming we started with equal value split: $500 ETH + $500 BTC equivalent
    const initialBTCValue = 0.5; // In BTC terms (half our value)
    const strategyBTCValue = backtest.finalPortfolio?.totalBtcValue || (backtest.portfolioValue || initialUSD) / 1000; // Convert to BTC terms
    const buyHoldBTCValue = initialBTCValue; // If we just held BTC
    const cryptoOutperformance = ((strategyBTCValue - buyHoldBTCValue) / buyHoldBTCValue) * 100;
    
    // Extract trading opportunities for analysis
    const opportunities = (backtest.portfolio || [])
        .filter(day => day.rebalanced)
        .map(day => ({
            date: day.date || new Date(),
            action: day.action || 'rebalance',
            pnlPercent: day.pnlPercent || 0,
            btcValue: day.totalBtcValue || day.portfolioValue || 0
        }));
    
    // Build comprehensive response
    const response = {
        type: 'backtest',
        parameters: params,
        result: {
            performance: {
                btcGrowthPercent: cryptoOutperformance,
                totalTrades: backtest.numTrades,
                sharpeRatio: backtest.sharpeRatio || 0,
                maxDrawdown: Math.abs(backtest.maxDrawdownPercent || 0),
                winRate: opportunities.length > 0 ? 
                    (opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length * 100) : 0
            },
            portfolioHistory: backtest.portfolio?.map(p => ({
                timestamp: (p.date || new Date()).toISOString ? (p.date || new Date()).toISOString() : new Date().toISOString(),
                totalValueBTC: p.totalBtcValue || p.portfolioValue || 0,
                btcAmount: p.btcAmount || p.btc || 0,
                ethAmount: p.ethAmount || p.eth || 0,
                trades: p.rebalanced ? 1 : 0
            })) || [],
            finalPortfolio: {
                totalValueBTC: strategyBTCValue,
                btcAmount: backtest.portfolio?.[backtest.portfolio.length - 1]?.btcAmount || 0,
                ethAmount: backtest.portfolio?.[backtest.portfolio.length - 1]?.ethAmount || 0
            }
        },
        metadata: {
            processingTimeMs: Date.now() - startTime,
            dataPoints: data.length,
            backtestEngine: 'ETHBTCAnalyzer',
            version: '2.0.0',
            period: period,
            useRealData: useRealData
        }
    };
    
    console.log(`✅ [BACKTEST] Complete in ${response.metadata.processingTimeMs}ms: ${cryptoOutperformance.toFixed(2)}% BTC growth`);
    return response;
}
