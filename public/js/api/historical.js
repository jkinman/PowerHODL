/**
 * Historical Data API Module
 * 
 * Handles fetching and processing historical market data
 */

/**
 * Fetch historical data from API
 */
async function fetchHistoricalData(days = 30) {
    try {
        const apiUrl = window.BacktestAPI ? window.BacktestAPI.getApiUrl() : '';
        const response = await fetch(`${apiUrl}/api/historical?days=${days}`);
        
        if (!response.ok) {
            throw new Error(`Historical API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'API returned unsuccessful response');
        }
        
        return result.data;
    } catch (error) {
        console.error('❌ Failed to fetch historical data:', error);
        throw error;
    }
}

/**
 * Process historical data for chart display
 */
function processHistoricalData(rawData) {
    if (!rawData || rawData.length === 0) {
        return { ratioData: [], zScoreData: [], labels: [] };
    }
    
    // Take last 30 points for chart display
    const chartData = rawData.slice(-30);
    
    // Generate labels based on data timeframe
    const labels = chartData.map(d => {
        const date = new Date(d.date || d.timestamp);
        
        // Detect if all data is from the same day
        const isIntraday = chartData.every(item => {
            const itemDate = new Date(item.date || item.timestamp);
            return itemDate.toDateString() === date.toDateString();
        });
        
        if (isIntraday) {
            // Show time for intraday data
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        } else {
            // Show date for multi-day data
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    });
    
    return {
        ratioData: chartData.map(d => d.ethBtcRatio),
        zScoreData: chartData.map(d => d.zScore),
        labels: labels,
        rawData: chartData
    };
}

/**
 * Get data age information
 */
function getDataAge(data) {
    if (!data || data.length === 0) {
        return { age: 0, ageText: 'No data' };
    }
    
    const latestEntry = data[data.length - 1];
    const latestTime = new Date(latestEntry.date || latestEntry.timestamp);
    const now = new Date();
    const ageMs = now - latestTime;
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    
    let ageText;
    if (ageMinutes < 1) {
        ageText = 'Just now';
    } else if (ageMinutes < 60) {
        ageText = `${ageMinutes}m ago`;
    } else if (ageMinutes < 1440) {
        const hours = Math.floor(ageMinutes / 60);
        ageText = `${hours}h ago`;
    } else {
        const days = Math.floor(ageMinutes / 1440);
        ageText = `${days}d ago`;
    }
    
    return { age: ageMs, ageMinutes, ageText };
}

/**
 * Validate historical data quality
 */
function validateHistoricalData(data) {
    if (!data || !Array.isArray(data)) {
        return { isValid: false, error: 'Data is not an array' };
    }
    
    if (data.length === 0) {
        return { isValid: false, error: 'No data points available' };
    }
    
    // Check for required fields
    const requiredFields = ['ethBtcRatio'];
    const firstItem = data[0];
    
    for (const field of requiredFields) {
        if (!(field in firstItem)) {
            return { isValid: false, error: `Missing required field: ${field}` };
        }
    }
    
    // Check for reasonable data ranges
    const ratios = data.map(d => d.ethBtcRatio).filter(r => r && !isNaN(r));
    
    if (ratios.length === 0) {
        return { isValid: false, error: 'No valid ratio data' };
    }
    
    const minRatio = Math.min(...ratios);
    const maxRatio = Math.max(...ratios);
    
    // ETH/BTC ratio should be between 0.001 and 1.0 (reasonable bounds)
    if (minRatio < 0.001 || maxRatio > 1.0) {
        return { 
            isValid: false, 
            error: `Ratio out of bounds: ${minRatio.toFixed(6)} - ${maxRatio.toFixed(6)}` 
        };
    }
    
    return { 
        isValid: true, 
        dataPoints: data.length,
        dateRange: {
            start: data[0].date || data[0].timestamp,
            end: data[data.length - 1].date || data[data.length - 1].timestamp
        },
        ratioRange: { min: minRatio, max: maxRatio }
    };
}

/**
 * Format historical data summary for logging
 */
function formatDataSummary(data) {
    if (!data || data.length === 0) {
        return 'No data available';
    }
    
    const validation = validateHistoricalData(data);
    const ageInfo = getDataAge(data);
    
    return {
        points: data.length,
        isValid: validation.isValid,
        error: validation.error,
        dataAge: ageInfo.ageText,
        dateRange: validation.dateRange,
        ratioRange: validation.ratioRange
    };
}

// Export functions for global use
window.HistoricalAPI = {
    fetchHistoricalData,
    processHistoricalData,
    getDataAge,
    validateHistoricalData,
    formatDataSummary
};
