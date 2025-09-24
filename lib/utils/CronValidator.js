/**
 * Cron Validator Utility
 * 
 * Validates that requests to cron endpoints are legitimate Vercel cron requests.
 * Provides security layer to prevent unauthorized access to automated trading functions.
 */

import { Logger } from './Logger.js';

export class CronValidator {
    static logger = new Logger('CronValidator');

    /**
     * Validate that a request is a legitimate Vercel cron request
     * @param {Object} req - Express request object
     * @returns {boolean} True if valid cron request
     */
    static isValidCronRequest(req) {
        try {
            // Method validation - Vercel cron jobs send POST requests
            if (req.method !== 'POST') {
                this.logger.warn('Invalid cron request method', { method: req.method });
                return false;
            }

            // Check for required CRON_SECRET environment variable
            if (!process.env.CRON_SECRET) {
                this.logger.error('CRON_SECRET environment variable not set');
                return false;
            }

            // Validate Authorization header
            const authHeader = req.headers.authorization;
            const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

            if (!authHeader) {
                this.logger.warn('Missing Authorization header in cron request');
                return false;
            }

            if (authHeader !== expectedAuth) {
                this.logger.warn('Invalid Authorization header in cron request');
                return false;
            }

            // Additional Vercel-specific headers (optional validation)
            const userAgent = req.headers['user-agent'];
            if (userAgent && !userAgent.includes('vercel')) {
                this.logger.warn('Suspicious user agent for cron request', { userAgent });
                // Don't fail on this, but log it for monitoring
            }

            // Check for development vs production
            if (process.env.NODE_ENV === 'development') {
                this.logger.info('Development mode: relaxed cron validation');
                // In development, we might be testing locally
                return true;
            }

            this.logger.debug('Cron request validation passed');
            return true;

        } catch (error) {
            this.logger.error('Error validating cron request', error);
            return false;
        }
    }

    /**
     * Get request metadata for logging and debugging
     * @param {Object} req - Express request object
     * @returns {Object} Request metadata
     */
    static getRequestMetadata(req) {
        return {
            method: req.method,
            userAgent: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            timestamp: new Date().toISOString(),
            hasAuth: !!req.headers.authorization,
            authValid: this.isValidCronRequest(req)
        };
    }

    /**
     * Create a standardized unauthorized response
     * @returns {Object} Unauthorized response object
     */
    static createUnauthorizedResponse() {
        return {
            error: 'Unauthorized cron request',
            message: 'This endpoint can only be called by Vercel cron jobs',
            timestamp: new Date().toISOString(),
            code: 'INVALID_CRON_REQUEST'
        };
    }

    /**
     * Log security event for monitoring
     * @param {Object} req - Request object
     * @param {string} reason - Reason for security event
     */
    static logSecurityEvent(req, reason) {
        this.logger.warn('Security event in cron validation', {
            reason,
            metadata: this.getRequestMetadata(req)
        });
    }
}
