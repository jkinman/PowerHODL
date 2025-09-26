<!--
	Portfolio Summary Component
	
	Main portfolio overview with BTC accumulation focus, asset allocation, and key metrics
-->
<script>
	import { 
		portfolio, 
		portfolioMetrics, 
		portfolioGrowth,
		marketData 
	} from '$lib/stores';
	
	// Reactive values
	$: totalBTC = $portfolioMetrics.totalValueBTC || 0;
	$: btcGrowth = $portfolioGrowth.btcGrowthPercent || 0;
	$: ethPercentage = $portfolioMetrics.ethPercentage || 50;
	$: btcPercentage = $portfolioMetrics.btcPercentage || 50;
	$: rebalanceNeeded = $portfolioMetrics.rebalanceNeeded || false;
	$: targetRebalance = $portfolioMetrics.targetRebalance || 0;
	$: ethBtcRatio = $marketData.ethBtcRatio || 0;
	
	// Format numbers
	function formatBTC(value) {
		return value.toFixed(6);
	}
	
	function formatPercent(value) {
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(2)}%`;
	}
	
	function formatCurrency(value) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}
	
	// Get growth trend class
	function getGrowthClass(value) {
		if (value > 1) return 'positive';
		if (value < -1) return 'negative';
		return 'neutral';
	}
</script>

<div class="portfolio-summary">
	<!-- Header -->
	<div class="summary-header">
		<h2 class="summary-title">
			<span class="title-icon">₿</span>
			Portfolio Overview
		</h2>
		<div class="last-update">
			{#if $portfolio.lastUpdate}
				Updated {new Date($portfolio.lastUpdate).toLocaleTimeString()}
			{:else}
				No data
			{/if}
		</div>
	</div>

	<!-- Main BTC Metric -->
	<div class="btc-focus-section">
		<div class="primary-metric">
			<div class="metric-label">Total Portfolio Value</div>
			<div class="metric-value btc-value">
				{formatBTC(totalBTC)} BTC
			</div>
			<div class="metric-subtitle">
				≈ {formatCurrency($portfolioMetrics.totalValueUSD || 0)} USD
			</div>
		</div>
		
		<div class="growth-metric" class:positive={btcGrowth > 0} class:negative={btcGrowth < 0}>
			<div class="growth-label">BTC Accumulation</div>
			<div class="growth-value">
				{formatPercent(btcGrowth)}
			</div>
			<div class="growth-timeframe">
				{$portfolioGrowth.timeframe || 'N/A'}
			</div>
		</div>
	</div>

	<!-- Asset Breakdown -->
	<div class="asset-breakdown">
		<h3 class="breakdown-title">Asset Allocation</h3>
		
		<!-- Allocation Bar -->
		<div class="allocation-container">
			<div class="allocation-bar">
				<div 
					class="allocation-segment btc" 
					style="width: {btcPercentage}%"
					title="BTC: {btcPercentage.toFixed(1)}%"
				></div>
				<div 
					class="allocation-segment eth" 
					style="width: {ethPercentage}%"
					title="ETH: {ethPercentage.toFixed(1)}%"
				></div>
			</div>
			<div class="allocation-labels">
				<div class="allocation-item">
					<span class="allocation-dot btc"></span>
					<span class="allocation-text">BTC: {btcPercentage.toFixed(1)}%</span>
					<span class="allocation-amount">{formatBTC($portfolio.btcAmount || 0)}</span>
				</div>
				<div class="allocation-item">
					<span class="allocation-dot eth"></span>
					<span class="allocation-text">ETH: {ethPercentage.toFixed(1)}%</span>
					<span class="allocation-amount">{($portfolio.ethAmount || 0).toFixed(3)}</span>
				</div>
			</div>
		</div>

		<!-- Rebalance Alert -->
		{#if rebalanceNeeded}
			<div class="rebalance-alert">
				<div class="alert-icon">⚠️</div>
				<div class="alert-content">
					<div class="alert-title">Rebalance Suggested</div>
					<div class="alert-message">
						Portfolio is {Math.abs(targetRebalance).toFixed(1)}% away from target 50/50 allocation
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Current Market Info -->
	<div class="market-info">
		<h3 class="market-title">Current Market</h3>
		<div class="market-metrics">
			<div class="market-metric">
				<div class="metric-label">ETH/BTC Ratio</div>
				<div class="metric-value">
					{ethBtcRatio.toFixed(6)}
				</div>
			</div>
			<div class="market-metric">
				<div class="metric-label">ETH Price</div>
				<div class="metric-value">
					{formatCurrency($marketData.ethPriceUSD || 0)}
				</div>
			</div>
			<div class="market-metric">
				<div class="metric-label">BTC Price</div>
				<div class="metric-value">
					{formatCurrency($marketData.btcPriceUSD || 0)}
				</div>
			</div>
		</div>
	</div>

	<!-- Performance Summary -->
	<div class="performance-summary">
		<h3 class="performance-title">Performance Highlights</h3>
		<div class="performance-grid">
			<div class="performance-item">
				<div class="perf-label">Strategy Trend</div>
				<div class="perf-value {getGrowthClass(btcGrowth)}">
					{btcGrowth > 1 ? '📈 Accumulating' : btcGrowth < -1 ? '📉 Declining' : '➡️ Stable'}
				</div>
			</div>
			<div class="performance-item">
				<div class="perf-label">ETH Holdings</div>
				<div class="perf-value">
					{($portfolio.ethAmount || 0).toFixed(3)} ETH
				</div>
			</div>
			<div class="performance-item">
				<div class="perf-label">BTC Holdings</div>
				<div class="perf-value btc-highlight">
					{formatBTC($portfolio.btcAmount || 0)} BTC
				</div>
			</div>
			<div class="performance-item">
				<div class="perf-label">Data Source</div>
				<div class="perf-value">
					{$marketData.source || 'Unknown'}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.portfolio-summary {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		margin-bottom: 24px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.summary-title {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0;
		font-size: 20px;
		font-weight: 700;
		color: #fff;
	}

	.title-icon {
		font-size: 24px;
		color: #f7931a;
	}

	.last-update {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	/* BTC Focus Section */
	.btc-focus-section {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;
		margin-bottom: 32px;
		padding: 20px;
		background: rgba(247, 147, 26, 0.05);
		border: 1px solid rgba(247, 147, 26, 0.2);
		border-radius: 12px;
	}

	.primary-metric {
		text-align: left;
	}

	.metric-label {
		font-size: 14px;
		color: #888;
		font-weight: 500;
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: 32px;
		font-weight: 700;
		color: #fff;
		line-height: 1.2;
		margin-bottom: 4px;
	}

	.btc-value {
		color: #f7931a;
		font-family: 'Courier New', monospace;
		text-shadow: 0 0 10px rgba(247, 147, 26, 0.3);
	}

	.metric-subtitle {
		font-size: 14px;
		color: #ccc;
		font-weight: 500;
	}

	.growth-metric {
		text-align: right;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.growth-label {
		font-size: 12px;
		color: #888;
		font-weight: 500;
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.growth-value {
		font-size: 24px;
		font-weight: 700;
		line-height: 1.2;
		margin-bottom: 4px;
	}

	.growth-metric.positive .growth-value {
		color: #10b981;
	}

	.growth-metric.negative .growth-value {
		color: #ef4444;
	}

	.growth-metric:not(.positive):not(.negative) .growth-value {
		color: #f59e0b;
	}

	.growth-timeframe {
		font-size: 11px;
		color: #666;
		font-weight: 500;
	}

	/* Asset Breakdown */
	.asset-breakdown {
		margin-bottom: 32px;
	}

	.breakdown-title {
		margin: 0 0 16px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.allocation-container {
		margin-bottom: 16px;
	}

	.allocation-bar {
		height: 12px;
		background: #333;
		border-radius: 6px;
		overflow: hidden;
		display: flex;
		margin-bottom: 12px;
	}

	.allocation-segment {
		transition: width 0.3s ease;
	}

	.allocation-segment.btc {
		background: linear-gradient(90deg, #f7931a 0%, #ff9500 100%);
	}

	.allocation-segment.eth {
		background: linear-gradient(90deg, #627eea 0%, #4f6cda 100%);
	}

	.allocation-labels {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.allocation-item {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.allocation-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.allocation-dot.btc {
		background: #f7931a;
	}

	.allocation-dot.eth {
		background: #627eea;
	}

	.allocation-text {
		font-size: 13px;
		color: #ccc;
		font-weight: 500;
		flex: 1;
	}

	.allocation-amount {
		font-size: 12px;
		color: #888;
		font-family: 'Courier New', monospace;
	}

	/* Rebalance Alert */
	.rebalance-alert {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 8px;
		margin-top: 16px;
	}

	.alert-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.alert-title {
		font-size: 13px;
		font-weight: 600;
		color: #f59e0b;
		margin-bottom: 2px;
	}

	.alert-message {
		font-size: 12px;
		color: #ccc;
		line-height: 1.3;
	}

	/* Market Info */
	.market-info {
		margin-bottom: 32px;
	}

	.market-title {
		margin: 0 0 16px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.market-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 16px;
	}

	.market-metric {
		padding: 12px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		text-align: center;
	}

	.market-metric .metric-label {
		font-size: 11px;
		margin-bottom: 6px;
	}

	.market-metric .metric-value {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}

	/* Performance Summary */
	.performance-summary {
		margin-bottom: 0;
	}

	.performance-title {
		margin: 0 0 16px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.performance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
	}

	.performance-item {
		padding: 12px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		text-align: center;
	}

	.perf-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
		margin-bottom: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.perf-value {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}

	.perf-value.positive {
		color: #10b981;
	}

	.perf-value.negative {
		color: #ef4444;
	}

	.perf-value.neutral {
		color: #f59e0b;
	}

	.perf-value.btc-highlight {
		color: #f7931a;
		font-family: 'Courier New', monospace;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.portfolio-summary {
			padding: 20px;
			margin-bottom: 20px;
		}

		.btc-focus-section {
			grid-template-columns: 1fr;
			gap: 16px;
			text-align: center;
		}

		.growth-metric {
			text-align: center;
		}

		.metric-value {
			font-size: 28px;
		}

		.allocation-labels {
			flex-direction: column;
			gap: 8px;
		}

		.market-metrics {
			grid-template-columns: 1fr;
		}

		.performance-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.portfolio-summary {
			padding: 16px;
		}

		.summary-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.metric-value {
			font-size: 24px;
		}

		.performance-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
