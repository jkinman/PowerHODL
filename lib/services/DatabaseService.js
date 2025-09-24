/**
 * Database Service
 * 
 * Handles all database operations for the trading system.
 * Uses Supabase as the backend database.
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/Logger.js';

export class DatabaseService {
    constructor() {
        this.logger = new Logger('DatabaseService');
        this.supabase = null;
        this.initialize();
    }

    /**
     * Initialize Supabase client
     * @private
     */
    initialize() {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
            }

            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.logger.info('Supabase client initialized');

        } catch (error) {
            this.logger.error('Failed to initialize Supabase client', error);
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
            const { data, error } = await this.supabase
                .from('market_snapshots')
                .insert([snapshot])
                .select()
                .single();

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('market_snapshots')
                .select('*')
                .order('collected_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('portfolios')
                .select('*')
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            return data || null;

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
            const { data, error } = await this.supabase
                .from('trading_signals')
                .insert([signal])
                .select()
                .single();

            if (error) throw error;

            this.logger.debug('Trading signal inserted', { id: data.id, type: signal.signal_type });
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

            const { data, error } = await this.supabase
                .from('trading_signals')
                .select('*')
                .eq('should_trade', true)
                .eq('trade_executed', false)
                .gte('generated_at', cutoffTime)
                .gte('confidence', 0.7) // Only high confidence signals
                .order('generated_at', { ascending: false });

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('trades')
                .insert([trade])
                .select()
                .single();

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('trading_signals')
                .update(updates)
                .eq('id', signalId)
                .select()
                .single();

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('portfolios')
                .update(updates)
                .eq('id', portfolioId)
                .select()
                .single();

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('system_events')
                .insert([{
                    ...event,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return data;

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
            const { data, error } = await this.supabase
                .from('portfolios')
                .select('count(*)')
                .limit(1);

            if (error) throw error;

            this.logger.info('Database connection test successful');
            return true;

        } catch (error) {
            this.logger.error('Database connection test failed', error);
            return false;
        }
    }
}
