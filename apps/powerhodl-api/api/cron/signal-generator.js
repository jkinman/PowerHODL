/**
 * Signal Generator Cron Job
 * 
 * Executes periodically to generate trading signals based on market conditions.
 * Uses the same SimpleStrategy as backtesting for consistency.
 * 
 * Schedule: Every 5 minutes (H/5 * * * *)
 */

import { Logger } from '../../lib/utils/Logger.js';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import { SimpleStrategy } from '../../src/SimpleStrategy.js';
import { CronValidator } from '../../lib/utils/CronValidator.js';

const logger = new Logger('SignalCron');

/**
 * Cron job handler for signal generation
 */
export default async function handler(req, res) {
    // Validate cron request
    if (!CronValidator.isValid(req)) {
        logger.warn('Invalid cron request detected', { 
            headers: req.headers,
            ip: req.ip 
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('🎯 Signal generation started');

    try {
        // Initialize services
        const strategy = new SimpleStrategy();
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
        const marketHistory = await dbService.getRecentMarketData(strategy.parameters.lookbackDays + 5);
        if (marketHistory.length < strategy.parameters.lookbackDays) {
            throw new Error(`Insufficient market data: ${marketHistory.length} points, need at least ${strategy.parameters.lookbackDays}`);
        }

        const latestMarket = marketHistory[0]; // Most recent data
        logger.info('📊 Market data retrieved', {
            dataPoints: marketHistory.length,
            latestRatio: latestMarket.eth_btc_ratio,
            parameters: strategy.parameters
        });

        // Step 3: Extract ratios for signal generation
        const historicalRatios = marketHistory.map(m => m.eth_btc_ratio);
        const currentRatio = latestMarket.eth_btc_ratio;

        // Step 4: Generate trading signal using the same logic as backtesting
        const signal = strategy.generateSignal(currentRatio, historicalRatios);
        
        logger.info('🎯 Trading signal generated', {
            action: signal.action,
            shouldTrade: signal.shouldTrade,
            confidence: signal.confidence * 100,
            zScore: signal.zScore.toFixed(4),
            reasoning: signal.reasoning
        });

        // Step 5: Calculate current portfolio allocation
        const allocation = strategy.calculateAllocation(
            portfolio.eth_amount,
            portfolio.btc_amount,
            currentRatio
        );

        // Step 6: Store signal in database
        const signalRecord = {
            action: signal.action,
            should_trade: signal.shouldTrade,
            confidence: signal.confidence,
            z_score: signal.zScore,
            eth_btc_ratio: currentRatio,
            eth_price_usd: latestMarket.eth_price_usd,
            btc_price_usd: latestMarket.btc_price_usd,
            portfolio_id: portfolio.id,
            portfolio_btc_value: allocation.totalValueBTC,
            eth_percentage: allocation.ethPercentage,
            btc_percentage: allocation.btcPercentage,
            parameters_used: JSON.stringify(signal.parameters),
            reasoning: signal.reasoning,
            created_at: new Date()
        };

        const savedSignal = await dbService.insertTradingSignal(signalRecord);
        logger.info('💾 Signal stored in database', { signalId: savedSignal.id });

        // Step 7: Check if action is needed and not already executed
        if (signal.shouldTrade) {
            // Check if we've already executed a similar trade recently
            const recentTrades = await dbService.getRecentTrades(1);
            const lastTrade = recentTrades[0];
            
            if (lastTrade) {
                const timeSinceLastTrade = Date.now() - new Date(lastTrade.executed_at).getTime();
                const minTimeBetweenTrades = 5 * 60 * 1000; // 5 minutes
                
                if (timeSinceLastTrade < minTimeBetweenTrades) {
                    logger.info('⏰ Skipping trade - too soon since last trade', {
                        lastTradeTime: lastTrade.executed_at,
                        minutesAgo: (timeSinceLastTrade / 60000).toFixed(1)
                    });
                    signal.shouldTrade = false;
                    signal.reasoning += ' (Trade skipped - cooldown period)';
                }
            }
        }

        // Step 8: Return comprehensive response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            signal: {
                action: signal.action,
                shouldTrade: signal.shouldTrade,
                confidence: signal.confidence,
                zScore: signal.zScore,
                reasoning: signal.reasoning
            },
            market: {
                ethBtcRatio: currentRatio,
                ethPriceUsd: latestMarket.eth_price_usd,
                btcPriceUsd: latestMarket.btc_price_usd
            },
            portfolio: {
                ethAmount: portfolio.eth_amount,
                btcAmount: portfolio.btc_amount,
                totalValueBTC: allocation.totalValueBTC,
                ethPercentage: allocation.ethPercentage,
                needsRebalancing: allocation.needsRebalancing
            },
            parameters: signal.parameters,
            metadata: {
                dataPoints: marketHistory.length,
                signalId: savedSignal.id,
                executionTimeMs: Date.now() - new Date().getTime()
            }
        };

        logger.info('✅ Signal generation completed successfully');
        return res.status(200).json(response);

    } catch (error) {
        logger.error('❌ Signal generation failed', { 
            error: error.message,
            stack: error.stack 
        });

        return res.status(500).json({
            success: false,
            error: 'Signal generation failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}