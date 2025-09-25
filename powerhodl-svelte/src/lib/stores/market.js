/**
 * Market Data Store
 * 
 * Manages real-time market data, historical data, and technical indicators
 */

import { writable, derived } from 'svelte/store';

// === Current Market Data ===

/**
 * Real-time market prices
 */
export const marketData = writable({
	ethPriceUSD: 2600,
	btcPriceUSD: 67000,
	ethBtcRatio: 0.037106,
	zScore: 0,
	
	// Technical indicators
	movingAverage: 0,
	volatility: 0,
	trend: 'neutral', // 'bullish', 'bearish', 'neutral'
	
	// Data quality
	lastUpdate: null,
	dataAge: 0,
	isLive: false,
	source: 'unknown'
});

/**
 * Historical market data for charts and analysis
 */
export const historicalData = writable([]);

/**
 * Market connection status
 */
export const marketConnection = writable({
	status: 'disconnected', // 'connected', 'connecting', 'disconnected', 'error'
	lastHeartbeat: null,
	reconnectAttempts: 0,
	error: null
});

// === Derived Market Analytics ===

/**
 * Market health and data quality metrics
 */
export const marketHealth = derived(
	[marketData, marketConnection],
	([$data, $connection]) => {
		const dataAge = $data.lastUpdate ? Date.now() - new Date($data.lastUpdate).getTime() : null;
		const isStale = dataAge ? dataAge > 300000 : true; // 5 minutes
		const isHealthy = $connection.status === 'connected' && !isStale;
		
		return {
			isHealthy,
			isStale,
			dataAge,
			dataAgeFormatted: dataAge ? formatDataAge(dataAge) : 'Never',
			connectionStatus: $connection.status,
			lastError: $connection.error
		};
	}
);

/**
 * Trading signals based on market data
 */
export const marketSignals = derived(
	marketData,
	($data) => {
		const signals = [];
		
		// Z-Score based signals
		if (Math.abs($data.zScore) > 1.5) {
			signals.push({
				type: 'zscore',
				strength: Math.min(Math.abs($data.zScore) / 3, 1),
				direction: $data.zScore > 0 ? 'sell_eth' : 'buy_eth',
				message: `Z-Score: ${$data.zScore.toFixed(2)} (${$data.zScore > 0 ? 'ETH expensive' : 'ETH cheap'})`
			});
		}
		
		// Trend signals
		if ($data.trend !== 'neutral') {
			signals.push({
				type: 'trend',
				strength: 0.5,
				direction: $data.trend === 'bullish' ? 'buy_eth' : 'sell_eth',
				message: `Trend: ${$data.trend}`
			});
		}
		
		// Volatility signals
		if ($data.volatility > 0.05) { // 5% daily volatility
			signals.push({
				type: 'volatility',
				strength: Math.min($data.volatility / 0.1, 1),
				direction: 'caution',
				message: `High volatility: ${($data.volatility * 100).toFixed(1)}%`
			});
		}
		
		return signals;
	}
);

/**
 * Price change analytics
 */
export const priceChanges = derived(
	historicalData,
	($history) => {
		if ($history.length < 2) {
			return {
				ethChange24h: 0,
				btcChange24h: 0,
				ratioChange24h: 0,
				ethTrend: 'neutral',
				btcTrend: 'neutral',
				ratioTrend: 'neutral'
			};
		}
		
		const latest = $history[$history.length - 1];
		const yesterday = $history.find(item => {
			const timeDiff = new Date(latest.timestamp).getTime() - new Date(item.timestamp).getTime();
			return timeDiff >= 86400000; // 24 hours
		}) || $history[0];
		
		const ethChange24h = ((latest.ethPriceUSD - yesterday.ethPriceUSD) / yesterday.ethPriceUSD) * 100;
		const btcChange24h = ((latest.btcPriceUSD - yesterday.btcPriceUSD) / yesterday.btcPriceUSD) * 100;
		const ratioChange24h = ((latest.ethBtcRatio - yesterday.ethBtcRatio) / yesterday.ethBtcRatio) * 100;
		
		return {
			ethChange24h,
			btcChange24h,
			ratioChange24h,
			ethTrend: ethChange24h > 1 ? 'bullish' : ethChange24h < -1 ? 'bearish' : 'neutral',
			btcTrend: btcChange24h > 1 ? 'bullish' : btcChange24h < -1 ? 'bearish' : 'neutral',
			ratioTrend: ratioChange24h > 1 ? 'bullish' : ratioChange24h < -1 ? 'bearish' : 'neutral'
		};
	}
);

// === Store Actions ===

/**
 * Update current market data
 */
export function updateMarketData(newData) {
	marketData.update(current => ({
		...current,
		...newData,
		ethBtcRatio: newData.ethPriceUSD && newData.btcPriceUSD 
			? newData.ethPriceUSD / newData.btcPriceUSD 
			: current.ethBtcRatio,
		lastUpdate: new Date().toISOString(),
		dataAge: 0,
		isLive: true
	}));
}

/**
 * Add historical data point
 */
export function addHistoricalData(dataPoint) {
	historicalData.update(history => {
		const newHistory = [...history, {
			...dataPoint,
			timestamp: dataPoint.timestamp || new Date().toISOString()
		}];
		
		// Sort by timestamp and keep only last 2000 points
		return newHistory
			.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
			.slice(-2000);
	});
}

/**
 * Set historical data (replace all)
 */
export function setHistoricalData(data) {
	historicalData.set(data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
}

/**
 * Update market connection status
 */
export function updateConnectionStatus(status, error = null) {
	marketConnection.update(current => ({
		...current,
		status,
		error,
		lastHeartbeat: status === 'connected' ? new Date().toISOString() : current.lastHeartbeat,
		reconnectAttempts: status === 'connected' ? 0 : current.reconnectAttempts
	}));
}

/**
 * Increment reconnection attempts
 */
export function incrementReconnectAttempts() {
	marketConnection.update(current => ({
		...current,
		reconnectAttempts: current.reconnectAttempts + 1
	}));
}

/**
 * Calculate technical indicators
 */
export function calculateTechnicalIndicators(data) {
	if (!data || data.length < 2) return {};
	
	// Calculate moving average (simple)
	const window = Math.min(15, data.length);
	const recentData = data.slice(-window);
	const movingAverage = recentData.reduce((sum, item) => sum + item.ethBtcRatio, 0) / recentData.length;
	
	// Calculate volatility (standard deviation)
	const variance = recentData.reduce((sum, item) => {
		return sum + Math.pow(item.ethBtcRatio - movingAverage, 2);
	}, 0) / recentData.length;
	const volatility = Math.sqrt(variance);
	
	// Calculate Z-Score
	const currentRatio = data[data.length - 1].ethBtcRatio;
	const zScore = volatility > 0 ? (currentRatio - movingAverage) / volatility : 0;
	
	// Determine trend
	const older = data[data.length - Math.min(5, data.length)];
	const trendDirection = currentRatio > older.ethBtcRatio * 1.01 ? 'bullish'
		: currentRatio < older.ethBtcRatio * 0.99 ? 'bearish'
		: 'neutral';
	
	return {
		movingAverage,
		volatility,
		zScore,
		trend: trendDirection
	};
}

/**
 * Fetch fresh market data from API
 */
export async function fetchMarketData() {
	try {
		updateConnectionStatus('connecting');
		
		const response = await fetch('/api/signal');
		if (!response.ok) {
			throw new Error(`API Error: ${response.status}`);
		}
		
		const data = await response.json();
		
		updateMarketData({
			ethPriceUSD: data.ethPrice,
			btcPriceUSD: data.btcPrice,
			ethBtcRatio: data.ethBtcRatio,
			zScore: data.zScore,
			source: 'api'
		});
		
		updateConnectionStatus('connected');
		return data;
		
	} catch (error) {
		console.error('Failed to fetch market data:', error);
		updateConnectionStatus('error', error.message);
		throw error;
	}
}

/**
 * Fetch historical data from API
 */
export async function fetchHistoricalData(days = 30) {
	try {
		const response = await fetch(`/api/historical?days=${days}`);
		if (!response.ok) {
			throw new Error(`API Error: ${response.status}`);
		}
		
		const result = await response.json();
		setHistoricalData(result.data || []);
		
		return result.data;
		
	} catch (error) {
		console.error('Failed to fetch historical data:', error);
		throw error;
	}
}

/**
 * Start real-time market data updates
 */
export function startRealTimeUpdates(intervalMs = 30000) {
	const interval = setInterval(async () => {
		try {
			await fetchMarketData();
		} catch (error) {
			console.warn('Real-time update failed:', error.message);
		}
	}, intervalMs);
	
	// Return cleanup function
	return () => clearInterval(interval);
}

// === Utility Functions ===

function formatDataAge(ageMs) {
	const minutes = Math.floor(ageMs / 60000);
	const seconds = Math.floor((ageMs % 60000) / 1000);
	
	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${seconds}s`;
}
