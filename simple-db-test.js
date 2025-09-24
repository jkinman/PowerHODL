import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

async function quickTest() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const result = await sql`SELECT 'Connection successful!' as message, NOW() as time`;
        console.log('✅ Database connected:', result[0]);
        
        // Quick table check
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('📊 Tables found:', tables.length);
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

quickTest();
