/**
 * Vercel Serverless Function - Portfolio API
 * 
 * Portfolio management and status endpoint
 */

import { DatabaseService } from '../lib/services/DatabaseService.js';
import { SimpleStrategy } from '../src/SimpleStrategy.js';
import { ethers } from 'ethers';

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
        
        // Get current portfolio state from REAL wallet/exchange (PRIMARY SOURCE)
        let currentPortfolio;
        let portfolioSource = 'unknown';
        
        try {
            // PRIMARY: Get real wallet balances directly from wallet/exchange
                const { TradeExecutionService } = await import('../lib/services/TradeExecutionService.js');
                const { ModernMetaMaskService } = await import('../lib/services/ModernMetaMaskService.js');
                
                const tradingMode = process.env.TRADING_MODE || 'simulation';
                let walletBalances;
                
                if (tradingMode === 'metamask') {
                    const metaMaskService = new ModernMetaMaskService();
                    walletBalances = await metaMaskService.getWalletBalances();
                    portfolioSource = 'metamask';
                } else {
                    const tradeService = new TradeExecutionService();
                    walletBalances = await tradeService.getAccountBalance();
                    portfolioSource = 'exchange';
                }
                
                // Convert wallet balances to portfolio format
                const ethAmount = tradingMode === 'metamask' 
                    ? parseFloat(ethers.formatEther(walletBalances.ETH || 0))
                    : walletBalances.ETH?.total || 0;
                const btcAmount = tradingMode === 'metamask'
                    ? parseFloat(ethers.formatUnits(walletBalances.WBTC || 0, 8))
                    : walletBalances.BTC?.total || 0;
                    
                // Get current market data for conversion
                const { MarketDataService } = await import('../lib/services/MarketDataService.js');
                const marketService = new MarketDataService();
                let ethBtcRatio = 0.037; // Fallback ratio
                
                try {
                    const marketData = await marketService.getCurrentMarketData();
                    ethBtcRatio = marketData.ethBtcRatio;
                } catch (marketError) {
                    console.warn('Could not fetch current market data, using fallback ratio');
                }
                
                const ethValueBTC = ethAmount * ethBtcRatio;
                
                currentPortfolio = {
                    totalValueBTC: btcAmount + ethValueBTC,
                    btcAmount: btcAmount,
                    ethAmount: ethAmount,
                    ethValueBTC: ethValueBTC,
                    lastUpdated: new Date().toISOString()
                };
                
                console.log(`✅ [PORTFOLIO API] Using real wallet balances from ${portfolioSource}`);
        } catch (walletError) {
            console.error('❌ [PORTFOLIO API] Could not access real wallet:', walletError.message);
            
            // NO DATABASE FALLBACK - Portfolio balances should ONLY come from wallet
            // Database is for trade history, not current balances
            throw new Error(`Unable to fetch real portfolio balances from wallet: ${walletError.message}`);
        }
        
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
        const strategy = new SimpleStrategy();
        
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
                timestamp: new Date().toISOString(),
                portfolioSource: portfolioSource // Track where portfolio data came from
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
