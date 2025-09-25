/**
 * Database Service
 * 
 * Handles all database operations for the trading system.
 * Uses Neon serverless Postgres as the backend database.
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
            const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

            if (!databaseUrl) {
                throw new Error('Missing Neon database configuration. Set DATABASE_URL or NEON_DATABASE_URL environment variable.');
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

    /**
     * Get recent trades
     * @param {number} limit - Number of trades to return
     * @returns {Promise<Array>} Recent trades
     */
    async getRecentTrades(limit = 10) {
        try {
            const result = await this.sql`
                SELECT 
                    id,
                    date,
                    type,
                    action,
                    eth_amount,
                    btc_amount,
                    reason,
                    status,
                    created_at
                FROM trades 
                ORDER BY created_at DESC 
                LIMIT ${limit}
            `;

            this.logger.debug(`Retrieved ${result.length} recent trades`);
            return result;

        } catch (error) {
            this.logger.error('Failed to get recent trades', error);
            throw error;
        }
    }
}
