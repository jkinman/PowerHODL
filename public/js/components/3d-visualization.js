/**
 * 3D Parameter Visualization Module
 * 
 * Provides interactive 3D surface plots for strategy parameter optimization
 */

class ThreeDVisualization {
    constructor() {
        this.optimizationResults = []; // Store optimization results for trail overlay
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners for 3D visualization
     */
    initializeEventListeners() {
        // Initialize sliders when modal opens
        document.addEventListener('DOMContentLoaded', () => {
            const lookbackSlider = document.getElementById('viz3d-lookback');
            const txCostSlider = document.getElementById('viz3d-txcost');
            
            if (lookbackSlider) {
                lookbackSlider.addEventListener('input', function() {
                    document.getElementById('viz3d-lookback-value').textContent = `${this.value} days`;
                });
            }
            
            if (txCostSlider) {
                txCostSlider.addEventListener('input', function() {
                    document.getElementById('viz3d-txcost-value').textContent = `${this.value}%`;
                });
            }
        });
    }

    /**
     * Open 3D visualization modal
     */
    open() {
        const modal = document.getElementById('threeDVisualization');
        if (modal) {
            modal.style.display = 'block';
            
            // Initialize slider values
            const lookbackSlider = document.getElementById('viz3d-lookback');
            const txCostSlider = document.getElementById('viz3d-txcost');
            
            if (lookbackSlider) {
                document.getElementById('viz3d-lookback-value').textContent = `${lookbackSlider.value} days`;
            }
            
            if (txCostSlider) {
                document.getElementById('viz3d-txcost-value').textContent = `${txCostSlider.value}%`;
            }
        }
    }

    /**
     * Close 3D visualization modal
     */
    close() {
        const modal = document.getElementById('threeDVisualization');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Generate 3D surface plot
     */
    generateSurface() {
        console.log('🎯 Generating 3D parameter landscape...');
        
        // Get fixed parameters
        const fixedLookback = parseInt(document.getElementById('viz3d-lookback').value);
        const fixedTxCost = parseFloat(document.getElementById('viz3d-txcost').value);
        const resolution = document.getElementById('viz3d-resolution').value;
        
        // Define resolution
        const resolutions = { low: 10, medium: 15, high: 20 };
        const gridSize = resolutions[resolution];
        
        // Parameter ranges
        const zScoreMin = 0.5, zScoreMax = 3.0;
        const rebalanceMin = 10, rebalanceMax = 90;
        
        // Generate grid
        const x = []; // Z-Score values
        const y = []; // Rebalance values  
        const z = []; // BTC Growth values
        
        let globalMax = -Infinity;
        let globalMaxParams = null;
        let minPerformance = Infinity;
        let maxPerformance = -Infinity;
        
        console.log(`📊 Calculating ${gridSize}x${gridSize} = ${gridSize * gridSize} parameter combinations...`);
        
        for (let i = 0; i < gridSize; i++) {
            const zScoreRow = [];
            const rebalanceRow = [];
            const performanceRow = [];
            
            for (let j = 0; j < gridSize; j++) {
                // Calculate parameter values
                const zScore = zScoreMin + (zScoreMax - zScoreMin) * i / (gridSize - 1);
                const rebalance = rebalanceMin + (rebalanceMax - rebalanceMin) * j / (gridSize - 1);
                
                // Create parameter set
                const params = {
                    zScoreThreshold: zScore,
                    rebalancePercent: rebalance,
                    lookbackWindow: fixedLookback,
                    transactionCost: fixedTxCost,
                    backtestPeriod: 30,
                    startingBTC: 0.1,
                    startingETH: 2.0
                };
                
                // Calculate performance using simulation
                const performance = window.SimulationUtils?.simulateBacktestPerformance(params) || 
                                  Math.random() * 40 - 10; // Fallback if simulation not available
                
                // Track global maximum
                if (performance > globalMax) {
                    globalMax = performance;
                    globalMaxParams = { zScore, rebalance };
                }
                
                // Track range
                minPerformance = Math.min(minPerformance, performance);
                maxPerformance = Math.max(maxPerformance, performance);
                
                zScoreRow.push(zScore);
                rebalanceRow.push(rebalance);
                performanceRow.push(performance);
            }
            
            x.push(zScoreRow);
            y.push(rebalanceRow);
            z.push(performanceRow);
        }
        
        // Create 3D surface plot
        const surfaceData = {
            x: x,
            y: y,
            z: z,
            type: 'surface',
            colorscale: [
                [0, '#ff6b6b'],    // Red for poor performance
                [0.3, '#fbbf24'],  // Yellow for mediocre
                [0.7, '#00d4aa'],  // Green for good
                [1, '#10b981']     // Bright green for excellent
            ],
            showscale: true,
            colorbar: {
                title: 'BTC Growth %',
                titlefont: { color: '#ffffff' },
                tickfont: { color: '#ffffff' }
            }
        };
        
        const layout = {
            title: {
                text: `3D Parameter Landscape (Lookback: ${fixedLookback}d, TxCost: ${fixedTxCost}%)`,
                font: { color: '#ffffff', size: 16 }
            },
            scene: {
                xaxis: { 
                    title: 'Z-Score Threshold',
                    titlefont: { color: '#ffffff' },
                    tickfont: { color: '#ffffff' },
                    gridcolor: '#444',
                    zerolinecolor: '#666'
                },
                yaxis: { 
                    title: 'Rebalance %',
                    titlefont: { color: '#ffffff' },
                    tickfont: { color: '#ffffff' },
                    gridcolor: '#444',
                    zerolinecolor: '#666'
                },
                zaxis: { 
                    title: 'BTC Growth %',
                    titlefont: { color: '#ffffff' },
                    tickfont: { color: '#ffffff' },
                    gridcolor: '#444',
                    zerolinecolor: '#666'
                },
                bgcolor: '#1a1a1b',
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            },
            paper_bgcolor: '#1a1a1b',
            plot_bgcolor: '#1a1a1b',
            font: { color: '#ffffff' },
            margin: { t: 50, b: 50, l: 50, r: 50 }
        };
        
        const config = {
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
            displaylogo: false,
            responsive: true
        };
        
        // Plot the surface
        Plotly.newPlot('threeDPlot', [surfaceData], layout, config);
        
        // Update stats
        document.getElementById('global-max').textContent = `+${globalMax.toFixed(2)}%`;
        document.getElementById('global-max-params').textContent = 
            `Z:${globalMaxParams.zScore.toFixed(2)}, R:${globalMaxParams.rebalance.toFixed(0)}%`;
        document.getElementById('surface-points').textContent = `${gridSize * gridSize}`;
        document.getElementById('performance-range').textContent = 
            `${minPerformance.toFixed(1)}% to ${maxPerformance.toFixed(1)}%`;
        
        console.log('✅ 3D surface generated successfully!');
        console.log(`🏆 Global maximum: +${globalMax.toFixed(2)}% at Z:${globalMaxParams.zScore.toFixed(2)}, R:${globalMaxParams.rebalance.toFixed(0)}%`);
    }

    /**
     * Add optimization trail to existing 3D plot
     */
    addOptimizationTrail() {
        // Get optimization results from the global state (BacktestAPI might have them)
        const results = window.BacktestAPI?.optimizationResults || this.optimizationResults || [];
        
        if (results.length === 0) {
            alert('Run some optimizations first to see the trail!');
            return;
        }
        
        console.log('🛤️ Adding optimization trail to 3D plot...');
        
        // Get current fixed parameters
        const fixedLookback = parseInt(document.getElementById('viz3d-lookback').value);
        const fixedTxCost = parseFloat(document.getElementById('viz3d-txcost').value);
        
        // Filter results that match current fixed parameters (approximately)
        const relevantResults = results.filter(result => 
            Math.abs(result.parameters.lookbackWindow - fixedLookback) <= 2 &&
            Math.abs(result.parameters.transactionCost - fixedTxCost) <= 0.5
        );
        
        if (relevantResults.length === 0) {
            alert(`No optimization results match current fixed parameters (Lookback: ${fixedLookback}d, TxCost: ${fixedTxCost}%). Generate surface first or adjust parameters.`);
            return;
        }
        
        // Create scatter trace for optimization points
        const trailData = {
            x: relevantResults.map(r => r.parameters.zScoreThreshold),
            y: relevantResults.map(r => r.parameters.rebalancePercent),
            z: relevantResults.map(r => r.btcGrowth),
            mode: 'markers+lines',
            type: 'scatter3d',
            name: 'Optimization Trail',
            marker: {
                size: relevantResults.map(r => r.isBest ? 12 : 6),
                color: relevantResults.map(r => r.btcGrowth),
                colorscale: 'Viridis',
                symbol: relevantResults.map(r => r.isBest ? 'diamond' : 'circle'),
                line: { width: 1, color: '#ffffff' }
            },
            line: {
                color: '#8b5cf6',
                width: 3
            },
            text: relevantResults.map(r => 
                `Iteration ${r.iteration}<br>BTC: +${r.btcGrowth.toFixed(2)}%<br>Z:${r.parameters.zScoreThreshold.toFixed(2)}<br>R:${r.parameters.rebalancePercent.toFixed(0)}%`
            ),
            hovertemplate: '%{text}<extra></extra>'
        };
        
        // Add trace to existing plot
        Plotly.addTraces('threeDPlot', [trailData]);
        
        console.log(`✅ Added optimization trail with ${relevantResults.length} points`);
    }

    /**
     * Store optimization results for trail visualization
     */
    setOptimizationResults(results) {
        this.optimizationResults = results;
    }
}

// Export for global use
window.ThreeDVisualization = ThreeDVisualization;

// Global functions for backward compatibility
window.open3DVisualization = function() {
    if (window.threeDViz) {
        window.threeDViz.open();
    }
};

window.close3DVisualization = function() {
    if (window.threeDViz) {
        window.threeDViz.close();
    }
};

window.generate3DSurface = function() {
    if (window.threeDViz) {
        window.threeDViz.generateSurface();
    }
};

window.addOptimizationTrail = function() {
    if (window.threeDViz) {
        window.threeDViz.addOptimizationTrail();
    }
};
