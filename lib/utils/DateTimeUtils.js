/**
 * Date and Time Utilities
 * 
 * Centralized library for handling date/time transformations, formatting,
 * and data processing to prevent recurring date-related bugs.
 */

export default class DateTimeUtils {
    
    /**
     * Normalize various date formats to ISO string
     * Handles: strings, Date objects, timestamps
     */
    static normalizeToISO(dateInput) {
        if (!dateInput) return null;
        
        try {
            if (typeof dateInput === 'string') {
                return new Date(dateInput).toISOString();
            } else if (dateInput instanceof Date) {
                return dateInput.toISOString();
            } else if (typeof dateInput === 'number') {
                return new Date(dateInput).toISOString();
            } else {
                return new Date(dateInput).toISOString();
            }
        } catch (error) {
            console.error('❌ DateTimeUtils: Failed to normalize date:', dateInput, error);
            return null;
        }
    }
    
    /**
     * Extract date-only string (YYYY-MM-DD) from various date formats
     */
    static extractDateOnly(dateInput) {
        const isoString = this.normalizeToISO(dateInput);
        return isoString ? isoString.split('T')[0] : null;
    }
    
    /**
     * Determine the span of a dataset in days
     */
    static calculateDatasetSpan(dataArray, dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) return 0;
        
        const dates = dataArray
            .map(item => item[dateField] || item.date || item.collected_at)
            .filter(Boolean)
            .map(date => new Date(date))
            .sort((a, b) => a - b);
            
        if (dates.length === 0) return 0;
        
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        const spanMs = lastDate - firstDate;
        const spanDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24));
        
        return Math.max(0, spanDays);
    }
    
    /**
     * Determine appropriate chart label format based on data characteristics
     */
    static getChartLabelFormat(dataArray, dateField = 'timestamp') {
        const spanDays = this.calculateDatasetSpan(dataArray, dateField);
        const dataPoints = dataArray.length;
        
        // Determine format based on span and density
        if (spanDays === 0) {
            // Single day or intraday data
            return {
                type: 'time',
                format: { hour: '2-digit', minute: '2-digit', hour12: false },
                description: 'Intraday times'
            };
        } else if (spanDays <= 7) {
            // Week or less
            return {
                type: 'shortDate',
                format: { weekday: 'short', month: 'short', day: 'numeric' },
                description: 'Day of week and date'
            };
        } else if (spanDays <= 90) {
            // 3 months or less
            return {
                type: 'monthDay',
                format: { month: 'short', day: 'numeric' },
                description: 'Month and day'
            };
        } else if (spanDays <= 730) {
            // 2 years or less
            return {
                type: 'monthYear',
                format: { month: 'short', year: '2-digit' },
                description: 'Month and year'
            };
        } else {
            // Long term data
            return {
                type: 'yearOnly',
                format: { year: 'numeric' },
                description: 'Year only'
            };
        }
    }
    
    /**
     * Format dates for chart labels using intelligent formatting
     */
    static formatChartLabels(dataArray, dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) return [];
        
        const labelFormat = this.getChartLabelFormat(dataArray, dateField);
        
        return dataArray.map(item => {
            const dateValue = item[dateField] || item.date || item.collected_at;
            if (!dateValue) return 'Invalid Date';
            
            try {
                const date = new Date(dateValue);
                return date.toLocaleDateString('en-US', labelFormat.format);
            } catch (error) {
                console.error('❌ DateTimeUtils: Failed to format date:', dateValue, error);
                return 'Invalid Date';
            }
        });
    }
    
    /**
     * Group data by time periods (day, week, month)
     */
    static groupByPeriod(dataArray, period = 'day', dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) return {};
        
        const groups = {};
        
        dataArray.forEach(item => {
            const dateValue = item[dateField] || item.date || item.collected_at;
            if (!dateValue) return;
            
            const date = new Date(dateValue);
            let key;
            
            switch (period) {
                case 'hour':
                    key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
                    break;
                case 'day':
                    key = date.toISOString().substring(0, 10); // YYYY-MM-DD
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().substring(0, 10);
                    break;
                case 'month':
                    key = date.toISOString().substring(0, 7); // YYYY-MM
                    break;
                case 'year':
                    key = date.toISOString().substring(0, 4); // YYYY
                    break;
                default:
                    key = date.toISOString().substring(0, 10);
            }
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        
        return groups;
    }
    
    /**
     * Sample data points intelligently based on time span
     * Prevents chart overcrowding while preserving important data points
     */
    static sampleDataForChart(dataArray, maxPoints = 50, dateField = 'timestamp') {
        if (!dataArray || dataArray.length <= maxPoints) return dataArray;
        
        const spanDays = this.calculateDatasetSpan(dataArray, dateField);
        
        // Sort by date first
        const sortedData = [...dataArray].sort((a, b) => {
            const dateA = new Date(a[dateField] || a.date || a.collected_at);
            const dateB = new Date(b[dateField] || b.date || b.collected_at);
            return dateA - dateB;
        });
        
        // Calculate sampling interval
        const interval = Math.ceil(sortedData.length / maxPoints);
        
        // Always include first and last points
        const sampledData = [sortedData[0]];
        
        // Sample intermediate points
        for (let i = interval; i < sortedData.length - 1; i += interval) {
            sampledData.push(sortedData[i]);
        }
        
        // Always include last point (if different from first)
        if (sortedData.length > 1) {
            sampledData.push(sortedData[sortedData.length - 1]);
        }
        
        return sampledData;
    }
    
    /**
     * Validate and clean dataset timestamps
     */
    static validateDataset(dataArray, dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) {
            return { valid: false, errors: ['Empty dataset'] };
        }
        
        const errors = [];
        const validData = [];
        
        dataArray.forEach((item, index) => {
            const dateValue = item[dateField] || item.date || item.collected_at;
            
            if (!dateValue) {
                errors.push(`Missing date field at index ${index}`);
                return;
            }
            
            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                    errors.push(`Invalid date at index ${index}: ${dateValue}`);
                    return;
                }
                
                validData.push({
                    ...item,
                    _normalizedTimestamp: date.toISOString()
                });
                
            } catch (error) {
                errors.push(`Date parsing error at index ${index}: ${error.message}`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            validData,
            originalCount: dataArray.length,
            validCount: validData.length
        };
    }
    
    /**
     * Convert relative time strings to absolute dates
     */
    static parseRelativeTime(relativeString) {
        const now = new Date();
        const lowerStr = relativeString.toLowerCase();
        
        if (lowerStr.includes('minute')) {
            const minutes = parseInt(lowerStr) || 1;
            return new Date(now.getTime() - minutes * 60 * 1000);
        } else if (lowerStr.includes('hour')) {
            const hours = parseInt(lowerStr) || 1;
            return new Date(now.getTime() - hours * 60 * 60 * 1000);
        } else if (lowerStr.includes('day')) {
            const days = parseInt(lowerStr) || 1;
            return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        } else if (lowerStr.includes('week')) {
            const weeks = parseInt(lowerStr) || 1;
            return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
        } else if (lowerStr.includes('month')) {
            const months = parseInt(lowerStr) || 1;
            const date = new Date(now);
            date.setMonth(date.getMonth() - months);
            return date;
        } else if (lowerStr.includes('year')) {
            const years = parseInt(lowerStr) || 1;
            const date = new Date(now);
            date.setFullYear(date.getFullYear() - years);
            return date;
        }
        
        return now;
    }
    
    /**
     * Get human-readable time difference
     */
    static getTimeAgo(dateInput) {
        const date = new Date(dateInput);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return `${diffSec} seconds ago`;
        if (diffMin < 60) return `${diffMin} minutes ago`;
        if (diffHour < 24) return `${diffHour} hours ago`;
        if (diffDay < 30) return `${diffDay} days ago`;
        
        const diffMonth = Math.floor(diffDay / 30);
        if (diffMonth < 12) return `${diffMonth} months ago`;
        
        const diffYear = Math.floor(diffMonth / 12);
        return `${diffYear} years ago`;
    }
}

// Also export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateTimeUtils;
}
