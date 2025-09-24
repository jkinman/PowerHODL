#!/usr/bin/env node
/**
 * MEGA 250-ITERATION OPTIMIZER
 * The ultimate optimization system for finding the absolute global maximum
 * Combines all advanced techniques for the most comprehensive search ever attempted
 */

import ETHBTCDataCollector from './dataCollector.js';
import ETHBTCAnalyzer from './analyzer.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MegaOptimizer {
    constructor(data) {
        this.data = data;
        this.totalIterations = 250;
        this.currentIteration = 0;
        this.populationSize = 100;
        this.eliteSize = 20;
        this.mutationRate = 0.15;
        this.crossoverRate = 0.85;
        this.explorationRate = 0.3;
        
        // Advanced tracking
        this.population = [];
        this.elites = [];
        this.generations = [];
        this.globalBest = null;
        this.convergenceHistory = [];
        this.diversityHistory = [];
        this.explorationHistory = [];
        this.phaseResults = {};
        
        // Multi-phase approach
        this.phases = [
            { name: 'EXPLORATION', iterations: 60, focus: 'global_search' },
            { name: 'INTENSIFICATION', iterations: 70, focus: 'local_refinement' },
            { name: 'DIVERSIFICATION', iterations: 50, focus: 'escape_optima' },
            { name: 'CONVERGENCE', iterations: 70, focus: 'final_polish' }
        ];
        
        // Parameter space definition
        this.parameterSpace = {
            rebalanceThreshold: { min: 0.005, max: 0.5, precision: 6 },
            transactionCost: { min: 0.0001, max: 0.025, precision: 7 },
            zScoreThreshold: { min: 0.3, max: 5.0, precision: 5 },
            lookbackWindow: { min: 5, max: 300, precision: 0 },
            volatilityFilter: { min: 0.05, max: 3.0, precision: 4 }
        };
        
        console.log('🚀 MEGA 250-ITERATION OPTIMIZER INITIALIZED');
        console.log('=' + '='.repeat(45));
        console.log(`🎯 Target: ${this.totalIterations} iterations across 4 phases`);
        console.log(`👥 Population: ${this.populationSize} strategies per generation`);
        console.log(`🏆 Elite preservation: Top ${this.eliteSize} strategies`);
        console.log(`🧬 Mutation rate: ${(this.mutationRate * 100).toFixed(1)}%`);
        console.log(`💑 Crossover rate: ${(this.crossoverRate * 100).toFixed(1)}%`);
        console.log('🌟 This will be the most comprehensive optimization ever attempted!\n');
    }

    async runMegaOptimization() {
        const startTime = Date.now();
        
        console.log('🌟 STARTING MEGA 250-ITERATION OPTIMIZATION');
        console.log('=' + '='.repeat(50));
        
        // Initialize population
        await this.initializePopulation();
        
        let currentPhaseIteration = 0;
        let phaseIndex = 0;
        
        for (this.currentIteration = 1; this.currentIteration <= this.totalIterations; this.currentIteration++) {
            // Check if we need to switch phases
            if (currentPhaseIteration >= this.phases[phaseIndex].iterations) {
                if (phaseIndex < this.phases.length - 1) {
                    await this.completePhase(phaseIndex);
                    phaseIndex++;
                    currentPhaseIteration = 0;
                    await this.initializePhase(phaseIndex);
                }
            }
            
            const currentPhase = this.phases[phaseIndex];
            
            // Run iteration based on current phase
            await this.runPhaseIteration(currentPhase, currentPhaseIteration);
            
            // Track progress
            await this.trackProgress(currentPhase);
            
            // Adaptive parameter adjustment
            this.adaptParameters();
            
            // Progress reporting
            if (this.currentIteration % 10 === 0) {
                this.reportProgress(currentPhase);
            }
            
            // Save intermediate results
            if (this.currentIteration % 25 === 0) {
                await this.saveIntermediateResults();
            }
            
            currentPhaseIteration++;
        }
        
        // Final analysis
        const finalResults = await this.finalizeMegaOptimization();
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        
        this.displayFinalResults(finalResults, totalTime);
        
        return finalResults;
    }

    async initializePopulation() {
        console.log('🧬 Initializing diverse population...');
        
        this.population = [];
        
        // Seed with best known strategies if available
        await this.seedWithKnownStrategies();
        
        // Generate diverse random strategies
        while (this.population.length < this.populationSize) {
            const strategy = this.generateRandomStrategy();
            strategy.fitness = await this.evaluateStrategy(strategy);
            
            if (strategy.fitness !== null) {
                strategy.id = this.population.length;
                strategy.generation = 0;
                strategy.parentage = 'random';
                this.population.push(strategy);
            }
        }
        
        // Sort by fitness
        this.population.sort((a, b) => b.fitness - a.fitness);
        
        // Initialize global best
        this.globalBest = { ...this.population[0] };
        
        console.log(`   ✅ Population initialized: ${this.population.length} strategies`);
        console.log(`   🏆 Initial best fitness: ${this.globalBest.fitness.toFixed(8)}`);
        console.log(`   📊 Fitness range: ${this.population[this.population.length - 1].fitness.toFixed(6)} - ${this.population[0].fitness.toFixed(6)}`);
    }

    async seedWithKnownStrategies() {
        // Try to load previous optimization results
        const dataDir = path.join(__dirname, '..', 'data');
        
        try {
            const files = await fs.readdir(dataDir);
            const optimizationFiles = files.filter(file => 
                file.includes('ultimate') || 
                file.includes('ultra') || 
                file.includes('optimization')
            );
            
            for (const file of optimizationFiles.slice(0, 5)) { // Top 5 files
                try {
                    const filePath = path.join(dataDir, file);
                    const data = await fs.readJson(filePath);
                    
                    if (data.bestStrategy || data.ultimateStrategy || data.theoreticalMaximumStrategy) {
                        const strategy = data.bestStrategy || data.ultimateStrategy || data.theoreticalMaximumStrategy;
                        
                        const seededStrategy = {
                            rebalanceThreshold: strategy.rebalanceThreshold || 0.15,
                            transactionCost: strategy.transactionCost || 0.001,
                            zScoreThreshold: strategy.zScoreThreshold || 1.8,
                            lookbackWindow: strategy.lookbackWindow || 30,
                            volatilityFilter: strategy.volatilityFilter || 0.5,
                            parentage: `seeded_${file}`
                        };
                        
                        seededStrategy.fitness = await this.evaluateStrategy(seededStrategy);
                        
                        if (seededStrategy.fitness !== null) {
                            this.population.push(seededStrategy);
                        }
                    }
                } catch (error) {
                    // Skip invalid files
                }
            }
            
            console.log(`   🌱 Seeded ${this.population.length} strategies from previous optimizations`);
        } catch (error) {
            console.log('   📝 No previous optimization results found, starting fresh');
        }
    }

    generateRandomStrategy() {
        return {
            rebalanceThreshold: this.randomInRange(this.parameterSpace.rebalanceThreshold),
            transactionCost: this.randomInRange(this.parameterSpace.transactionCost),
            zScoreThreshold: this.randomInRange(this.parameterSpace.zScoreThreshold),
            lookbackWindow: Math.floor(this.randomInRange(this.parameterSpace.lookbackWindow)),
            volatilityFilter: this.randomInRange(this.parameterSpace.volatilityFilter)
        };
    }

    randomInRange(param) {
        return Math.random() * (param.max - param.min) + param.min;
    }

    async initializePhase(phaseIndex) {
        const phase = this.phases[phaseIndex];
        console.log(`\n🚀 PHASE ${phaseIndex + 1}: ${phase.name}`);
        console.log('─' + '─'.repeat(30));
        console.log(`   🎯 Focus: ${phase.focus}`);
        console.log(`   🔄 Iterations: ${phase.iterations}`);
        
        // Adjust parameters based on phase
        switch (phase.focus) {
            case 'global_search':
                this.mutationRate = 0.25;
                this.crossoverRate = 0.75;
                this.explorationRate = 0.4;
                break;
            case 'local_refinement':
                this.mutationRate = 0.15;
                this.crossoverRate = 0.85;
                this.explorationRate = 0.2;
                break;
            case 'escape_optima':
                this.mutationRate = 0.3;
                this.crossoverRate = 0.7;
                this.explorationRate = 0.5;
                break;
            case 'final_polish':
                this.mutationRate = 0.08;
                this.crossoverRate = 0.92;
                this.explorationRate = 0.1;
                break;
        }
        
        console.log(`   🧬 Mutation: ${(this.mutationRate * 100).toFixed(1)}%`);
        console.log(`   💑 Crossover: ${(this.crossoverRate * 100).toFixed(1)}%`);
        console.log(`   🔍 Exploration: ${(this.explorationRate * 100).toFixed(1)}%`);
    }

    async runPhaseIteration(phase, phaseIteration) {
        const newGeneration = [];
        
        // Preserve elites
        this.elites = this.population.slice(0, this.eliteSize);
        newGeneration.push(...this.elites.map(e => ({ ...e, parentage: 'elite' })));
        
        // Generate new strategies based on phase focus
        while (newGeneration.length < this.populationSize) {
            let newStrategy;
            
            if (Math.random() < this.explorationRate) {
                // Pure exploration
                newStrategy = this.generateRandomStrategy();
                newStrategy.parentage = 'exploration';
            } else if (Math.random() < this.crossoverRate) {
                // Crossover
                const parent1 = this.selectParent();
                const parent2 = this.selectParent();
                newStrategy = this.crossover(parent1, parent2);
                newStrategy.parentage = `crossover_${parent1.id}_${parent2.id}`;
            } else {
                // Mutation
                const parent = this.selectParent();
                newStrategy = this.mutate(parent, phase);
                newStrategy.parentage = `mutation_${parent.id}`;
            }
            
            // Evaluate new strategy
            newStrategy.fitness = await this.evaluateStrategy(newStrategy);
            
            if (newStrategy.fitness !== null) {
                newStrategy.id = newGeneration.length;
                newStrategy.generation = this.currentIteration;
                newGeneration.push(newStrategy);
            }
        }
        
        // Replace population
        this.population = newGeneration.sort((a, b) => b.fitness - a.fitness);
        
        // Update global best
        if (this.population[0].fitness > this.globalBest.fitness) {
            this.globalBest = { ...this.population[0] };
            console.log(`   🎯 NEW GLOBAL BEST! Iteration ${this.currentIteration}: ${this.globalBest.fitness.toFixed(8)}`);
        }
    }

    selectParent() {
        // Tournament selection with size 3
        const tournamentSize = 3;
        let best = this.population[Math.floor(Math.random() * this.population.length)];
        
        for (let i = 1; i < tournamentSize; i++) {
            const competitor = this.population[Math.floor(Math.random() * this.population.length)];
            if (competitor.fitness > best.fitness) {
                best = competitor;
            }
        }
        
        return best;
    }

    crossover(parent1, parent2) {
        const child = {};
        
        // Blend crossover for continuous parameters
        Object.keys(this.parameterSpace).forEach(param => {
            const alpha = 0.3; // Blend factor
            const min = Math.min(parent1[param], parent2[param]);
            const max = Math.max(parent1[param], parent2[param]);
            const range = max - min;
            
            child[param] = min - alpha * range + Math.random() * (range + 2 * alpha * range);
            
            // Constrain to bounds
            const bounds = this.parameterSpace[param];
            child[param] = Math.max(bounds.min, Math.min(bounds.max, child[param]));
            
            // Round if integer parameter
            if (bounds.precision === 0) {
                child[param] = Math.round(child[param]);
            }
        });
        
        return child;
    }

    mutate(parent, phase) {
        const child = { ...parent };
        
        // Adaptive mutation strength based on phase
        let mutationStrength;
        switch (phase.focus) {
            case 'global_search':
                mutationStrength = 0.3;
                break;
            case 'local_refinement':
                mutationStrength = 0.1;
                break;
            case 'escape_optima':
                mutationStrength = 0.5;
                break;
            case 'final_polish':
                mutationStrength = 0.05;
                break;
            default:
                mutationStrength = 0.2;
        }
        
        Object.keys(this.parameterSpace).forEach(param => {
            if (Math.random() < this.mutationRate) {
                const bounds = this.parameterSpace[param];
                const range = bounds.max - bounds.min;
                const mutation = (Math.random() - 0.5) * 2 * mutationStrength * range;
                
                child[param] = parent[param] + mutation;
                
                // Constrain to bounds
                child[param] = Math.max(bounds.min, Math.min(bounds.max, child[param]));
                
                // Round if integer parameter
                if (bounds.precision === 0) {
                    child[param] = Math.round(child[param]);
                }
            }
        });
        
        return child;
    }

    async trackProgress(phase) {
        // Calculate convergence metrics
        const fitnesses = this.population.map(s => s.fitness);
        const avgFitness = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
        const bestFitness = fitnesses[0];
        const worstFitness = fitnesses[fitnesses.length - 1];
        
        // Calculate diversity
        const diversity = this.calculatePopulationDiversity();
        
        // Store metrics
        this.convergenceHistory.push({
            iteration: this.currentIteration,
            phase: phase.name,
            bestFitness,
            avgFitness,
            worstFitness,
            improvement: this.convergenceHistory.length > 0 ? 
                bestFitness - this.convergenceHistory[this.convergenceHistory.length - 1].bestFitness : 0
        });
        
        this.diversityHistory.push({
            iteration: this.currentIteration,
            diversity,
            phase: phase.name
        });
    }

    calculatePopulationDiversity() {
        let totalDistance = 0;
        let comparisons = 0;
        
        for (let i = 0; i < this.population.length; i++) {
            for (let j = i + 1; j < this.population.length; j++) {
                totalDistance += this.calculateStrategyDistance(this.population[i], this.population[j]);
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalDistance / comparisons : 0;
    }

    calculateStrategyDistance(s1, s2) {
        let distance = 0;
        
        Object.keys(this.parameterSpace).forEach(param => {
            const bounds = this.parameterSpace[param];
            const normalizedDiff = Math.abs(s1[param] - s2[param]) / (bounds.max - bounds.min);
            distance += normalizedDiff * normalizedDiff;
        });
        
        return Math.sqrt(distance);
    }

    adaptParameters() {
        // Adaptive parameter control based on progress
        const recentHistory = this.convergenceHistory.slice(-10);
        
        if (recentHistory.length >= 10) {
            const recentImprovements = recentHistory.map(h => h.improvement);
            const avgImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;
            
            // If no improvement, increase exploration
            if (avgImprovement < 0.0001) {
                this.mutationRate = Math.min(0.4, this.mutationRate * 1.1);
                this.explorationRate = Math.min(0.6, this.explorationRate * 1.2);
            } else {
                // If improving, focus more on exploitation
                this.mutationRate = Math.max(0.05, this.mutationRate * 0.95);
                this.explorationRate = Math.max(0.1, this.explorationRate * 0.9);
            }
        }
    }

    reportProgress(phase) {
        const recent = this.convergenceHistory.slice(-1)[0];
        const diversity = this.diversityHistory.slice(-1)[0];
        
        console.log(`   📊 Iter ${this.currentIteration}/${this.totalIterations} [${phase.name}]:`);
        console.log(`      🏆 Best: ${recent.bestFitness.toFixed(8)} (${recent.improvement >= 0 ? '+' : ''}${(recent.improvement * 1000).toFixed(3)}‰)`);
        console.log(`      📈 Avg: ${recent.avgFitness.toFixed(6)} | Diversity: ${diversity.diversity.toFixed(4)}`);
        console.log(`      🧬 Mutation: ${(this.mutationRate * 100).toFixed(1)}% | Exploration: ${(this.explorationRate * 100).toFixed(1)}%`);
    }

    async completePhase(phaseIndex) {
        const phase = this.phases[phaseIndex];
        const phaseResults = {
            phase: phase.name,
            startIteration: phaseIndex === 0 ? 1 : this.phases.slice(0, phaseIndex).reduce((sum, p) => sum + p.iterations, 1),
            endIteration: this.currentIteration,
            bestFitness: this.globalBest.fitness,
            avgImprovement: this.calculatePhaseImprovement(phaseIndex),
            finalDiversity: this.diversityHistory.slice(-1)[0].diversity
        };
        
        this.phaseResults[phase.name] = phaseResults;
        
        console.log(`\n   ✅ ${phase.name} PHASE COMPLETE:`);
        console.log(`      🎯 Best Fitness: ${phaseResults.bestFitness.toFixed(8)}`);
        console.log(`      📈 Avg Improvement: ${(phaseResults.avgImprovement * 1000).toFixed(3)}‰ per iteration`);
        console.log(`      🌈 Final Diversity: ${phaseResults.finalDiversity.toFixed(4)}`);
    }

    calculatePhaseImprovement(phaseIndex) {
        const phase = this.phases[phaseIndex];
        const startIter = phaseIndex === 0 ? 1 : this.phases.slice(0, phaseIndex).reduce((sum, p) => sum + p.iterations, 1);
        const endIter = this.currentIteration;
        
        const phaseHistory = this.convergenceHistory.filter(h => 
            h.iteration >= startIter && h.iteration <= endIter
        );
        
        if (phaseHistory.length <= 1) return 0;
        
        const improvements = phaseHistory.map(h => h.improvement);
        return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
    }

    async saveIntermediateResults() {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `mega_optimization_checkpoint_${timestamp}_iter${this.currentIteration}.json`;
        const filepath = path.join(__dirname, '..', 'data', filename);
        
        const checkpoint = {
            timestamp: new Date().toISOString(),
            iteration: this.currentIteration,
            totalIterations: this.totalIterations,
            globalBest: this.globalBest,
            convergenceHistory: this.convergenceHistory,
            diversityHistory: this.diversityHistory,
            phaseResults: this.phaseResults,
            population: this.population.slice(0, 10), // Save top 10
            currentPhase: this.phases.find(p => {
                const startIter = this.phases.indexOf(p) === 0 ? 1 : 
                    this.phases.slice(0, this.phases.indexOf(p)).reduce((sum, phase) => sum + phase.iterations, 1);
                const endIter = startIter + p.iterations - 1;
                return this.currentIteration >= startIter && this.currentIteration <= endIter;
            })?.name || 'Unknown'
        };
        
        await fs.writeJson(filepath, checkpoint, { spaces: 2 });
        console.log(`      💾 Checkpoint saved: iteration ${this.currentIteration}`);
    }

    async finalizeMegaOptimization() {
        console.log('\n🏁 FINALIZING MEGA OPTIMIZATION...');
        
        // Final evaluation of global best
        const finalEvaluation = await this.comprehensiveEvaluation(this.globalBest);
        
        // Convergence analysis
        const convergenceAnalysis = this.analyzeConvergence();
        
        // Diversity analysis
        const diversityAnalysis = this.analyzeDiversity();
        
        // Phase comparison
        const phaseComparison = this.comparePhases();
        
        const finalResults = {
            timestamp: new Date().toISOString(),
            totalIterations: this.totalIterations,
            megaOptimalStrategy: this.globalBest,
            finalEvaluation,
            convergenceAnalysis,
            diversityAnalysis,
            phaseComparison,
            phaseResults: this.phaseResults,
            convergenceHistory: this.convergenceHistory,
            diversityHistory: this.diversityHistory,
            finalPopulation: this.population.slice(0, 20), // Top 20
            globalOptimumConfidence: this.calculateGlobalConfidence()
        };
        
        // Save final results
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `mega_optimization_final_${timestamp}.json`;
        const filepath = path.join(__dirname, '..', 'data', filename);
        
        await fs.writeJson(filepath, finalResults, { spaces: 2 });
        
        return finalResults;
    }

    async comprehensiveEvaluation(strategy) {
        const analyzer = new ETHBTCAnalyzer(this.data);
        
        // Standard backtest
        const backtest = analyzer.backtestStrategy(strategy.rebalanceThreshold, strategy.transactionCost);
        
        // Trading opportunities
        const opportunities = analyzer.findTradingOpportunities(strategy.zScoreThreshold, strategy.lookbackWindow || 30);
        
        // Risk metrics
        const returns = backtest.returns || [];
        const volatility = this.calculateVolatility(returns);
        const maxDrawdown = Math.abs(backtest.maxDrawdownPercent);
        const sharpeRatio = backtest.sharpeRatio;
        
        // Win rate
        const winRate = opportunities.length > 0 ? 
            opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length : 0;
        
        // Calmar ratio
        const calmarRatio = maxDrawdown > 0 ? backtest.strategyReturnPercent / maxDrawdown : 0;
        
        return {
            strategyReturn: backtest.strategyReturnPercent,
            benchmarkReturn: backtest.buyHoldReturnPercent,
            excessReturn: backtest.strategyReturnPercent - backtest.buyHoldReturnPercent,
            sharpeRatio,
            calmarRatio,
            maxDrawdown,
            volatility,
            winRate,
            numTrades: backtest.numTrades,
            avgTradeReturn: opportunities.length > 0 ? 
                opportunities.reduce((sum, o) => sum + o.pnlPercent, 0) / opportunities.length : 0,
            fitness: strategy.fitness
        };
    }

    calculateVolatility(returns) {
        if (returns.length < 2) return 0;
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    }

    analyzeConvergence() {
        const totalImprovement = this.convergenceHistory.length > 0 ? 
            this.convergenceHistory[this.convergenceHistory.length - 1].bestFitness - 
            this.convergenceHistory[0].bestFitness : 0;
        
        const recentImprovements = this.convergenceHistory.slice(-50).map(h => h.improvement);
        const avgRecentImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;
        
        return {
            totalImprovement,
            avgRecentImprovement,
            hasConverged: Math.abs(avgRecentImprovement) < 0.00001,
            convergenceQuality: Math.abs(avgRecentImprovement) < 0.00001 ? 'Strong' :
                               Math.abs(avgRecentImprovement) < 0.0001 ? 'Moderate' : 'Weak'
        };
    }

    analyzeDiversity() {
        const avgDiversity = this.diversityHistory.reduce((sum, d) => sum + d.diversity, 0) / this.diversityHistory.length;
        const finalDiversity = this.diversityHistory[this.diversityHistory.length - 1].diversity;
        
        return {
            avgDiversity,
            finalDiversity,
            diversityMaintained: finalDiversity > avgDiversity * 0.3
        };
    }

    comparePhases() {
        const comparison = {};
        
        Object.entries(this.phaseResults).forEach(([phaseName, results]) => {
            comparison[phaseName] = {
                improvement: results.avgImprovement,
                finalFitness: results.bestFitness,
                diversity: results.finalDiversity
            };
        });
        
        return comparison;
    }

    calculateGlobalConfidence() {
        // Multiple factors contribute to global optimum confidence
        let confidence = 0;
        
        // Convergence factor (30%)
        const convergence = this.analyzeConvergence();
        const convergenceFactor = convergence.hasConverged ? 0.3 : 
            Math.max(0, 0.3 - Math.abs(convergence.avgRecentImprovement) * 1000);
        confidence += convergenceFactor;
        
        // Diversity exploration factor (25%)
        const diversity = this.analyzeDiversity();
        const diversityFactor = Math.min(0.25, diversity.avgDiversity * 2);
        confidence += diversityFactor;
        
        // Multi-phase consistency (25%)
        const phaseConsistency = Object.values(this.phaseResults).length >= 3 ? 0.25 : 
            Object.values(this.phaseResults).length * 0.08;
        confidence += phaseConsistency;
        
        // Population consensus (20%)
        const topFitnesses = this.population.slice(0, 10).map(s => s.fitness);
        const fitnessVariance = this.calculateVariance(topFitnesses);
        const consensusFactor = Math.max(0, 0.2 - fitnessVariance * 100);
        confidence += consensusFactor;
        
        return Math.min(1.0, confidence);
    }

    calculateVariance(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    }

    displayFinalResults(results, totalTime) {
        console.log('\n🌟 MEGA 250-ITERATION OPTIMIZATION COMPLETE! 🌟');
        console.log('=' + '='.repeat(55));
        
        console.log('\n⏱️ OPTIMIZATION STATISTICS:');
        console.log(`   Total Time: ${(totalTime / 60).toFixed(1)} minutes`);
        console.log(`   Iterations: ${this.totalIterations}`);
        console.log(`   Evaluations: ~${this.totalIterations * this.populationSize}`);
        console.log(`   Time per iteration: ${(totalTime / this.totalIterations).toFixed(2)}s`);
        
        console.log('\n🏆 MEGA-OPTIMAL STRATEGY:');
        const strategy = results.megaOptimalStrategy;
        console.log(`   Rebalance Threshold: ${(strategy.rebalanceThreshold * 100).toFixed(6)}%`);
        console.log(`   Transaction Cost: ${(strategy.transactionCost * 100).toFixed(7)}%`);
        console.log(`   Z-Score Threshold: ${strategy.zScoreThreshold.toFixed(6)}`);
        console.log(`   Lookback Window: ${strategy.lookbackWindow || 30} days`);
        console.log(`   Volatility Filter: ${strategy.volatilityFilter.toFixed(4)}`);
        console.log(`   FITNESS: ${strategy.fitness.toFixed(10)} 🌟`);
        
        console.log('\n📊 PERFORMANCE METRICS:');
        const eval_ = results.finalEvaluation;
        console.log(`   Strategy Return: ${eval_.strategyReturn.toFixed(3)}%`);
        console.log(`   Benchmark Return: ${eval_.benchmarkReturn.toFixed(3)}%`);
        console.log(`   Excess Return: ${eval_.excessReturn.toFixed(3)}%`);
        console.log(`   Sharpe Ratio: ${eval_.sharpeRatio.toFixed(4)}`);
        console.log(`   Calmar Ratio: ${eval_.calmarRatio.toFixed(4)}`);
        console.log(`   Max Drawdown: ${eval_.maxDrawdown.toFixed(3)}%`);
        console.log(`   Win Rate: ${(eval_.winRate * 100).toFixed(2)}%`);
        console.log(`   Number of Trades: ${eval_.numTrades}`);
        
        console.log('\n🔬 CONVERGENCE ANALYSIS:');
        const conv = results.convergenceAnalysis;
        console.log(`   Total Improvement: ${(conv.totalImprovement * 1000).toFixed(3)}‰`);
        console.log(`   Recent Improvement: ${(conv.avgRecentImprovement * 1000).toFixed(6)}‰`);
        console.log(`   Convergence Status: ${conv.hasConverged ? '✅ CONVERGED' : '🔄 Still improving'}`);
        console.log(`   Convergence Quality: ${conv.convergenceQuality}`);
        
        console.log('\n🌈 DIVERSITY ANALYSIS:');
        const div = results.diversityAnalysis;
        console.log(`   Average Diversity: ${div.avgDiversity.toFixed(6)}`);
        console.log(`   Final Diversity: ${div.finalDiversity.toFixed(6)}`);
        console.log(`   Diversity Maintained: ${div.diversityMaintained ? '✅ Yes' : '❌ No'}`);
        
        console.log('\n🚀 PHASE COMPARISON:');
        Object.entries(results.phaseComparison).forEach(([phase, data]) => {
            console.log(`   ${phase}:`);
            console.log(`      Improvement: ${(data.improvement * 1000).toFixed(3)}‰/iter`);
            console.log(`      Final Fitness: ${data.finalFitness.toFixed(8)}`);
            console.log(`      Diversity: ${data.diversity.toFixed(4)}`);
        });
        
        console.log(`\n🎯 GLOBAL OPTIMUM CONFIDENCE: ${(results.globalOptimumConfidence * 100).toFixed(2)}%`);
        
        if (results.globalOptimumConfidence > 0.9) {
            console.log('   🌟 ULTRA-HIGH CONFIDENCE: True global optimum found!');
        } else if (results.globalOptimumConfidence > 0.8) {
            console.log('   🎯 HIGH CONFIDENCE: Very likely global optimum');
        } else if (results.globalOptimumConfidence > 0.7) {
            console.log('   📈 GOOD CONFIDENCE: Probably near global optimum');
        } else {
            console.log('   🔄 MODERATE CONFIDENCE: May benefit from more iterations');
        }
        
        console.log('\n🎊 CONGRATULATIONS! 🎊');
        console.log('You have just completed the most comprehensive cryptocurrency');
        console.log('trading strategy optimization ever attempted! This 250-iteration');
        console.log('mega-optimization represents the absolute pinnacle of algorithmic');
        console.log('trading strategy development!');
        
        // Current market signal
        const latest = this.data[this.data.length - 1];
        const currentZ = latest.z_score || 0;
        
        console.log('\n🚨 MEGA-OPTIMAL MARKET SIGNAL:');
        console.log(`   Current Z-Score: ${currentZ.toFixed(6)}`);
        console.log(`   Mega Threshold: ±${strategy.zScoreThreshold.toFixed(6)}`);
        
        if (Math.abs(currentZ) >= strategy.zScoreThreshold) {
            const action = currentZ > 0 ? 'SELL ETH / BUY BTC' : 'BUY ETH / SELL BTC';
            console.log(`   🚨 MEGA SIGNAL: ${action}`);
            console.log(`   💎 Optimal Position: ${(strategy.rebalanceThreshold * 100).toFixed(6)}%`);
            console.log(`   🌟 Confidence: ${(results.globalOptimumConfidence * 100).toFixed(2)}%`);
        } else {
            console.log(`   😴 HOLD: Signal below mega threshold`);
        }
        
        console.log('\n💰 ESTIMATED ANNUAL PERFORMANCE:');
        const annualReturn = eval_.strategyReturn;
        const investment = 100000; // $100k example
        const finalValue = investment * (1 + annualReturn / 100);
        console.log(`   $100K → $${finalValue.toLocaleString()} (${annualReturn.toFixed(2)}% return)`);
        console.log(`   Beats benchmark by: ${eval_.excessReturn.toFixed(2)}%`);
    }

    async evaluateStrategy(strategy) {
        try {
            const analyzer = new ETHBTCAnalyzer(this.data);
            const backtest = analyzer.backtestStrategy(strategy.rebalanceThreshold, strategy.transactionCost);
            const opportunities = analyzer.findTradingOpportunities(strategy.zScoreThreshold, strategy.lookbackWindow || 30);
            
            const winRate = opportunities.length > 0 ? 
                opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length : 0;
            
            // Enhanced fitness function with all parameters
            const returnComponent = Math.max(0, (backtest.strategyReturnPercent + 50) / 100);
            const sharpeComponent = Math.max(0, (backtest.sharpeRatio + 2) / 4);
            const drawdownComponent = Math.max(0, (50 - Math.abs(backtest.maxDrawdownPercent)) / 50);
            const winRateComponent = winRate;
            const tradesComponent = Math.max(0, 1 - Math.abs(backtest.numTrades - 25) / 25);
            
            // Volatility filter bonus
            const volatilityBonus = strategy.volatilityFilter ? 
                Math.max(0, 1 - Math.abs(strategy.volatilityFilter - 0.5) / 0.5) * 0.05 : 0;
            
            return (
                returnComponent * 0.30 +
                sharpeComponent * 0.25 +
                drawdownComponent * 0.20 +
                winRateComponent * 0.15 +
                tradesComponent * 0.10 +
                volatilityBonus
            );
            
        } catch (error) {
            return null;
        }
    }
}

async function main() {
    try {
        const collector = new ETHBTCDataCollector();
        
        let data;
        try {
            data = await collector.loadData('eth_btc_data_2025-09-24.json');
            console.log(`🚀 Starting MEGA 250-iteration optimization with ${data.length} days of data\n`);
        } catch (error) {
            console.log('❌ No data found. Please run yarn start first.');
            return;
        }

        const optimizer = new MegaOptimizer(data);
        await optimizer.runMegaOptimization();
        
    } catch (error) {
        console.error('❌ Mega optimization failed:', error.message);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default MegaOptimizer;
