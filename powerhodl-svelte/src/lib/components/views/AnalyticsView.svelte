<!--
	Analytics View Component
	
	Comprehensive market analysis with multiple charts and trading insights
-->
<script>
	import { onMount } from 'svelte';
	import { 
		addHistoricalData,
		updateMarketData,
		showInfo
	} from '$lib/stores';
	import { MarketChart, PerformanceChart } from '../charts';
	
	// Generate some demo market history on mount
	onMount(() => {
		// Add demo historical data
		const now = new Date();
		const historicalData = [];
		
		for (let i = 90; i >= 0; i--) {
			const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			
			// Generate realistic ETH/BTC ratio with trends
			const baseRatio = 0.037;
			const longTrend = Math.sin(i * 0.05) * 0.003; // Long-term trend
			const shortTrend = Math.sin(i * 0.3) * 0.001; // Short-term volatility
			const noise = (Math.random() - 0.5) * 0.0005; // Random noise
			
			const ratio = baseRatio + longTrend + shortTrend + noise;
			
			// Calculate Z-Score (deviation from mean)
			const meanRatio = 0.037;
			const stdDev = 0.002;
			const zscore = (ratio - meanRatio) / stdDev;
			
			historicalData.push({
				timestamp: date.toISOString(),
				ethBtcRatio: Math.max(0.03, Math.min(0.045, ratio)),
				zScore: Math.max(-3, Math.min(3, zscore)),
				volume: Math.random() * 1000000 + 500000,
				ethPriceUSD: 2500 + Math.sin(i * 0.1) * 200,
				btcPriceUSD: 65000 + Math.sin(i * 0.08) * 5000
			});
		}
		
		// Add to store
		historicalData.forEach(data => addHistoricalData(data));
		
		// Update current market data
		const latest = historicalData[historicalData.length - 1];
		updateMarketData({
			ethBtcRatio: latest.ethBtcRatio,
			ethPriceUSD: latest.ethPriceUSD,
			btcPriceUSD: latest.btcPriceUSD,
			zScore: latest.zScore,
			volume: latest.volume,
			source: 'demo'
		});
		
		showInfo('Analytics Loaded', 'Market analysis charts loaded with 90 days of demo data');
	});
</script>

<div class="analytics-view">
	<!-- Analytics Header -->
	<div class="analytics-header">
		<div class="header-content">
			<h2 class="page-title">Market Analytics</h2>
			<div class="page-subtitle">
				Comprehensive market analysis and trading insights
			</div>
		</div>
	</div>
	
	<!-- Main Charts Grid -->
	<div class="charts-grid">
		<!-- ETH/BTC Ratio Chart -->
		<div class="chart-section">
			<MarketChart 
				chartType="ratio" 
				height={280}
			/>
		</div>
		
		<!-- Z-Score Analysis Chart -->
		<div class="chart-section">
			<MarketChart 
				chartType="zscore" 
				height={280}
			/>
		</div>
		
		<!-- Combined Market Analysis -->
		<div class="chart-section wide">
			<MarketChart 
				chartType="both" 
				height={350}
				timeframe="90d"
			/>
		</div>
		
		<!-- Performance Analysis -->
		<div class="chart-section wide">
			<PerformanceChart 
				compareWith="holding"
				timeframe="ALL"
				height={350}
				showDrawdown={true}
			/>
		</div>
	</div>
	
	<!-- Analysis Summary -->
	<div class="analysis-summary">
		<div class="summary-grid">
			<div class="summary-card">
				<div class="card-header">
					<h4 class="card-title">Market Signals</h4>
					<div class="card-icon">📈</div>
				</div>
				<div class="card-content">
					<div class="signal-item">
						<span class="signal-label">Current Signal:</span>
						<span class="signal-value hold">HOLD</span>
					</div>
					<div class="signal-item">
						<span class="signal-label">Z-Score Level:</span>
						<span class="signal-value normal">Normal Range</span>
					</div>
					<div class="signal-item">
						<span class="signal-label">Trend Direction:</span>
						<span class="signal-value bullish">Sideways</span>
					</div>
					<div class="signal-item">
						<span class="signal-label">Confidence:</span>
						<span class="signal-value">68%</span>
					</div>
				</div>
			</div>
			
			<div class="summary-card">
				<div class="card-header">
					<h4 class="card-title">Statistical Analysis</h4>
					<div class="card-icon">📊</div>
				</div>
				<div class="card-content">
					<div class="stat-row">
						<span class="stat-label">ETH/BTC Ratio:</span>
						<span class="stat-value">0.037106</span>
					</div>
					<div class="stat-row">
						<span class="stat-label">30-Day Average:</span>
						<span class="stat-value">0.037245</span>
					</div>
					<div class="stat-row">
						<span class="stat-label">Volatility (30d):</span>
						<span class="stat-value">12.4%</span>
					</div>
					<div class="stat-row">
						<span class="stat-label">Sharpe Ratio:</span>
						<span class="stat-value">1.82</span>
					</div>
				</div>
			</div>
			
			<div class="summary-card">
				<div class="card-header">
					<h4 class="card-title">Trading Opportunities</h4>
					<div class="card-icon">⚡</div>
				</div>
				<div class="card-content">
					<div class="opportunity-item">
						<div class="opportunity-header">
							<span class="opportunity-type">Mean Reversion</span>
							<span class="opportunity-probability low">25%</span>
						</div>
						<div class="opportunity-description">
							ETH/BTC ratio within normal range, limited opportunity
						</div>
					</div>
					<div class="opportunity-item">
						<div class="opportunity-header">
							<span class="opportunity-type">Momentum</span>
							<span class="opportunity-probability medium">45%</span>
						</div>
						<div class="opportunity-description">
							Sideways trend suggests potential breakout
						</div>
					</div>
				</div>
			</div>
			
			<div class="summary-card">
				<div class="card-header">
					<h4 class="card-title">Risk Metrics</h4>
					<div class="card-icon">🛡️</div>
				</div>
				<div class="card-content">
					<div class="risk-item">
						<div class="risk-header">
							<span class="risk-label">Portfolio Risk:</span>
							<span class="risk-level low">Low</span>
						</div>
						<div class="risk-bar">
							<div class="risk-fill" style="width: 25%"></div>
						</div>
					</div>
					<div class="risk-item">
						<div class="risk-header">
							<span class="risk-label">Market Risk:</span>
							<span class="risk-level medium">Medium</span>
						</div>
						<div class="risk-bar">
							<div class="risk-fill" style="width: 55%"></div>
						</div>
					</div>
					<div class="risk-item">
						<div class="risk-header">
							<span class="risk-label">Drawdown Risk:</span>
							<span class="risk-level low">Low</span>
						</div>
						<div class="risk-bar">
							<div class="risk-fill" style="width: 15%"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.analytics-view {
		padding: 0;
		min-height: 100%;
	}

	/* Header */
	.analytics-header {
		margin-bottom: 32px;
		padding: 24px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.page-title {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 700;
		color: #fff;
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.page-subtitle {
		font-size: 16px;
		color: #888;
		font-weight: 500;
	}

	/* Charts Grid */
	.charts-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-bottom: 32px;
	}

	.chart-section {
		min-height: 0;
	}

	.chart-section.wide {
		grid-column: 1 / -1;
	}

	/* Analysis Summary */
	.analysis-summary {
		margin-top: 32px;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
	}

	.summary-card {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 20px;
		backdrop-filter: blur(10px);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.card-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.card-icon {
		font-size: 16px;
		opacity: 0.7;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Signal Items */
	.signal-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
	}

	.signal-label {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.signal-value {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
	}

	.signal-value.hold {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.signal-value.normal {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
	}

	.signal-value.bullish {
		background: rgba(99, 102, 241, 0.2);
		color: #6366f1;
	}

	/* Stat Rows */
	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 0;
		font-size: 13px;
	}

	.stat-label {
		color: #888;
		font-weight: 500;
	}

	.stat-value {
		color: #fff;
		font-weight: 600;
		font-family: 'Courier New', monospace;
	}

	/* Opportunities */
	.opportunity-item {
		padding: 12px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.opportunity-item:last-child {
		border-bottom: none;
	}

	.opportunity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.opportunity-type {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}

	.opportunity-probability {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.opportunity-probability.low {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.opportunity-probability.medium {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}


	.opportunity-description {
		font-size: 12px;
		color: #888;
		line-height: 1.4;
	}

	/* Risk Metrics */
	.risk-item {
		margin-bottom: 16px;
	}

	.risk-item:last-child {
		margin-bottom: 0;
	}

	.risk-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.risk-label {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.risk-level {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.risk-level.low {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
	}

	.risk-level.medium {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}


	.risk-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.risk-fill {
		height: 100%;
		background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
		transition: width 0.3s ease;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}

		.chart-section.wide {
			grid-column: 1;
		}
	}

	@media (max-width: 768px) {
		.analytics-view {
			padding: 0;
		}

		.analytics-header {
			margin-bottom: 24px;
			padding: 16px 0;
		}

		.page-title {
			font-size: 24px;
		}

		.page-subtitle {
			font-size: 14px;
		}

		.charts-grid {
			gap: 16px;
			margin-bottom: 24px;
		}

		.summary-grid {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.summary-card {
			padding: 16px;
		}
	}

	@media (max-width: 480px) {
		.analytics-header {
			padding: 12px 0;
		}

		.page-title {
			font-size: 20px;
		}

		.charts-grid {
			gap: 12px;
		}

		.summary-card {
			padding: 12px;
		}
	}

	/* Animation */
	.chart-section {
		animation: fadeInUp 0.5s ease-out;
		animation-fill-mode: both;
	}

	.chart-section:nth-child(1) { animation-delay: 0.1s; }
	.chart-section:nth-child(2) { animation-delay: 0.2s; }
	.chart-section:nth-child(3) { animation-delay: 0.3s; }
	.chart-section:nth-child(4) { animation-delay: 0.4s; }

	.summary-card {
		animation: fadeInUp 0.4s ease-out;
		animation-fill-mode: both;
	}

	.summary-card:nth-child(1) { animation-delay: 0.5s; }
	.summary-card:nth-child(2) { animation-delay: 0.6s; }
	.summary-card:nth-child(3) { animation-delay: 0.7s; }
	.summary-card:nth-child(4) { animation-delay: 0.8s; }

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
