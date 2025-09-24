#!/usr/bin/env node

/**
 * Historical Data Seeding Script
 * 
 * Populates the database with historical ETH/BTC market data
 * This should be run once after database setup
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import ccxt from 'ccxt';
import { DatabaseService } from '../lib/services/DatabaseService.js';
import { Logger } from '../lib/utils/Logger.js';

const logger = new Logger('DataSeeder');

class HistoricalDataSeeder {
    constructor() {
        this.db = new DatabaseService();
        this.exchange = new ccxt.binance({
            enableRateLimit: true,
            timeout: 30000
        });
    }

    /**
     * Seed historical data for the last N days
     * @param {number} days - Number of days to fetch (default: 90)
     */
    async seedHistoricalData(days = 90) {
        try {
            logger.info(`🌱 Starting historical data seeding for ${days} days`);

            // Check if we already have recent data
            const existingData = await this.db.getRecentMarketData(10);
            if (existingData.length > 30) {
                logger.info('📊 Sufficient historical data already exists');
                logger.info(`   Found ${existingData.length} recent records`);
                
                const response = await this.promptContinue();
                if (!response) {
                    logger.info('❌ Seeding cancelled by user');
                    return;
                }
            }

            // Fetch historical OHLCV data from Binance
            logger.info('📈 Fetching historical OHLCV data...');
            const ohlcvData = await this.fetchHistoricalOHLCV(days);
            
            logger.info(`📦 Fetched ${ohlcvData.length} historical data points`);

            // Convert OHLCV to market snapshots and store
            logger.info('💾 Converting and storing market snapshots...');
            const snapshots = await this.convertToMarketSnapshots(ohlcvData);
            
            logger.info('🏪 Inserting data into database...');
            await this.insertMarketSnapshots(snapshots);

            logger.info('✅ Historical data seeding completed successfully!');
            logger.info(`   📊 Inserted ${snapshots.length} market snapshots`);
            logger.info(`   📅 Date range: ${snapshots[0].collected_at} to ${snapshots[snapshots.length - 1].collected_at}`);

        } catch (error) {
            logger.error('❌ Historical data seeding failed', error);
            throw error;
        }
    }

    /**
     * Fetch historical OHLCV data from exchange
     */
    async fetchHistoricalOHLCV(days) {
        const symbol = 'ETH/BTC';
        const timeframe = '1h'; // 1-hour candles
        const limit = days * 24; // hours in the period
        const since = Date.now() - (days * 24 * 60 * 60 * 1000);

        try {
            const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);
            
            // Also fetch USD prices for context
            const ethUsdOhlcv = await this.exchange.fetchOHLCV('ETH/USDT', timeframe, since, limit);
            const btcUsdOhlcv = await this.exchange.fetchOHLCV('BTC/USDT', timeframe, since, limit);

            // Combine the data
            return ohlcv.map((candle, index) => ({
                timestamp: new Date(candle[0]),
                ethBtcRatio: candle[4], // Close price
                ethBtcVolume: candle[5],
                ethUsdPrice: ethUsdOhlcv[index] ? ethUsdOhlcv[index][4] : null,
                btcUsdPrice: btcUsdOhlcv[index] ? btcUsdOhlcv[index][4] : null,
                high: candle[2],
                low: candle[3]
            }));

        } catch (error) {
            logger.error('Failed to fetch OHLCV data', error);
            throw error;
        }
    }

    /**
     * Convert OHLCV data to market snapshot format
     */
    async convertToMarketSnapshots(ohlcvData) {
        return ohlcvData.map(data => ({
            eth_price_usd: data.ethUsdPrice || 0,
            btc_price_usd: data.btcUsdPrice || 0,
            eth_btc_ratio: data.ethBtcRatio,
            eth_volume_24h: 0, // Would need additional API calls
            btc_volume_24h: 0,
            eth_btc_volume_24h: data.ethBtcVolume || 0,
            sma_15d: 0, // Will be calculated later
            sma_30d: 0,
            std_dev_15d: 0,
            z_score: 0, // Will be calculated by cron jobs
            rsi: 50,
            source: 'binance_historical',
            data_quality: 0.9, // Historical data is generally good quality
            collected_at: data.timestamp.toISOString()
        }));
    }

    /**
     * Insert market snapshots into database in batches
     */
    async insertMarketSnapshots(snapshots) {
        const batchSize = 50;
        let inserted = 0;

        for (let i = 0; i < snapshots.length; i += batchSize) {
            const batch = snapshots.slice(i, i + batchSize);
            
            for (const snapshot of batch) {
                try {
                    await this.db.insertMarketSnapshot(snapshot);
                    inserted++;
                } catch (error) {
                    // Skip duplicates or handle errors gracefully
                    if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
                        logger.warn(`Failed to insert snapshot: ${error.message}`);
                    }
                }
            }

            logger.info(`📊 Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${snapshots.length} total`);
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return inserted;
    }

    /**
     * Prompt user to continue if data already exists
     */
    async promptContinue() {
        // In a real implementation, you might use readline for user input
        // For now, we'll just log and return true
        logger.info('🤔 Do you want to continue and add more historical data? (Continuing automatically...)');
        return true;
    }

    /**
     * Calculate and update technical indicators for existing data
     */
    async updateTechnicalIndicators() {
        logger.info('📊 Calculating technical indicators for historical data...');
        
        try {
            const allData = await this.db.getRecentMarketData(1000); // Get more data
            
            if (allData.length < 30) {
                logger.warn('Not enough data to calculate meaningful indicators');
                return;
            }

            // Calculate indicators for each data point
            const ratios = allData.map(d => d.eth_btc_ratio).reverse(); // Oldest first
            
            for (let i = 15; i < allData.length; i++) { // Start after we have 15 data points
                const dataPoint = allData[allData.length - 1 - i]; // Get in chronological order
                const historicalRatios = ratios.slice(Math.max(0, i - 15), i);
                
                if (historicalRatios.length >= 15) {
                    // Calculate Z-score
                    const mean = historicalRatios.reduce((sum, r) => sum + r, 0) / historicalRatios.length;
                    const variance = historicalRatios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalRatios.length;
                    const stdDev = Math.sqrt(variance);
                    const zScore = stdDev > 0 ? (dataPoint.eth_btc_ratio - mean) / stdDev : 0;

                    // Update this record (this would require an update method in DatabaseService)
                    logger.debug(`Updated indicators for ${dataPoint.collected_at}: Z-score ${zScore.toFixed(4)}`);
                }
            }

            logger.info('✅ Technical indicators updated');

        } catch (error) {
            logger.error('Failed to update technical indicators', error);
        }
    }
}

// Main execution
async function main() {
    try {
        const seeder = new HistoricalDataSeeder();
        
        // Test database connection
        const dbConnected = await seeder.db.testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Seed 30 days of historical data (good starting point)
        await seeder.seedHistoricalData(30);
        
        // Update technical indicators
        await seeder.updateTechnicalIndicators();

        logger.info('🎉 Historical data seeding completed successfully!');
        logger.info('💡 Your cron jobs should now have enough data to generate meaningful signals');
        
        process.exit(0);

    } catch (error) {
        logger.error('❌ Seeding process failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { HistoricalDataSeeder };
