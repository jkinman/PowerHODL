/**
 * SvelteKit API Route: Backtest
 * 
 * Handles strategy backtesting and optimization requests
 * Migrated from Express API to SvelteKit server routes
 */

import { json } from '@sveltejs/kit';
import { DatabaseService } from '../../../lib/services/DatabaseService.js';
import { BacktestService } from '../../../lib/services/BacktestService.js';
import { LoggerService } from '../../../lib/services/LoggerService.js';

// Initialize services
const logger = new LoggerService('BacktestAPI');
let dbService;
let backtestService;

// Initialize services with error handling
async function initializeServices() {
	if (!dbService) {
		try {
			dbService = new DatabaseService();
			await dbService.connect();
			backtestService = new BacktestService(dbService);
			logger.info('Backtest API services initialized');
		} catch (error) {
			logger.error('Failed to initialize backtest services:', error);
			throw error;
		}
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const startTime = Date.now();
	
	try {
		// Initialize services
		await initializeServices();
		
		// Parse request body
		const body = await request.json();
		logger.info('📊 [BACKTEST API] Request received:', {
			parametersProvided: !!body.parameters,
			optimizationMode: body.optimization || false,
			iterations: body.iterations || 1
		});
		
		// Validate request
		if (!body.parameters) {
			return json({
				success: false,
				error: 'Missing parameters',
				message: 'Strategy parameters are required for backtesting'
			}, { status: 400 });
		}
		
		// Extract parameters with defaults
		const parameters = {
			rebalanceThreshold: body.parameters.rebalanceThreshold || 50,
			zScoreThreshold: body.parameters.zScoreThreshold || 1.2,
			transactionCost: body.parameters.transactionCost || 1.66,
			lookbackWindow: body.parameters.lookbackWindow || 15,
			volatilityFilter: body.parameters.volatilityFilter || 0.5,
			...body.parameters
		};
		
		// Run backtest
		let results;
		
		if (body.optimization && body.iterations > 1) {
			// Run optimization with multiple iterations
			logger.info('🔄 Running optimization with', body.iterations, 'iterations');
			
			const optimizationResults = [];
			const baseParams = { ...parameters };
			
			for (let i = 0; i < body.iterations; i++) {
				// Add some parameter variation for optimization
				const variedParams = {
					...baseParams,
					rebalanceThreshold: baseParams.rebalanceThreshold + (Math.random() - 0.5) * 10,
					zScoreThreshold: baseParams.zScoreThreshold + (Math.random() - 0.5) * 0.5,
					transactionCost: Math.max(0.1, baseParams.transactionCost + (Math.random() - 0.5) * 0.5)
				};
				
				try {
					const result = await backtestService.runBacktest(variedParams, {
						useRealData: body.useRealData !== false,
						startDate: body.startDate,
						endDate: body.endDate,
						initialBalance: body.initialBalance || 1000
					});
					
					optimizationResults.push({
						iteration: i + 1,
						parameters: variedParams,
						btcGrowthPercent: result.performance?.btcGrowthPercent || 0,
						totalTrades: result.trades?.length || 0,
						sharpeRatio: result.performance?.sharpeRatio || 0,
						maxDrawdown: result.performance?.maxDrawdown || 0,
						result: result
					});
					
				} catch (iterError) {
					logger.warn(`Iteration ${i + 1} failed:`, iterError.message);
					optimizationResults.push({
						iteration: i + 1,
						parameters: variedParams,
						btcGrowthPercent: 0,
						error: iterError.message
					});
				}
			}
			
			// Find best result
			const bestResult = optimizationResults
				.filter(r => !r.error)
				.reduce((best, current) => 
					current.btcGrowthPercent > best.btcGrowthPercent ? current : best,
					optimizationResults[0]
				);
			
			results = {
				type: 'optimization',
				iterations: body.iterations,
				results: optimizationResults,
				bestResult: bestResult,
				summary: {
					averageGrowth: optimizationResults
						.filter(r => !r.error)
						.reduce((sum, r) => sum + r.btcGrowthPercent, 0) / 
						optimizationResults.filter(r => !r.error).length,
					successRate: optimizationResults.filter(r => !r.error).length / optimizationResults.length,
					bestGrowth: bestResult?.btcGrowthPercent || 0
				}
			};
			
		} else {
			// Run single backtest
			logger.info('📈 Running single backtest');
			
			const result = await backtestService.runBacktest(parameters, {
				useRealData: body.useRealData !== false,
				startDate: body.startDate,
				endDate: body.endDate,
				initialBalance: body.initialBalance || 1000
			});
			
			results = {
				type: 'single',
				parameters: parameters,
				result: result,
				btcGrowthPercent: result.performance?.btcGrowthPercent || 0,
				totalTrades: result.trades?.length || 0,
				sharpeRatio: result.performance?.sharpeRatio || 0,
				maxDrawdown: result.performance?.maxDrawdown || 0
			};
		}
		
		const duration = Date.now() - startTime;
		logger.info(`✅ [BACKTEST API] Completed in ${duration}ms`);
		
		return json({
			success: true,
			data: results,
			metadata: {
				executionTime: duration,
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit'
			}
		});
		
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('❌ [BACKTEST API] Error:', {
			message: error.message,
			stack: error.stack?.substring(0, 200),
			duration: duration
		});
		
		return json({
			success: false,
			error: 'Backtest failed',
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
export async function GET({ url }) {
	try {
		await initializeServices();
		
		// Get backtest status or recent results
		const limit = parseInt(url.searchParams.get('limit')) || 10;
		
		// This could be extended to fetch recent backtest results from database
		return json({
			success: true,
			data: {
				status: 'ready',
				recentResults: [], // TODO: Implement database retrieval
				capabilities: {
					optimization: true,
					realData: true,
					multipleTimeframes: true
				}
			},
			metadata: {
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit'
			}
		});
		
	} catch (error) {
		logger.error('❌ [BACKTEST API] GET Error:', error);
		
		return json({
			success: false,
			error: 'Failed to get backtest status',
			message: error.message
		}, { status: 500 });
	}
}
