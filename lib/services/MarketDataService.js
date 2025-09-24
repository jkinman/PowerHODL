/**
 * Market Data Service
 * 
 * Handles all market data collection and technical indicator calculations.
 * Implements clean separation of concerns with error handling and logging.
 */

import ccxt from 'ccxt';
import { Logger } from '../utils/Logger.js';
import { TechnicalIndicators } from '../utils/TechnicalIndicators.js';

export class MarketDataService {
    constructor() {
        this.logger = new Logger('MarketDataService');
        this.exchange = null;
        this.initializeExchange();
    }

    /**
     * Initialize Binance exchange connection
     * @private
     */
    initializeExchange() {
        try {
            this.exchange = new ccxt.binance({
                apiKey: process.env.BINANCE_API_KEY,
                secret: process.env.BINANCE_SECRET,
                enableRateLimit: true,
                timeout: 30000,
                options: {
                    defaultType: 'spot',
                    adjustForTimeDifference: true
                }
            });
            
            this.logger.info('Binance exchange initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Binance exchange', error);
            throw new Error(`Exchange initialization failed: ${error.message}`);
        }
    }

    /**
     * Get current market data from Binance
     * @returns {Promise<Object>} Market data with prices and volumes
     */
    async getCurrentMarketData() {
        try {
            this.logger.debug('Fetching current market data from Binance');

            // Fetch all required tickers in parallel for speed
            const [ethBtcTicker, ethUsdTicker, btcUsdTicker] = await Promise.all([
                this.exchange.fetchTicker('ETH/BTC'),
                this.exchange.fetchTicker('ETH/USDT'),
                this.exchange.fetchTicker('BTC/USDT')
            ]);

            const marketData = {
                // Core price data
                ethBtcRatio: ethBtcTicker.last,
                ethPriceUsd: ethUsdTicker.last,
                btcPriceUsd: btcUsdTicker.last,

                // Volume data (24h)
                ethVolume24h: ethUsdTicker.baseVolume,
                btcVolume24h: btcUsdTicker.baseVolume,
                ethBtcVolume24h: ethBtcTicker.baseVolume,

                // Spread and liquidity indicators
                ethBtcSpread: ((ethBtcTicker.ask - ethBtcTicker.bid) / ethBtcTicker.bid) * 100,
                
                // Data quality and timing
                dataQuality: this.calculateDataQuality(ethBtcTicker, ethUsdTicker, btcUsdTicker),
                source: 'binance',
                timestamp: new Date().toISOString()
            };

            this.logger.debug('Market data fetched successfully', {
                ethBtcRatio: marketData.ethBtcRatio,
                ethPrice: marketData.ethPriceUsd,
                btcPrice: marketData.btcPriceUsd,
                dataQuality: marketData.dataQuality
            });

            return marketData;

        } catch (error) {
            this.logger.error('Failed to fetch market data', error);
            throw new Error(`Market data fetch failed: ${error.message}`);
        }
    }

    /**
     * Calculate technical indicators for current market data
     * @param {Object} currentMarket - Current market data
     * @returns {Promise<Object>} Technical indicators
     */
    async calculateTechnicalIndicators(currentMarket) {
        try {
            this.logger.debug('Calculating technical indicators');

            // This would typically require historical data from database
            // For now, we'll use simplified calculations
            
            // Note: In production, you'd get historical ratios from database
            // const historicalRatios = await this.getHistoricalRatios(30);
            
            // Simplified indicators for current implementation
            const indicators = {
                // Z-score (will be calculated properly with historical data)
                zScore: 0, // Placeholder - calculated in SignalGenerationService with full history
                
                // Simple moving averages (would need historical data)
                sma15: currentMarket.ethBtcRatio, // Placeholder
                sma30: currentMarket.ethBtcRatio, // Placeholder
                
                // Volatility estimate (simplified)
                volatility: this.estimateVolatility(currentMarket),
                
                // RSI (simplified - would need 14+ periods)
                rsi: 50, // Neutral placeholder
                
                // Current ratio momentum
                momentum: 0, // Would need previous values
                
                // Data timestamp
                calculatedAt: new Date().toISOString()
            };

            this.logger.debug('Technical indicators calculated', {
                volatility: indicators.volatility,
                sma15: indicators.sma15
            });

            return indicators;

        } catch (error) {
            this.logger.error('Failed to calculate technical indicators', error);
            throw new Error(`Technical indicator calculation failed: ${error.message}`);
        }
    }

    /**
     * Calculate data quality score based on ticker freshness and completeness
     * @param {...Object} tickers - Ticker objects from exchange
     * @returns {number} Quality score between 0 and 1
     * @private
     */
    calculateDataQuality(...tickers) {
        let qualityScore = 1.0;

        for (const ticker of tickers) {
            // Check for missing data
            if (!ticker.last || !ticker.bid || !ticker.ask || !ticker.baseVolume) {
                qualityScore -= 0.2;
            }

            // Check timestamp freshness (if available)
            if (ticker.timestamp) {
                const age = Date.now() - ticker.timestamp;
                if (age > 60000) { // More than 1 minute old
                    qualityScore -= 0.1;
                }
            }

            // Check spread reasonableness
            if (ticker.bid && ticker.ask) {
                const spread = (ticker.ask - ticker.bid) / ticker.bid;
                if (spread > 0.01) { // More than 1% spread
                    qualityScore -= 0.1;
                }
            }
        }

        return Math.max(0, qualityScore);
    }

    /**
     * Estimate current volatility based on spread and volume
     * @param {Object} marketData - Current market data
     * @returns {number} Volatility estimate
     * @private
     */
    estimateVolatility(marketData) {
        // Simple volatility estimation
        // In production, you'd calculate this from historical price movements
        const baseVolatility = 0.02; // 2% base volatility for crypto
        const spreadMultiplier = Math.max(1, marketData.ethBtcSpread / 0.1); // Adjust for spread
        
        return baseVolatility * spreadMultiplier;
    }

    /**
     * Test exchange connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            this.logger.info('Testing exchange connection');
            
            await this.exchange.loadMarkets();
            const ticker = await this.exchange.fetchTicker('ETH/BTC');
            
            this.logger.info('Exchange connection test successful', {
                ethBtcPrice: ticker.last
            });
            
            return true;
        } catch (error) {
            this.logger.error('Exchange connection test failed', error);
            return false;
        }
    }

    /**
     * Get exchange status and limits
     * @returns {Promise<Object>} Exchange status information
     */
    async getExchangeStatus() {
        try {
            const status = await this.exchange.fetchStatus();
            const markets = await this.exchange.loadMarkets();
            
            return {
                status: status.status,
                updated: status.updated,
                markets: Object.keys(markets).length,
                ethBtcMarket: markets['ETH/BTC'] ? 'Available' : 'Not Available',
                rateLimits: this.exchange.rateLimit
            };
        } catch (error) {
            this.logger.error('Failed to get exchange status', error);
            throw error;
        }
    }
}
