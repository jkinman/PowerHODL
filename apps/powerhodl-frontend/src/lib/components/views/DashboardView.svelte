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
	
	// API URL
	const __API_URL__ = import.meta.env.VITE_API_URL || 'http://localhost:9001';
	
	// Fetch real portfolio data on mount
	onMount(async () => {
		try {
			// Fetch portfolio status from API
			const portfolioResponse = await fetch(`${__API_URL__}/api/portfolio`);
			if (portfolioResponse.ok) {
				const data = await portfolioResponse.json();
				
				// Update portfolio with real data
				if (data.portfolio && data.portfolio.current) {
					const current = data.portfolio.current;
					addPortfolioSnapshot({
						totalValueBTC: current.totalValueBTC,
						btcAmount: current.btcAmount,
						ethValueBTC: current.ethValueBTC,
						ethAmount: current.ethAmount,
						timestamp: current.lastUpdated || new Date().toISOString(),
						trades: 0
					});
				}
				
				// Update trading signal if available
				if (data.strategy) {
					updateSignal({
						signal: data.strategy.status === 'active' ? 'ACTIVE' : 'HOLD',
						confidence: 0.85,
						reason: `Strategy: ${data.strategy.name}`
					});
				}
			}
			
			// Recent trades will be fetched from API when available
			// For now, leave empty as no real trades have been executed yet
			const trades = [];
			
			// If the API returned recent trades, add them
			if (data.recentTrades && data.recentTrades.length > 0) {
				data.recentTrades.forEach(trade => addTrade(trade));
			}
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
		}
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
