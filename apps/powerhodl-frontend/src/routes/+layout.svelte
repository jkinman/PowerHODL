<!-- Main Layout for PowerHODL Dashboard -->
<script>
	import '$lib/styles/global.css';
	import { onMount } from 'svelte';

	// Global app initialization
	onMount(() => {
		console.log('🚀 PowerHODL Svelte Edition Loaded');
	});
</script>

<svelte:head>
	<title>PowerHODL - BTC Bear Market Buster</title>
</svelte:head>

<main class="app">
	<slot />
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0d0d0d;
		color: #ffffff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.app {
		min-height: 100vh;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 20px;
	}

	:global(.dark-theme) {
		background: #0d0d0d;
		color: #ffffff;
	}
</style>
