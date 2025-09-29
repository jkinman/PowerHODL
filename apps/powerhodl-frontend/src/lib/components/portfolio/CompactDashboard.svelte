<!--
	Compact Dashboard Component
	
	Simplified single-box view combining market data, portfolio metrics, and trading parameters
-->
<script>
	import { 
		portfolio, 
		portfolioMetrics, 
		portfolioGrowth,
		marketData,
		tradingParams
	} from '$lib/stores';
	
	// Reactive values
	$: totalBTC = $portfolioMetrics.totalValueBTC || 0;
	$: btcGrowth = $portfolioGrowth.btcGrowthPercent || 0;
	$: ethPercentage = $portfolioMetrics.ethPercentage || 50;
	$: btcPercentage = $portfolioMetrics.btcPercentage || 50;
	$: ethBtcRatio = $marketData.ethBtcRatio || 0;
	
	// Format functions
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
	
	function getGrowthClass(value) {
		if (value > 0.5) return 'positive';
		if (value < -0.5) return 'negative';
		return 'neutral';
	}
</script>

<div class="compact-dashboard">
	<!-- Header with BTC Focus -->
	<div class="dashboard-header">
		<div class="btc-metric">
			<span class="btc-icon">₿</span>
			<span class="btc-value">{formatBTC(totalBTC)}</span>
			<span class="btc-growth {getGrowthClass(btcGrowth)}">{formatPercent(btcGrowth)}</span>
		</div>
		{#if $portfolio.lastUpdate}
			<div class="last-update">
				{new Date($portfolio.lastUpdate).toLocaleTimeString()}
			</div>
		{/if}
	</div>
	
	<!-- Main Content Grid -->
	<div class="dashboard-grid">
		<!-- Market Data -->
		<div class="data-group">
			<h4>Market</h4>
			<div class="data-items">
				<div class="data-item">
					<span class="label">Ratio</span>
					<span class="value">{ethBtcRatio.toFixed(6)}</span>
				</div>
				<div class="data-item">
					<span class="label">ETH</span>
					<span class="value">{formatCurrency($marketData.ethPriceUSD || 0)}</span>
				</div>
				<div class="data-item">
					<span class="label">BTC</span>
					<span class="value">{formatCurrency($marketData.btcPriceUSD || 0)}</span>
				</div>
			</div>
		</div>
		
		<!-- Portfolio -->
		<div class="data-group">
			<h4>Holdings</h4>
			<div class="data-items">
				<div class="data-item">
					<span class="label">ETH</span>
					<span class="value">{($portfolio.ethAmount || 0).toFixed(3)}</span>
					<span class="pct">{ethPercentage.toFixed(0)}%</span>
				</div>
				<div class="data-item">
					<span class="label">BTC</span>
					<span class="value btc">{formatBTC($portfolio.btcAmount || 0)}</span>
					<span class="pct">{btcPercentage.toFixed(0)}%</span>
				</div>
			</div>
		</div>
		
		<!-- Trading Status -->
		<div class="data-group">
			<h4>Trading</h4>
			<div class="data-items">
				<div class="data-item">
					<span class="label">Z-Score</span>
					<span class="value">{($marketData.zScore || 0).toFixed(3)}</span>
				</div>
				<div class="data-item">
					<span class="label">Threshold</span>
					<span class="value">{($tradingParams.zScoreThreshold || 1.5).toFixed(2)}</span>
				</div>
				<div class="data-item">
					<span class="label">Status</span>
					<span class="value status {$marketData.isLive ? 'live' : 'offline'}">
						{$marketData.isLive ? 'Live' : 'Offline'}
					</span>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Simple Allocation Bar -->
	<div class="allocation-bar">
		<div class="btc-segment" style="width: {btcPercentage}%"></div>
		<div class="eth-segment" style="width: {ethPercentage}%"></div>
	</div>
</div>

<style>
	.compact-dashboard {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 16px 20px;
		margin-bottom: 20px;
		backdrop-filter: blur(10px);
	}
	
	/* Header */
	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.btc-metric {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 20px;
		font-weight: 700;
	}
	
	.btc-icon {
		color: #f7931a;
		font-size: 24px;
	}
	
	.btc-value {
		color: #f7931a;
		font-family: 'Courier New', monospace;
	}
	
	.btc-growth {
		font-size: 16px;
		font-weight: 600;
	}
	
	.btc-growth.positive {
		color: #10b981;
	}
	
	.btc-growth.negative {
		color: #ef4444;
	}
	
	.btc-growth.neutral {
		color: #f59e0b;
	}
	
	.last-update {
		font-size: 11px;
		color: #666;
		font-weight: 500;
	}
	
	/* Main Grid */
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin-bottom: 16px;
	}
	
	.data-group h4 {
		margin: 0 0 10px 0;
		font-size: 12px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.data-items {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	
	.data-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
	}
	
	.label {
		color: #999;
		font-weight: 500;
	}
	
	.value {
		color: #fff;
		font-weight: 600;
		font-family: 'Courier New', monospace;
	}
	
	.value.btc {
		color: #f7931a;
	}
	
	.value.status {
		font-family: inherit;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		text-transform: uppercase;
	}
	
	.value.status.live {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}
	
	.value.status.offline {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	
	.pct {
		font-size: 11px;
		color: #666;
		margin-left: 4px;
	}
	
	/* Allocation Bar */
	.allocation-bar {
		height: 4px;
		background: #333;
		border-radius: 2px;
		overflow: hidden;
		display: flex;
	}
	
	.btc-segment {
		background: #f7931a;
		transition: width 0.3s ease;
	}
	
	.eth-segment {
		background: #627eea;
		transition: width 0.3s ease;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		
		.data-group {
			padding-bottom: 16px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		}
		
		.data-group:last-child {
			padding-bottom: 0;
			border-bottom: none;
		}
	}
	
	@media (max-width: 480px) {
		.compact-dashboard {
			padding: 12px 16px;
		}
		
		.btc-metric {
			font-size: 18px;
		}
		
		.btc-icon {
			font-size: 20px;
		}
	}
</style>
