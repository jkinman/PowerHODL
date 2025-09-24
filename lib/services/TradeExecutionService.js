/**
 * Trade Execution Service
 * 
 * Handles trade execution on cryptocurrency exchanges.
 * Currently supports simulation mode and planned Binance integration.
 */

import ccxt from 'ccxt';
import { Logger } from '../utils/Logger.js';

export class TradeExecutionService {
    constructor() {
        this.logger = new Logger('TradeExecutionService');
        this.tradingMode = process.env.TRADING_MODE || 'simulation';
        this.isSimulationMode = process.env.SIMULATION_MODE !== 'false';
        this.exchange = null;
        this.metamaskService = null;
        
        this.initializeTrading();
        
        this.logger.info('🔄 Trade execution service initialized', {
            tradingMode: this.tradingMode,
            simulationMode: this.isSimulationMode
        });
    }
    
    /**
     * Initialize trading based on mode
     */
    async initializeTrading() {
        switch (this.tradingMode) {
            case 'metamask':
                await this.initializeMetaMask();
                break;
            case 'cex':
            case 'live':
                this.initializeExchange();
                break;
            case 'dex':
                // Legacy DEX mode - could be deprecated
                this.logger.info('💡 DEX mode detected - consider upgrading to MetaMask mode');
                break;
            default:
                this.logger.info('📊 Running in simulation mode');
                this.isSimulationMode = true;
        }
    }
    
    /**
     * Initialize MetaMask trading service
     */
    async initializeMetaMask() {
        try {
            const { ModernMetaMaskService } = await import('./ModernMetaMaskService.js');
            this.metamaskService = new ModernMetaMaskService();
            this.logger.info('🦊 Modern MetaMask service ready (no Infura required)');
        } catch (error) {
            this.logger.error('❌ Failed to initialize modern MetaMask service', { error: error.message });
            this.isSimulationMode = true;
        }
    }
    
    /**
     * Initialize exchange connection (Multi-exchange support)
     */
    initializeExchange() {
        const exchangeId = process.env.EXCHANGE || 'coinbase';
        
        // Check for exchange-specific credentials
        const credentials = this.getExchangeCredentials(exchangeId);
        
        if (!credentials.hasRequiredKeys) {
            this.logger.warn(`⚠️ ${exchangeId} API credentials not found, running in simulation mode`);
            this.isSimulationMode = true;
            return;
        }
        
        try {
            const exchangeConfig = {
                ...credentials.config,
                sandbox: process.env.NODE_ENV !== 'production',
                enableRateLimit: true,
            };
            
            // Add exchange-specific options
            if (exchangeId === 'binance') {
                exchangeConfig.options = { adjustForTimeDifference: true };
            } else if (exchangeId === 'coinbase') {
                exchangeConfig.sandbox = false; // Coinbase Pro doesn't have sandbox
            }
            
            this.exchange = new ccxt[exchangeId](exchangeConfig);
            this.logger.info(`🔗 ${exchangeId} exchange connection initialized`);
        } catch (error) {
            this.logger.error(`❌ Failed to initialize ${exchangeId} exchange`, { error: error.message });
            this.isSimulationMode = true;
        }
    }
    
    /**
     * Get credentials for specific exchange
     * @param {string} exchangeId - Exchange identifier
     * @returns {Object} Credentials and configuration
     */
    getExchangeCredentials(exchangeId) {
        const configs = {
            binance: {
                config: {
                    apiKey: process.env.BINANCE_API_KEY,
                    secret: process.env.BINANCE_SECRET,
                },
                hasRequiredKeys: !!(process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET)
            },
            coinbase: {
                config: {
                    apiKey: process.env.COINBASE_API_KEY,
                    secret: process.env.COINBASE_API_SECRET,
                    passphrase: process.env.COINBASE_PASSPHRASE,
                },
                hasRequiredKeys: !!(process.env.COINBASE_API_KEY && process.env.COINBASE_API_SECRET && process.env.COINBASE_PASSPHRASE)
            },
            kraken: {
                config: {
                    apiKey: process.env.KRAKEN_API_KEY,
                    secret: process.env.KRAKEN_SECRET,
                },
                hasRequiredKeys: !!(process.env.KRAKEN_API_KEY && process.env.KRAKEN_SECRET)
            },
            gemini: {
                config: {
                    apiKey: process.env.GEMINI_API_KEY,
                    secret: process.env.GEMINI_SECRET,
                },
                hasRequiredKeys: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_SECRET)
            },
            kucoin: {
                config: {
                    apiKey: process.env.KUCOIN_API_KEY,
                    secret: process.env.KUCOIN_SECRET,
                    passphrase: process.env.KUCOIN_PASSPHRASE,
                },
                hasRequiredKeys: !!(process.env.KUCOIN_API_KEY && process.env.KUCOIN_SECRET && process.env.KUCOIN_PASSPHRASE)
            }
        };
        
        return configs[exchangeId] || configs.coinbase; // Default to Coinbase
    }
    
    /**
     * Execute a trade based on signal
     * @param {Object} signal - Trading signal with action, strength, etc.
     * @param {Object} portfolio - Current portfolio state
     * @param {Object} marketData - Current market data
     * @returns {Object} Trade result
     */
    async executeTrade(signal, portfolio, marketData) {
        try {
            this.logger.info('🔄 Executing trade', {
                action: signal.action,
                strength: signal.strength,
                tradingMode: this.tradingMode,
                simulationMode: this.isSimulationMode
            });
            
            if (signal.action === 'HOLD') {
                return {
                    success: true,
                    action: 'HOLD',
                    message: 'No trade executed - holding position'
                };
            }
            
            // Route to appropriate trading service
            if (this.tradingMode === 'metamask' && this.metamaskService) {
                return await this.metamaskService.executeTrade(signal, portfolio, marketData);
            }
            
            // Calculate trade parameters for CEX trading
            const tradeParams = await this.calculateTradeParameters(signal, portfolio, marketData);
            
            if (!tradeParams.shouldExecute) {
                return {
                    success: true,
                    action: 'SKIP',
                    message: tradeParams.reason
                };
            }
            
            // Execute trade (simulation or real)
            const tradeResult = this.isSimulationMode 
                ? await this.simulateTrade(tradeParams)
                : await this.executeRealTrade(tradeParams);
            
            this.logger.info('✅ Trade executed successfully', {
                action: tradeResult.action,
                amount: tradeResult.amount,
                price: tradeResult.price,
                cost: tradeResult.cost
            });
            
            return tradeResult;
            
        } catch (error) {
            this.logger.error('❌ Trade execution failed', {
                error: error.message,
                signal: signal.action
            });
            
            return {
                success: false,
                error: error.message,
                action: signal.action
            };
        }
    }
    
    /**
     * Calculate trade parameters based on signal and portfolio
     * @param {Object} signal - Trading signal
     * @param {Object} portfolio - Current portfolio
     * @param {Object} marketData - Current market data
     * @returns {Object} Trade parameters
     */
    async calculateTradeParameters(signal, portfolio, marketData) {
        const rebalanceThreshold = 0.4979; // From mega-optimal strategy
        const transactionCost = 0.0166; // 1.66% transaction cost
        
        const ethPrice = marketData.eth_price;
        const btcPrice = marketData.btc_price;
        const currentRatio = ethPrice / btcPrice;
        
        // Calculate current portfolio allocation
        const ethValue = portfolio.eth_balance * ethPrice;
        const btcValue = portfolio.btc_balance * btcPrice;
        const totalValue = ethValue + btcValue;
        const ethAllocation = ethValue / totalValue;
        
        this.logger.info('📊 Current portfolio state', {
            ethBalance: portfolio.eth_balance,
            btcBalance: portfolio.btc_balance,
            ethValue: ethValue.toFixed(2),
            btcValue: btcValue.toFixed(2),
            totalValue: totalValue.toFixed(2),
            ethAllocation: (ethAllocation * 100).toFixed(1) + '%',
            currentRatio: currentRatio.toFixed(6)
        });
        
        // Determine if rebalancing is needed
        let targetEthAllocation = 0.5; // Default 50/50
        let shouldExecute = false;
        let reason = '';
        
        if (signal.action === 'BUY_ETH' && ethAllocation < 0.5 - rebalanceThreshold) {
            targetEthAllocation = 0.5;
            shouldExecute = true;
        } else if (signal.action === 'SELL_ETH' && ethAllocation > 0.5 + rebalanceThreshold) {
            targetEthAllocation = 0.5;
            shouldExecute = true;
        } else {
            reason = `Portfolio already balanced. ETH allocation: ${(ethAllocation * 100).toFixed(1)}%`;
        }
        
        if (!shouldExecute) {
            return { shouldExecute: false, reason };
        }
        
        // Calculate trade amount
        const targetEthValue = totalValue * targetEthAllocation;
        const ethToTrade = (targetEthValue - ethValue) / ethPrice;
        const tradeAmount = Math.abs(ethToTrade);
        
        // Account for transaction costs
        const adjustedAmount = tradeAmount * (1 - transactionCost);
        
        return {
            shouldExecute: true,
            action: signal.action,
            symbol: 'ETH/BTC',
            amount: adjustedAmount,
            price: currentRatio,
            cost: adjustedAmount * currentRatio,
            targetAllocation: targetEthAllocation,
            estimatedCost: tradeAmount * transactionCost
        };
    }
    
    /**
     * Simulate trade execution for testing/development
     * @param {Object} tradeParams - Trade parameters
     * @returns {Object} Simulated trade result
     */
    async simulateTrade(tradeParams) {
        // Simulate small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add small price slippage simulation
        const slippage = 0.001; // 0.1% slippage
        const slippageMultiplier = tradeParams.action === 'BUY_ETH' ? (1 + slippage) : (1 - slippage);
        const executionPrice = tradeParams.price * slippageMultiplier;
        
        this.logger.info('🎭 Simulated trade execution', {
            action: tradeParams.action,
            amount: tradeParams.amount.toFixed(6),
            requestedPrice: tradeParams.price.toFixed(6),
            executionPrice: executionPrice.toFixed(6),
            slippage: (slippage * 100).toFixed(2) + '%'
        });
        
        return {
            success: true,
            action: tradeParams.action,
            symbol: tradeParams.symbol,
            amount: tradeParams.amount,
            price: executionPrice,
            cost: tradeParams.amount * executionPrice,
            fee: tradeParams.estimatedCost,
            orderId: `SIM_${Date.now()}`,
            timestamp: new Date().toISOString(),
            simulation: true
        };
    }
    
    /**
     * Execute real trade on exchange
     * @param {Object} tradeParams - Trade parameters
     * @returns {Object} Real trade result
     */
    async executeRealTrade(tradeParams) {
        if (!this.exchange) {
            throw new Error('Exchange not initialized');
        }
        
        try {
            // Check account balance first
            const balance = await this.exchange.fetchBalance();
            
            // Execute market order
            const order = await this.exchange.createMarketOrder(
                tradeParams.symbol,
                tradeParams.action === 'BUY_ETH' ? 'buy' : 'sell',
                tradeParams.amount
            );
            
            this.logger.info('🔗 Real trade executed on Binance', {
                orderId: order.id,
                symbol: order.symbol,
                side: order.side,
                amount: order.amount,
                price: order.average || order.price,
                cost: order.cost,
                fee: order.fee
            });
            
            return {
                success: true,
                action: tradeParams.action,
                symbol: order.symbol,
                amount: order.amount,
                price: order.average || order.price,
                cost: order.cost,
                fee: order.fee,
                orderId: order.id,
                timestamp: order.timestamp ? new Date(order.timestamp).toISOString() : new Date().toISOString(),
                simulation: false
            };
            
        } catch (error) {
            throw new Error(`Exchange trade failed: ${error.message}`);
        }
    }
    
    /**
     * Get account balance from exchange
     * @returns {Object} Account balance
     */
    async getAccountBalance() {
        if (this.isSimulationMode) {
            return {
                ETH: { free: 1.0, used: 0.0, total: 1.0 },
                BTC: { free: 0.05, used: 0.0, total: 0.05 },
                simulation: true
            };
        }
        
        if (!this.exchange) {
            throw new Error('Exchange not initialized');
        }
        
        const balance = await this.exchange.fetchBalance();
        return {
            ETH: balance.ETH || { free: 0, used: 0, total: 0 },
            BTC: balance.BTC || { free: 0, used: 0, total: 0 },
            simulation: false
        };
    }
    
    /**
     * Check if exchange is connected and working
     * @returns {boolean} Connection status
     */
    async testConnection() {
        if (this.isSimulationMode) {
            return { connected: true, simulation: true };
        }
        
        if (!this.exchange) {
            return { connected: false, error: 'Exchange not initialized' };
        }
        
        try {
            await this.exchange.fetchStatus();
            return { connected: true, simulation: false };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }
}
