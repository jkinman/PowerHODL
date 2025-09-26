/**
 * SIMPLIFIED Strategy Class
 * 
 * Clean, simple trading signal generation without complex abstractions
 */

export class SimpleStrategy {
    constructor() {
        // Mega-optimal parameters from extensive testing
        this.parameters = {
            zScoreThreshold: 1.258,
            rebalancePercent: 49.79,
            transactionCost: 1.66,
            lookbackDays: 15
        };
    }

    /**
     * Calculate Z-Score for mean reversion analysis
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Array<number>} historicalRatios - Historical ratios for lookback
     * @returns {number} Z-Score
     */
    calculateZScore(currentRatio, historicalRatios) {
        if (historicalRatios.length < this.parameters.lookbackDays) {
            return 0;
        }
        
        const lookbackData = historicalRatios.slice(-this.parameters.lookbackDays);
        const mean = lookbackData.reduce((sum, ratio) => sum + ratio, 0) / lookbackData.length;
        const variance = lookbackData.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / lookbackData.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? (currentRatio - mean) / stdDev : 0;
    }

    /**
     * Generate trading signal based on current market conditions
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Array<number>} historicalRatios - Historical ratios
     * @returns {Object} Trading signal
     */
    generateSignal(currentRatio, historicalRatios) {
        const zScore = this.calculateZScore(currentRatio, historicalRatios);
        
        let action = 'HOLD';
        let shouldTrade = false;
        let confidence = 0;
        let reasoning = 'Market conditions within normal range';
        
        if (Math.abs(zScore) > this.parameters.zScoreThreshold) {
            shouldTrade = true;
            confidence = Math.min(1.0, Math.abs(zScore) / 3.0); // Cap at 100%
            
            if (zScore > this.parameters.zScoreThreshold) {
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
            timestamp: new Date().toISOString(),
            parameters: this.parameters
        };
    }

    /**
     * Calculate portfolio allocation percentage
     * @param {number} ethAmount - ETH amount
     * @param {number} btcAmount - BTC amount  
     * @param {number} ethBtcRatio - Current ETH/BTC ratio
     * @returns {Object} Portfolio allocation info
     */
    calculateAllocation(ethAmount, btcAmount, ethBtcRatio) {
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
            needsRebalancing: deviation > this.parameters.rebalancePercent
        };
    }
}
