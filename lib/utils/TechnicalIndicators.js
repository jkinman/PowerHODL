/**
 * Technical Indicators Utility
 * 
 * Mathematical functions for calculating technical indicators used in trading analysis.
 * All functions are pure and stateless for easy testing and debugging.
 */

export class TechnicalIndicators {
    
    /**
     * Calculate Simple Moving Average
     * @param {Array<number>} values - Array of numeric values
     * @param {number} period - Period for moving average
     * @returns {number} Simple moving average
     */
    static simpleMovingAverage(values, period) {
        if (!values || values.length === 0) return 0;
        if (period <= 0 || period > values.length) return values[values.length - 1];
        
        const slice = values.slice(-period);
        return slice.reduce((sum, value) => sum + value, 0) / slice.length;
    }

    /**
     * Calculate Exponential Moving Average
     * @param {Array<number>} values - Array of numeric values
     * @param {number} period - Period for EMA
     * @returns {number} Exponential moving average
     */
    static exponentialMovingAverage(values, period) {
        if (!values || values.length === 0) return 0;
        if (period <= 0) return values[values.length - 1];
        
        const multiplier = 2 / (period + 1);
        let ema = values[0];
        
        for (let i = 1; i < values.length; i++) {
            ema = (values[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    /**
     * Calculate mean (average) of values
     * @param {Array<number>} values - Array of numeric values
     * @returns {number} Mean value
     */
    static mean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /**
     * Calculate standard deviation
     * @param {Array<number>} values - Array of numeric values
     * @returns {number} Standard deviation
     */
    static standardDeviation(values) {
        if (!values || values.length === 0) return 0;
        if (values.length === 1) return 0;
        
        const mean = this.mean(values);
        const variance = this.variance(values);
        return Math.sqrt(variance);
    }

    /**
     * Calculate variance
     * @param {Array<number>} values - Array of numeric values
     * @returns {number} Variance
     */
    static variance(values) {
        if (!values || values.length === 0) return 0;
        if (values.length === 1) return 0;
        
        const mean = this.mean(values);
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        return this.mean(squaredDifferences);
    }

    /**
     * Calculate volatility (standard deviation of returns)
     * @param {Array<number>} prices - Array of price values
     * @returns {number} Volatility
     */
    static volatility(prices) {
        if (!prices || prices.length < 2) return 0;
        
        // Calculate returns (percentage changes)
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
            returns.push(returnValue);
        }
        
        return this.standardDeviation(returns);
    }

    /**
     * Calculate momentum (rate of change over period)
     * @param {Array<number>} values - Array of numeric values
     * @param {number} period - Look-back period
     * @returns {number} Momentum
     */
    static momentum(values, period = 5) {
        if (!values || values.length < period + 1) return 0;
        
        const current = values[values.length - 1];
        const previous = values[values.length - 1 - period];
        
        return (current - previous) / previous;
    }

    /**
     * Calculate rate of change
     * @param {Array<number>} values - Array of numeric values
     * @param {number} period - Look-back period
     * @returns {number} Rate of change as percentage
     */
    static rateOfChange(values, period = 10) {
        if (!values || values.length < period + 1) return 0;
        
        const current = values[values.length - 1];
        const previous = values[values.length - 1 - period];
        
        return ((current - previous) / previous) * 100;
    }

    /**
     * Calculate Z-score (number of standard deviations from mean)
     * @param {number} value - Current value
     * @param {Array<number>} historicalValues - Historical values for comparison
     * @returns {number} Z-score
     */
    static zScore(value, historicalValues) {
        if (!historicalValues || historicalValues.length === 0) return 0;
        
        const mean = this.mean(historicalValues);
        const stdDev = this.standardDeviation(historicalValues);
        
        if (stdDev === 0) return 0;
        
        return (value - mean) / stdDev;
    }

    /**
     * Calculate linear regression slope
     * @param {Array<number>} values - Array of numeric values
     * @returns {Object} Object with slope and intercept
     */
    static linearRegression(values) {
        if (!values || values.length < 2) {
            return { slope: 0, intercept: values?.[0] || 0 };
        }
        
        const n = values.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        
        const sumX = xValues.reduce((sum, x) => sum + x, 0);
        const sumY = values.reduce((sum, y) => sum + y, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }

    /**
     * Calculate RSI (Relative Strength Index)
     * @param {Array<number>} prices - Array of price values
     * @param {number} period - RSI period (default 14)
     * @returns {number} RSI value (0-100)
     */
    static rsi(prices, period = 14) {
        if (!prices || prices.length < period + 1) return 50; // Neutral RSI
        
        // Calculate price changes
        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }
        
        // Separate gains and losses
        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
        
        // Calculate average gains and losses
        const avgGain = this.simpleMovingAverage(gains.slice(-period), period);
        const avgLoss = this.simpleMovingAverage(losses.slice(-period), period);
        
        if (avgLoss === 0) return 100; // No losses = max RSI
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return rsi;
    }

    /**
     * Calculate Bollinger Bands
     * @param {Array<number>} prices - Array of price values
     * @param {number} period - Period for moving average (default 20)
     * @param {number} multiplier - Standard deviation multiplier (default 2)
     * @returns {Object} Object with upper, middle, and lower bands
     */
    static bollingerBands(prices, period = 20, multiplier = 2) {
        if (!prices || prices.length < period) {
            const lastPrice = prices?.[prices.length - 1] || 0;
            return {
                upper: lastPrice,
                middle: lastPrice,
                lower: lastPrice
            };
        }
        
        const recentPrices = prices.slice(-period);
        const middle = this.simpleMovingAverage(recentPrices, period);
        const stdDev = this.standardDeviation(recentPrices);
        
        return {
            upper: middle + (stdDev * multiplier),
            middle: middle,
            lower: middle - (stdDev * multiplier)
        };
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * @param {Array<number>} prices - Array of price values
     * @param {number} fastPeriod - Fast EMA period (default 12)
     * @param {number} slowPeriod - Slow EMA period (default 26)
     * @param {number} signalPeriod - Signal line EMA period (default 9)
     * @returns {Object} Object with MACD line, signal line, and histogram
     */
    static macd(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!prices || prices.length < slowPeriod) {
            return {
                macd: 0,
                signal: 0,
                histogram: 0
            };
        }
        
        const fastEMA = this.exponentialMovingAverage(prices, fastPeriod);
        const slowEMA = this.exponentialMovingAverage(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;
        
        // For signal line, we'd need historical MACD values
        // Simplified: use current MACD as signal
        const signalLine = macdLine;
        const histogram = macdLine - signalLine;
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    /**
     * Validate numeric array input
     * @param {Array} values - Array to validate
     * @param {string} functionName - Name of calling function for error messages
     * @returns {Array<number>} Validated numeric array
     * @private
     */
    static validateNumericArray(values, functionName) {
        if (!Array.isArray(values)) {
            throw new Error(`${functionName}: Expected array, got ${typeof values}`);
        }
        
        const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
        
        if (numericValues.length === 0) {
            throw new Error(`${functionName}: Array contains no valid numeric values`);
        }
        
        return numericValues;
    }
}

// For backwards compatibility, also export individual functions
export const {
    simpleMovingAverage,
    exponentialMovingAverage,
    mean,
    standardDeviation,
    variance,
    volatility,
    momentum,
    rateOfChange,
    zScore,
    linearRegression,
    rsi,
    bollingerBands,
    macd
} = TechnicalIndicators;
