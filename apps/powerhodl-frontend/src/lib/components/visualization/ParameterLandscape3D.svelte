<!--
	3D Parameter Landscape Visualization
	
	Interactive 3D surface plot showing BTC growth across parameter combinations
	with gradient descent optimization trails and parameter exploration
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { 
		visualizationData,
		optimizationResults,
		backtestResults,
		showSuccess,
		showError,
		showInfo,
		runSingleBacktest
	} from '$lib/stores';
	
	export let width = 800;
	export let height = 600;
	export let interactive = true;
	export let showOptimizationTrail = true;
	export let surfaceResolution = 'high'; // Default to high resolution
	
	let plotContainer;
	let plotlyReady = false;
	let currentPlot = null;
	
	// Visualization settings - simplified with good defaults
	let visualSettings = {
		surfaceOpacity: 0.9,
		colorScale: 'Portland',
		showContours: true,
		cameraAngle: { x: 20, y: 35, z: 0 }, // Better starting angle
		lightingIntensity: 0.8,
		meshSmoothing: true
	};
	
	// Parameter ranges for surface generation
	const parameterRanges = {
		rebalanceThreshold: { min: 30, max: 70, steps: 20 },
		zScoreThreshold: { min: 0.5, max: 3.0, steps: 20 },
		transactionCost: { min: 0.5, max: 3.0, steps: 15 },
		lookbackWindow: { min: 5, max: 30, steps: 10 },
		volatilityFilter: { min: 0.1, max: 1.0, steps: 10 }
	};
	
	// Current visualization mode
	let vizMode = 'surface'; // 'surface', 'trail', 'combined'
	let fixedParameters = {
		transactionCost: 1.66,
		lookbackWindow: 15,
		volatilityFilter: 0.5
	};
	
	// Surface data cache
	let surfaceDataCache = new Map();
	let isGeneratingSurface = false;
	let surfaceGenerationProgress = 0;
	
	// Use real backtest results for the surface
	let backtestResultsCache = new Map();
	
	// Generate 3D surface data using real backtest results
	async function generateParameterSurface(xParam = 'rebalanceThreshold', yParam = 'zScoreThreshold') {
		const cacheKey = `${xParam}_${yParam}_${surfaceResolution}`;
		if (surfaceDataCache.has(cacheKey)) {
			return surfaceDataCache.get(cacheKey);
		}
		
		isGeneratingSurface = true;
		surfaceGenerationProgress = 0;
		
		const xRange = parameterRanges[xParam];
		const yRange = parameterRanges[yParam];
		
		// Adjust resolution based on setting
		const resolutionMultiplier = surfaceResolution === 'high' ? 1 : surfaceResolution === 'low' ? 0.5 : 0.75;
		const xSteps = Math.floor(xRange.steps * resolutionMultiplier);
		const ySteps = Math.floor(yRange.steps * resolutionMultiplier);
		
		const xValues = [];
		const yValues = [];
		const zValues = [];
		
		// Generate X axis values
		for (let i = 0; i <= xSteps; i++) {
			xValues.push(xRange.min + (xRange.max - xRange.min) * (i / xSteps));
		}
		
		// Generate Y axis values
		for (let j = 0; j <= ySteps; j++) {
			yValues.push(yRange.min + (yRange.max - yRange.min) * (j / ySteps));
		}
		
		// First check if we have cached results to interpolate from
		const cachedResults = Array.from(backtestResultsCache.values());
		if (cachedResults.length > 10) {
			// Use interpolation from cached results for faster generation
			console.log('Using interpolation from', cachedResults.length, 'cached results');
			
			for (let j = 0; j <= ySteps; j++) {
				const row = [];
				for (let i = 0; i <= xSteps; i++) {
					const params = { ...fixedParameters };
					params[xParam] = xValues[i];
					params[yParam] = yValues[j];
					
					// Interpolate from nearby cached results
					const btcGrowth = interpolateFromCache(params, xParam, yParam, cachedResults);
					// Ensure no NaN or undefined values
					row.push(isNaN(btcGrowth) || btcGrowth === undefined || btcGrowth === null ? 0 : btcGrowth);
				}
				zValues.push(row);
			}
		} else {
			// Not enough real data - prompt user to run more backtests
			console.log('Not enough backtest results for accurate surface. Run more tests in the Gradient Descent Sandbox.');
			showInfo('More Data Needed', 'Run at least 10 backtests in the Gradient Descent Sandbox to see an accurate surface');
			
			// Use simulation as fallback
			for (let j = 0; j <= ySteps; j++) {
				const row = [];
				for (let i = 0; i <= xSteps; i++) {
					const params = { ...fixedParameters };
					params[xParam] = xValues[i];
					params[yParam] = yValues[j];
					
					// Use enhanced simulation based on strategy knowledge
					const btcGrowth = simulateBTCGrowthEnhanced(params);
					// Ensure no NaN or undefined values
					row.push(isNaN(btcGrowth) || btcGrowth === undefined || btcGrowth === null ? 0 : btcGrowth);
				}
				zValues.push(row);
				surfaceGenerationProgress = (j / ySteps) * 100;
			}
		}
		
		isGeneratingSurface = false;
		
		// Final cleanup to ensure no NaN or undefined values in the surface
		const cleanZValues = zValues.map(row => 
			row.map(val => isNaN(val) || val === undefined || val === null ? 0 : val)
		);
		
		const surfaceData = { x: xValues, y: yValues, z: cleanZValues };
		surfaceDataCache.set(cacheKey, surfaceData);
		return surfaceData;
	}
	
	// Interpolate results from cached backtest data
	function interpolateFromCache(params, xParam, yParam, cachedResults) {
		// Find the 4 nearest neighbors in parameter space
		const distances = cachedResults.map(result => {
			const dx = (result.parameters[xParam] - params[xParam]) / (parameterRanges[xParam].max - parameterRanges[xParam].min);
			const dy = (result.parameters[yParam] - params[yParam]) / (parameterRanges[yParam].max - parameterRanges[yParam].min);
			return {
				distance: Math.sqrt(dx * dx + dy * dy),
				btcGrowth: result.btcGrowthPercent || 0
			};
		}).sort((a, b) => a.distance - b.distance);
		
		// Weighted average of nearest neighbors
		const k = Math.min(4, distances.length);
		let weightSum = 0;
		let valueSum = 0;
		
		for (let i = 0; i < k; i++) {
			const weight = 1 / (distances[i].distance + 0.01); // Avoid division by zero
			weightSum += weight;
			valueSum += weight * distances[i].btcGrowth;
		}
		
		return weightSum > 0 ? valueSum / weightSum : 0;
	}
	
	// Enhanced simulation based on real strategy behavior
	function simulateBTCGrowthEnhanced(params) {
		const {
			rebalanceThreshold,
			zScoreThreshold,
			transactionCost,
			lookbackWindow,
			volatilityFilter
		} = params;
		
		// Model based on actual strategy behavior and recent backtest results
		
		// Optimal z-score is around 1.258 based on mega-optimal parameters
		const zScoreOptimal = 1.258;
		const zScorePenalty = Math.exp(-Math.pow((zScoreThreshold - zScoreOptimal) / 0.5, 2));
		
		// Optimal rebalance threshold is around 49.79%
		const rebalanceOptimal = 49.79;
		const rebalancePenalty = Math.exp(-Math.pow((rebalanceThreshold - rebalanceOptimal) / 15, 2));
		
		// Transaction costs have severe impact on performance
		const costImpact = Math.max(0, 1 - transactionCost / 5);
		
		// Lookback window sweet spot is 15 days
		const lookbackOptimal = 15;
		const lookbackPenalty = Math.exp(-Math.pow((lookbackWindow - lookbackOptimal) / 10, 2));
		
		// Combine factors with realistic weights
		let performance = -5; // Base negative performance (market baseline)
		performance += zScorePenalty * 8;      // Up to +8% for optimal z-score
		performance += rebalancePenalty * 5;   // Up to +5% for optimal rebalance
		performance += costImpact * 3;         // Up to +3% for low costs
		performance += lookbackPenalty * 2;    // Up to +2% for optimal lookback
		
		// Add some realistic variance
		const variance = (Math.random() - 0.5) * 2;
		
		// Cap between realistic bounds seen in actual backtests
		const result = Math.max(-15, Math.min(10, performance + variance));
		
		// Ensure we never return NaN or undefined
		return isNaN(result) || result === undefined || result === null ? 0 : result;
	}
	
	// Generate optimization trail from results
	function generateOptimizationTrail() {
		if (!$optimizationResults || $optimizationResults.length === 0) {
			return null;
		}
		
		const trailData = {
			x: [],
			y: [],
			z: [],
			text: [],
			iteration: []
		};
		
		$optimizationResults.forEach((result, index) => {
			if (result.parameters) {
				trailData.x.push(result.parameters.rebalanceThreshold || 50);
				trailData.y.push(result.parameters.zScoreThreshold || 1.2);
				trailData.z.push(result.btcGrowthPercent || 0);
				trailData.text.push(`Iteration ${index + 1}<br>BTC Growth: ${(result.btcGrowthPercent || 0).toFixed(2)}%`);
				trailData.iteration.push(index + 1);
			}
		});
		
		return trailData;
	}
	
	// Create 3D surface plot
	async function createSurfacePlot() {
		if (!plotlyReady || !plotContainer) return;
		
		try {
			// Always populate cache from existing backtest results
			if ($backtestResults && $backtestResults.length > 0) {
				backtestResultsCache.clear(); // Clear old cache
				$backtestResults.forEach(result => {
					if (result && result.parameters) {
						const rebalanceValue = result.parameters.rebalancePercent || result.parameters.rebalanceThreshold || 50;
						const zScoreValue = result.parameters.zScoreThreshold || 1.5;
						
						// Create multiple cache keys for better matching
						const key1 = `${rebalanceValue}_${zScoreValue}`;
						const key2 = `${Math.round(rebalanceValue)}_${zScoreValue}`;
						
						const cacheEntry = {
							parameters: {
								rebalanceThreshold: rebalanceValue,
								rebalancePercent: rebalanceValue,
								zScoreThreshold: zScoreValue,
								...result.parameters
							},
							btcGrowthPercent: result.btcGrowthPercent || 0
						};
						
						backtestResultsCache.set(key1, cacheEntry);
						backtestResultsCache.set(key2, cacheEntry);
					}
				});
				console.log(`Auto-populated cache with ${backtestResultsCache.size} entries from ${$backtestResults.length} backtest results`);
			}
			
			const surfaceData = await generateParameterSurface();
			const Plotly = window['Plotly'];
			
			const data = [{
				type: 'surface',
				x: surfaceData.x,
				y: surfaceData.y,
				z: surfaceData.z,
				colorscale: visualSettings.colorScale,
				opacity: visualSettings.surfaceOpacity,
				contours: {
					z: {
						show: visualSettings.showContours,
						usecolormap: true,
						highlightcolor: "#42f462",
						project: { z: true }
					}
				},
				lighting: {
					ambient: visualSettings.lightingIntensity,
					diffuse: 0.8,
					fresnel: 0.2,
					specular: 0.05,
					roughness: 0.1
				},
				hovertemplate: 
					'<b>Parameters:</b><br>' +
					'Rebalance: %{x:.1f}%<br>' +
					'Z-Score: %{y:.3f}<br>' +
					'<b>BTC Growth: %{z:.2f}%</b><br>' +
					'<extra></extra>',
				name: 'Parameter Surface'
			}];
			
			// Add optimization trail if available and enabled
			if (showOptimizationTrail) {
				const trailData = generateOptimizationTrail();
				if (trailData && trailData.x.length > 0) {
					data.push({
						type: 'scatter3d',
						mode: 'markers+lines',
						x: trailData.x,
						y: trailData.y,
						z: trailData.z,
						text: trailData.text,
						hovertemplate: '%{text}<extra></extra>',
						name: 'Optimization Trail',
						line: {
							color: '#ff6b6b',
							width: 4
						},
						marker: {
							size: trailData.iteration.map(i => 3 + i * 0.5),
							color: trailData.iteration,
							colorscale: 'Hot',
							opacity: 0.8,
							symbol: 'circle'
						}
					});
				}
			}
			
			const layout = {
				title: {
					text: '3D Parameter Landscape: BTC Growth Optimization',
					font: { 
						color: '#ffffff',
						size: 18,
						family: 'Arial, sans-serif'
					}
				},
				scene: {
					xaxis: {
						title: 'Rebalance Threshold (%)',
						titlefont: { color: '#ffffff', size: 14 },
						tickfont: { color: '#cccccc', size: 11 },
						gridcolor: 'rgba(255,255,255,0.1)',
						zerolinecolor: 'rgba(255,255,255,0.2)',
						showbackground: true,
						backgroundcolor: 'rgba(0,0,0,0.1)'
					},
					yaxis: {
						title: 'Z-Score Threshold',
						titlefont: { color: '#ffffff', size: 14 },
						tickfont: { color: '#cccccc', size: 11 },
						gridcolor: 'rgba(255,255,255,0.1)',
						zerolinecolor: 'rgba(255,255,255,0.2)',
						showbackground: true,
						backgroundcolor: 'rgba(0,0,0,0.1)'
					},
					zaxis: {
						title: 'BTC Growth (%)',
						titlefont: { color: '#ffffff', size: 14 },
						tickfont: { color: '#cccccc', size: 11 },
						gridcolor: 'rgba(255,255,255,0.1)',
						zerolinecolor: 'rgba(255,255,255,0.2)',
						showbackground: true,
						backgroundcolor: 'rgba(0,0,0,0.1)'
					},
					camera: {
						eye: {
							x: 1.5,
							y: -1.5,
							z: 1.2
						},
						center: {
							x: 0,
							y: 0,
							z: 0
						}
					},
					bgcolor: 'rgba(0,0,0,0)',
					aspectmode: 'cube'
				},
				paper_bgcolor: 'rgba(0,0,0,0)',
				plot_bgcolor: 'rgba(0,0,0,0)',
				font: {
					color: '#ffffff',
					family: 'Arial, sans-serif'
				},
				margin: { l: 0, r: 0, t: 50, b: 0 },
				showlegend: true,
				legend: {
					font: { color: '#ffffff' },
					bgcolor: 'rgba(0,0,0,0.5)',
					bordercolor: 'rgba(255,255,255,0.2)',
					borderwidth: 1
				}
			};
			
			const config = {
				responsive: true,
				displayModeBar: interactive,
				scrollZoom: false, // Disable scroll wheel zoom
				modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
				modeBarButtonsToAdd: [{
					name: 'Reset Camera',
					icon: {
						width: 500,
						height: 600,
						path: 'M250,300 L350,200 L350,250 L450,250 L450,350 L350,350 L350,400 Z'
					},
					click: () => resetCamera()
				}],
				toImageButtonOptions: {
					format: 'png',
					filename: 'powerhodl-parameter-landscape',
					height: height,
					width: width,
					scale: 2
				}
			};
			
			Plotly.newPlot(plotContainer, data, layout, config).then(() => {
				currentPlot = plotContainer;
				showSuccess('3D Visualization Ready', 'Interactive parameter landscape generated');
			});
			
		} catch (error) {
			console.error('Failed to create 3D plot:', error);
			showError('Visualization Error', error.message);
		}
	}
	
	// Reset camera to default position
	function resetCamera() {
		if (currentPlot) {
			const Plotly = window['Plotly'];
			Plotly.relayout(currentPlot, {
				'scene.camera.eye': { x: 1.25, y: 1.25, z: 1.25 }
			});
		}
	}
	
	// Update visualization with new data
	async function updateVisualization() {
		if (!plotlyReady) return;
		
		// Clear cache to force regeneration
		surfaceDataCache.clear();
		await createSurfacePlot();
	}
	
	// Handle parameter changes
	function handleParameterChange(param, value) {
		fixedParameters[param] = value;
		updateVisualization();
	}
	
	// Export current view as image
	function exportAsImage() {
		if (!currentPlot) return;
		
		const Plotly = window['Plotly'];
		Plotly.toImage(currentPlot, {
			format: 'png',
			width: width * 2,
			height: height * 2,
			scale: 2
		}).then((dataUrl) => {
			const link = document.createElement('a');
			link.download = 'powerhodl-parameter-landscape.png';
			link.href = dataUrl;
			link.click();
			showInfo('Export Complete', 'Parameter landscape saved as PNG');
		});
	}
	
	// Refresh surface from existing backtest results
	async function refreshFromBacktestResults() {
		if ($backtestResults.length === 0) {
			showInfo('No Results', 'Run some backtests in the Gradient Descent Sandbox first');
			return;
		}
		
		showInfo('Refreshing Visualization', `Using ${$backtestResults.length} backtest results`);
		
		// Clear caches to force regeneration
		backtestResultsCache.clear();
		surfaceDataCache.clear();
		
		// Populate cache with ALL backtest results from the store
		$backtestResults.forEach(result => {
			if (result && result.parameters) {
				// Use both rebalancePercent and rebalanceThreshold for compatibility
				const rebalanceValue = result.parameters.rebalancePercent || result.parameters.rebalanceThreshold || 50;
				const zScoreValue = result.parameters.zScoreThreshold || 1.5;
				
				// Create multiple cache keys to ensure we find the data
				const key1 = `${rebalanceValue}_${zScoreValue}`;
				const key2 = `${Math.round(rebalanceValue)}_${zScoreValue}`;
				
				const cacheEntry = {
					parameters: {
						rebalanceThreshold: rebalanceValue,
						rebalancePercent: rebalanceValue,
						zScoreThreshold: zScoreValue,
						...result.parameters
					},
					btcGrowthPercent: result.btcGrowthPercent || 0,
					totalTrades: result.totalTrades || 0,
					sharpeRatio: result.sharpeRatio || 0,
					maxDrawdown: result.maxDrawdown || 0
				};
				
				backtestResultsCache.set(key1, cacheEntry);
				backtestResultsCache.set(key2, cacheEntry);
			}
		});
		
		console.log(`Populated cache with ${backtestResultsCache.size} entries from ${$backtestResults.length} results`);
		
		// Force regeneration of the surface
		await updateVisualization();
		
		showSuccess('Visualization Updated', `Surface generated from ${$backtestResults.length} backtest results`);
	}
	
	// Component lifecycle
	onMount(async () => {
		// Wait for Plotly.js to be available
		const checkPlotly = () => {
			if (typeof window !== 'undefined' && window['Plotly']) {
				plotlyReady = true;
				createSurfacePlot();
			} else {
				setTimeout(checkPlotly, 100);
			}
		};
		checkPlotly();
	});
	
	onDestroy(() => {
		if (currentPlot) {
			const Plotly = window['Plotly'];
			if (Plotly && Plotly.purge) {
				Plotly.purge(currentPlot);
			}
		}
	});
	
	// React to store changes
	$: if ($optimizationResults && plotlyReady) {
		updateVisualization();
	}
	
	// Don't automatically update during iterations
	// The visualization will update when user clicks a result
	// or manually refreshes
	
	// React to settings changes
	$: if (visualSettings && plotlyReady) {
		updateVisualization();
	}
	
	let updateDebounce;
</script>

<div class="parameter-landscape-3d">
	<!-- Controls Panel -->
	<div class="viz-controls">
		<div class="control-group">
			<h4 class="control-title">
				<span class="title-icon">🌐</span>
				3D Parameter Landscape
			</h4>
			<div class="control-subtitle">
				High-resolution optimization surface (Portland color scheme, 90% opacity)
			</div>
		</div>
		
		<div class="control-row">
			<!-- Essential Controls Only -->
			<div class="control-item">
				<button class="action-btn" on:click={resetCamera}>
					<span class="btn-icon">🎥</span>
					Reset Camera
				</button>
			</div>
			
			<div class="control-item">
				<button class="action-btn secondary" on:click={exportAsImage}>
					<span class="btn-icon">📸</span>
					Export PNG
				</button>
			</div>
			
			<div class="control-item">
				<button 
					class="action-btn primary" 
					on:click={refreshFromBacktestResults}
					disabled={$backtestResults.length === 0}
				>
					<span class="btn-icon">🔄</span>
					Refresh from {$backtestResults.length} Results
				</button>
			</div>
		</div>
	</div>
	
	<!-- 3D Plot Container -->
	<div class="plot-container" style="width: {width}px; height: {height}px;">
		{#if !plotlyReady}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<div class="loading-text">Loading 3D Visualization...</div>
				<div class="loading-subtitle">Initializing Plotly.js</div>
			</div>
		{:else}
			<div bind:this={plotContainer} class="plotly-container"></div>
		{/if}
	</div>
	
	<!-- Legend and Info -->
	<div class="viz-info">
		<div class="info-section">
			<h5 class="info-title">Surface Interpretation</h5>
			<div class="info-grid">
				<div class="info-item">
					<span class="info-color hot"></span>
					<span class="info-text">High BTC Growth (>15%)</span>
				</div>
				<div class="info-item">
					<span class="info-color warm"></span>
					<span class="info-text">Good Performance (8-15%)</span>
				</div>
				<div class="info-item">
					<span class="info-color cool"></span>
					<span class="info-text">Average Performance (3-8%)</span>
				</div>
				<div class="info-item">
					<span class="info-color cold"></span>
					<span class="info-text">Poor Performance (&lt;3%)</span>
				</div>
			</div>
		</div>
		
		<div class="info-section">
			<h5 class="info-title">Optimization Trail</h5>
			<div class="trail-info">
				{#if $optimizationResults && $optimizationResults.length > 0}
					<div class="trail-stats">
						<span class="trail-stat">
							<strong>{$optimizationResults.length}</strong> iterations
						</span>
						<span class="trail-stat">
							<strong>{Math.max(...$optimizationResults.map(r => r.btcGrowthPercent || 0)).toFixed(2)}%</strong> best
						</span>
					</div>
				{:else}
					<div class="trail-empty">
						Run optimization to see gradient descent trail
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.parameter-landscape-3d {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 20px;
		backdrop-filter: blur(10px);
	}

	/* Controls */
	.viz-controls {
		margin-bottom: 20px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
	}

	.control-group {
		margin-bottom: 16px;
	}

	.control-title {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.title-icon {
		font-size: 18px;
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.control-subtitle {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.control-row {
		display: flex;
		gap: 20px;
		align-items: center;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	.control-item {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 120px;
	}

	.control-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
		min-width: 80px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.control-select,
	.control-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		width: 80px;
	}

	.control-select:focus,
	.control-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(255, 255, 255, 0.1);
	}

	.control-slider {
		width: 60px;
		height: 3px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.control-slider::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		background: #f7931a;
		border-radius: 50%;
		cursor: pointer;
		border: 1px solid #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.control-value {
		font-size: 10px;
		color: #f7931a;
		font-weight: 600;
		min-width: 30px;
		text-align: center;
	}

	.control-unit {
		font-size: 10px;
		color: #888;
		font-weight: 500;
	}

	.checkbox-control {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: #ccc;
		cursor: pointer;
	}

	.checkbox-control input[type="checkbox"] {
		width: 12px;
		height: 12px;
		accent-color: #f7931a;
	}

	.action-btn {
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.3);
		color: #f7931a;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 4px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.action-btn:hover {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
	}

	.action-btn.secondary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
	}

	.action-btn.secondary:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.btn-icon {
		font-size: 10px;
	}

	/* Plot Container */
	.plot-container {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(0, 0, 0, 0.3);
		margin-bottom: 20px;
	}

	.plotly-container {
		width: 100%;
		height: 100%;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #888;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(247, 147, 26, 0.2);
		border-top: 3px solid #f7931a;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	.loading-text {
		font-size: 16px;
		font-weight: 600;
		color: #ccc;
		margin-bottom: 4px;
	}

	.loading-subtitle {
		font-size: 12px;
		color: #888;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Visualization Info */
	.viz-info {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.info-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 12px;
	}

	.info-title {
		margin: 0 0 10px 0;
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.info-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: #ccc;
	}

	.info-color {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.info-color.hot {
		background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
	}

	.info-color.warm {
		background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
	}

	.info-color.cool {
		background: linear-gradient(135deg, #42a5f5 0%, #2196f3 100%);
	}

	.info-color.cold {
		background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
	}

	.trail-info {
		text-align: center;
	}

	.trail-stats {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.trail-stat {
		font-size: 12px;
		color: #ccc;
	}

	.trail-stat strong {
		color: #f7931a;
		font-weight: 700;
	}

	.trail-empty {
		font-size: 12px;
		color: #888;
		font-style: italic;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.parameter-landscape-3d {
			padding: 16px;
		}

		.control-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.viz-info {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.parameter-landscape-3d {
			padding: 12px;
		}

		.viz-controls {
			padding: 12px;
		}

		.control-item {
			min-width: 100%;
			justify-content: space-between;
		}

		.info-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
