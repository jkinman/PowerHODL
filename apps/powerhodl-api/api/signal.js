/**
 * Vercel Serverless Function - Signal API
 * 
 * Real-time trading signal generation endpoint
 * Uses the same SimpleStrategy as backtesting and cron jobs
 */

import { SimpleStrategy } from '../src/SimpleStrategy.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🎯 [SIGNAL API] Generating trading signal...');
        const startTime = Date.now();
        
        // Initialize simplified strategy
        const strategy = new SimpleStrategy();
        console.log(`📊 [SIGNAL API] Strategy initialized: Z-Score ±${strategy.parameters.zScoreThreshold}, ${strategy.parameters.lookbackDays}d lookback`);
        
        // Fetch market data from database
        const dbService = new DatabaseService();
        const marketHistory = await dbService.getRecentMarketData(strategy.parameters.lookbackDays + 5);
        console.log(`📊 [SIGNAL API] Retrieved ${marketHistory.length} days from database`);
        
        // Validate data availability
        if (!marketHistory || marketHistory.length < strategy.parameters.lookbackDays) {
            console.error(`❌ [SIGNAL API] Insufficient data: ${marketHistory?.length || 0} days (need ${strategy.parameters.lookbackDays})`);
            return res.status(503).json({
                error: 'Insufficient market data',
                code: 'INSUFFICIENT_DATA',
                details: `Need ${strategy.parameters.lookbackDays} days, got ${marketHistory?.length || 0}`,
                retryAfter: 300
            });
        }
        
        // Extract ratios and generate signal
        const historicalRatios = marketHistory.map(m => m.eth_btc_ratio);
        const currentRatio = marketHistory[0].eth_btc_ratio; // Most recent
        const signal = strategy.generateSignal(currentRatio, historicalRatios);
        
        // Get portfolio for allocation info
        const portfolio = await dbService.getActivePortfolio();
        let allocation = null;
        
        if (portfolio) {
            allocation = strategy.calculateAllocation(
                portfolio.eth_amount,
                portfolio.btc_amount,
                currentRatio
            );
        }
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ [SIGNAL API] Signal generated in ${executionTime}ms: ${signal.action} (confidence: ${(signal.confidence * 100).toFixed(0)}%)`);
        
        // Return structured response
        res.status(200).json({
            success: true,
            signal: {
                action: signal.action,
                shouldTrade: signal.shouldTrade,
                confidence: signal.confidence * 100, // Convert to percentage
                reasoning: signal.reasoning,
                zScore: signal.zScore,
                ethBtcRatio: signal.ethBtcRatio,
                timestamp: signal.timestamp,
                parameters: signal.parameters
            },
            portfolio: allocation ? {
                ethPercentage: allocation.ethPercentage,
                btcPercentage: allocation.btcPercentage,
                deviation: allocation.deviation,
                totalValueBTC: allocation.totalValueBTC,
                needsRebalancing: allocation.needsRebalancing
            } : null,
            market: {
                currentRatio: currentRatio,
                ethPriceUsd: marketHistory[0].eth_price_usd,
                btcPriceUsd: marketHistory[0].btc_price_usd
            },
            metadata: {
                executionTime,
                dataPoints: marketHistory.length,
                version: '3.0.0'
            }
        });
        
    } catch (error) {
        console.error('❌ [SIGNAL API] Error:', error);
        res.status(500).json({
            error: 'Signal generation failed',
            code: 'SIGNAL_ERROR',
            message: error.message
        });
    }
}