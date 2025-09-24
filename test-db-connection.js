#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests the Neon database connection using your .env.local variables
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

const logger = {
    info: (msg, ...args) => console.log(`ℹ️  ${msg}`, ...args),
    error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
    success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`⚠️  ${msg}`, ...args)
};

async function testDatabaseConnection() {
    logger.info('Testing Neon database connection...');
    
    try {
        // Get database URL from environment
        const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
        
        if (!databaseUrl) {
            throw new Error('DATABASE_URL or NEON_DATABASE_URL not found in environment variables');
        }
        
        logger.info('Found database URL in environment variables');
        logger.info('Database host:', databaseUrl.split('@')[1]?.split('/')[0] || 'Unknown');
        
        // Initialize Neon client
        const sql = neon(databaseUrl);
        
        // Test basic connection
        logger.info('Testing basic SQL query...');
        const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
        
        logger.success('Database connection successful!');
        logger.info('Current time:', result[0].current_time);
        logger.info('PostgreSQL version:', result[0].postgres_version);
        
        // Test if our tables exist
        logger.info('Checking if trading system tables exist...');
        
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('market_snapshots', 'trading_signals', 'portfolios', 'trades', 'system_events')
            ORDER BY table_name
        `;
        
        const tableNames = tables.map(t => t.table_name);
        
        if (tableNames.length === 0) {
            logger.warn('No trading system tables found. You may need to run the schema setup.');
            logger.info('Run this command to set up the database schema:');
            logger.info('psql "YOUR_DATABASE_URL" < database/schema.sql');
        } else {
            logger.success(`Found ${tableNames.length} trading system tables:`);
            tableNames.forEach(name => logger.info(`  - ${name}`));
        }
        
        // Test inserting a simple record (system event)
        logger.info('Testing database write operation...');
        
        if (tableNames.includes('system_events')) {
            await sql`
                INSERT INTO system_events (event_type, severity, message, metadata)
                VALUES ('CONNECTION_TEST', 'info', 'Database connection test completed successfully', '{"test": true}')
            `;
            logger.success('Database write test successful!');
        } else {
            logger.warn('system_events table not found, skipping write test');
        }
        
        // Test environment variables for trading
        logger.info('Checking other environment variables...');
        
        const envChecks = [
            { name: 'BINANCE_API_KEY', value: process.env.BINANCE_API_KEY, required: false },
            { name: 'BINANCE_SECRET', value: process.env.BINANCE_SECRET, required: false },
            { name: 'CRON_SECRET', value: process.env.CRON_SECRET, required: true },
            { name: 'COINGECKO_API_KEY', value: process.env.COINGECKO_API_KEY, required: false },
        ];
        
        envChecks.forEach(check => {
            if (check.value) {
                const maskedValue = check.value.substring(0, 8) + '...';
                logger.success(`${check.name}: ${maskedValue} ✓`);
            } else if (check.required) {
                logger.error(`${check.name}: Missing (required)`);
            } else {
                logger.warn(`${check.name}: Not set (optional)`);
            }
        });
        
        logger.success('🎉 Database connection test completed successfully!');
        logger.info('Your system is ready for deployment to Vercel.');
        
        return true;
        
    } catch (error) {
        logger.error('Database connection failed:', error.message);
        
        if (error.message.includes('getaddrinfo ENOTFOUND')) {
            logger.error('DNS resolution failed. Check your database URL host.');
        } else if (error.message.includes('authentication failed')) {
            logger.error('Authentication failed. Check your username/password in DATABASE_URL.');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            logger.error('Database does not exist. Check your database name in DATABASE_URL.');
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
            logger.error('Database tables not found. Run the schema setup first.');
        }
        
        logger.info('Troubleshooting tips:');
        logger.info('1. Verify your DATABASE_URL format: postgresql://username:password@host.neon.tech/database?sslmode=require');
        logger.info('2. Check your Neon dashboard for the correct connection string');
        logger.info('3. Ensure your database is not paused (Neon auto-pauses after inactivity)');
        logger.info('4. Run the schema setup if tables are missing');
        
        return false;
    }
}

// Run the test
testDatabaseConnection()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        logger.error('Unexpected error:', error);
        process.exit(1);
    });
