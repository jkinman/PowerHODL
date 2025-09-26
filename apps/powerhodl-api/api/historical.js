/**
 * Vercel Serverless Function - Historical Data API
 * 
 * Historical market data endpoint
 */

import { DatabaseService } from '../lib/services/DatabaseService.js';
import ETHBTCDataCollector from '../src/dataCollector.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('📊 [HISTORICAL API] Fetching historical data...');
        const startTime = Date.now();
        
        // Get query parameters
        const { days = '30' } = req.query;
        const requestedDays = parseInt(days);
        
        if (isNaN(requestedDays) || requestedDays < 1 || requestedDays > 365) {
            return res.status(400).json({
                success: false,
                error: 'Invalid days parameter (must be 1-365)'
            });
        }
        
        // Initialize database service
        const dbService = new DatabaseService();
        
        let historicalData = [];
        let dataSource = 'unknown';
        
        try {
            // Try to fetch from database first
            console.log(`📈 [HISTORICAL API] Fetching ${requestedDays} days from database...`);
            const dbData = await dbService.getHistoricalData(requestedDays);
            
            if (dbData && dbData.length > 0) {
                historicalData = dbData.map(item => ({
                    date: extractDateOnly(item.collected_at),
                    timestamp: normalizeDate(item.collected_at),
                    ethBtcRatio: parseFloat(item.eth_btc_ratio),
                    close: parseFloat(item.eth_price_usd || item.eth_price),
                    volume: parseFloat(item.volume_24h || 0),
                    zScore: parseFloat(item.z_score || 0)
                }));
                dataSource = 'database';
                console.log(`✅ [HISTORICAL API] Retrieved ${historicalData.length} records from database`);
            } else {
                throw new Error('No data found in database');
            }
        } catch (dbError) {
            console.error('❌ [HISTORICAL API] Database error:', {
                message: dbError.message,
                stack: dbError.stack?.substring(0, 200)
            });
            // Return error instead of mock data
            return res.status(503).json({
                success: false,
                error: 'Historical data unavailable',
                message: 'Database connection failed - no historical data can be provided',
                details: dbError.message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Filter to requested number of days
        if (historicalData.length > requestedDays) {
            historicalData = historicalData.slice(-requestedDays);
        }
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ [HISTORICAL API] Historical data retrieved in ${executionTime}ms`);
        
        // Build response
        const response = {
            success: true,
            data: historicalData,
            metadata: {
                requestedDays: requestedDays,
                actualDays: historicalData.length,
                dataSource: dataSource,
                executionTime,
                version: '2.0.0',
                timestamp: new Date().toISOString()
            }
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ [HISTORICAL API] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Historical data fetch failed',
            message: error.message
        });
    }
}

// Date handling utilities (inline for API compatibility)
const normalizeDate = (dateInput) => {
    if (!dateInput) return null;
    try {
        if (typeof dateInput === 'string') {
            return dateInput;
        } else if (dateInput instanceof Date) {
            return dateInput.toISOString();
        } else {
            return new Date(dateInput).toISOString();
        }
    } catch (error) {
        console.error('Failed to normalize date:', dateInput, error);
        return null;
    }
};

const extractDateOnly = (dateInput) => {
    const normalized = normalizeDate(dateInput);
    return normalized ? normalized.split('T')[0] : null;
};
