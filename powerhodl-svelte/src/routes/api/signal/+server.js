/**
 * SvelteKit API Route: Trading Signal
 * 
 * Handles current trading signal generation and retrieval
 * Migrated from Express API to SvelteKit server routes
 */

import { json } from '@sveltejs/kit';
import { DatabaseService } from '../../../lib/services/DatabaseService.js';
import { SignalService } from '../../../lib/services/SignalService.js';
import { LoggerService } from '../../../lib/services/LoggerService.js';

// Initialize services
const logger = new LoggerService('SignalAPI');
let dbService;
let signalService;

// Initialize services with error handling
async function initializeServices() {
	if (!dbService) {
		try {
			dbService = new DatabaseService();
			await dbService.connect();
			signalService = new SignalService(dbService);
			logger.info('Signal API services initialized');
		} catch (error) {
			logger.error('Failed to initialize signal services:', error);
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
		
		logger.info('📡 [SIGNAL API] Request received');
		
		// Generate current trading signal
		const signal = await signalService.generateSignal();
		
		// Get additional market context
		const marketContext = {
			ethBtcRatio: signal.ethBtcRatio || 0.035,
			zScore: signal.zScore || 0,
			volatility: signal.volatility || 0.15,
			trend: signal.trend || 'sideways',
			volume24h: Math.random() * 1000000, // Mock volume
			momentum: signal.momentum || 0
		};
		
		// Calculate confidence based on multiple factors
		let confidence = 50; // Base confidence
		
		if (Math.abs(signal.zScore) > 1.5) confidence += 20;
		if (Math.abs(signal.zScore) > 2.0) confidence += 15;
		if (signal.trend !== 'sideways') confidence += 10;
		if (signal.volatility < 0.1) confidence += 5;
		
		confidence = Math.min(95, Math.max(20, confidence));
		
		// Determine signal type based on z-score
		let signalType = 'HOLD';
		let signalStrength = 'weak';
		
		if (signal.zScore > 1.5) {
			signalType = 'SELL_ETH';
			signalStrength = signal.zScore > 2.0 ? 'strong' : 'moderate';
		} else if (signal.zScore < -1.5) {
			signalType = 'BUY_ETH';
			signalStrength = signal.zScore < -2.0 ? 'strong' : 'moderate';
		}
		
		const result = {
			signal: {
				type: signalType,
				strength: signalStrength,
				confidence: confidence,
				timestamp: new Date().toISOString()
			},
			market: marketContext,
			analysis: {
				zScoreAnalysis: {
					current: signal.zScore,
					threshold: 1.5,
					interpretation: Math.abs(signal.zScore) > 1.5 
						? (signal.zScore > 0 ? 'ETH overvalued vs BTC' : 'ETH undervalued vs BTC')
						: 'ETH/BTC ratio within normal range'
				},
				recommendation: {
					action: signalType,
					reasoning: generateReasoningText(signal.zScore, signalType, confidence),
					riskLevel: confidence > 70 ? 'low' : confidence > 50 ? 'medium' : 'high'
				}
			}
		};
		
		const duration = Date.now() - startTime;
		logger.info(`✅ [SIGNAL API] Completed in ${duration}ms - Signal: ${signalType}`);
		
		return json({
			success: true,
			data: result,
			metadata: {
				executionTime: duration,
				timestamp: new Date().toISOString(),
				apiVersion: '2.0',
				service: 'SvelteKit',
				signalGenerated: true
			}
		});
		
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('❌ [SIGNAL API] Error:', {
			message: error.message,
			stack: error.stack?.substring(0, 200),
			duration: duration
		});
		
		return json({
			success: false,
			error: 'Signal generation failed',
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
		logger.info('📝 [SIGNAL API] Custom signal request:', body);
		
		// Handle custom signal generation with specific parameters
		if (body.parameters) {
			const customSignal = await signalService.generateSignal(body.parameters);
			
			return json({
				success: true,
				data: {
					signal: customSignal,
					custom: true,
					parameters: body.parameters
				}
			});
		}
		
		return json({
			success: false,
			error: 'Invalid request',
			message: 'Custom signal generation requires parameters'
		}, { status: 400 });
		
	} catch (error) {
		logger.error('❌ [SIGNAL API] POST Error:', error);
		
		return json({
			success: false,
			error: 'Custom signal generation failed',
			message: error.message
		}, { status: 500 });
	}
}

// Helper function to generate reasoning text
function generateReasoningText(zScore, signalType, confidence) {
	if (signalType === 'SELL_ETH') {
		return `Z-Score of ${zScore.toFixed(2)} indicates ETH is significantly overvalued relative to BTC. Mean reversion suggests selling ETH for BTC.`;
	} else if (signalType === 'BUY_ETH') {
		return `Z-Score of ${zScore.toFixed(2)} indicates ETH is significantly undervalued relative to BTC. Mean reversion suggests buying ETH with BTC.`;
	} else {
		return `Z-Score of ${zScore.toFixed(2)} is within normal range. No strong signal detected - maintain current portfolio allocation.`;
	}
}
