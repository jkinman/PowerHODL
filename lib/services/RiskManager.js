/**
 * Risk Manager Service
 * 
 * Implements risk controls and safety checks for automated trading.
 * Prevents excessive trading, manages position sizes, and enforces safety limits.
 */

import { Logger } from '../utils/Logger.js';

export class RiskManager {
    constructor() {
        this.logger = new Logger('RiskManager');
        
        // Risk management parameters
        this.maxDailyTrades = parseInt(process.env.MAX_DAILY_TRADES) || 10;
        this.maxTradeSize = parseFloat(process.env.MAX_TRADE_SIZE) || 0.1; // 10% of portfolio
        this.maxDrawdown = parseFloat(process.env.MAX_DRAWDOWN) || 0.2; // 20% max drawdown
        this.cooldownPeriod = parseInt(process.env.TRADE_COOLDOWN_MINUTES) || 30; // 30 minutes
        this.emergencyStopEnabled = process.env.EMERGENCY_STOP === 'true';
        
        this.logger.info('🛡️ Risk manager initialized', {
            maxDailyTrades: this.maxDailyTrades,
            maxTradeSize: this.maxTradeSize,
            maxDrawdown: this.maxDrawdown,
            cooldownPeriod: this.cooldownPeriod,
            emergencyStopEnabled: this.emergencyStopEnabled
        });
    }
    
    /**
     * Validate if a trade should be executed based on risk parameters
     * @param {Object} signal - Trading signal
     * @param {Object} portfolio - Current portfolio state
     * @param {Object} marketData - Current market data
     * @param {Array} recentTrades - Recent trade history
     * @returns {Object} Validation result
     */
    async validateTrade(signal, portfolio, marketData, recentTrades = []) {
        try {
            this.logger.info('🔍 Validating trade risk', {
                action: signal.action,
                strength: signal.strength
            });
            
            // Check emergency stop
            if (this.emergencyStopEnabled) {
                return {
                    approved: false,
                    reason: 'Emergency stop is enabled - all trading halted',
                    riskLevel: 'CRITICAL'
                };
            }
            
            // Check daily trade limit
            const dailyTradeCheck = this.checkDailyTradeLimit(recentTrades);
            if (!dailyTradeCheck.passed) {
                return {
                    approved: false,
                    reason: dailyTradeCheck.reason,
                    riskLevel: 'HIGH'
                };
            }
            
            // Check cooldown period
            const cooldownCheck = this.checkCooldownPeriod(recentTrades);
            if (!cooldownCheck.passed) {
                return {
                    approved: false,
                    reason: cooldownCheck.reason,
                    riskLevel: 'MEDIUM'
                };
            }
            
            // Check trade size limits
            const tradeSizeCheck = this.checkTradeSize(signal, portfolio);
            if (!tradeSizeCheck.passed) {
                return {
                    approved: false,
                    reason: tradeSizeCheck.reason,
                    riskLevel: 'HIGH'
                };
            }
            
            // Check portfolio drawdown
            const drawdownCheck = this.checkDrawdown(portfolio);
            if (!drawdownCheck.passed) {
                return {
                    approved: false,
                    reason: drawdownCheck.reason,
                    riskLevel: 'CRITICAL'
                };
            }
            
            // Check signal strength threshold
            const signalCheck = this.checkSignalStrength(signal);
            if (!signalCheck.passed) {
                return {
                    approved: false,
                    reason: signalCheck.reason,
                    riskLevel: 'LOW'
                };
            }
            
            // Check market volatility
            const volatilityCheck = this.checkMarketVolatility(marketData);
            if (!volatilityCheck.passed) {
                return {
                    approved: false,
                    reason: volatilityCheck.reason,
                    riskLevel: 'MEDIUM'
                };
            }
            
            this.logger.info('✅ Trade approved by risk manager', {
                action: signal.action,
                riskLevel: 'ACCEPTABLE'
            });
            
            return {
                approved: true,
                reason: 'All risk checks passed',
                riskLevel: 'ACCEPTABLE'
            };
            
        } catch (error) {
            this.logger.error('❌ Risk validation failed', { error: error.message });
            return {
                approved: false,
                reason: `Risk validation error: ${error.message}`,
                riskLevel: 'CRITICAL'
            };
        }
    }
    
    /**
     * Check if daily trade limit is exceeded
     * @param {Array} recentTrades - Recent trades
     * @returns {Object} Check result
     */
    checkDailyTradeLimit(recentTrades) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTrades = recentTrades.filter(trade => {
            const tradeDate = new Date(trade.created_at);
            return tradeDate >= today;
        });
        
        if (todayTrades.length >= this.maxDailyTrades) {
            return {
                passed: false,
                reason: `Daily trade limit exceeded (${todayTrades.length}/${this.maxDailyTrades})`
            };
        }
        
        return {
            passed: true,
            todayTrades: todayTrades.length,
            limit: this.maxDailyTrades
        };
    }
    
    /**
     * Check if cooldown period has passed since last trade
     * @param {Array} recentTrades - Recent trades
     * @returns {Object} Check result
     */
    checkCooldownPeriod(recentTrades) {
        if (recentTrades.length === 0) {
            return { passed: true };
        }
        
        const lastTrade = recentTrades[0]; // Assuming sorted by most recent
        const lastTradeTime = new Date(lastTrade.created_at);
        const cooldownEnd = new Date(lastTradeTime.getTime() + (this.cooldownPeriod * 60 * 1000));
        const now = new Date();
        
        if (now < cooldownEnd) {
            const remainingMinutes = Math.ceil((cooldownEnd - now) / (60 * 1000));
            return {
                passed: false,
                reason: `Cooldown period active - ${remainingMinutes} minutes remaining`
            };
        }
        
        return { passed: true };
    }
    
    /**
     * Check if trade size is within acceptable limits
     * @param {Object} signal - Trading signal
     * @param {Object} portfolio - Current portfolio
     * @returns {Object} Check result
     */
    checkTradeSize(signal, portfolio) {
        // For now, assume maximum trade size as percentage of total portfolio
        // This would be calculated more precisely in the trade execution service
        const estimatedTradeSize = 0.05; // Placeholder - 5% of portfolio
        
        if (estimatedTradeSize > this.maxTradeSize) {
            return {
                passed: false,
                reason: `Trade size too large (${(estimatedTradeSize * 100).toFixed(1)}% > ${(this.maxTradeSize * 100).toFixed(1)}%)`
            };
        }
        
        return { passed: true };
    }
    
    /**
     * Check portfolio drawdown limits
     * @param {Object} portfolio - Current portfolio
     * @returns {Object} Check result
     */
    checkDrawdown(portfolio) {
        // Calculate current portfolio value vs initial/peak value
        const currentValue = portfolio.total_usd_value || 0;
        const initialValue = portfolio.initial_usd_value || currentValue;
        const peakValue = portfolio.peak_usd_value || currentValue;
        
        const drawdownFromPeak = (peakValue - currentValue) / peakValue;
        const drawdownFromInitial = (initialValue - currentValue) / initialValue;
        
        if (drawdownFromPeak > this.maxDrawdown) {
            return {
                passed: false,
                reason: `Portfolio drawdown too high (${(drawdownFromPeak * 100).toFixed(1)}% > ${(this.maxDrawdown * 100).toFixed(1)}%)`
            };
        }
        
        return {
            passed: true,
            currentDrawdown: drawdownFromPeak,
            maxDrawdown: this.maxDrawdown
        };
    }
    
    /**
     * Check signal strength meets minimum threshold
     * @param {Object} signal - Trading signal
     * @returns {Object} Check result
     */
    checkSignalStrength(signal) {
        const minStrength = 0.7; // Minimum signal strength for execution
        
        if (signal.strength < minStrength) {
            return {
                passed: false,
                reason: `Signal strength too low (${signal.strength.toFixed(2)} < ${minStrength})`
            };
        }
        
        return { passed: true };
    }
    
    /**
     * Check market volatility levels
     * @param {Object} marketData - Current market data
     * @returns {Object} Check result
     */
    checkMarketVolatility(marketData) {
        const maxVolatility = 0.1; // 10% maximum volatility
        const currentVolatility = marketData.volatility || 0;
        
        if (currentVolatility > maxVolatility) {
            return {
                passed: false,
                reason: `Market volatility too high (${(currentVolatility * 100).toFixed(1)}% > ${(maxVolatility * 100).toFixed(1)}%)`
            };
        }
        
        return { passed: true };
    }
    
    /**
     * Calculate position sizing based on risk parameters
     * @param {Object} signal - Trading signal
     * @param {Object} portfolio - Current portfolio
     * @returns {Object} Position sizing recommendation
     */
    calculatePositionSize(signal, portfolio) {
        const baseSize = 0.05; // 5% base position size
        const strengthMultiplier = signal.strength; // Scale by signal strength
        const volatilityAdjustment = 1 - (portfolio.volatility || 0); // Reduce size in high volatility
        
        const recommendedSize = Math.min(
            baseSize * strengthMultiplier * volatilityAdjustment,
            this.maxTradeSize
        );
        
        return {
            recommendedSize,
            reasoning: {
                baseSize,
                strengthMultiplier,
                volatilityAdjustment,
                maxTradeSize: this.maxTradeSize
            }
        };
    }
    
    /**
     * Get current risk assessment of the trading system
     * @param {Object} portfolio - Current portfolio
     * @param {Array} recentTrades - Recent trades
     * @returns {Object} Risk assessment
     */
    getRiskAssessment(portfolio, recentTrades = []) {
        const dailyTrades = this.checkDailyTradeLimit(recentTrades);
        const drawdown = this.checkDrawdown(portfolio);
        
        let riskLevel = 'LOW';
        let warnings = [];
        
        if (dailyTrades.todayTrades > this.maxDailyTrades * 0.8) {
            riskLevel = 'MEDIUM';
            warnings.push('Approaching daily trade limit');
        }
        
        if (drawdown.currentDrawdown > this.maxDrawdown * 0.7) {
            riskLevel = 'HIGH';
            warnings.push('Approaching maximum drawdown');
        }
        
        if (this.emergencyStopEnabled) {
            riskLevel = 'CRITICAL';
            warnings.push('Emergency stop is enabled');
        }
        
        return {
            riskLevel,
            warnings,
            metrics: {
                dailyTrades: dailyTrades.todayTrades,
                maxDailyTrades: this.maxDailyTrades,
                currentDrawdown: drawdown.currentDrawdown,
                maxDrawdown: this.maxDrawdown,
                emergencyStopEnabled: this.emergencyStopEnabled
            }
        };
    }
    
    /**
     * Enable emergency stop (halt all trading)
     * @param {string} reason - Reason for emergency stop
     */
    enableEmergencyStop(reason = 'Manual trigger') {
        this.emergencyStopEnabled = true;
        this.logger.warn('🚨 Emergency stop ENABLED', { reason });
    }
    
    /**
     * Disable emergency stop (resume trading)
     */
    disableEmergencyStop() {
        this.emergencyStopEnabled = false;
        this.logger.info('✅ Emergency stop DISABLED - trading resumed');
    }
}
