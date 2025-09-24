/**
 * Signal Generator Cron Job
 * 
 * Runs every 5 minutes to:
 * - Analyze market conditions using mega-optimal strategy
 * - Generate trading signals (BUY/SELL/HOLD)
 * - Store signals in database
 * - Trigger trade execution for strong signals
 * 
 * Schedule: Every 5 minutes (cron format)
 */

import { SignalGenerationService } from '../../lib/services/SignalGenerationService.js';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import { Logger } from '../../lib/utils/Logger.js';
import { CronValidator } from '../../lib/utils/CronValidator.js';

const logger = new Logger('SignalGenerator');

export default async function handler(req, res) {
    // Validate cron request
    if (!CronValidator.isValidCronRequest(req)) {
        return res.status(401).json({ error: 'Unauthorized cron request' });
    }

    const startTime = Date.now();
    logger.info('🎯 Signal generation started');

    try {
        // Initialize services
        const signalService = new SignalGenerationService();
        const dbService = new DatabaseService();

        // Step 1: Get active portfolio
        const portfolio = await dbService.getActivePortfolio();
        if (!portfolio) {
            throw new Error('No active portfolio found');
        }

        logger.info('💼 Active portfolio loaded', {
            portfolioId: portfolio.id,
            ethAmount: portfolio.eth_amount,
            btcAmount: portfolio.btc_amount
        });

        // Step 2: Get recent market data for analysis
        const marketHistory = await dbService.getRecentMarketData(30); // 30 data points
        if (marketHistory.length < 15) {
            throw new Error(`Insufficient market data: ${marketHistory.length} points, need at least 15`);
        }

        const latestMarket = marketHistory[0]; // Most recent data
        logger.info('📊 Market data retrieved', {
            dataPoints: marketHistory.length,
            latestRatio: latestMarket.eth_btc_ratio,
            latestZScore: latestMarket.z_score
        });

        // Step 3: Generate trading signal using mega-optimal strategy
        const signal = await signalService.generateSignal(latestMarket, marketHistory, portfolio);
        
        logger.info('🎯 Trading signal generated', {
            action: signal.action,
            shouldTrade: signal.shouldTrade,
            confidence: signal.confidence,
            zScore: signal.zScore.toFixed(4)
        });

        // Step 4: Store signal in database
        const signalRecord = {
            portfolio_id: portfolio.id,
            signal_type: signal.action,
            z_score: signal.zScore,
            confidence: signal.confidence,
            strength: signal.strength,
            eth_btc_ratio: latestMarket.eth_btc_ratio,
            mean_ratio: signal.meanRatio,
            std_dev: signal.stdDev,
            should_trade: signal.shouldTrade,
            reasoning: signal.reasoning,
            generated_at: new Date().toISOString()
        };

        const savedSignal = await dbService.insertTradingSignal(signalRecord);
        logger.info('💾 Signal saved to database', { signalId: savedSignal.id });

        // Step 5: Determine if trade should be executed
        let tradeResult = null;
        if (signal.shouldTrade && signal.confidence >= 0.7) {
            logger.info('🚀 Strong signal detected, trade execution will be triggered');
            // Note: Actual trade execution happens in separate cron job for better separation
            tradeResult = {
                willExecute: true,
                confidence: signal.confidence,
                action: signal.action
            };
        } else {
            logger.info('😴 Signal not strong enough for trade execution', {
                shouldTrade: signal.shouldTrade,
                confidence: signal.confidence,
                threshold: 0.7
            });
            tradeResult = {
                willExecute: false,
                reason: signal.shouldTrade ? 'Low confidence' : 'No signal'
            };
        }

        const executionTime = Date.now() - startTime;
        logger.info(`✅ Signal generation completed in ${executionTime}ms`);

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            executionTime,
            signal: {
                id: savedSignal.id,
                action: signal.action,
                shouldTrade: signal.shouldTrade,
                confidence: signal.confidence,
                zScore: signal.zScore,
                reasoning: signal.reasoning
            },
            trade: tradeResult
        });

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('❌ Signal generation failed', {
            error: error.message,
            stack: error.stack,
            executionTime
        });

        // Log error to database
        try {
            const dbService = new DatabaseService();
            await dbService.logSystemEvent({
                event_type: 'cron_error',
                severity: 'error',
                message: `Signal generation failed: ${error.message}`,
                metadata: {
                    function: 'signal-generator',
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
