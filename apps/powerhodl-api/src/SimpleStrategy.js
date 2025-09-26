/**
 * SIMPLIFIED Strategy Class
 * 
 * Pure functions for trading signal generation
 * All methods are deterministic with no side effects
 */

import { ZScoreCalculator, DEFAULT_ZSCORE_PARAMS } from '../../../packages/shared/src/ZScoreCalculator.js';

export class SimpleStrategy {
    constructor() {
        // Mega-optimal parameters from extensive testing
        this.parameters = {
            zScoreThreshold: 1.258,
            
            // CRITICAL: This controls how much portfolio deviation from 50/50 is allowed
            // before triggering a rebalance. This is NOT a target percentage!
            // Lower values = more frequent trading = more fees = worse returns
            // Higher values = less frequent trading = miss opportunities
            // The gradient descent optimizer should find the sweet spot that balances
            // capturing opportunities vs minimizing trading costs
            rebalancePercent: 49.79,  // TODO: This value needs optimization
            
            transactionCost: 1.66,
            lookbackDays: 15
        };
    }

    /**
     * PURE FUNCTION: Calculate Z-Score for mean reversion analysis
     * Delegates to centralized ZScoreCalculator for consistency
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Array<number>} historicalRatios - Historical ratios for lookback
     * @param {number} lookbackDays - Number of days to look back (optional, uses default if not provided)
     * @returns {number} Z-Score
     */
    calculateZScore(currentRatio, historicalRatios, lookbackDays = this.parameters.lookbackDays) {
        return ZScoreCalculator.calculate(currentRatio, historicalRatios, lookbackDays);
    }

    /**
     * PURE FUNCTION: Generate trading signal based on market conditions
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Array<number>} historicalRatios - Historical ratios
     * @param {Object} parameters - Trading parameters (optional, uses defaults if not provided)
     * @returns {Object} Trading signal (without timestamp)
     */
    generateSignalPure(currentRatio, historicalRatios, parameters = this.parameters) {
        const zScore = this.calculateZScore(currentRatio, historicalRatios, parameters.lookbackDays);
        
        let action = 'HOLD';
        let shouldTrade = false;
        let confidence = 0;
        let reasoning = 'Market conditions within normal range';
        
        if (Math.abs(zScore) > parameters.zScoreThreshold) {
            shouldTrade = true;
            confidence = Math.min(1.0, Math.abs(zScore) / 3.0); // Cap at 100%
            
            if (zScore > parameters.zScoreThreshold) {
                action = 'SELL_ETH';
                reasoning = `ETH overvalued (Z-Score: ${zScore.toFixed(2)})`;
            } else {
                action = 'BUY_ETH';
                reasoning = `ETH undervalued (Z-Score: ${zScore.toFixed(2)})`;
            }
        }
        
        return {
            action,
            shouldTrade,
            confidence,
            zScore,
            reasoning,
            ethBtcRatio: currentRatio,
            parameters: parameters
        };
    }

    /**
     * WRAPPER: Generate signal with timestamp (calls pure function internally)
     * This maintains backward compatibility while keeping core logic pure
     */
    generateSignal(currentRatio, historicalRatios) {
        const pureSignal = this.generateSignalPure(currentRatio, historicalRatios);
        return {
            ...pureSignal,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * PURE FUNCTION: Calculate portfolio allocation percentage
     * @param {number} ethAmount - ETH amount
     * @param {number} btcAmount - BTC amount  
     * @param {number} ethBtcRatio - Current ETH/BTC ratio
     * @param {number} rebalanceThreshold - Rebalance threshold percentage (optional)
     * @returns {Object} Portfolio allocation info
     */
    calculateAllocation(ethAmount, btcAmount, ethBtcRatio, rebalanceThreshold = this.parameters.rebalancePercent) {
        const ethValueBTC = ethAmount * ethBtcRatio;
        const totalValueBTC = btcAmount + ethValueBTC;
        
        const ethPercentage = totalValueBTC > 0 ? (ethValueBTC / totalValueBTC) * 100 : 0;
        const btcPercentage = 100 - ethPercentage;
        const deviation = Math.abs(ethPercentage - 50);
        
        return {
            ethPercentage,
            btcPercentage,
            deviation,
            totalValueBTC,
            // IMPORTANT: This checks if deviation from 50/50 exceeds threshold
            // The rebalanceThreshold parameter controls trading frequency:
            // - Small threshold (e.g., 1%) = frequent trading = high fees
            // - Large threshold (e.g., 10%) = rare trading = may miss opportunities
            // Finding the optimal value is crucial for profitability
            needsRebalancing: deviation > rebalanceThreshold
        };
    }

    /**
     * PURE FUNCTION: Calculate trade amounts to reach target allocation
     * @param {number} currentEthAmount - Current ETH holdings
     * @param {number} currentBtcAmount - Current BTC holdings
     * @param {number} ethBtcRatio - Current ETH/BTC ratio
     * @param {number} targetEthPercentage - Target ETH percentage (0-100)
     * @returns {Object} Trade amounts needed
     */
    calculateTradeAmounts(currentEthAmount, currentBtcAmount, ethBtcRatio, targetEthPercentage) {
        const currentEthValueBTC = currentEthAmount * ethBtcRatio;
        const totalValueBTC = currentBtcAmount + currentEthValueBTC;
        
        // Calculate target amounts
        const targetEthValueBTC = totalValueBTC * (targetEthPercentage / 100);
        const targetEthAmount = targetEthValueBTC / ethBtcRatio;
        
        // Calculate differences
        const ethToTrade = targetEthAmount - currentEthAmount;
        const btcToTrade = -ethToTrade * ethBtcRatio; // Negative because we trade opposite
        
        return {
            ethToTrade,
            btcToTrade,
            targetEthAmount,
            targetBtcAmount: totalValueBTC - targetEthValueBTC,
            totalValueBTC
        };
    }
}