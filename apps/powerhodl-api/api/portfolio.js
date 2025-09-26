/**
 * Vercel Serverless Function - Portfolio API
 * 
 * Portfolio management and status endpoint
 */

import { DatabaseService } from '../lib/services/DatabaseService.js';
import MegaOptimalStrategy from '../src/strategy.js';

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
        console.log('💼 [PORTFOLIO API] Fetching portfolio status...');
        const startTime = Date.now();
        
        // Initialize database service
        const dbService = new DatabaseService();
        
        // Get current portfolio state (mock for now)
        const currentPortfolio = {
            totalValueBTC: 0.485,
            btcAmount: 0.285,
            ethAmount: 5.714,
            ethValueBTC: 0.200,
            lastUpdated: new Date().toISOString()
        };
        
        // Get recent trades
        let recentTrades = [];
        let tradesError = null;
        try {
            recentTrades = await dbService.getRecentTrades(10);
        } catch (error) {
            console.error('❌ [PORTFOLIO API] Could not fetch trades from database:', error.message);
            tradesError = error.message;
            recentTrades = []; // Return empty array - no mock data
        }
        
        // Get current strategy parameters
        const strategy = new MegaOptimalStrategy();
        
        // Calculate performance metrics
        const initialValue = 0.5; // Starting BTC value
        const currentValue = currentPortfolio.totalValueBTC;
        const growthPercent = ((currentValue - initialValue) / initialValue) * 100;
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ [PORTFOLIO API] Portfolio status retrieved in ${executionTime}ms`);
        
        // Build response
        const response = {
            success: true,
            portfolio: {
                current: currentPortfolio,
                performance: {
                    totalValueBTC: currentValue,
                    growthPercent: growthPercent,
                    dayChange: 0, // Would need historical data
                    allTimeHigh: currentValue,
                    allTimeLow: initialValue
                },
                allocation: {
                    btc: {
                        amount: currentPortfolio.btcAmount,
                        percentage: (currentPortfolio.btcAmount / currentValue) * 100,
                        valueInBTC: currentPortfolio.btcAmount
                    },
                    eth: {
                        amount: currentPortfolio.ethAmount,
                        percentage: (currentPortfolio.ethValueBTC / currentValue) * 100,
                        valueInBTC: currentPortfolio.ethValueBTC
                    }
                }
            },
            recentTrades: recentTrades,
            strategy: {
                name: 'Mega Optimal',
                parameters: strategy.parameters,
                status: 'active'
            },
            metadata: {
                executionTime,
                version: '2.0.0',
                timestamp: new Date().toISOString()
            },
            warnings: tradesError ? [`Unable to fetch trade history: ${tradesError}`] : []
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ [PORTFOLIO API] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Portfolio fetch failed',
            message: error.message
        });
    }
}
