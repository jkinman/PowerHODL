/**
 * Trade Executor Cron Job
 * 
 * Runs every 5 minutes to:
 * - Check for pending strong signals
 * - Execute trades on Binance exchange
 * - Record trade results and update portfolio
 * - Handle errors and risk management
 * 
 * Schedule: */5 * * * * (every 5 minutes)
 */

import { TradeExecutionService } from '../../lib/services/TradeExecutionService.js';
import { DatabaseService } from '../../lib/services/DatabaseService.js';
import { RiskManager } from '../../lib/services/RiskManager.js';
import { Logger } from '../../lib/utils/Logger.js';
import { CronValidator } from '../../lib/utils/CronValidator.js';

const logger = new Logger('TradeExecutor');

export default async function handler(req, res) {
    // Validate cron request
    if (!CronValidator.isValidCronRequest(req)) {
        return res.status(401).json({ error: 'Unauthorized cron request' });
    }

    const startTime = Date.now();
    logger.info('🔄 Trade execution started');

    try {
        // Initialize services
        const tradeService = new TradeExecutionService();
        const dbService = new DatabaseService();
        const riskManager = new RiskManager();

        // Step 1: Check for executable signals (strong signals from last 10 minutes)
        const executableSignals = await dbService.getExecutableSignals(10); // Last 10 minutes
        
        if (executableSignals.length === 0) {
            logger.info('😴 No executable signals found');
            return res.status(200).json({
                success: true,
                message: 'No signals to execute',
                timestamp: new Date().toISOString(),
                executionTime: Date.now() - startTime
            });
        }

        logger.info(`🎯 Found ${executableSignals.length} executable signal(s)`);

        // Step 2: Get active portfolio and current balances
        const portfolio = await dbService.getActivePortfolio();
        if (!portfolio) {
            throw new Error('No active portfolio found');
        }

        // Step 3: Risk management checks
        const riskCheck = await riskManager.validateTradeExecution(portfolio, executableSignals);
        if (!riskCheck.canTrade) {
            logger.warn('⚠️ Trade blocked by risk management', {
                reason: riskCheck.reason,
                details: riskCheck.details
            });
            
            // Mark signals as skipped
            for (const signal of executableSignals) {
                await dbService.updateTradingSignal(signal.id, {
                    trade_executed: false,
                    skip_reason: riskCheck.reason
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Trade blocked by risk management',
                reason: riskCheck.reason,
                timestamp: new Date().toISOString(),
                executionTime: Date.now() - startTime
            });
        }

        // Step 4: Execute trades for each signal
        const tradeResults = [];
        
        for (const signal of executableSignals) {
            try {
                logger.info('🚀 Executing trade', {
                    signalId: signal.id,
                    action: signal.signal_type,
                    confidence: signal.confidence
                });

                // Execute the trade
                const tradeResult = await tradeService.executeTrade(signal, portfolio);
                
                if (tradeResult.success) {
                    // Record successful trade
                    const tradeRecord = await dbService.insertTrade({
                        portfolio_id: portfolio.id,
                        signal_id: signal.id,
                        trade_type: signal.signal_type,
                        
                        // Market data
                        eth_price_usd: tradeResult.marketData.ethPriceUsd,
                        btc_price_usd: tradeResult.marketData.btcPriceUsd,
                        eth_btc_ratio: signal.eth_btc_ratio,
                        z_score: signal.z_score,
                        signal_strength: signal.confidence,
                        
                        // Trade execution
                        eth_amount_before: tradeResult.balances.ethBefore,
                        btc_amount_before: tradeResult.balances.btcBefore,
                        eth_amount_after: tradeResult.balances.ethAfter,
                        btc_amount_after: tradeResult.balances.btcAfter,
                        
                        // Trade details
                        trade_value_usd: tradeResult.order.cost,
                        trade_value_btc: tradeResult.order.cost / tradeResult.marketData.btcPriceUsd,
                        fees_usd: tradeResult.order.fee?.cost || 0,
                        fees_btc: (tradeResult.order.fee?.cost || 0) / tradeResult.marketData.btcPriceUsd,
                        
                        // Exchange info
                        exchange_name: 'binance',
                        exchange_order_id: tradeResult.order.id,
                        execution_time_ms: tradeResult.executionTime,
                        
                        executed_at: new Date().toISOString()
                    });

                    // Update signal as executed
                    await dbService.updateTradingSignal(signal.id, {
                        trade_executed: true,
                        trade_id: tradeRecord.id
                    });

                    // Update portfolio balances
                    await dbService.updatePortfolio(portfolio.id, {
                        eth_amount: tradeResult.balances.ethAfter,
                        btc_amount: tradeResult.balances.btcAfter,
                        updated_at: new Date().toISOString()
                    });

                    logger.info('✅ Trade executed successfully', {
                        tradeId: tradeRecord.id,
                        orderId: tradeResult.order.id,
                        amount: tradeResult.order.amount,
                        price: tradeResult.order.price
                    });

                    tradeResults.push({
                        signalId: signal.id,
                        tradeId: tradeRecord.id,
                        success: true,
                        order: {
                            id: tradeResult.order.id,
                            amount: tradeResult.order.amount,
                            price: tradeResult.order.price,
                            cost: tradeResult.order.cost
                        }
                    });

                } else {
                    // Handle failed trade
                    logger.error('❌ Trade execution failed', {
                        signalId: signal.id,
                        error: tradeResult.error
                    });

                    // Mark signal as failed
                    await dbService.updateTradingSignal(signal.id, {
                        trade_executed: false,
                        skip_reason: `Execution failed: ${tradeResult.error}`
                    });

                    tradeResults.push({
                        signalId: signal.id,
                        success: false,
                        error: tradeResult.error
                    });
                }

            } catch (error) {
                logger.error('❌ Trade execution error', {
                    signalId: signal.id,
                    error: error.message
                });

                // Mark signal as error
                await dbService.updateTradingSignal(signal.id, {
                    trade_executed: false,
                    skip_reason: `Error: ${error.message}`
                });

                tradeResults.push({
                    signalId: signal.id,
                    success: false,
                    error: error.message
                });
            }
        }

        const executionTime = Date.now() - startTime;
        const successfulTrades = tradeResults.filter(r => r.success).length;
        
        logger.info(`✅ Trade execution completed in ${executionTime}ms`, {
            totalSignals: executableSignals.length,
            successfulTrades,
            failedTrades: tradeResults.length - successfulTrades
        });

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            executionTime,
            summary: {
                signalsProcessed: executableSignals.length,
                tradesExecuted: successfulTrades,
                tradesFailed: tradeResults.length - successfulTrades
            },
            trades: tradeResults
        });

    } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error('❌ Trade execution failed', {
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
                message: `Trade execution failed: ${error.message}`,
                metadata: {
                    function: 'trade-executor',
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
