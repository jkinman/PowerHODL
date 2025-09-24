/**
 * Market Monitor Cron Job
 * 
 * Runs every 5 minutes to:
 * - Collect current market data from Binance
 * - Calculate technical indicators (Z-score, moving averages)
 * - Store market snapshot in database
 * - Trigger signal generation if conditions are met
 * 
 * Schedule: Every 5 minutes (cron format)
 */

import { MarketDataService } from '../../lib/services/MarketDataService.js';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import { Logger } from '../../lib/utils/Logger.js';
import { CronValidator } from '../../lib/utils/CronValidator.js';

const logger = new Logger('MarketMonitor');

export default async function handler(req, res) {
    // Validate this is a legitimate cron request
    if (!CronValidator.isValidCronRequest(req)) {
        return res.status(401).json({ error: 'Unauthorized cron request' });
    }

    const startTime = Date.now();
    logger.info('🔍 Market monitoring started');

    try {
        // Initialize services
        const marketService = new MarketDataService();
        const dbService = new DatabaseService();

        // Step 1: Collect current market data from Binance
        const marketData = await marketService.getCurrentMarketData();
        logger.info('📊 Market data collected', {
            ethBtcRatio: marketData.ethBtcRatio,
            ethPrice: marketData.ethPriceUsd,
            btcPrice: marketData.btcPriceUsd
        });

        // Step 2: Calculate technical indicators (with historical data if available)
        const historicalData = await dbService.getRecentMarketData(30);
        const indicators = await marketService.calculateTechnicalIndicators(marketData, historicalData);
        logger.info('📈 Technical indicators calculated', {
            dataPoints: historicalData.length,
            zScore: indicators.zScore ? indicators.zScore.toFixed(4) : 'N/A',
            sma15: indicators.sma15 ? indicators.sma15.toFixed(6) : 'N/A',
            volatility: indicators.volatility.toFixed(4)
        });

        // Step 3: Create market snapshot
        const snapshot = {
            ...marketData,
            ...indicators,
            collected_at: new Date().toISOString()
        };

        // Step 4: Store in database
        await dbService.insertMarketSnapshot(snapshot);
        logger.info('💾 Market snapshot saved to database');

        // Step 5: Check if we should trigger signal generation
        const shouldGenerateSignal = Math.abs(indicators.zScore) > 0.5; // Pre-filter
        
        if (shouldGenerateSignal) {
            logger.info('🚨 High Z-score detected, signal generation may be triggered');
        }

        const executionTime = Date.now() - startTime;
        logger.info(`✅ Market monitoring completed in ${executionTime}ms`);

        // Return success response
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            executionTime,
            data: {
                ethBtcRatio: marketData.ethBtcRatio,
                zScore: indicators.zScore,
                shouldGenerateSignal,
                snapshotId: snapshot.id
            }
        });

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('❌ Market monitoring failed', {
            error: error.message,
            stack: error.stack,
            executionTime
        });

        // Log error to database for monitoring
        try {
            const dbService = new DatabaseService();
            await dbService.logSystemEvent({
                event_type: 'cron_error',
                severity: 'error',
                message: `Market monitor failed: ${error.message}`,
                metadata: {
                    function: 'market-monitor',
                    executionTime,
                    stack: error.stack
                }
            });
        } catch (logError) {
            logger.error('Failed to log error to database', logError);
        }

        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            executionTime
        });
    }
}
