#!/usr/bin/env node

/**
 * Update database schema to add algorithm parameters tables
 */

import { config } from 'dotenv';
import { DatabaseService } from '../apps/powerhodl-api/lib/services/DatabaseService.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

async function updateSchema() {
    const dbService = new DatabaseService();
    
    try {
        console.log('📊 Updating database schema for algorithm parameters...\n');
        
        // Create algorithm_parameters table
        await dbService.sql`
            CREATE TABLE IF NOT EXISTS algorithm_parameters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                parameters JSONB NOT NULL,
                z_score_threshold DECIMAL(10,6) DEFAULT 1.5,
                rebalance_percent DECIMAL(10,6) DEFAULT 10.0,
                transaction_cost DECIMAL(10,6) DEFAULT 1.66,
                lookback_window INTEGER DEFAULT 15,
                trade_frequency_minutes INTEGER DEFAULT 720,
                max_allocation_shift DECIMAL(10,6) DEFAULT 0.3,
                neutral_zone DECIMAL(10,6) DEFAULT 0.5,
                min_allocation DECIMAL(10,6) DEFAULT 0.25,
                max_allocation DECIMAL(10,6) DEFAULT 0.75,
                backtest_performance JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT FALSE,
                is_default BOOLEAN DEFAULT FALSE,
                created_by VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        console.log('✅ Created algorithm_parameters table');
        
        // Create parameter_history table
        await dbService.sql`
            CREATE TABLE IF NOT EXISTS parameter_history (
                id SERIAL PRIMARY KEY,
                parameter_id INTEGER REFERENCES algorithm_parameters(id),
                action VARCHAR(50) NOT NULL,
                previous_parameter_id INTEGER REFERENCES algorithm_parameters(id),
                performance_metrics JSONB DEFAULT '{}',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        console.log('✅ Created parameter_history table');
        
        // Create indexes
        await dbService.sql`
            CREATE INDEX IF NOT EXISTS idx_algorithm_parameters_is_active 
            ON algorithm_parameters(is_active)
        `;
        await dbService.sql`
            CREATE INDEX IF NOT EXISTS idx_algorithm_parameters_created_at 
            ON algorithm_parameters(created_at)
        `;
        await dbService.sql`
            CREATE INDEX IF NOT EXISTS idx_parameter_history_parameter_id 
            ON parameter_history(parameter_id)
        `;
        await dbService.sql`
            CREATE INDEX IF NOT EXISTS idx_parameter_history_created_at 
            ON parameter_history(created_at)
        `;
        console.log('✅ Created indexes');
        
        // Insert default parameters
        const result = await dbService.sql`
            INSERT INTO algorithm_parameters (
                name,
                description,
                parameters,
                z_score_threshold,
                rebalance_percent,
                transaction_cost,
                lookback_window,
                trade_frequency_minutes,
                max_allocation_shift,
                is_active,
                is_default,
                created_by
            ) VALUES (
                'System Default',
                'Conservative default parameters for safe trading',
                ${JSON.stringify({
                    zScoreThreshold: 1.5,
                    rebalancePercent: 10.0,
                    transactionCost: 1.66,
                    lookbackWindow: 15,
                    tradeFrequencyMinutes: 720,
                    maxAllocationShift: 0.3,
                    neutralZone: 0.5,
                    minAllocation: 0.25,
                    maxAllocation: 0.75
                })}::jsonb,
                1.5,
                10.0,
                1.66,
                15,
                720,
                0.3,
                TRUE,
                TRUE,
                'system'
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        `;
        
        if (result.length > 0) {
            console.log('✅ Inserted default parameters');
        } else {
            console.log('ℹ️  Default parameters already exist');
        }
        
        console.log('\n✅ Schema update complete!');
        
    } catch (error) {
        console.error('❌ Error updating schema:', error);
        throw error;
    }
}

// Run the update
updateSchema().catch(console.error);
