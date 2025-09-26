<!-- PowerHODL Svelte Dashboard -->
<script>
	import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
	import { onMount } from 'svelte';
	import { 
		showSuccess, 
		showInfo,
		updateMarketData,
		updatePortfolio 
	} from '$lib/stores';
	
	// Initialize with some demo data
	onMount(() => {
		// Welcome message
		showSuccess('PowerHODL Initialized', 'Svelte edition is ready for BTC accumulation!');
		
		// Load some demo market data
		updateMarketData({
			ethPriceUSD: 2650,
			btcPriceUSD: 67200,
			zScore: -0.456,
			source: 'demo'
		});
		
		// Load demo portfolio
		updatePortfolio({
			btcAmount: 0.485,
			ethAmount: 8.234
		});
		
		// Show info about the migration
		setTimeout(() => {
			showInfo(
				'Layout Complete!', 
				'Dashboard layout and gradient descent sandbox are now powered by Svelte. Real components coming next.'
			);
		}, 2000);
	});
</script>

<DashboardLayout />