/**
 * Shared Data Schemas for PowerHODL
 * 
 * This file contains all data structures and schemas used across
 * frontend and backend to ensure consistency and prevent mismatches.
 */

// Market Data Schema
export const MarketDataSchema = {
    // Database field mappings
    database: {
        timestamp: 'created_at',
        ethBtcRatio: 'eth_btc_ratio',
        ethPrice: 'eth_price_usd',
        btcPrice: 'btc_price_usd',
        volume: 'eth_volume_24h',
        source: 'source'
    },
    
    // Normalized field names (used in application logic)
    normalized: {
        timestamp: 'timestamp',
        ethBtcRatio: 'ethBtcRatio',
        ethPrice: 'ethPrice',
        btcPrice: 'btcPrice',
        volume: 'volume',
        source: 'source'
    },
    
    // API response field names
    api: {
        timestamp: 'timestamp',
        ratio: 'ethBtcRatio',
        ethPriceUSD: 'ethPrice',
        btcPriceUSD: 'btcPrice',
        volume24h: 'volume'
    }
};

// Trading Signal Schema
export const TradingSignalSchema = {
    database: {
        id: 'id',
        timestamp: 'created_at',
        action: 'action',
        shouldTrade: 'should_trade',
        confidence: 'confidence',
        zScore: 'z_score',
        ethBtcRatio: 'eth_btc_ratio',
        reasoning: 'reasoning',
        parameters: 'parameters'
    },
    
    normalized: {
        id: 'id',
        timestamp: 'timestamp',
        action: 'action',
        shouldTrade: 'shouldTrade',
        confidence: 'confidence',
        zScore: 'zScore',
        ethBtcRatio: 'ethBtcRatio',
        reasoning: 'reasoning',
        parameters: 'parameters'
    }
};

// Portfolio Schema
export const PortfolioSchema = {
    database: {
        id: 'id',
        btcAmount: 'btc_amount',
        ethAmount: 'eth_amount',
        totalValueBTC: 'total_value_btc',
        lastUpdated: 'updated_at',
        isActive: 'is_active'
    },
    
    normalized: {
        id: 'id',
        btcAmount: 'btcAmount',
        ethAmount: 'ethAmount',
        totalValueBTC: 'totalValueBTC',
        lastUpdated: 'lastUpdated',
        isActive: 'isActive'
    }
};

// Backtest Parameters Schema
export const BacktestParametersSchema = {
    // Frontend field names
    frontend: {
        rebalancePercent: 'rebalancePercent',
        transactionCost: 'transactionCost',
        zScoreThreshold: 'zScoreThreshold',
        lookbackWindow: 'lookbackWindow',
        volatilityFilter: 'volatilityFilter',
        maxAllocationShift: 'maxAllocationShift',
        backtestPeriod: 'backtestPeriod',
        useRealData: 'useRealData'
    },
    
    // Backend/Engine field names
    backend: {
        rebalancePercent: 'rebalancePercent',
        transactionCost: 'transactionCost',
        zScoreThreshold: 'zScoreThreshold',
        lookbackDays: 'lookbackDays', // Note: different from frontend!
        volatilityFilter: 'volatilityFilter',
        maxAllocationShift: 'maxAllocationShift'
    }
};

// Backtest Results Schema
export const BacktestResultsSchema = {
    performance: {
        btcGrowthPercent: 'btcGrowthPercent',
        tokenAccumulationPercent: 'tokenAccumulationPercent',
        totalTrades: 'totalTrades',
        sharpeRatio: 'sharpeRatio',
        maxDrawdown: 'maxDrawdown',
        winRate: 'winRate',
        totalFeesBTC: 'totalFeesBTC'
    },
    
    portfolio: {
        timestamp: 'timestamp',
        date: 'date',
        btcAmount: 'btcAmount',
        ethAmount: 'ethAmount',
        ethValueBTC: 'ethValueBTC',
        totalValueBTC: 'totalValueBTC',
        ethPercentage: 'ethPercentage',
        zScore: 'zScore',
        ratio: 'ratio',
        targetAllocation: 'targetAllocation'
    },
    
    trade: {
        timestamp: 'timestamp',
        action: 'action',
        zScore: 'zScore',
        ratio: 'ratio',
        ethAmount: 'ethAmount',
        btcAmount: 'btcAmount',
        fees: 'fees',
        targetAllocation: 'targetAllocation',
        portfolioValueBefore: 'portfolioValueBefore',
        portfolioValueAfter: 'portfolioValueAfter'
    }
};

// Data Period Options
export const DataPeriodOptions = {
    THIRTY_DAYS: { value: 30, label: '30 Days', key: '30' },
    NINETY_DAYS: { value: 90, label: '3 Months', key: '90' },
    SIX_MONTHS: { value: 180, label: '6 Months', key: '180' },
    ONE_YEAR: { value: 365, label: '1 Year', key: '365' },
    TWO_YEARS: { value: 730, label: '2 Years', key: '730' },
    ALL: { value: 1460, label: 'All Available', key: 'ALL' } // 4 years
};

// Helper function to convert between schemas
export function convertSchema(data, fromSchema, toSchema) {
    if (!data) return null;
    
    if (Array.isArray(data)) {
        return data.map(item => convertSchema(item, fromSchema, toSchema));
    }
    
    const converted = {};
    for (const [toKey, toField] of Object.entries(toSchema)) {
        // Find the corresponding field in fromSchema
        const fromKey = Object.keys(fromSchema).find(key => fromSchema[key] === toField);
        if (fromKey && data[fromKey] !== undefined) {
            converted[toField] = data[fromKey];
        }
    }
    
    return converted;
}

// Database to normalized converters
export const dbToNormalized = {
    marketData: (data) => convertSchema(data, MarketDataSchema.database, MarketDataSchema.normalized),
    signal: (data) => convertSchema(data, TradingSignalSchema.database, TradingSignalSchema.normalized),
    portfolio: (data) => convertSchema(data, PortfolioSchema.database, PortfolioSchema.normalized)
};

// Normalized to database converters
export const normalizedToDb = {
    marketData: (data) => convertSchema(data, MarketDataSchema.normalized, MarketDataSchema.database),
    signal: (data) => convertSchema(data, TradingSignalSchema.normalized, TradingSignalSchema.database),
    portfolio: (data) => convertSchema(data, PortfolioSchema.normalized, PortfolioSchema.database)
};

// Parameter mapping function
export function mapBacktestParameters(frontendParams) {
    return {
        zScoreThreshold: frontendParams.zScoreThreshold,
        rebalancePercent: frontendParams.rebalancePercent || frontendParams.rebalanceThreshold,
        transactionCost: frontendParams.transactionCost,
        lookbackDays: frontendParams.lookbackWindow || frontendParams.lookbackDays,
        volatilityFilter: frontendParams.volatilityFilter,
        maxAllocationShift: frontendParams.maxAllocationShift || 0.3
    };
}

// Period parsing function
export function parseBacktestPeriod(period) {
    if (typeof period === 'number') return period;
    
    const option = Object.values(DataPeriodOptions).find(opt => 
        opt.key === period || opt.value === period
    );
    
    return option ? option.value : DataPeriodOptions.THIRTY_DAYS.value;
}
