/**
 * Seed Database with Historical ETH/BTC Market Data
 * 
 * Simple script to populate the database with realistic historical data
 */

import { DatabaseService } from '../apps/powerhodl-api/lib/services/DatabaseService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('🌱 Starting historical data seeding...\n');

async function main() {
    const dbService = new DatabaseService();
    
    try {
        // Generate 4 years of data
        const days = 1460; // 4 years
        const endDate = new Date();
        const data = [];
        
        console.log(`📊 Generating ${days} days of historical ETH/BTC data...`);
        
        // Historical patterns
        for (let i = days; i >= 0; i--) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - i);
            
            // Determine market cycle based on date
            const year = date.getFullYear();
            const month = date.getMonth();
            const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
            
            let baseRatio = 0.05;
            let ethPrice = 2000;
            let btcPrice = 40000;
            
            // Apply market cycles
            if (year === 2021) {
                baseRatio = 0.065 + Math.sin(dayOfYear / 365 * Math.PI * 2) * 0.015;
                ethPrice = 2500 + Math.sin(dayOfYear / 365 * Math.PI * 2) * 1000;
                btcPrice = 40000 + Math.sin(dayOfYear / 365 * Math.PI * 2) * 10000;
            } else if (year === 2022) {
                baseRatio = 0.055 - (month / 12) * 0.015;
                ethPrice = 3000 - month * 100;
                btcPrice = 45000 - month * 2000;
            } else if (year === 2023) {
                baseRatio = 0.045 + (month / 12) * 0.01;
                ethPrice = 1500 + month * 50;
                btcPrice = 25000 + month * 1000;
            } else {
                baseRatio = 0.036 + Math.sin(month / 12 * Math.PI) * 0.004;
                ethPrice = 2500 + Math.random() * 500;
                btcPrice = 65000 + Math.random() * 5000;
            }
            
            // Add daily volatility
            const volatility = (Math.random() - 0.5) * 0.002;
            const ratio = Math.max(0.02, Math.min(0.085, baseRatio + volatility));
            
            data.push({
                date: date.toISOString(),
                ratio: ratio,
                ethPrice: Math.max(100, ethPrice + (Math.random() - 0.5) * ethPrice * 0.02),
                btcPrice: Math.max(3000, btcPrice + (Math.random() - 0.5) * btcPrice * 0.015),
                volume: Math.random() * 1000000000
            });
        }
        
        console.log(`✅ Generated ${data.length} days of data`);
        console.log(`📅 Date range: ${data[0].date.split('T')[0]} to ${data[data.length - 1].date.split('T')[0]}\n`);
        
        // Insert into database
        console.log('💾 Inserting data into database...');
        let inserted = 0;
        const batchSize = 50;
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            for (const record of batch) {
                try {
                    await dbService.sql`
                        INSERT INTO market_snapshots 
                        (created_at, eth_btc_ratio, eth_price_usd, btc_price_usd, eth_volume_24h, source, z_score)
                        VALUES (
                            ${record.date}::timestamptz, 
                            ${record.ratio}, 
                            ${record.ethPrice}, 
                            ${record.btcPrice}, 
                            ${record.volume}, 
                            'historical_seed',
                            0
                        )
                    `;
                    inserted++;
                } catch (err) {
                    // Skip duplicates silently
                    if (!err.message.includes('duplicate')) {
                        console.error(`Error at ${record.date}:`, err.message);
                    }
                }
            }
            
            process.stdout.write(`\r⏳ Progress: ${Math.round((i + batch.length) / data.length * 100)}% (${inserted}/${data.length})`);
        }
        
        console.log(`\n\n✅ Successfully inserted ${inserted} records`);
        
        // Verify
        const result = await dbService.sql`
            SELECT 
                COUNT(*) as count,
                MIN(created_at) as min_date,
                MAX(created_at) as max_date,
                AVG(eth_btc_ratio) as avg_ratio
            FROM market_snapshots
        `;
        
        const stats = result[0];
        console.log('\n📊 Database Statistics:');
        console.log(`   Total records: ${stats.count}`);
        console.log(`   Date range: ${new Date(stats.min_date).toLocaleDateString()} to ${new Date(stats.max_date).toLocaleDateString()}`);
        console.log(`   Average ETH/BTC ratio: ${parseFloat(stats.avg_ratio).toFixed(4)}`);
        
        console.log('\n🎉 Historical data seeding completed!');
        console.log('📈 You can now view 4 years of market data in your charts');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();