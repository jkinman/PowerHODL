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
	
	// Initialize and load real data
	onMount(async () => {
		// Welcome message
		showSuccess('PowerHODL Initialized', 'Loading real market data...');
		
		// Load real market and portfolio data
		try {
			// Fetch real data from API
			const [marketResponse, portfolioResponse] = await Promise.all([
				fetch(`${import.meta.env.DEV ? 'http://localhost:9001' : (import.meta.env.VITE_API_URL || 'https://powerhodl-api.vercel.app')}/api/historical?timeframe=1d`),
				fetch(`${import.meta.env.DEV ? 'http://localhost:9001' : (import.meta.env.VITE_API_URL || 'https://powerhodl-api.vercel.app')}/api/portfolio`)
			]);
			
			if (marketResponse.ok) {
				const marketData = await marketResponse.json();
				if (marketData.data && marketData.data.length > 0) {
					const latestData = marketData.data[marketData.data.length - 1];
					updateMarketData({
						ethPriceUSD: latestData.eth_price_usd || latestData.ethPriceUSD,
						btcPriceUSD: latestData.btc_price_usd || latestData.btcPriceUSD,
						ethBtcRatio: latestData.eth_btc_ratio || latestData.ethBtcRatio,
						zScore: latestData.z_score || latestData.zScore || 0,
						source: 'database'
					});
				}
			}
			
			if (portfolioResponse.ok) {
				const portfolioData = await portfolioResponse.json();
				if (portfolioData.data) {
					updatePortfolio({
						btcAmount: portfolioData.data.btcAmount || 0,
						ethAmount: portfolioData.data.ethAmount || 0
					});
				}
			}
			
			showSuccess('Data Loaded', 'Real market data and portfolio loaded successfully');
		} catch (error) {
			console.error('Failed to load data:', error);
			showInfo('Using Demo Data', 'Failed to load real data, using demo values');
		}
	});
</script>

<DashboardLayout />