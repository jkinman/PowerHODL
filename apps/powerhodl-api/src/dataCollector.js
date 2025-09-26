#!/usr/bin/env node
/**
 * ETH/BTC Data Collector
 * Fetches historical price data from multiple exchanges and APIs
 */

import ccxt from 'ccxt';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ETHBTCDataCollector {
    constructor() {
        this.exchanges = {
            binance: new ccxt.binance({ 
                enableRateLimit: true,
                sandbox: false
            }),
            kraken: new ccxt.kraken({ 
                enableRateLimit: true,
                sandbox: false
            }),
            coinbase: new ccxt.coinbase({ 
                enableRateLimit: true,
                sandbox: false
            })
        };
        
        this.dataDir = path.join(__dirname, '..', 'data');
        this.ensureDataDir();
    }

    async ensureDataDir() {
        await fs.ensureDir(this.dataDir);
    }

    /**
     * Fetch OHLCV data from a specific exchange
     */
    async fetchExchangeData(exchangeName, symbol = 'ETH/BTC', timeframe = '1d', limit = 500) {
        try {
            const exchange = this.exchanges[exchangeName];
            console.log(`🔄 Fetching data from ${exchangeName}...`);

            const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            
            const data = ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
                timestamp: new Date(timestamp),
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume),
                exchange: exchangeName
            }));

            console.log(`✅ Fetched ${data.length} records from ${exchangeName}`);
            return data;

        } catch (error) {
            console.error(`❌ Error fetching data from ${exchangeName}:`, error.message);
            return [];
        }
    }

    /**
     * Fetch ETH/BTC data from CoinGecko API
     */
    async fetchCoinGeckoData(days = 365) {
        try {
            console.log('🔄 Fetching data from CoinGecko...');
            
            const url = 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart';
            const params = {
                vs_currency: 'btc',
                days: days,
                interval: 'daily'
            };

            const response = await axios.get(url, { params, timeout: 15000 });
            const { prices, total_volumes } = response.data;

            const data = prices.map(([timestamp, price], index) => ({
                timestamp: new Date(timestamp),
                open: parseFloat(price),
                high: parseFloat(price),
                low: parseFloat(price),
                close: parseFloat(price),
                volume: total_volumes[index] ? parseFloat(total_volumes[index][1]) : 0,
                source: 'coingecko'
            }));

            console.log(`✅ Fetched ${data.length} records from CoinGecko`);
            return data;

        } catch (error) {
            console.error('❌ Error fetching CoinGecko data:', error.message);
            return [];
        }
    }

    /**
     * Fetch data from all sources
     */
    async fetchAllData(daysBack = 365) {
        const allData = {};

        // Fetch from exchanges
        for (const exchangeName of Object.keys(this.exchanges)) {
            try {
                const data = await this.fetchExchangeData(exchangeName, 'ETH/BTC', '1d', Math.min(daysBack, 500));
                if (data.length > 0) {
                    allData[exchangeName] = data;
                }
                // Rate limiting
                await this.sleep(1000);
            } catch (error) {
                console.warn(`⚠️ Skipping ${exchangeName}:`, error.message);
            }
        }

        // Fetch from CoinGecko
        try {
            const cgData = await this.fetchCoinGeckoData(daysBack);
            if (cgData.length > 0) {
                allData.coingecko = cgData;
            }
        } catch (error) {
            console.warn('⚠️ CoinGecko failed:', error.message);
        }

        return allData;
    }

    /**
     * Merge and clean data from different sources
     */
    mergeAndCleanData(dataDict) {
        const mergedData = [];
        const seenDates = new Set();

        // Priority order: exchanges first, then CoinGecko
        const sources = ['binance', 'kraken', 'coinbase', 'coingecko'];

        sources.forEach(source => {
            if (dataDict[source]) {
                dataDict[source].forEach(record => {
                    const dateKey = record.timestamp.toISOString().split('T')[0];
                    
                    if (!seenDates.has(dateKey)) {
                        seenDates.add(dateKey);
                        mergedData.push({
                            ...record,
                            source: source
                        });
                    }
                });
            }
        });

        // Sort by timestamp
        mergedData.sort((a, b) => a.timestamp - b.timestamp);

        console.log(`✅ Merged data: ${mergedData.length} total records`);
        return mergedData;
    }

    /**
     * Add technical indicators
     */
    addTechnicalIndicators(data) {
        console.log('🔄 Adding technical indicators...');
        
        const closes = data.map(d => d.close);
        
        // Add moving averages
        [7, 14, 30, 60].forEach(period => {
            data.forEach((record, index) => {
                if (index >= period - 1) {
                    const slice = closes.slice(index - period + 1, index + 1);
                    record[`ma_${period}`] = this.average(slice);
                }
            });
        });

        // Add Bollinger Bands (20-period)
        const bollPeriod = 20;
        data.forEach((record, index) => {
            if (index >= bollPeriod - 1) {
                const slice = closes.slice(index - bollPeriod + 1, index + 1);
                const mean = this.average(slice);
                const std = this.standardDeviation(slice, mean);
                
                record.bb_middle = mean;
                record.bb_upper = mean + (std * 2);
                record.bb_lower = mean - (std * 2);
            }
        });

        // Add RSI (14-period)
        this.addRSI(data, 14);

        // Add volatility and Z-score
        data.forEach((record, index) => {
            if (index >= 20) {
                const slice = closes.slice(index - 19, index + 1);
                const mean = this.average(slice);
                const std = this.standardDeviation(slice, mean);
                
                record.volatility = std;
                record.z_score = std > 0 ? (record.close - mean) / std : 0;
            }

            // Daily returns
            if (index > 0) {
                record.daily_return = (record.close - data[index - 1].close) / data[index - 1].close;
            }
        });

        console.log('✅ Added technical indicators');
        return data;
    }

    /**
     * Add RSI indicator
     */
    addRSI(data, period = 14) {
        const gains = [];
        const losses = [];

        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        data.forEach((record, index) => {
            if (index >= period) {
                const gainSlice = gains.slice(index - period, index);
                const lossSlice = losses.slice(index - period, index);
                
                const avgGain = this.average(gainSlice);
                const avgLoss = this.average(lossSlice);
                
                if (avgLoss === 0) {
                    record.rsi = 100;
                } else {
                    const rs = avgGain / avgLoss;
                    record.rsi = 100 - (100 / (1 + rs));
                }
            }
        });
    }

    /**
     * Save data to JSON and CSV
     */
    async saveData(data, filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            filename = `eth_btc_data_${timestamp}`;
        }

        const jsonPath = path.join(this.dataDir, `${filename}.json`);
        const csvPath = path.join(this.dataDir, `${filename}.csv`);

        // Save as JSON
        await fs.writeJson(jsonPath, data, { spaces: 2 });

        // Save as CSV
        const csvContent = this.convertToCSV(data);
        await fs.writeFile(csvPath, csvContent);

        console.log(`💾 Data saved to:`);
        console.log(`   JSON: ${jsonPath}`);
        console.log(`   CSV: ${csvPath}`);

        return { jsonPath, csvPath };
    }

    /**
     * Load data from JSON file
     */
    async loadData(filename) {
        const filepath = path.join(this.dataDir, filename);
        try {
            const data = await fs.readJson(filepath);
            // Convert timestamp strings back to Date objects
            data.forEach(record => {
                record.timestamp = new Date(record.timestamp);
            });
            console.log(`📖 Loaded data from: ${filepath}`);
            return data;
        } catch (error) {
            console.error(`❌ Error loading data:`, error.message);
            return [];
        }
    }

    /**
     * Main method to fetch, process, and return latest data
     */
    async getLatestData(days = 365, addIndicators = true) {
        console.log(`🚀 Starting data collection for ${days} days...`);

        // Fetch all data
        const rawData = await this.fetchAllData(days);

        if (Object.keys(rawData).length === 0) {
            console.error('❌ No data fetched from any source');
            return [];
        }

        // Merge and clean
        let mergedData = this.mergeAndCleanData(rawData);

        if (mergedData.length === 0) {
            console.error('❌ No data after merging');
            return [];
        }

        // Add technical indicators
        if (addIndicators) {
            mergedData = this.addTechnicalIndicators(mergedData);
        }

        // Save data
        await this.saveData(mergedData);

        console.log(`✅ Data collection complete! ${mergedData.length} records collected`);
        console.log(`📅 Date range: ${mergedData[0].timestamp.toISOString().split('T')[0]} to ${mergedData[mergedData.length - 1].timestamp.toISOString().split('T')[0]}`);

        return mergedData;
    }

    // Helper methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    average(arr) {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    standardDeviation(arr, mean = null) {
        if (mean === null) mean = this.average(arr);
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(record => {
            const values = headers.map(header => {
                const value = record[header];
                if (value instanceof Date) {
                    return value.toISOString();
                }
                return typeof value === 'string' ? `"${value}"` : (value || '');
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }
}

// CLI usage
async function main() {
    console.log('🚀 ETH/BTC Data Collector');
    console.log('=' + '='.repeat(30));

    const collector = new ETHBTCDataCollector();
    const data = await collector.getLatestData(365);

    if (data.length > 0) {
        console.log('\n📊 Data Summary:');
        console.log(`Records: ${data.length}`);
        console.log(`Latest ratio: ${data[data.length - 1].close.toFixed(6)}`);
        console.log(`Date range: ${data[0].timestamp.toISOString().split('T')[0]} to ${data[data.length - 1].timestamp.toISOString().split('T')[0]}`);
        
        if (data[data.length - 1].z_score !== undefined) {
            console.log(`Current Z-score: ${data[data.length - 1].z_score.toFixed(2)}`);
        }
    }
}

// Run if called directly
if (process.argv[1] === __filename) {
    main().catch(console.error);
}

export default ETHBTCDataCollector;
