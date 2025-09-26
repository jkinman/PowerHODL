/**
 * Vercel Serverless Function - Signal API
 * 
 * Real-time trading signal generation endpoint
 */

import MegaOptimalStrategy from '../src/strategy.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';
import ETHBTCDataCollector from '../src/dataCollector.js';
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
        if (!data || data.length < strategy.parameters.lookbackWindow) {
            console.error(`❌ [SIGNAL API] Insufficient data: ${data?.length || 0} days (need ${strategy.parameters.lookbackWindow})`);
            return res.status(503).json({
                error: 'Insufficient market data',
                code: 'INSUFFICIENT_DATA',
                details: `Need ${strategy.parameters.lookbackWindow} days, got ${data?.length || 0}`,
                retryAfter: 300
            });
        }
        
        // Generate signal
        const signal = strategy.generateSignal(data);
        const executionTime = Date.now() - startTime;
        
        console.log(`✅ [SIGNAL API] Signal generated in ${executionTime}ms: ${signal.type} (confidence: ${signal.confidence}%)`);
        
        // Return structured response
        res.status(200).json({
            success: true,
            signal: {
                type: signal.type,
                confidence: signal.confidence,
                reason: signal.reason,
                zScore: signal.zScore,
                ratio: signal.ratio,
                timestamp: new Date().toISOString(),
                parameters: {
                    zScoreThreshold: strategy.parameters.zScoreThreshold,
                    lookbackWindow: strategy.parameters.lookbackWindow,
                    rebalanceThreshold: strategy.parameters.rebalanceThreshold
                }
            },
            metadata: {
                executionTime,
                dataPoints: data.length,
                version: '2.0.0'
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
