/**
 * Unified Chart Utilities
 * 
 * Centralized chart labeling and formatting to prevent recurring date/time label bugs
 */

/**
 * Format chart labels with consistent, intelligent date/time formatting
 * @param {Date} date - The date to format
 * @param {Array} allDates - All dates in the dataset for context
 * @param {number} index - Current index in the dataset
 * @param {string} chartType - Type of chart ('backtest', 'performance', 'market', 'portfolio')
 * @returns {string} Formatted label
 */
export function formatChartLabel(date, allDates = [], index = 0, chartType = 'default') {
	if (!date || !(date instanceof Date)) {
		console.warn('Invalid date passed to formatChartLabel:', date);
		return 'Invalid Date';
	}

	const dataLength = allDates.length;
	const timespan = getDataTimespan(allDates);
	
	// Determine format based on data characteristics
	switch (chartType) {
		case 'backtest':
			return formatBacktestLabel(date, timespan, dataLength, index);
		case 'performance':
			return formatPerformanceLabel(date, timespan, dataLength);
		case 'market':
			return formatMarketLabel(date, timespan, dataLength);
		case 'portfolio':
			return formatPortfolioLabel(date, timespan, dataLength);
		default:
			return formatDefaultLabel(date, timespan, dataLength);
	}
}

/**
 * Calculate the timespan of a dataset in days
 * @param {Array<Date>} dates - Array of dates
 * @returns {number} Timespan in days
 */
function getDataTimespan(dates) {
	if (!dates || dates.length < 2) return 0;
	
	const validDates = dates.filter(d => d instanceof Date && !isNaN(d));
	if (validDates.length < 2) return 0;
	
	const earliest = new Date(Math.min(...validDates));
	const latest = new Date(Math.max(...validDates));
	
	return Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));
}

/**
 * Format labels for backtest charts (focus on showing full time range)
 */
function formatBacktestLabel(date, timespan, dataLength, index) {
	// For backtests, we want to show the full progression over time
	if (timespan > 365) {
		// Multi-year data - show year for first/last, quarter for middle
		if (index === 0 || index === dataLength - 1) {
			return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
		}
		return date.toLocaleDateString([], { month: 'short' });
	} else if (timespan > 90) {
		// Quarterly+ data - show month/day
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 30) {
		// Monthly data - show month/day
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 7) {
		// Weekly data - show day only for space
		return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
	} else {
		// Daily/hourly data - show day and time
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
			'\n' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
}

/**
 * Format labels for performance charts (focus on performance periods)
 */
function formatPerformanceLabel(date, timespan, dataLength) {
	if (timespan > 365) {
		return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
	} else if (timespan > 90) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 30) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 7) {
		return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
	} else {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
}

/**
 * Format labels for market charts (focus on recent activity)
 */
function formatMarketLabel(date, timespan, dataLength) {
	if (timespan > 90) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 7) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else {
		// Recent data - show time for intraday
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		
		if (isToday) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else {
			return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
		}
	}
}

/**
 * Format labels for portfolio charts (focus on portfolio changes)
 */
function formatPortfolioLabel(date, timespan, dataLength) {
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	
	if (isToday && timespan <= 1) {
		// Today's data - show time
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	} else if (timespan <= 7) {
		// Week's data - show day
		return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
	} else {
		// Longer data - show date
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
}

/**
 * Default label formatting
 */
function formatDefaultLabel(date, timespan, dataLength) {
	if (timespan > 365) {
		return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
	} else if (timespan > 30) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else if (timespan > 7) {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	} else {
		return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
	}
}

/**
 * Parse and validate timestamp data from API responses
 * @param {string|Date} timestamp - Raw timestamp
 * @returns {Date} Valid Date object
 */
export function parseTimestamp(timestamp) {
	if (!timestamp) {
		console.warn('Empty timestamp provided');
		return new Date();
	}
	
	if (timestamp instanceof Date) {
		return timestamp;
	}
	
	// Try parsing string timestamp
	const parsed = new Date(timestamp);
	if (isNaN(parsed.getTime())) {
		console.warn('Invalid timestamp:', timestamp);
		return new Date();
	}
	
	return parsed;
}

/**
 * Extract and validate dates from portfolio/backtest data
 * @param {Array} data - Portfolio or backtest data
 * @returns {Array<Date>} Array of valid dates
 */
export function extractValidDates(data) {
	if (!Array.isArray(data)) return [];
	
	return data
		.map(item => parseTimestamp(item.timestamp || item.date))
		.filter(date => date instanceof Date && !isNaN(date.getTime()));
}

/**
 * Generate chart data with proper labels
 * @param {Array} rawData - Raw data from API
 * @param {string} chartType - Type of chart
 * @returns {Object} Chart data with proper labels
 */
export function generateChartData(rawData, chartType = 'default') {
	if (!Array.isArray(rawData) || rawData.length === 0) {
		return { labels: [], datasets: [] };
	}
	
	// Extract and validate dates
	const allDates = extractValidDates(rawData);
	
	// Generate labels using unified formatting
	const labels = allDates.map((date, index) => 
		formatChartLabel(date, allDates, index, chartType)
	);
	
	return {
		labels,
		allDates,
		dataLength: rawData.length,
		timespan: getDataTimespan(allDates)
	};
}
