<!--
	Dashboard View Component
	
	Main dashboard layout with portfolio components and real-time data
-->
<script>
	import { onMount } from 'svelte';
	import { 
		showSuccess, 
		addPortfolioSnapshot,
		addTrade,
		updateSignal 
	} from '$lib/stores';
	
	// Import portfolio components
	import PortfolioSummary from '../portfolio/PortfolioSummary.svelte';
	import PortfolioChart from '../portfolio/PortfolioChart.svelte';
	import RecentTrades from '../portfolio/RecentTrades.svelte';
	import GradientDescentSandbox from '../backtest/GradientDescentSandboxSimplified.svelte';
	
	// Generate some demo portfolio history on mount
	onMount(() => {
		// Add some demo portfolio snapshots
		const now = new Date();
		for (let i = 10; i >= 0; i--) {
			const date = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); // Every 6 hours
			const progress = (10 - i) / 10;
			
			// Simulate portfolio growth
			const baseValue = 0.5;
			const growth = progress * 0.08; // 8% growth simulation
			const volatility = Math.sin(i * 0.8) * 0.015; // Some volatility
			
			const totalBTC = baseValue + growth + volatility;
			const btcAmount = 0.5 + progress * 0.02; // Slight BTC accumulation
			const ethValueBTC = totalBTC - btcAmount;
			
			addPortfolioSnapshot({
				totalValueBTC: Math.max(0.4, totalBTC),
				btcAmount: Math.max(0.45, btcAmount),
				ethValueBTC: Math.max(0.05, ethValueBTC),
				ethAmount: 8.234 - progress * 0.5, // Simulate some ETH being traded
				timestamp: date.toISOString(),
				trades: Math.floor(Math.random() * 2)
			});
		}
		
		// Add some demo trades
		const trades = [
			{
				id: 'trade_1',
				action: 'SELL_ETH',
				type: 'SIGNAL',
				eth_amount: 0.234,
				btc_amount: 0.008,
				reason: 'Z-Score exceeded threshold (1.45), ETH overvalued vs BTC',
				status: 'completed',
				profit: 0.002,
				fees: 0.0001,
				executionTime: 1250,
				created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
			},
			{
				id: 'trade_2',
				action: 'BUY_ETH',
				type: 'REBALANCE',
				eth_amount: 0.156,
				btc_amount: 0.006,
				reason: 'Portfolio rebalancing to maintain 50/50 target allocation',
				status: 'completed',
				profit: 0.001,
				fees: 0.00008,
				executionTime: 980,
				created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString()
			},
			{
				id: 'trade_3',
				action: 'SELL_ETH',
				type: 'SIGNAL',
				eth_amount: 0.445,
				btc_amount: 0.016,
				reason: 'Strong mean reversion signal detected, ETH/BTC ratio high',
				status: 'completed',
				profit: 0.004,
				fees: 0.00015,
				executionTime: 1100,
				created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
			}
		];
		
		trades.forEach(trade => addTrade(trade));
		
		// Update current signal
		updateSignal({
			action: 'HOLD',
			shouldTrade: false,
			confidence: 0.65,
			zScore: -0.456,
			ethBtcRatio: 0.037106,
			reasoning: 'ETH/BTC ratio within normal range, no trading signal generated'
		});
		
		// Show welcome message
		showSuccess('Dashboard Loaded', 'Portfolio components loaded with demo data');
	});
</script>

<div class="dashboard-view">
	<!-- Main Content Grid -->
	<div class="dashboard-grid">
		<!-- Portfolio Summary - Full Width -->
		<div class="grid-item full-width">
			<PortfolioSummary />
		</div>
		
		<!-- Portfolio Chart - Large -->
		<div class="grid-item chart-area">
			<PortfolioChart />
		</div>
		
		<!-- Recent Trades - Sidebar -->
		<div class="grid-item sidebar-area">
			<RecentTrades />
		</div>
		
		<!-- Gradient Descent Sandbox - Full Width -->
		<div class="grid-item full-width">
			<GradientDescentSandbox />
		</div>
	</div>
</div>

<style>
	.dashboard-view {
		padding: 0;
		min-height: 100%;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		grid-template-rows: auto auto auto;
		gap: 24px;
		height: 100%;
	}

	.grid-item {
		min-height: 0; /* Allow grid items to shrink */
	}

	/* Grid Layout */
	.full-width {
		grid-column: 1 / -1;
	}

	.chart-area {
		grid-column: 1;
		grid-row: 2;
	}

	.sidebar-area {
		grid-column: 2;
		grid-row: 2;
	}



	/* Responsive Design */
	@media (max-width: 1200px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto auto;
			gap: 20px;
		}

		.full-width,
		.chart-area,
		.sidebar-area {
			grid-column: 1;
			grid-row: auto;
		}
	}

	@media (max-width: 768px) {
		.dashboard-view {
			padding: 0;
		}

		.dashboard-grid {
			gap: 16px;
		}

	}

	@media (max-width: 480px) {
		.dashboard-grid {
			gap: 12px;
		}

	}

	/* Animation for loading */
	.grid-item {
		animation: fadeInUp 0.5s ease-out;
		animation-fill-mode: both;
	}

	.grid-item:nth-child(1) { animation-delay: 0.1s; }
	.grid-item:nth-child(2) { animation-delay: 0.2s; }
	.grid-item:nth-child(3) { animation-delay: 0.3s; }
	.grid-item:nth-child(4) { animation-delay: 0.4s; }

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
