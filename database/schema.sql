-- ETH/BTC Trading System Database Schema for Neon Postgres
-- This file contains all the database tables and indexes needed for the trading system

-- Market Snapshots Table
-- Stores historical market data and technical indicators
CREATE TABLE IF NOT EXISTS market_snapshots (
    id SERIAL PRIMARY KEY,
    eth_price_usd DECIMAL(15,6) NOT NULL,
    btc_price_usd DECIMAL(15,6) NOT NULL,
    eth_btc_ratio DECIMAL(15,10) NOT NULL,
    eth_volume_24h DECIMAL(20,6) DEFAULT 0,
    btc_volume_24h DECIMAL(20,6) DEFAULT 0,
    eth_btc_volume_24h DECIMAL(20,6) DEFAULT 0,
    sma_15d DECIMAL(15,10) DEFAULT 0,
    sma_30d DECIMAL(15,10) DEFAULT 0,
    std_dev_15d DECIMAL(15,10) DEFAULT 0,
    z_score DECIMAL(10,6) DEFAULT 0,
    rsi DECIMAL(5,2) DEFAULT 50,
    source VARCHAR(50) DEFAULT 'binance',
    data_quality DECIMAL(3,2) DEFAULT 1.0,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading Signals Table
-- Stores generated trading signals with strategy parameters
CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL PRIMARY KEY,
    action VARCHAR(20) NOT NULL, -- BUY_ETH, SELL_ETH, HOLD
    should_trade BOOLEAN DEFAULT FALSE,
    z_score DECIMAL(10,6) DEFAULT 0,
    confidence DECIMAL(5,4) DEFAULT 0, -- 0.0 to 1.0
    eth_btc_ratio DECIMAL(15,10) DEFAULT 0,
    signal_strength DECIMAL(5,4) DEFAULT 0,
    reasoning TEXT DEFAULT '',
    strategy_params JSONB DEFAULT '{}',
    market_conditions JSONB DEFAULT '{}',
    trade_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios Table
-- Stores portfolio balances and allocation
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    eth_amount DECIMAL(20,10) NOT NULL DEFAULT 0,
    btc_amount DECIMAL(20,10) NOT NULL DEFAULT 0,
    total_value_btc DECIMAL(20,10) DEFAULT 0,
    initial_value_btc DECIMAL(20,10) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    last_rebalance_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades Table
-- Stores executed trades with detailed information
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    signal_id INTEGER REFERENCES trading_signals(id),
    trade_type VARCHAR(20) NOT NULL, -- BUY_ETH, SELL_ETH
    from_currency VARCHAR(10) NOT NULL, -- ETH or BTC
    to_currency VARCHAR(10) NOT NULL, -- ETH or BTC
    from_amount DECIMAL(20,10) NOT NULL,
    to_amount DECIMAL(20,10) NOT NULL,
    exchange_rate DECIMAL(15,10) NOT NULL,
    trade_value_btc DECIMAL(20,10) DEFAULT 0,
    fees_btc DECIMAL(20,10) DEFAULT 0,
    net_value_btc DECIMAL(20,10) DEFAULT 0,
    exchange VARCHAR(50) DEFAULT 'binance',
    status VARCHAR(20) DEFAULT 'completed',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Events Table
-- Stores system logs and events for monitoring
CREATE TABLE IF NOT EXISTS system_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- ERROR, INFO, TRADE, SIGNAL, etc.
    severity VARCHAR(20) DEFAULT 'info', -- error, warn, info, debug
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Snapshots Table
-- Stores periodic performance calculations
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id),
    total_value_btc DECIMAL(20,10) NOT NULL,
    total_return_pct DECIMAL(10,6) DEFAULT 0,
    benchmark_return_pct DECIMAL(10,6) DEFAULT 0,
    excess_return_pct DECIMAL(10,6) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,4) DEFAULT 0,
    sharpe_ratio DECIMAL(10,6) DEFAULT 0,
    max_drawdown_pct DECIMAL(10,6) DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_market_snapshots_collected_at ON market_snapshots(collected_at);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_eth_btc_ratio ON market_snapshots(eth_btc_ratio);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created_at ON trading_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_trading_signals_should_trade ON trading_signals(should_trade);
CREATE INDEX IF NOT EXISTS idx_trading_signals_confidence ON trading_signals(confidence);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_trades_signal_id ON trades(signal_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_created_at ON performance_snapshots(created_at);

-- Algorithm Parameters Table
-- Stores trading algorithm parameters and configurations
CREATE TABLE IF NOT EXISTS algorithm_parameters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., "Optimal Q4 2024", "Conservative", "Aggressive"
    description TEXT,
    parameters JSONB NOT NULL, -- All parameters as JSON
    z_score_threshold DECIMAL(10,6) DEFAULT 1.5,
    rebalance_percent DECIMAL(10,6) DEFAULT 10.0,
    transaction_cost DECIMAL(10,6) DEFAULT 1.66,
    lookback_window INTEGER DEFAULT 15,
    trade_frequency_minutes INTEGER DEFAULT 720, -- 12 hours default
    max_allocation_shift DECIMAL(10,6) DEFAULT 0.3,
    neutral_zone DECIMAL(10,6) DEFAULT 0.5,
    min_allocation DECIMAL(10,6) DEFAULT 0.25,
    max_allocation DECIMAL(10,6) DEFAULT 0.75,
    position_adjustment_factor DECIMAL(10,6) DEFAULT 0.5,
    profit_take_threshold DECIMAL(10,6) DEFAULT 0.15,
    rebalance_aggressiveness DECIMAL(10,6) DEFAULT 0.3,
    backtest_performance JSONB DEFAULT '{}', -- Store backtest results
    is_active BOOLEAN DEFAULT FALSE, -- Currently active parameters
    is_default BOOLEAN DEFAULT FALSE, -- System default parameters
    created_by VARCHAR(100), -- User who created/found these params
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parameter History Table
-- Tracks when parameters are activated/deactivated
CREATE TABLE IF NOT EXISTS parameter_history (
    id SERIAL PRIMARY KEY,
    parameter_id INTEGER REFERENCES algorithm_parameters(id),
    action VARCHAR(50) NOT NULL, -- ACTIVATED, DEACTIVATED, TESTED
    previous_parameter_id INTEGER REFERENCES algorithm_parameters(id),
    performance_metrics JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for algorithm parameters
CREATE INDEX IF NOT EXISTS idx_algorithm_parameters_is_active ON algorithm_parameters(is_active);
CREATE INDEX IF NOT EXISTS idx_algorithm_parameters_created_at ON algorithm_parameters(created_at);
CREATE INDEX IF NOT EXISTS idx_parameter_history_parameter_id ON parameter_history(parameter_id);
CREATE INDEX IF NOT EXISTS idx_parameter_history_created_at ON parameter_history(created_at);

-- Insert default parameters
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
    '{
        "zScoreThreshold": 1.5,
        "rebalancePercent": 10.0,
        "transactionCost": 1.66,
        "lookbackWindow": 15,
        "tradeFrequencyMinutes": 720,
        "maxAllocationShift": 0.3,
        "neutralZone": 0.5,
        "minAllocation": 0.25,
        "maxAllocation": 0.75
    }'::jsonb,
    1.5,
    10.0,
    1.66,
    15,
    720,
    0.3,
    TRUE,
    TRUE,
    'system'
) ON CONFLICT DO NOTHING;

-- NOTE: No initial portfolio data inserted
-- Portfolio balances should come from real wallet/exchange, not database
-- Database is only for storing trade history, market data, and signals
