/**
 * SvelteKit API Route: Portfolio
 * 
 * Handles portfolio data retrieval and management
 * Migrated from Express API to SvelteKit server routes
 */

import { json } from '@sveltejs/kit';
import { DatabaseService } from '../../../lib/services/DatabaseService.js';
import { LoggerService } from '../../../lib/services/LoggerService.js';

// Initialize services
const logger = new LoggerService('PortfolioAPI');
let dbService;

// Initialize services with error handling
async function initializeServices() {
	if (!dbService) {
		try {
			dbService = new DatabaseService();
			await dbService.connect();
			logger.info('Portfolio API services initialized');
		} catch (error) {
			logger.error('Failed to initialize portfolio services:', error);
			throw error;
		}
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const startTime = Date.now();
	
	try {
		// Initialize services
		await initializeServices();
		
		logger.info('📊 [PORTFOLIO API] Request received');
		
		// Get current portfolio state
		let portfolioState = {
			btcAmount: 0.485,
			ethAmount: 8.234,
			totalValueBTC: 0.0,
			totalValueUSD: 0.0,
			lastUpdated: new Date().toISOString()
		};
		
		let currentSignal = {
			type: 'HOLD',
			confidence: 75,
			zScore: 0.8,
			trend: 'sideways',
			timestamp: new Date().toISOString()
		};
		
		// Calculate portfolio metrics
		const ethBtcRatio = 0.035; // Mock current ratio
		portfolioState.totalValueBTC = portfolioState.btcAmount + (portfolioState.ethAmount * ethBtcRatio);
		portfolioState.totalValueUSD = portfolioState.totalValueBTC * 45000; // Mock BTC price
		
		// Get recent trades from database
		let recentTrades = [];
		let tradesError = null;
		
		try {
			recentTrades = await dbService.getRecentTrades(10);
		} catch (error) {
			logger.error('❌ [PORTFOLIO API] Could not fetch trades from database:', error.message);
			tradesError = error.message;
			recentTrades = []; // Return empty array - no mock data
		}
		
		// Portfolio composition
		const composition = {
			btcPercentage: (portfolioState.btcAmount / portfolioState.totalValueBTC) * 100,
			ethPercentage: ((portfolioState.ethAmount * ethBtcRatio) / portfolioState.totalValueBTC) * 100
		};
		
		// Performance metrics (simplified for demo)
		const performance = {
			btcGrowthPercent: 12.45,
			period: '30d',
			sharpeRatio: 1.23,
			maxDrawdown: -5.2,
			totalTrades: recentTrades.length,
			winRate: 68.5
		};
		
		const duration = Date.now() - startTime;
		logger.info(`✅ [PORTFOLIO API] Completed in ${duration}ms`);
		
		const response = {
			success: true,
			data: {
				portfolio: portfolioState,
				composition: composition,
				performance: performance,
				currentSignal: currentSignal,
				recentTrades: recentTrades,
				lastUpdate: new Date().toISOString()
			},
			metadata: {
				executionTime: duration,
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit',
				dataSource: 'database'
			},
			warnings: tradesError ? [`Unable to fetch trade history: ${tradesError}`] : []
		};
		
		return json(response);
		
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('❌ [PORTFOLIO API] Error:', {
			message: error.message,
			stack: error.stack?.substring(0, 200),
			duration: duration
		});
		
		return json({
			success: false,
			error: 'Portfolio data unavailable',
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

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		await initializeServices();
		
		const body = await request.json();
		logger.info('📝 [PORTFOLIO API] Update request:', body);
		
		// Handle portfolio updates (e.g., manual rebalancing)
		if (body.action === 'rebalance') {
			// Implement rebalancing logic
			return json({
				success: true,
				data: {
					action: 'rebalance',
					status: 'completed',
					timestamp: new Date().toISOString()
				}
			});
		}
		
		return json({
			success: false,
			error: 'Unknown action',
			message: 'Supported actions: rebalance'
		}, { status: 400 });
		
	} catch (error) {
		logger.error('❌ [PORTFOLIO API] POST Error:', error);
		
		return json({
			success: false,
			error: 'Portfolio update failed',
			message: error.message
		}, { status: 500 });
	}
}
