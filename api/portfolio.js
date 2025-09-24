/**
 * ETH/BTC Portfolio Management API - Vercel Serverless Function
 * 
 * ENDPOINTS:
 * - GET  /api/portfolio: Get current portfolio status and trading signal
 * - POST /api/portfolio: Initialize portfolio or execute trades
 * 
 * DESCRIPTION:
 * Comprehensive portfolio management system for ETH/BTC trading.
 * Tracks balances, calculates portfolio value, executes trades, and provides
 * real-time trading signals integrated with the mega-optimal strategy.
 * 
 * IMPORTANT NOTE:
 * This is a DEMO implementation using in-memory state. In production,
 * you would integrate with:
 * - Database (PostgreSQL, MongoDB) for persistent state
 * - Exchange APIs (Binance, Kraken) for real balances
 * - Secure key management (AWS KMS, HashiCorp Vault)
 * - Transaction logging and audit trails
 * 
 * GET REQUEST - Portfolio Status:
 * Returns current balances, allocation, market data, and trading signal
 * 
 * POST REQUEST ACTIONS:
 * 
 * 1. Initialize Portfolio:
 * {
 *   "action": "initialize",
 *   "ethAmount": 0.5,
 *   "btcAmount": 0.01
 * }
 * 
 * 2. Execute Trade:
 * {
 *   "action": "trade",
 *   "executeTrade": true
 * }
 * 
 * RESPONSE STRUCTURE (GET):
 * {
 *   timestamp: string,
 *   portfolio: {
 *     ethAmount: string,           // ETH balance
 *     btcAmount: string,           // BTC balance
 *     ethValueBTC: string,         // ETH value in BTC terms
 *     totalValueBTC: string,       // Total portfolio value in BTC
 *     allocation: {
 *       ethPercent: string,        // ETH allocation percentage
 *       btcPercent: string         // BTC allocation percentage
 *     }
 *   },
 *   currentMarket: {
 *     ethBtcRatio: string,         // Current ETH/BTC price ratio
 *     ethPrice: number,            // ETH price in USD
 *     btcPrice: number             // BTC price in USD
 *   },
 *   signal: {
 *     action: string,              // Trading action recommendation
 *     shouldTrade: boolean,        // Whether to execute trade
 *     zScore: string,              // Current Z-score
 *     confidence: string           // Signal confidence percentage
 *   },
 *   stats: {
 *     totalTrades: number,         // Number of trades executed
 *     lastUpdate: string           // Last portfolio update timestamp
 *   }
 * }
 * 
 * TRADE EXECUTION RESPONSE (POST):
 * {
 *   message: string,             // Success/failure message
 *   trade: {
 *     action: string,             // Trade action executed
 *     zScore: string,             // Z-score at execution
 *     tradeValueBTC: string,      // Trade size in BTC
 *     feesBTC: string             // Trading fees in BTC
 *   },
 *   newPortfolio: {
 *     ethAmount: string,          // New ETH balance
 *     btcAmount: string,          // New BTC balance
 *     totalValueBTC: string       // New total value in BTC
 *   },
 *   timestamp: string
 * }
 * 
 * ERROR RESPONSES:
 * - 400: Invalid request body or uninitialized portfolio
 * - 405: Method not allowed (non-GET/POST requests)
 * - 500: Portfolio operation failure
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Check portfolio status:
 *    GET /api/portfolio
 * 
 * 2. Initialize new portfolio:
 *    POST /api/portfolio
 *    {
 *      "action": "initialize",
 *      "ethAmount": 1.5,
 *      "btcAmount": 0.05
 *    }
 * 
 * 3. Execute automated trade:
 *    POST /api/portfolio
 *    {
 *      "action": "trade",
 *      "executeTrade": true
 *    }
 * 
 * 4. Trading bot integration:
 *    const portfolio = await fetch('/api/portfolio').then(r => r.json());
 *    if (portfolio.signal.shouldTrade && portfolio.signal.confidence > '70%') {
 *      await fetch('/api/portfolio', {
 *        method: 'POST',
 *        headers: { 'Content-Type': 'application/json' },
 *        body: JSON.stringify({ action: 'trade', executeTrade: true })
 *      });
 *    }
 * 
 * SECURITY CONSIDERATIONS:
 * - In production, implement authentication (JWT, API keys)
 * - Use HTTPS only for all portfolio operations
 * - Rate limiting to prevent abuse
 * - Input validation and sanitization
 * - Audit logging for all trades
 * 
 * @author ETH/BTC Trading System
 * @version 1.0.0
 * @since 2024-09-24
 */

import MegaOptimalStrategy from '../src/strategy.js';
import ETHBTCDataCollector from '../src/dataCollector.js';

/**
 * DEMO PORTFOLIO STATE - In-Memory Storage
 * 
 * ⚠️  WARNING: This is for demonstration only!
 * 
 * In production, replace with:
 * - Database connection (PostgreSQL, MongoDB)
 * - Exchange API integration (Binance, Kraken)
 * - Secure state management
 * - User authentication and authorization
 * 
 * @type {Object} portfolioState - Demo portfolio state
 * @property {number} ethAmount - ETH balance
 * @property {number} btcAmount - BTC balance
 * @property {boolean} initialized - Whether portfolio is initialized
 * @property {string|null} lastUpdate - Last update timestamp
 */
let portfolioState = {
    ethAmount: 0.2000,
    btcAmount: 0.0077,
    initialized: false,
    lastUpdate: null,
    tradeHistory: [],
    createdAt: new Date().toISOString()
};

/**
 * Vercel serverless function handler for portfolio management
 * 
 * @param {Object} req - Vercel request object
 * @param {string} req.method - HTTP method (GET or POST)
 * @param {Object} req.body - Request body for POST operations
 * @param {string} req.body.action - Action type ('initialize' or 'trade')
 * @param {number} req.body.ethAmount - ETH amount for initialization
 * @param {number} req.body.btcAmount - BTC amount for initialization
 * @param {boolean} req.body.executeTrade - Whether to execute trade
 * @param {Object} res - Vercel response object
 * @returns {Promise<void>} JSON response with portfolio data or error
 * 
 * @example
 * // GET /api/portfolio - Get current status
 * // POST /api/portfolio - Initialize or trade
 * 
 * @throws {400} Invalid request - Missing parameters or uninitialized portfolio
 * @throws {405} Method not allowed - Only GET and POST accepted
 * @throws {500} Operation failure - Portfolio or market data error
 */
export default async function handler(req, res) {
    // Set CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log(`💼 [PORTFOLIO API] ${req.method} request received`);
        const startTime = Date.now();
        
        // Initialize core components
        const strategy = new MegaOptimalStrategy();
        const collector = new ETHBTCDataCollector();
        
        if (req.method === 'GET') {
            // GET: Return comprehensive portfolio status with trading signal
            console.log('📊 [PORTFOLIO API] Getting portfolio status...');
            
            // Load current market data for signal generation
            let data;
            try {
                data = await collector.loadData('eth_btc_data_2025-09-24.json');
                console.log(`📊 [PORTFOLIO API] Loaded ${data.length} days of market data`);
            } catch (error) {
                throw new Error(`Unable to load market data: ${error.message}`);
            }
            
            const latestData = data[data.length - 1];
            const currentRatio = latestData.eth_price / latestData.btc_price;
            
            // Check if portfolio is initialized and has balances
            if (portfolioState.initialized && (portfolioState.ethAmount > 0 || portfolioState.btcAmount > 0)) {
                // Initialize strategy with current portfolio balances
                strategy.initialize(portfolioState.ethAmount, portfolioState.btcAmount);
                console.log(`💰 [PORTFOLIO API] Portfolio: ${portfolioState.ethAmount.toFixed(4)} ETH + ${portfolioState.btcAmount.toFixed(6)} BTC`);
                
                const status = strategy.getPortfolioStatus(currentRatio);
                const historicalRatios = data.map(d => d.eth_price / d.btc_price);
                const signal = strategy.getSignal(currentRatio, historicalRatios);
                
                const response = {
                    timestamp: new Date().toISOString(),
                    portfolio: {
                        ethAmount: status.ethAmount.toFixed(4),
                        btcAmount: status.btcAmount.toFixed(6),
                        ethValueBTC: status.ethValueBTC.toFixed(6),
                        totalValueBTC: status.totalValueBTC.toFixed(6),
                        allocation: {
                            ethPercent: `${(status.ethPercent * 100).toFixed(1)}%`,
                            btcPercent: `${(status.btcPercent * 100).toFixed(1)}%`
                        }
                    },
                    currentMarket: {
                        ethBtcRatio: currentRatio.toFixed(6),
                        ethPrice: latestData.eth_price,
                        btcPrice: latestData.btc_price
                    },
                    signal: {
                        action: signal.action,
                        shouldTrade: signal.shouldTrade,
                        zScore: signal.zScore.toFixed(4),
                        confidence: `${(signal.confidence * 100).toFixed(1)}%`
                    },
                    stats: {
                        totalTrades: status.totalTrades,
                        lastUpdate: portfolioState.lastUpdate
                    }
                };
                
                // Add performance metadata
                response.metadata = {
                    processingTimeMs: Date.now() - startTime,
                    portfolioInitialized: true,
                    apiVersion: '1.0.0'
                };
                
                console.log(`✅ [PORTFOLIO API] Status retrieved: ${response.portfolio.totalValueBTC} BTC total`);
                res.status(200).json(response);
                
            } else {
                console.log('⚠️ [PORTFOLIO API] Portfolio not initialized');
                res.status(200).json({
                    message: 'Portfolio not initialized - use POST to initialize',
                    initialized: false,
                    timestamp: new Date().toISOString(),
                    instructions: {
                        initialize: 'POST /api/portfolio with action: "initialize"',
                        requiredFields: ['ethAmount', 'btcAmount']
                    }
                });
            }
            
        } else if (req.method === 'POST') {
            // POST: Initialize portfolio or execute trades
            const { action, ethAmount, btcAmount, executeTrade } = req.body || {};
            
            console.log(`🛠️ [PORTFOLIO API] POST action: ${action}`);
            
            if (action === 'initialize' && ethAmount && btcAmount) {
                // Initialize portfolio with starting balances
                console.log(`🚀 [PORTFOLIO API] Initializing portfolio: ${ethAmount} ETH + ${btcAmount} BTC`);
                
                // Validate input amounts
                const ethVal = parseFloat(ethAmount);
                const btcVal = parseFloat(btcAmount);
                
                if (isNaN(ethVal) || ethVal < 0 || isNaN(btcVal) || btcVal < 0) {
                    return res.status(400).json({
                        error: 'Invalid amounts',
                        message: 'ETH and BTC amounts must be positive numbers',
                        received: { ethAmount, btcAmount }
                    });
                }
                
                // Update portfolio state
                portfolioState = {
                    ethAmount: ethVal,
                    btcAmount: btcVal,
                    initialized: true,
                    lastUpdate: new Date().toISOString(),
                    tradeHistory: [],
                    createdAt: portfolioState.createdAt || new Date().toISOString()
                };
                
                console.log(`✅ [PORTFOLIO API] Portfolio initialized successfully`);
                res.status(200).json({
                    message: 'Portfolio initialized successfully',
                    portfolio: {
                        ethAmount: portfolioState.ethAmount.toFixed(4),
                        btcAmount: portfolioState.btcAmount.toFixed(6),
                        initialized: portfolioState.initialized
                    },
                    timestamp: new Date().toISOString(),
                    nextSteps: {
                        checkStatus: 'GET /api/portfolio',
                        executeTrade: 'POST /api/portfolio with action: "trade"'
                    }
                });
                
            } else if (action === 'trade' && executeTrade) {
                // Execute trade based on current signal
                console.log('🔄 [PORTFOLIO API] Executing automated trade...');
                
                // Validate portfolio is initialized
                if (!portfolioState.initialized) {
                    return res.status(400).json({ 
                        error: 'Portfolio not initialized',
                        message: 'Initialize portfolio first with action: "initialize"',
                        requiredFields: ['ethAmount', 'btcAmount']
                    });
                }
                
                // Load market data and generate signal
                const data = await collector.loadData('eth_btc_data_2025-09-24.json');
                const latestData = data[data.length - 1];
                const currentRatio = latestData.eth_price / latestData.btc_price;
                const historicalRatios = data.map(d => d.eth_price / d.btc_price);
                
                // Initialize strategy and execute trade
                strategy.initialize(portfolioState.ethAmount, portfolioState.btcAmount);
                const signal = strategy.getSignal(currentRatio, historicalRatios);
                
                if (signal.shouldTrade) {
                    const trade = strategy.executeTrade(signal, currentRatio);
                    
                    if (trade.executed) {
                        // Update portfolio state
                        portfolioState.ethAmount = trade.ethAmountAfter;
                        portfolioState.btcAmount = trade.btcAmountAfter;
                        portfolioState.lastUpdate = new Date().toISOString();
                        
                        const newStatus = strategy.getPortfolioStatus(currentRatio);
                        
                        res.status(200).json({
                            message: 'Trade executed successfully',
                            trade: {
                                action: trade.action,
                                zScore: trade.zScore.toFixed(4),
                                tradeValueBTC: trade.tradeValueBTC.toFixed(6),
                                feesBTC: trade.feesBTC.toFixed(6)
                            },
                            newPortfolio: {
                                ethAmount: newStatus.ethAmount.toFixed(4),
                                btcAmount: newStatus.btcAmount.toFixed(6),
                                totalValueBTC: newStatus.totalValueBTC.toFixed(6)
                            },
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        res.status(400).json({
                            error: 'Trade execution failed',
                            reason: trade.error || 'Unknown error',
                            timestamp: new Date().toISOString()
                        });
                    }
                } else {
                    console.log(`📋 [PORTFOLIO API] No trade signal - holding position (Z-Score: ${signal.zScore.toFixed(4)})`);
                    res.status(200).json({
                        message: 'No trade signal - holding current position',
                        signal: {
                            action: signal.action,
                            zScore: signal.zScore.toFixed(4),
                            confidence: `${(signal.confidence * 100).toFixed(1)}%`,
                            reasoning: 'Z-score within normal range - no rebalancing needed'
                        },
                        currentPortfolio: {
                            ethAmount: portfolioState.ethAmount.toFixed(4),
                            btcAmount: portfolioState.btcAmount.toFixed(6)
                        },
                        timestamp: new Date().toISOString()
                    });
                }
                
            } else {
                // Invalid request body
                console.log('❌ [PORTFOLIO API] Invalid request body:', req.body);
                res.status(400).json({ 
                    error: 'Invalid request body',
                    message: 'Specify valid action with required parameters',
                    expectedActions: {
                        initialize: {
                            action: 'initialize',
                            ethAmount: 'number (e.g., 0.5)',
                            btcAmount: 'number (e.g., 0.01)'
                        },
                        trade: {
                            action: 'trade',
                            executeTrade: true
                        }
                    },
                    received: req.body
                });
            }
            
        } else {
            // Method not allowed
            res.status(405).json({ 
                error: 'Method not allowed',
                message: 'This endpoint accepts GET and POST requests only',
                allowedMethods: ['GET', 'POST'],
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ [PORTFOLIO API] Operation failed:', error.message);
        console.error('❌ [PORTFOLIO API] Stack trace:', error.stack);
        
        // Categorize error types
        let errorCategory = 'unknown';
        if (error.message.includes('data')) errorCategory = 'data_access';
        if (error.message.includes('Invalid')) errorCategory = 'validation';
        if (error.message.includes('timeout')) errorCategory = 'timeout';
        if (error.message.includes('network')) errorCategory = 'network';
        
        res.status(500).json({
            error: 'Portfolio operation failed',
            message: error.message,
            category: errorCategory,
            timestamp: new Date().toISOString(),
            suggestion: errorCategory === 'data_access' ? 
                'Check if historical data is available' :
                errorCategory === 'validation' ?
                'Verify request parameters' :
                'Try again or contact support'
        });
    }
}
