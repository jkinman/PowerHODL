/**
 * SvelteKit API Route: Historical Data
 * 
 * Handles historical market data retrieval for charts and analysis
 * Migrated from Express API to SvelteKit server routes
 */

import { json } from '@sveltejs/kit';
import { DatabaseService } from '../../../lib/services/DatabaseService.js';
import { LoggerService } from '../../../lib/services/LoggerService.js';

// Initialize services
const logger = new LoggerService('HistoricalAPI');
let dbService;

// Initialize services with error handling
async function initializeServices() {
	if (!dbService) {
		try {
			dbService = new DatabaseService();
			await dbService.connect();
			logger.info('Historical API services initialized');
		} catch (error) {
			logger.error('Failed to initialize historical services:', error);
			throw error;
		}
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

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const startTime = Date.now();
	
	try {
		// Initialize services
		await initializeServices();
		
		// Parse query parameters
		const days = parseInt(url.searchParams.get('days')) || 30;
		const symbol = url.searchParams.get('symbol') || 'ETH/BTC';
		const interval = url.searchParams.get('interval') || '1h';
		
		logger.info('📈 [HISTORICAL API] Request received:', {
			days: days,
			symbol: symbol,
			interval: interval
		});
		
		// Fetch historical data from database
		let historicalData = [];
		
		try {
			// Get market data from database
			const result = await dbService.sql`
				SELECT 
					id,
					eth_price,
					btc_price,
					eth_btc_ratio,
					z_score,
					collected_at
				FROM market_data 
				WHERE collected_at >= NOW() - INTERVAL '${days} days'
				ORDER BY collected_at ASC
			`;
			
			logger.info(`📊 [HISTORICAL API] Retrieved ${result.length} records from database`);
			
			// Process and format data
			const processedData = [];
			const seenDates = new Set();
			
			for (const item of result) {
				try {
					// Handle date normalization
					const timestamp = normalizeDate(item.collected_at);
					const dateOnly = extractDateOnly(item.collected_at);
					
					if (!timestamp || seenDates.has(dateOnly)) {
						continue; // Skip duplicates or invalid dates
					}
					
					seenDates.add(dateOnly);
					
					const dataPoint = {
						timestamp: timestamp,
						date: dateOnly,
						ethPrice: parseFloat(item.eth_price) || 0,
						btcPrice: parseFloat(item.btc_price) || 0,
						ethBtcRatio: parseFloat(item.eth_btc_ratio) || 0,
						zScore: parseFloat(item.z_score) || 0,
						volume: Math.random() * 1000000, // Mock volume for now
						id: item.id
					};
					
					processedData.push(dataPoint);
					
				} catch (itemError) {
					logger.warn('Failed to process historical data item:', itemError);
					continue; // Skip problematic items
				}
			}
			
			historicalData = processedData;
			
		} catch (dbError) {
			logger.error('❌ [HISTORICAL API] Database error:', {
				message: dbError.message,
				stack: dbError.stack?.substring(0, 200)
			});
			
			// Return error instead of mock data
			return json({
				success: false,
				error: 'Historical data unavailable',
				message: 'Database connection failed - no historical data can be provided',
				details: dbError.message,
				timestamp: new Date().toISOString()
			}, { status: 503 });
		}
		
		// Calculate summary statistics
		const summary = {
			totalPoints: historicalData.length,
			dateRange: {
				start: historicalData.length > 0 ? historicalData[0].date : null,
				end: historicalData.length > 0 ? historicalData[historicalData.length - 1].date : null
			},
			ratioStats: {
				min: Math.min(...historicalData.map(d => d.ethBtcRatio)),
				max: Math.max(...historicalData.map(d => d.ethBtcRatio)),
				avg: historicalData.reduce((sum, d) => sum + d.ethBtcRatio, 0) / historicalData.length
			},
			zScoreStats: {
				min: Math.min(...historicalData.map(d => d.zScore)),
				max: Math.max(...historicalData.map(d => d.zScore)),
				avg: historicalData.reduce((sum, d) => sum + d.zScore, 0) / historicalData.length
			}
		};
		
		const duration = Date.now() - startTime;
		logger.info(`✅ [HISTORICAL API] Completed in ${duration}ms`);
		
		return json({
			success: true,
			data: historicalData,
			summary: summary,
			metadata: {
				requestedDays: days,
				symbol: symbol,
				interval: interval,
				executionTime: duration,
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit',
				dataSource: 'database'
			}
		});
		
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('❌ [HISTORICAL API] Error:', {
			message: error.message,
			stack: error.stack?.substring(0, 200),
			duration: duration
		});
		
		return json({
			success: false,
			error: 'Historical data fetch failed',
			message: error.message,
			metadata: {
				executionTime: duration,
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit'
			}
		}, { status: 500 });
	}
}
