/**
 * Database Service
 * 
 * Handles all database operations for the trading system.
 * Uses Neon serverless Postgres as the backend database.
 * 
 * CRITICAL CONCEPTS:
 * 
 * 1. POSTGRESQL NUMERIC TYPES
 *    - Postgres returns DECIMAL/NUMERIC as strings to prevent precision loss
 *    - ALWAYS use parseFloat() or Number() when reading numeric data
 *    - This is why we see '0.0404600000' instead of 0.04046
 * 
 * 2. REAL DATA IS ESSENTIAL
 *    - Backtesting is only valid with real historical market data
 *    - Simulated data can hide real-world behaviors (gaps, volatility clusters)
 *    - 4+ years of data needed to test different market regimes
 * 
 * 3. DATA CONSISTENCY
 *    - All timestamps should be ISO strings in UTC
 *    - Use collected_at for when data was gathered
 *    - Normalize all data formats in one place (see SimpleBacktestEngine)
 * 
 * 4. PERFORMANCE CONSIDERATIONS
 *    - Index on collected_at for time-based queries
 *    - Batch inserts for seeding large datasets
 *    - Connection pooling handled by Neon
 */

import { neon } from '@neondatabase/serverless';
import { Logger } from '../utils/Logger.js';

export class DatabaseService {
    constructor() {
        this.logger = new Logger('DatabaseService');
        this.sql = null;
        this.initialize();
    }

    /**
     * Initialize Neon database client
     * @private
     */
    initialize() {
        try {
            const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

            if (!databaseUrl) {
                throw new Error('Missing Neon database configuration. Set DATABASE_URL, NEON_DATABASE_URL, or POSTGRES_URL environment variable.');
            }

            this.sql = neon(databaseUrl);
            this.logger.info('Neon database client initialized');

        } catch (error) {
            this.logger.error('Failed to initialize Neon database client', error);
            throw error;
        }
    }

    /**
     * Insert market snapshot into database
     * @param {Object} snapshot - Market data snapshot
     * @returns {Promise<Object>} Inserted record
     */
    async insertMarketSnapshot(snapshot) {
        try {
            const result = await this.sql`
                INSERT INTO market_snapshots (
                    eth_price_usd, btc_price_usd, eth_btc_ratio, eth_volume_24h, 
                    btc_volume_24h, eth_btc_volume_24h, sma_15d, sma_30d, 
                    std_dev_15d, z_score, rsi, source, data_quality, collected_at
                ) VALUES (
                    ${snapshot.eth_price_usd}, ${snapshot.btc_price_usd}, ${snapshot.eth_btc_ratio},
                    ${snapshot.eth_volume_24h || 0}, ${snapshot.btc_volume_24h || 0}, ${snapshot.eth_btc_volume_24h || 0},
                    ${snapshot.sma_15d || 0}, ${snapshot.sma_30d || 0}, ${snapshot.std_dev_15d || 0},
                    ${snapshot.z_score || 0}, ${snapshot.rsi || 50}, ${snapshot.source || 'binance'},
                    ${snapshot.data_quality || 1.0}, ${snapshot.collected_at || new Date().toISOString()}
                ) RETURNING *
            `;

            const data = result[0];
            this.logger.debug('Market snapshot inserted', { id: data.id });
            return data;

        } catch (error) {
            this.logger.error('Failed to insert market snapshot', error);
            throw error;
        }
    }

    /**
     * Get recent market data for analysis
     * @param {number} limit - Number of records to fetch
     * @returns {Promise<Array>} Market data records
     */
    async getRecentMarketData(limit = 30) {
        try {
            const data = await this.sql`
                SELECT * FROM market_snapshots 
                ORDER BY collected_at DESC 
                LIMIT ${limit}
            `;

            this.logger.debug(`Retrieved ${data.length} market data records`);
            return data;

        } catch (error) {
            this.logger.error('Failed to get recent market data', error);
            throw error;
        }
    }

    /**
     * Get historical market data for backtesting
     * @param {number} days - Number of days to fetch
     * @returns {Promise<Array>} Historical market data records
     */
    async getHistoricalData(days = 30) {
        try {
            // Get data starting from the oldest available data (for backtesting historical periods)
            // This ensures we test on actual historical data, not just recent market conditions
            const data = await this.sql`
                SELECT * FROM market_snapshots 
                ORDER BY collected_at ASC
                LIMIT ${days * 288}
            `;

            this.logger.info(`Retrieved ${data.length} historical records starting from oldest data (requested ${days} days worth)`);
            return data;

        } catch (error) {
            this.logger.error('Failed to get historical data', error);
            throw error;
        }
    }

    /**
     * Get active portfolio
     * @returns {Promise<Object|null>} Active portfolio or null
     */
    async getActivePortfolio() {
        try {
            const data = await this.sql`
                SELECT * FROM portfolios 
                WHERE is_active = true 
                LIMIT 1
            `;

            return data.length > 0 ? data[0] : null;

        } catch (error) {
            this.logger.error('Failed to get active portfolio', error);
            throw error;
        }
    }

    /**
     * Get recent trades
     * @param {number} limit - Number of trades to fetch
     * @returns {Promise<Array>} Recent trades
     */
    async getRecentTrades(limit = 10) {
        try {
            const data = await this.sql`
                SELECT * FROM trades 
                ORDER BY executed_at DESC 
                LIMIT ${limit}
            `;

            this.logger.debug(`Retrieved ${data.length} recent trades`);
            return data;

        } catch (error) {
            this.logger.error('Failed to get recent trades', error);
            throw error;
        }
    }

    /**
     * Insert trading signal
     * @param {Object} signal - Trading signal data
     * @returns {Promise<Object>} Inserted signal record
     */
    async insertTradingSignal(signal) {
        try {
            const result = await this.sql`
                INSERT INTO trading_signals (
                    action, should_trade, z_score, confidence, 
                    eth_btc_ratio, signal_strength, reasoning, 
                    strategy_params, market_conditions, created_at
                ) VALUES (
                    ${signal.action}, ${signal.should_trade}, ${signal.z_score || 0},
                    ${signal.confidence || 0}, ${signal.eth_btc_ratio || 0}, ${signal.signal_strength || 0},
                    ${signal.reasoning || ''}, ${JSON.stringify(signal.strategy_params || {})},
                    ${JSON.stringify(signal.market_conditions || {})}, ${signal.created_at || new Date().toISOString()}
                ) RETURNING *
            `;

            const data = result[0];
            this.logger.debug('Trading signal inserted', { id: data.id, action: signal.action });
            return data;

        } catch (error) {
            this.logger.error('Failed to insert trading signal', error);
            throw error;
        }
    }

    /**
     * Get executable signals (strong signals from recent time)
     * @param {number} minutesBack - How many minutes back to look
     * @returns {Promise<Array>} Executable signals
     */
    async getExecutableSignals(minutesBack = 10) {
        try {
            const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

            const data = await this.sql`
                SELECT * FROM trading_signals 
                WHERE should_trade = true 
                  AND trade_executed = false 
                  AND created_at >= ${cutoffTime}
                  AND confidence >= 0.7
                ORDER BY created_at DESC
            `;

            this.logger.debug(`Found ${data.length} executable signals`);
            return data;

        } catch (error) {
            this.logger.error('Failed to get executable signals', error);
            throw error;
        }
    }

    /**
     * Insert trade record
     * @param {Object} trade - Trade data
     * @returns {Promise<Object>} Inserted trade record
     */
    async insertTrade(trade) {
        try {
            const result = await this.sql`
                INSERT INTO trades (
                    signal_id, trade_type, from_currency, to_currency,
                    from_amount, to_amount, exchange_rate, trade_value_btc,
                    fees_btc, net_value_btc, exchange, status, executed_at
                ) VALUES (
                    ${trade.signal_id}, ${trade.trade_type}, ${trade.from_currency},
                    ${trade.to_currency}, ${trade.from_amount}, ${trade.to_amount},
                    ${trade.exchange_rate}, ${trade.trade_value_btc || 0}, ${trade.fees_btc || 0},
                    ${trade.net_value_btc || 0}, ${trade.exchange || 'binance'}, 
                    ${trade.status || 'completed'}, ${trade.executed_at || new Date().toISOString()}
                ) RETURNING *
            `;

            const data = result[0];
            this.logger.info('Trade record inserted', { 
                id: data.id, 
                type: trade.trade_type,
                value: trade.trade_value_btc 
            });
            return data;

        } catch (error) {
            this.logger.error('Failed to insert trade record', error);
            throw error;
        }
    }

    /**
     * Update trading signal
     * @param {string} signalId - Signal ID to update
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated signal
     */
    async updateTradingSignal(signalId, updates) {
        try {
            const setClause = Object.keys(updates)
                .map(key => `${key} = $${key}`)
                .join(', ');
            
            const result = await this.sql`
                UPDATE trading_signals 
                SET trade_executed = ${updates.trade_executed || false},
                    updated_at = ${new Date().toISOString()}
                WHERE id = ${signalId}
                RETURNING *
            `;

            const data = result[0];
            this.logger.debug('Trading signal updated', { id: signalId });
            return data;

        } catch (error) {
            this.logger.error('Failed to update trading signal', error);
            throw error;
        }
    }

    /**
     * Update portfolio
     * @param {string} portfolioId - Portfolio ID to update
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated portfolio
     */
    async updatePortfolio(portfolioId, updates) {
        try {
            const result = await this.sql`
                UPDATE portfolios 
                SET eth_amount = ${updates.eth_amount},
                    btc_amount = ${updates.btc_amount},
                    total_value_btc = ${updates.total_value_btc || 0},
                    last_rebalance_at = ${updates.last_rebalance_at || new Date().toISOString()},
                    updated_at = ${new Date().toISOString()}
                WHERE id = ${portfolioId}
                RETURNING *
            `;

            const data = result[0];
            this.logger.info('Portfolio updated', { 
                id: portfolioId,
                ethAmount: updates.eth_amount,
                btcAmount: updates.btc_amount 
            });
            return data;

        } catch (error) {
            this.logger.error('Failed to update portfolio', error);
            throw error;
        }
    }

    /**
     * Log system event
     * @param {Object} event - Event data
     * @returns {Promise<Object>} Inserted event record
     */
    async logSystemEvent(event) {
        try {
            const result = await this.sql`
                INSERT INTO system_events (
                    event_type, severity, message, metadata, created_at
                ) VALUES (
                    ${event.event_type}, ${event.severity || 'info'}, ${event.message},
                    ${JSON.stringify(event.metadata || {})}, ${new Date().toISOString()}
                ) RETURNING *
            `;

            return result[0];

        } catch (error) {
            this.logger.error('Failed to log system event', error);
            // Don't throw here to avoid cascading errors
            return null;
        }
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            const result = await this.sql`SELECT 1 as test`;
            
            if (result.length > 0) {
                this.logger.info('Database connection test successful');
                return true;
            }
            
            return false;

        } catch (error) {
            this.logger.error('Database connection test failed', error);
            return false;
        }
    }

    // ==================== Algorithm Parameters Methods ====================

    /**
     * Get active algorithm parameters
     * Returns the currently active parameter set
     */
    async getActiveParameters() {
        try {
            const result = await this.sql`
                SELECT * FROM algorithm_parameters 
                WHERE is_active = true 
                ORDER BY updated_at DESC 
                LIMIT 1
            `;
            
            if (result.length === 0) {
                // Return system defaults if no active params
                const defaults = await this.sql`
                    SELECT * FROM algorithm_parameters 
                    WHERE is_default = true 
                    LIMIT 1
                `;
                return defaults[0] || null;
            }
            
            return result[0];
        } catch (error) {
            this.logger.error('Failed to get active parameters', error);
            throw error;
        }
    }

    /**
     * Save new algorithm parameters from backtest
     * @param {Object} params - Parameter configuration
     * @param {Object} performance - Backtest performance metrics
     * @param {string} name - Name for this parameter set
     * @param {string} description - Description of parameters
     */
    async saveAlgorithmParameters(params, performance, name, description = '') {
        try {
            const result = await this.sql`
                INSERT INTO algorithm_parameters (
                    name,
                    description,
                    parameters,
                    z_score_threshold,
                    rebalance_percent,
                    transaction_cost,
                    lookback_window,
                    trade_frequency_minutes,
                    max_allocation_shift,
                    neutral_zone,
                    min_allocation,
                    max_allocation,
                    backtest_performance,
                    created_by
                ) VALUES (
                    ${name},
                    ${description},
                    ${JSON.stringify(params)}::jsonb,
                    ${params.zScoreThreshold || 1.5},
                    ${params.rebalancePercent || 10.0},
                    ${params.transactionCost || 1.66},
                    ${params.lookbackWindow || 15},
                    ${params.tradeFrequencyMinutes || 720},
                    ${params.maxAllocationShift || 0.3},
                    ${params.neutralZone || 0.5},
                    ${params.minAllocation || 0.25},
                    ${params.maxAllocation || 0.75},
                    ${JSON.stringify(performance)}::jsonb,
                    'user'
                )
                RETURNING *
            `;
            
            this.logger.info(`Saved new algorithm parameters: ${name}`);
            return result[0];
        } catch (error) {
            this.logger.error('Failed to save algorithm parameters', error);
            throw error;
        }
    }

    /**
     * Activate a parameter set
     * Deactivates current active params and activates the specified one
     * @param {number} parameterId - ID of parameter set to activate
     */
    async activateParameters(parameterId) {
        try {
            // Start transaction
            await this.sql`BEGIN`;
            
            // Get current active params
            const currentActive = await this.sql`
                SELECT id FROM algorithm_parameters 
                WHERE is_active = true
            `;
            
            // Deactivate current params
            if (currentActive.length > 0) {
                await this.sql`
                    UPDATE algorithm_parameters 
                    SET is_active = false, updated_at = NOW() 
                    WHERE is_active = true
                `;
            }
            
            // Activate new params
            await this.sql`
                UPDATE algorithm_parameters 
                SET is_active = true, updated_at = NOW() 
                WHERE id = ${parameterId}
            `;
            
            // Record in history
            await this.sql`
                INSERT INTO parameter_history (
                    parameter_id,
                    action,
                    previous_parameter_id,
                    notes
                ) VALUES (
                    ${parameterId},
                    'ACTIVATED',
                    ${currentActive[0]?.id || null},
                    'Activated via frontend'
                )
            `;
            
            // Commit transaction
            await this.sql`COMMIT`;
            
            this.logger.info(`Activated parameter set: ${parameterId}`);
            return true;
        } catch (error) {
            await this.sql`ROLLBACK`;
            this.logger.error('Failed to activate parameters', error);
            throw error;
        }
    }

    /**
     * Get all saved parameter sets
     * @param {number} limit - Max results to return
     * @param {number} offset - Pagination offset
     */
    async getAllParameters(limit = 50, offset = 0) {
        try {
            const result = await this.sql`
                SELECT * FROM algorithm_parameters 
                ORDER BY created_at DESC 
                LIMIT ${limit} 
                OFFSET ${offset}
            `;
            
            return result;
        } catch (error) {
            this.logger.error('Failed to get all parameters', error);
            throw error;
        }
    }

    /**
     * Get parameter history
     * @param {number} parameterId - Optional parameter ID to filter by
     */
    async getParameterHistory(parameterId = null) {
        try {
            let query;
            if (parameterId) {
                query = this.sql`
                    SELECT 
                        ph.*,
                        ap.name as parameter_name,
                        prev.name as previous_parameter_name
                    FROM parameter_history ph
                    LEFT JOIN algorithm_parameters ap ON ph.parameter_id = ap.id
                    LEFT JOIN algorithm_parameters prev ON ph.previous_parameter_id = prev.id
                    WHERE ph.parameter_id = ${parameterId}
                    ORDER BY ph.created_at DESC
                `;
            } else {
                query = this.sql`
                    SELECT 
                        ph.*,
                        ap.name as parameter_name,
                        prev.name as previous_parameter_name
                    FROM parameter_history ph
                    LEFT JOIN algorithm_parameters ap ON ph.parameter_id = ap.id
                    LEFT JOIN algorithm_parameters prev ON ph.previous_parameter_id = prev.id
                    ORDER BY ph.created_at DESC
                    LIMIT 100
                `;
            }
            
            return await query;
        } catch (error) {
            this.logger.error('Failed to get parameter history', error);
            throw error;
        }
    }

}
