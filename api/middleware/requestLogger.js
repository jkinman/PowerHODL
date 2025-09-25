/**
 * Request Logger Middleware
 * 
 * Custom logging for production environment
 */

const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const { method, path, query, body } = req;
    
    // Log request start
    console.log('📡 API Request:', {
        method,
        path,
        query: Object.keys(query).length > 0 ? query : undefined,
        bodySize: body ? JSON.stringify(body).length : 0,
        userAgent: req.get('User-Agent')?.substring(0, 100),
        timestamp: new Date().toISOString()
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Log response
        console.log('📤 API Response:', {
            method,
            path,
            statusCode,
            duration: `${duration}ms`,
            responseSize: data ? data.length : 0,
            success: statusCode < 400
        });

        // Call original send
        originalSend.call(this, data);
    };

    next();
};

module.exports = requestLogger;
