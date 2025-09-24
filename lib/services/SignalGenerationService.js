/**
 * Signal Generation Service
 * 
 * Implements the mega-optimal trading strategy with clean separation of concerns.
 * Generates BUY/SELL/HOLD signals based on Z-score analysis and market conditions.
 */

import { Logger } from '../utils/Logger.js';
import { TechnicalIndicators } from '../utils/TechnicalIndicators.js';
import { MegaOptimalStrategy } from '../strategies/MegaOptimalStrategy.js';

export class SignalGenerationService {
    constructor() {
        this.logger = new Logger('SignalGenerationService');
        this.strategy = new MegaOptimalStrategy();
        this.indicators = new TechnicalIndicators();
    }

    /**
     * Generate trading signal based on market data and strategy parameters
     * @param {Object} currentMarket - Latest market snapshot
     * @param {Array} marketHistory - Historical market data (30+ points)
     * @param {Object} portfolio - Current portfolio state
     * @returns {Promise<Object>} Trading signal with action and confidence
     */
    async generateSignal(currentMarket, marketHistory, portfolio) {
        try {
            this.logger.debug('Generating trading signal', {
                currentRatio: currentMarket.eth_btc_ratio,
                historyPoints: marketHistory.length,
                portfolioId: portfolio.id
            });

            // Step 1: Validate input data
            this.validateInputData(currentMarket, marketHistory, portfolio);

            // Step 2: Calculate technical indicators from historical data
            const technicalData = this.calculateTechnicalIndicators(marketHistory);

            // Step 3: Calculate current Z-score
            const zScore = this.calculateZScore(currentMarket.eth_btc_ratio, technicalData);

            // Step 4: Assess market conditions
            const marketConditions = this.assessMarketConditions(currentMarket, marketHistory);

            // Step 5: Generate signal using mega-optimal strategy
            const baseSignal = this.strategy.generateSignal({
                currentRatio: currentMarket.eth_btc_ratio,
                zScore,
                technicalData,
                marketConditions,
                portfolio
            });

            // Step 6: Apply risk adjustments and confidence scoring
            const adjustedSignal = this.applyRiskAdjustments(baseSignal, marketConditions, portfolio);

            // Step 7: Add comprehensive reasoning
            const finalSignal = this.addSignalReasoning(adjustedSignal, {
                zScore,
                technicalData,
                marketConditions,
                currentMarket
            });

            this.logger.info('Trading signal generated', {
                action: finalSignal.action,
                shouldTrade: finalSignal.shouldTrade,
                confidence: finalSignal.confidence,
                zScore: zScore.toFixed(4)
            });

            return finalSignal;

        } catch (error) {
            this.logger.error('Signal generation failed', error);
            throw new Error(`Signal generation failed: ${error.message}`);
        }
    }

    /**
     * Validate input data for signal generation
     * @param {Object} currentMarket - Current market data
     * @param {Array} marketHistory - Historical data
     * @param {Object} portfolio - Portfolio data
     * @private
     */
    validateInputData(currentMarket, marketHistory, portfolio) {
        if (!currentMarket || !currentMarket.eth_btc_ratio) {
            throw new Error('Invalid current market data');
        }

        if (!marketHistory || marketHistory.length < 15) {
            throw new Error(`Insufficient historical data: ${marketHistory?.length || 0} points, need at least 15`);
        }

        if (!portfolio || !portfolio.id) {
            throw new Error('Invalid portfolio data');
        }

        // Validate ratio values are reasonable
        if (currentMarket.eth_btc_ratio <= 0 || currentMarket.eth_btc_ratio > 1) {
            throw new Error(`Invalid ETH/BTC ratio: ${currentMarket.eth_btc_ratio}`);
        }
    }

    /**
     * Calculate technical indicators from historical market data
     * @param {Array} marketHistory - Historical market snapshots
     * @returns {Object} Technical indicators
     * @private
     */
    calculateTechnicalIndicators(marketHistory) {
        const ratios = marketHistory.map(m => m.eth_btc_ratio);
        
        return {
            // Moving averages
            sma15: this.indicators.simpleMovingAverage(ratios, 15),
            sma30: this.indicators.simpleMovingAverage(ratios, Math.min(30, ratios.length)),
            ema15: this.indicators.exponentialMovingAverage(ratios, 15),
            
            // Statistical measures
            mean: this.indicators.mean(ratios),
            standardDeviation: this.indicators.standardDeviation(ratios),
            variance: this.indicators.variance(ratios),
            
            // Volatility and momentum
            volatility: this.indicators.volatility(ratios),
            momentum: this.indicators.momentum(ratios, 5),
            rateOfChange: this.indicators.rateOfChange(ratios, 10),
            
            // Range and extremes
            highest: Math.max(...ratios),
            lowest: Math.min(...ratios),
            range: Math.max(...ratios) - Math.min(...ratios),
            
            // Sample size
            dataPoints: ratios.length
        };
    }

    /**
     * Calculate Z-score for current ratio vs historical mean
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Object} technicalData - Technical indicators
     * @returns {number} Z-score
     * @private
     */
    calculateZScore(currentRatio, technicalData) {
        if (technicalData.standardDeviation === 0) {
            this.logger.warn('Standard deviation is zero, returning neutral Z-score');
            return 0;
        }

        const zScore = (currentRatio - technicalData.mean) / technicalData.standardDeviation;
        
        this.logger.debug('Z-score calculated', {
            currentRatio,
            mean: technicalData.mean,
            stdDev: technicalData.standardDeviation,
            zScore
        });

        return zScore;
    }

    /**
     * Assess current market conditions for risk adjustment
     * @param {Object} currentMarket - Current market data
     * @param {Array} marketHistory - Historical data
     * @returns {Object} Market condition assessment
     * @private
     */
    assessMarketConditions(currentMarket, marketHistory) {
        const recentData = marketHistory.slice(0, 5); // Last 5 data points
        const recentVolatility = this.indicators.volatility(recentData.map(m => m.eth_btc_ratio));
        
        // Volume analysis
        const avgVolume = marketHistory.reduce((sum, m) => sum + (m.eth_btc_volume_24h || 0), 0) / marketHistory.length;
        const currentVolumeRatio = (currentMarket.eth_btc_volume_24h || avgVolume) / avgVolume;
        
        return {
            // Volatility assessment
            volatility: recentVolatility,
            volatilityLevel: recentVolatility > 0.05 ? 'high' : recentVolatility > 0.02 ? 'medium' : 'low',
            
            // Volume analysis
            volumeRatio: currentVolumeRatio,
            volumeLevel: currentVolumeRatio > 1.5 ? 'high' : currentVolumeRatio > 0.8 ? 'normal' : 'low',
            
            // Market spread (if available)
            spread: currentMarket.eth_btc_spread || 0,
            spreadLevel: (currentMarket.eth_btc_spread || 0) > 0.5 ? 'wide' : 'normal',
            
            // Data quality
            dataQuality: currentMarket.data_quality || 1.0,
            
            // Trend analysis
            trend: this.determineTrend(marketHistory),
            
            // Market session (could be expanded for different timezone considerations)
            marketSession: this.getMarketSession()
        };
    }

    /**
     * Determine market trend from recent data
     * @param {Array} marketHistory - Historical market data
     * @returns {string} Trend direction
     * @private
     */
    determineTrend(marketHistory) {
        if (marketHistory.length < 10) return 'neutral';
        
        const recent = marketHistory.slice(0, 10).map(m => m.eth_btc_ratio);
        const slope = this.indicators.linearRegression(recent).slope;
        
        if (slope > 0.0001) return 'upward';
        if (slope < -0.0001) return 'downward';
        return 'sideways';
    }

    /**
     * Get current market session for timing considerations
     * @returns {string} Market session
     * @private
     */
    getMarketSession() {
        const hour = new Date().getUTCHours();
        
        // Simplified market session (crypto trades 24/7 but has volume patterns)
        if (hour >= 1 && hour < 7) return 'asian';
        if (hour >= 7 && hour < 15) return 'european';
        if (hour >= 15 && hour < 22) return 'american';
        return 'overnight';
    }

    /**
     * Apply risk adjustments to base signal
     * @param {Object} baseSignal - Base signal from strategy
     * @param {Object} marketConditions - Market condition assessment
     * @param {Object} portfolio - Portfolio state
     * @returns {Object} Risk-adjusted signal
     * @private
     */
    applyRiskAdjustments(baseSignal, marketConditions, portfolio) {
        let adjustedConfidence = baseSignal.confidence;
        let adjustedShouldTrade = baseSignal.shouldTrade;
        const adjustments = [];

        // Volatility adjustment
        if (marketConditions.volatilityLevel === 'high') {
            adjustedConfidence *= 0.8; // Reduce confidence in high volatility
            adjustments.push('High volatility: -20% confidence');
        }

        // Volume adjustment
        if (marketConditions.volumeLevel === 'low') {
            adjustedConfidence *= 0.9; // Reduce confidence in low volume
            adjustments.push('Low volume: -10% confidence');
        }

        // Spread adjustment
        if (marketConditions.spreadLevel === 'wide') {
            adjustedConfidence *= 0.85; // Wide spreads indicate poor liquidity
            adjustments.push('Wide spread: -15% confidence');
        }

        // Data quality adjustment
        if (marketConditions.dataQuality < 0.9) {
            adjustedConfidence *= marketConditions.dataQuality;
            adjustments.push(`Low data quality: -${((1 - marketConditions.dataQuality) * 100).toFixed(0)}% confidence`);
        }

        // Portfolio balance check (avoid over-concentration)
        const portfolioValue = portfolio.eth_amount + portfolio.btc_amount; // Simplified
        if (portfolioValue < 0.001) { // Very small portfolio
            adjustedShouldTrade = false;
            adjustments.push('Portfolio too small for trading');
        }

        // Final confidence threshold
        if (adjustedConfidence < 0.6) {
            adjustedShouldTrade = false;
            adjustments.push('Adjusted confidence below threshold');
        }

        return {
            ...baseSignal,
            confidence: Math.max(0, Math.min(1, adjustedConfidence)),
            shouldTrade: adjustedShouldTrade,
            riskAdjustments: adjustments,
            originalConfidence: baseSignal.confidence
        };
    }

    /**
     * Add comprehensive reasoning to the signal
     * @param {Object} signal - Risk-adjusted signal
     * @param {Object} context - Context data for reasoning
     * @returns {Object} Signal with detailed reasoning
     * @private
     */
    addSignalReasoning(signal, context) {
        const { zScore, technicalData, marketConditions, currentMarket } = context;
        
        let reasoning = [];

        // Z-score reasoning
        if (Math.abs(zScore) > 2) {
            reasoning.push(`Extreme Z-score (${zScore.toFixed(3)}) indicates strong mean reversion opportunity`);
        } else if (Math.abs(zScore) > 1) {
            reasoning.push(`Moderate Z-score (${zScore.toFixed(3)}) suggests potential rebalancing`);
        } else {
            reasoning.push(`Neutral Z-score (${zScore.toFixed(3)}) indicates ratio near historical mean`);
        }

        // Market condition reasoning
        if (marketConditions.volatilityLevel === 'high') {
            reasoning.push('High market volatility may create better entry/exit opportunities');
        }

        if (marketConditions.trend !== 'sideways') {
            reasoning.push(`Market trending ${marketConditions.trend}, consider momentum factors`);
        }

        // Risk adjustment reasoning
        if (signal.riskAdjustments && signal.riskAdjustments.length > 0) {
            reasoning.push(`Risk adjustments applied: ${signal.riskAdjustments.join(', ')}`);
        }

        return {
            ...signal,
            reasoning: reasoning.join('. '),
            zScore,
            meanRatio: technicalData.mean,
            stdDev: technicalData.standardDeviation,
            marketConditions: {
                volatility: marketConditions.volatilityLevel,
                volume: marketConditions.volumeLevel,
                trend: marketConditions.trend
            }
        };
    }
}
