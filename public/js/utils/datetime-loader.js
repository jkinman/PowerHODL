/**
 * Date/Time Utilities Loader for Browser
 * 
 * Makes DateTimeUtils available globally in the browser environment
 */

// Simple fallback implementation for browser compatibility
class SimpleDateTimeUtils {
    static normalizeToISO(dateInput) {
        if (!dateInput) return null;
        try {
            return new Date(dateInput).toISOString();
        } catch {
            return null;
        }
    }
    
    static extractDateOnly(dateInput) {
        const iso = this.normalizeToISO(dateInput);
        return iso ? iso.split('T')[0] : null;
    }
    
    static calculateDatasetSpan(dataArray, dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) return 0;
        
        const dates = dataArray
            .map(item => item[dateField] || item.date || item.collected_at)
            .filter(Boolean)
            .map(date => new Date(date))
            .sort((a, b) => a - b);
            
        if (dates.length === 0) return 0;
        
        const spanMs = dates[dates.length - 1] - dates[0];
        return Math.max(0, Math.ceil(spanMs / (1000 * 60 * 60 * 24)));
    }
    
    static formatChartLabels(dataArray, dateField = 'timestamp') {
        if (!dataArray || dataArray.length === 0) return [];
        
        const spanDays = this.calculateDatasetSpan(dataArray, dateField);
        
        return dataArray.map(item => {
            const dateValue = item[dateField] || item.date || item.collected_at;
            if (!dateValue) return 'Invalid Date';
            
            try {
                const date = new Date(dateValue);
                
                if (spanDays === 0) {
                    // Single day: show times
                    return date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
                } else if (spanDays <= 90) {
                    // 3 months or less: month and day
                    return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } else {
                    // Longer periods: month and year
                    return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: '2-digit' 
                    });
                }
            } catch {
                return 'Invalid Date';
            }
        });
    }
    
    static sampleDataForChart(dataArray, maxPoints = 50) {
        if (!dataArray || dataArray.length <= maxPoints) return dataArray;
        
        const interval = Math.ceil(dataArray.length / maxPoints);
        const result = [dataArray[0]]; // Always include first
        
        for (let i = interval; i < dataArray.length - 1; i += interval) {
            result.push(dataArray[i]);
        }
        
        if (dataArray.length > 1) {
            result.push(dataArray[dataArray.length - 1]); // Always include last
        }
        
        return result;
    }
    
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
}

// Make available globally
window.DateTimeUtils = SimpleDateTimeUtils;

console.log('📅 DateTimeUtils loaded and available globally');
