/**
 * Centralized Z-Score Calculator
 * 
 * SINGLE SOURCE OF TRUTH for all Z-score calculations across the project
 * All components (frontend, backend, backtesting) MUST use this implementation
 * 
 * CRITICAL CONCEPTS:
 * 
 * 1. Z-SCORE MEASURES EXTREMENESS
 *    - Z-score = (current_value - mean) / standard_deviation
 *    - Tells us how many standard deviations from the mean
 *    - |Z| > 2 = statistically significant (happens ~5% of time)
 *    - |Z| > 3 = very rare (happens ~0.3% of time)
 * 
 * 2. MEAN REVERSION STRATEGY
 *    - When ETH/BTC ratio is extreme, it tends to revert to mean
 *    - High Z-score (> threshold) = ETH expensive = SELL ETH
 *    - Low Z-score (< -threshold) = ETH cheap = BUY ETH
 * 
 * 3. LOOKBACK PERIOD MATTERS
 *    - Too short = noisy signals, false positives
 *    - Too long = slow to adapt to regime changes
 *    - 15 days is a common sweet spot
 * 
 * 4. PURE FUNCTIONS ARE CRITICAL
 *    - Same inputs MUST give same outputs
 *    - No side effects, no external dependencies
 *    - Makes backtesting deterministic and reliable
 * 
 * 5. EDGE CASES
 *    - Returns 0 if insufficient data (< lookbackPeriod)
 *    - Returns 0 if no variance (flat market)
 *    - Always validate inputs are numbers
 */

export class ZScoreCalculator {
    /**
     * PURE FUNCTION: Calculate Z-Score for mean reversion analysis
     * 
     * This is THE ONLY Z-score calculation that should be used anywhere in the project
     * 
     * @param {number} currentValue - Current value (e.g., ETH/BTC ratio)
     * @param {Array<number>} historicalValues - Array of historical values
     * @param {number} lookbackPeriod - Number of periods to look back (default: 15)
     * @returns {number} Z-Score (0 if insufficient data or zero variance)
     */
    static calculate(currentValue, historicalValues, lookbackPeriod = 15) {
        // Validate inputs
        if (typeof currentValue !== 'number' || isNaN(currentValue)) {
            return 0;
        }
        
        if (!Array.isArray(historicalValues) || historicalValues.length < lookbackPeriod) {
            return 0;
        }
        
        // Get the lookback window (last N values)
        const lookbackData = historicalValues.slice(-lookbackPeriod);
        
        // Calculate mean
        const mean = lookbackData.reduce((sum, value) => sum + value, 0) / lookbackData.length;
        
        // Calculate variance
        const variance = lookbackData.reduce((sum, value) => {
            return sum + Math.pow(value - mean, 2);
        }, 0) / lookbackData.length;
        
        // Calculate standard deviation
        const stdDev = Math.sqrt(variance);
        
        // Avoid division by zero - return 0 if no variance
        if (stdDev === 0) {
            return 0;
        }
        
        // Return Z-score
        return (currentValue - mean) / stdDev;
    }
    
    /**
     * Calculate mean of an array
     * @param {Array<number>} values 
     * @returns {number} Mean value
     */
    static mean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    /**
     * Calculate standard deviation of an array
     * @param {Array<number>} values 
     * @returns {number} Standard deviation
     */
    static standardDeviation(values) {
        if (!values || values.length === 0) return 0;
        const avg = this.mean(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}

// Default parameters that should be used everywhere
export const DEFAULT_ZSCORE_PARAMS = {
    lookbackPeriod: 15,
    threshold: 1.258  // Mega-optimal threshold
};
