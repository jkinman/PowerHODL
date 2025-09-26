/**
 * Logger Utility
 * 
 * Provides structured logging with different levels and context.
 * Handles both console output and structured data for monitoring.
 */

export class Logger {
    constructor(context) {
        this.context = context || 'System';
        this.startTime = Date.now();
    }

    /**
     * Log info level message
     * @param {string} message - Log message
     * @param {Object} data - Additional structured data
     */
    info(message, data = {}) {
        this.log('INFO', message, data);
    }

    /**
     * Log debug level message  
     * @param {string} message - Log message
     * @param {Object} data - Additional structured data
     */
    debug(message, data = {}) {
        // Only log debug in development or if DEBUG env var is set
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
            this.log('DEBUG', message, data);
        }
    }

    /**
     * Log warning level message
     * @param {string} message - Log message
     * @param {Object} data - Additional structured data
     */
    warn(message, data = {}) {
        this.log('WARN', message, data);
    }

    /**
     * Log error level message
     * @param {string} message - Log message
     * @param {Error|Object} error - Error object or additional data
     */
    error(message, error = {}) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error;

        this.log('ERROR', message, errorData);
    }

    /**
     * Log performance timing
     * @param {string} operation - Operation name
     * @param {number} startTime - Operation start time
     * @param {Object} data - Additional data
     */
    timing(operation, startTime, data = {}) {
        const duration = Date.now() - startTime;
        this.log('TIMING', `${operation} completed`, {
            ...data,
            duration: `${duration}ms`,
            operation
        });
    }

    /**
     * Core logging method
     * @param {string} level - Log level
     * @param {string} message - Log message  
     * @param {Object} data - Structured data
     * @private
     */
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...data
        };

        // Console output with formatting
        const emoji = this.getLevelEmoji(level);
        const coloredLevel = this.colorizeLevel(level);
        const contextStr = this.context ? `[${this.context}]` : '';
        
        console.log(`${emoji} ${timestamp} ${coloredLevel} ${contextStr} ${message}`);

        // Log structured data if present
        if (Object.keys(data).length > 0) {
            console.log('  Data:', JSON.stringify(data, null, 2));
        }

        // In production, you might want to send to external logging service
        if (process.env.NODE_ENV === 'production') {
            this.sendToExternalLogger(logEntry);
        }
    }

    /**
     * Get emoji for log level
     * @param {string} level - Log level
     * @returns {string} Emoji
     * @private
     */
    getLevelEmoji(level) {
        const emojis = {
            'DEBUG': '🔍',
            'INFO': 'ℹ️',
            'WARN': '⚠️',
            'ERROR': '❌',
            'TIMING': '⏱️'
        };
        return emojis[level] || '📝';
    }

    /**
     * Colorize log level for console output
     * @param {string} level - Log level
     * @returns {string} Colorized level
     * @private
     */
    colorizeLevel(level) {
        // Only colorize in development
        if (process.env.NODE_ENV !== 'development') {
            return level;
        }

        const colors = {
            'DEBUG': '\x1b[36m%s\x1b[0m', // Cyan
            'INFO': '\x1b[32m%s\x1b[0m',  // Green
            'WARN': '\x1b[33m%s\x1b[0m',  // Yellow
            'ERROR': '\x1b[31m%s\x1b[0m', // Red
            'TIMING': '\x1b[35m%s\x1b[0m' // Magenta
        };

        return colors[level] ? colors[level].replace('%s', level) : level;
    }

    /**
     * Send log entry to external logging service (placeholder)
     * @param {Object} logEntry - Structured log entry
     * @private
     */
    sendToExternalLogger(logEntry) {
        // In production, integrate with services like:
        // - Vercel Analytics
        // - DataDog
        // - LogRocket
        // - Custom webhook to Discord/Slack
        
        // For now, just ensure critical errors are visible
        if (logEntry.level === 'ERROR') {
            // Could send to Discord webhook, email alert, etc.
            console.error('CRITICAL ERROR:', JSON.stringify(logEntry, null, 2));
        }
    }

    /**
     * Create a child logger with additional context
     * @param {string} childContext - Additional context
     * @returns {Logger} Child logger
     */
    child(childContext) {
        return new Logger(`${this.context}:${childContext}`);
    }

    /**
     * Start a timer for performance logging
     * @param {string} operation - Operation name
     * @returns {Function} Function to call when operation completes
     */
    startTimer(operation) {
        const startTime = Date.now();
        this.debug(`Starting ${operation}`);
        
        return (data = {}) => {
            this.timing(operation, startTime, data);
        };
    }
}
