/**
 * System Status API
 * 
 * Provides information about system health, cron job status, and data freshness
 */

import { Logger } from '../lib/utils/Logger.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';

const logger = new Logger('SystemStatusAPI');

export async function handler(req, res) {
    const dbService = new DatabaseService();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        // Get latest market snapshot to check data freshness
        const latestSnapshot = await dbService.sql`
            SELECT collected_at, source 
            FROM market_snapshots 
            ORDER BY collected_at DESC 
            LIMIT 1
        `;
        
        // Get latest trading signal to check cron job activity
        const latestSignal = await dbService.sql`
            SELECT created_at 
            FROM trading_signals 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        
        // Get system events for monitoring
        const recentEvents = await dbService.sql`
            SELECT event_type, created_at, message 
            FROM system_events 
            WHERE severity IN ('error', 'warn')
            AND created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 10
        `;
        
        // Calculate data freshness
        const now = new Date();
        const lastDataTime = latestSnapshot[0]?.collected_at ? new Date(latestSnapshot[0].collected_at) : null;
        const lastSignalTime = latestSignal[0]?.created_at ? new Date(latestSignal[0].created_at) : null;
        
        const dataAge = lastDataTime ? now - lastDataTime : null;
        const signalAge = lastSignalTime ? now - lastSignalTime : null;
        
        // Determine health status
        const dataFresh = dataAge && dataAge < 15 * 60 * 1000; // 15 minutes
        const signalFresh = signalAge && signalAge < 24 * 60 * 60 * 1000; // 24 hours
        const hasRecentErrors = recentEvents.length > 0;
        
        const status = {
            healthy: dataFresh && !hasRecentErrors,
            dataIngestion: {
                lastUpdate: lastDataTime?.toISOString() || null,
                ageMinutes: dataAge ? Math.floor(dataAge / 60000) : null,
                source: latestSnapshot[0]?.source || 'unknown',
                status: dataFresh ? 'active' : 'stale'
            },
            signalGeneration: {
                lastSignal: lastSignalTime?.toISOString() || null,
                ageHours: signalAge ? Math.floor(signalAge / 3600000) : null,
                status: signalFresh ? 'active' : 'inactive'
            },
            recentErrors: recentEvents.map(e => ({
                type: e.event_type,
                message: e.message,
                time: e.created_at
            })),
            timestamp: now.toISOString()
        };
        
        return res.status(200).json({
            success: true,
            data: status
        });
        
    } catch (error) {
        logger.error('Failed to get system status:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export default handler;
