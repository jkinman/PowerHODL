/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for all API endpoints
 */

const errorHandler = (err, req, res, next) => {
    // Log error details
    console.error('🔥 API Error:', {
        message: err.message,
        stack: err.stack?.substring(0, 500),
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        timestamp: new Date().toISOString()
    });

    // Database connection errors
    if (err.message?.includes('database') || err.message?.includes('connection')) {
        return res.status(503).json({
            error: 'Database service temporarily unavailable',
            code: 'DATABASE_ERROR',
            retryAfter: 30
        });
    }

    // Validation errors
    if (err.name === 'ValidationError' || err.message?.includes('Invalid')) {
        return res.status(400).json({
            error: err.message,
            code: 'VALIDATION_ERROR'
        });
    }

    // Timeout errors
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        return res.status(408).json({
            error: 'Request timeout - operation took too long',
            code: 'TIMEOUT_ERROR'
        });
    }

    // Rate limiting errors
    if (err.status === 429) {
        return res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_ERROR',
            retryAfter: 60
        });
    }

    // Default server error
    const statusCode = err.status || err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(statusCode).json({
        error: isDevelopment ? err.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { stack: err.stack })
    });
};

export default errorHandler;
