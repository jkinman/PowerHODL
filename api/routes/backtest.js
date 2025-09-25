/**
 * Backtest Route Handler
 * 
 * Strategy backtesting endpoint with parameter optimization
 */

import express from 'express';
import ETHBTCDataCollector from '../../src/dataCollector.js';
import ETHBTCAnalyzer from '../../src/analyzer.js';
import MegaOptimalStrategy from '../../src/strategy.js';
import { DatabaseService } from '../../lib/services/DatabaseService.js';

const router = express.Router();

/**
 * GET /api/backtest
 * 
 * Run backtest with mega-optimal parameters
 */
router.get('/', async (req, res, next) => {
    try {
        console.log('🧪 [BACKTEST API] Running mega-optimal backtest...');
        
        // Use mega-optimal parameters
        const strategy = new MegaOptimalStrategy();
        const params = {
            rebalanceThreshold: strategy.parameters.rebalanceThreshold,
            transactionCost: strategy.parameters.transactionCost,
            zScoreThreshold: strategy.parameters.zScoreThreshold
        };
        
        const result = await runBacktest(params);
        res.json(result);
        
    } catch (error) {
        console.error('❌ [BACKTEST API] GET Error:', error);
        next(error);
    }
});

/**
 * POST /api/backtest
 * 
 * Run backtest with custom parameters
 */
router.post('/', async (req, res, next) => {
    try {
        console.log('🧪 [BACKTEST API] Running custom backtest...');
        
        // Extract and validate parameters
        const { rebalanceThreshold, transactionCost, zScoreThreshold, backtestPeriod } = req.body;
        
        // Parameter validation
        const validationErrors = [];
        
        if (typeof rebalanceThreshold !== 'number' || rebalanceThreshold < 0 || rebalanceThreshold > 1) {
            validationErrors.push('rebalanceThreshold must be between 0 and 1');
        }
        
        if (typeof transactionCost !== 'number' || transactionCost < 0 || transactionCost > 0.1) {
            validationErrors.push('transactionCost must be between 0 and 0.1 (10%)');
        }
        
        if (typeof zScoreThreshold !== 'number' || zScoreThreshold < 0.1 || zScoreThreshold > 5) {
            validationErrors.push('zScoreThreshold must be between 0.1 and 5.0');
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Parameter validation failed',
                details: validationErrors
            });
        }
        
        console.log('📊 [BACKTEST API] Parameters validated:', { rebalanceThreshold, transactionCost, zScoreThreshold });
        
        const params = { rebalanceThreshold, transactionCost, zScoreThreshold, backtestPeriod };
        const result = await runBacktest(params);
        res.json(result);
        
    } catch (error) {
        console.error('❌ [BACKTEST API] POST Error:', error);
        next(error);
    }
});

/**
 * Core backtest logic (shared between GET and POST)
 */
async function runBacktest(params) {
    const startTime = Date.now();
    const { rebalanceThreshold, transactionCost, zScoreThreshold, backtestPeriod } = params;
    
    console.log('🔄 [BACKTEST API] Loading historical data...');
    
    // Load historical data
    let data;
    try {
        const dbService = new DatabaseService();
        
        // Determine how many days to request
        let requestedDays;
        if (backtestPeriod === "ALL") {
            requestedDays = 2000; // All available data
        } else if (backtestPeriod) {
            requestedDays = parseInt(backtestPeriod) || 365; // Default 1 year
        } else {
            requestedDays = 2000; // Default to all data for GET requests
        }
        
        const dbData = await dbService.getRecentMarketData(requestedDays);
        console.log(`📊 [BACKTEST API] Loaded ${dbData.length} days from database (requested: ${requestedDays} days)`);
        
        if (dbData.length === 0) {
            throw new Error('No historical data available in database');
        }
        
        // Convert database format to backtest format
        data = dbData.map(d => ({
            date: new Date(d.collected_at),
            high: d.eth_price_usd / d.btc_price_usd,
            low: d.eth_price_usd / d.btc_price_usd,
            open: d.eth_price_usd / d.btc_price_usd,
            close: d.eth_price_usd / d.btc_price_usd, // ETH/BTC ratio
            volume: 1000 // Placeholder
        }));
        
    } catch (dbError) {
        console.error('❌ [BACKTEST API] Database error:', dbError);
        console.log('📥 [BACKTEST API] Falling back to cached data...');
        
        // Fallback to cached data
        const collector = new ETHBTCDataCollector();
        data = await collector.loadData('eth_btc_data_2025-09-24.json');
        console.log(`📊 [BACKTEST API] Loaded ${data.length} days from cache`);
    }
    
    if (data.length === 0) {
        throw new Error('No historical data available from any source');
    }
    
    console.log(`🧪 [BACKTEST API] Running backtest with ${data.length} days of data...`);
    
    // Initialize analyzer and run backtest
    const analyzer = new ETHBTCAnalyzer(data);
    const backtest = analyzer.backtest({
        rebalanceThreshold,
        transactionCost,
        zScoreThreshold,
        lookbackWindow: 15,
        enableTrading: true
    });
    
    console.log(`📊 [BACKTEST API] Backtest completed: ${backtest.strategyReturnPercent.toFixed(2)}% return, ${backtest.numTrades} trades`);
    
    // Calculate crypto accumulation metrics
    const startRatio = data[0].close;
    const endRatio = data[data.length - 1].close;
    const startingBTC = 0.01540; // Example starting portfolio in BTC terms
    const buyHoldBTC = startingBTC * (0.5 + 0.5 * (endRatio / startRatio));
    const strategyBTC = startingBTC * (1 + backtest.strategyReturnPercent / 100);
    
    // Calculate crypto outperformance (how much more BTC vs 50/50 portfolio)
    let cryptoOutperformance;
    if (buyHoldBTC > 0 && !isNaN(buyHoldBTC) && !isNaN(strategyBTC)) {
        cryptoOutperformance = ((strategyBTC - buyHoldBTC) / buyHoldBTC) * 100;
        
        // Final NaN check
        if (isNaN(cryptoOutperformance)) {
            console.warn('⚠️ [BACKTEST API] cryptoOutperformance is NaN, using strategyReturnPercent as fallback');
            cryptoOutperformance = backtest.strategyReturnPercent;
        }
    } else {
        console.warn(`⚠️ [BACKTEST API] Invalid BTC calculations: buyHoldBTC=${buyHoldBTC}, strategyBTC=${strategyBTC}`);
        cryptoOutperformance = backtest.strategyReturnPercent;
    }
    
    // Generate trading opportunities
    const opportunities = backtest.trades?.map(trade => ({
        date: trade.date,
        action: trade.action,
        pnlPercent: trade.pnl || 0
    })) || [];
    
    // Build comprehensive response
    const response = {
        timestamp: new Date().toISOString(),
        parameters: {
            rebalanceThreshold,
            transactionCost,
            zScoreThreshold,
            lookbackWindow: 15
        },
        dataInfo: {
            totalDays: data.length,
            startDate: data[0].date.toISOString().split('T')[0],
            endDate: data[data.length - 1].date.toISOString().split('T')[0],
            dataSource: 'historical'
        },
        performance: {
            strategyReturn: `${backtest.strategyReturnPercent.toFixed(2)}%`,
            benchmarkReturn: `${backtest.benchmarkReturnPercent.toFixed(2)}%`,
            excessReturn: `${(backtest.strategyReturnPercent - backtest.benchmarkReturnPercent).toFixed(2)}%`,
            volatility: `${(backtest.volatility || 0).toFixed(2)}%`,
            sharpeRatio: (backtest.sharpeRatio || 0).toFixed(2),
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
                '0.0%'
        },
        recommendation: {
            suitable: cryptoOutperformance > 0,
            reason: cryptoOutperformance > 0 ? 
                'Strategy outperforms - Recommended for live trading' :
                'Strategy underperforms - Consider parameter optimization'
        },
        portfolioEvolution: {
            // Complete portfolio evolution for charting (sample every 5th day)
            dates: backtest.portfolio.filter((_, i) => i % 5 === 0).map(p => p.date.toISOString().split('T')[0]),
            btcValues: backtest.portfolio.filter((_, i) => i % 5 === 0).map(p => p.totalBtcValue),
            trades: backtest.portfolio.filter(p => p.rebalanced).map(p => ({
                date: p.date.toISOString().split('T')[0],
                btcValue: p.totalBtcValue,
                action: 'rebalance'
            })),
            // Debug info
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
        version: '2.0.0'
    };
    
    return response;
}

export default router;
