// Direct database connection test
const DATABASE_URL = "postgresql://neondb_owner:npg_YHvkAZS1yo9t@ep-rough-flower-adesxmoa-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log("🧪 Testing Neon database connection...");
console.log("📡 Database host:", "ep-rough-flower-adesxmoa-pooler.c-2.us-east-1.aws.neon.tech");

async function testConnection() {
    try {
        // Dynamic import for ESM
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(DATABASE_URL);
        
        console.log("🔌 Attempting to connect to database...");
        
        // Test basic query
        const result = await sql`SELECT 'Hello from Neon!' as message, NOW() as timestamp`;
        
        console.log("✅ Connection successful!");
        console.log("📋 Result:", result[0]);
        
        // Check if trading tables exist
        console.log("🔍 Checking for trading system tables...");
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('market_snapshots', 'trading_signals', 'portfolios', 'trades', 'system_events')
            ORDER BY table_name
        `;
        
        console.log(`📊 Found ${tables.length} trading system tables:`);
        tables.forEach(table => console.log(`  - ${table.table_name}`));
        
        if (tables.length === 0) {
            console.log("⚠️  No trading tables found. You need to run the schema setup:");
            console.log("   psql \"" + DATABASE_URL + "\" < database/schema.sql");
        } else {
            console.log("🎉 Database is ready for trading system!");
        }
        
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        
        if (error.message.includes('authentication')) {
            console.error("🔐 Authentication issue - check your username/password");
        } else if (error.message.includes('getaddrinfo')) {
            console.error("🌐 DNS issue - check your database URL");
        } else if (error.message.includes('timeout')) {
            console.error("⏱️  Timeout - your database might be paused");
        }
    }
}

testConnection();
