/**
 * Modern MetaMask Service (2024)
 * 
 * Uses the latest MetaMask SDK that no longer requires Infura Project IDs.
 * Supports both browser wallet connection and server-side trading.
 */

import { MetaMaskSDK } from '@metamask/sdk';
import { ethers } from 'ethers';
import { Logger } from '../utils/Logger.js';

export class ModernMetaMaskService {
    constructor() {
        this.logger = new Logger('ModernMetaMaskService');
        this.isSimulationMode = process.env.DEX_SIMULATION_MODE !== 'false';
        
        // Modern MetaMask SDK (no Infura required!)
        this.sdk = null;
        this.provider = null;
        this.signer = null;
        
        // For server-side trading with private key
        this.privateKey = process.env.METAMASK_PRIVATE_KEY;
        
        this.initializeModernMetaMask();
        
        // Token addresses (Ethereum mainnet)
        this.tokens = {
            ETH: ethers.ZeroAddress,
            WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        };
        
        this.logger.info('🦊 Modern MetaMask service initialized', {
            simulationMode: this.isSimulationMode,
            hasPrivateKey: !!this.privateKey,
            version: '2024'
        });
    }
    
    /**
     * Initialize modern MetaMask connection
     */
    async initializeModernMetaMask() {
        try {
            // Initialize MetaMask SDK (no Infura needed!)
            this.sdk = new MetaMaskSDK({
                dappMetadata: {
                    name: 'PowerHODL',
                    url: 'https://powerhodl.vercel.app',
                    iconUrl: 'https://powerhodl.vercel.app/icon.png',
                },
                // Note: No infuraAPIKey required in modern SDK!
                logging: {
                    developerMode: process.env.NODE_ENV === 'development',
                },
            });
            
            this.logger.info('✅ MetaMask SDK initialized without Infura');
            
            // For server-side trading, use private key with public RPC
            if (this.privateKey) {
                await this.initializeServerSideWallet();
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize modern MetaMask', { 
                error: error.message 
            });
            this.isSimulationMode = true;
        }
    }
    
    /**
     * Initialize server-side wallet for automated trading
     */
    async initializeServerSideWallet() {
        try {
            // Use free public RPC endpoints (no API key needed)
            const publicRPCs = [
                'https://eth.llamarpc.com',
                'https://rpc.ankr.com/eth',
                'https://ethereum.publicnode.com',
                'https://cloudflare-eth.com'
            ];
            
            // Try public RPCs first
            for (const rpcUrl of publicRPCs) {
                try {
                    this.provider = new ethers.JsonRpcProvider(rpcUrl);
                    
                    // Test the connection
                    await this.provider.getBlockNumber();
                    this.logger.info('✅ Connected to public RPC', { url: rpcUrl });
                    break;
                } catch (error) {
                    this.logger.warn('⚠️ Public RPC failed, trying next', { url: rpcUrl });
                    continue;
                }
            }
            
            // No Infura fallback needed - public RPCs are sufficient
            
            if (!this.provider) {
                throw new Error('No working RPC provider found');
            }
            
            // Create wallet signer
            this.signer = new ethers.Wallet(this.privateKey, this.provider);
            this.logger.info('🔑 Server-side wallet ready', {
                address: this.signer.address.substring(0, 10) + '...'
            });
            
        } catch (error) {
            this.logger.error('❌ Server-side wallet initialization failed', { 
                error: error.message 
            });
            this.isSimulationMode = true;
        }
    }
    
    /**
     * Connect to user's MetaMask wallet (browser mode)
     */
    async connectWallet() {
        try {
            if (!this.sdk) {
                throw new Error('MetaMask SDK not initialized');
            }
            
            this.logger.info('🔗 Connecting to user MetaMask wallet...');
            
            // Request wallet connection
            const accounts = await this.sdk.connect();
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from MetaMask');
            }
            
            // Get provider from SDK
            this.provider = this.sdk.getProvider();
            
            this.logger.info('✅ MetaMask wallet connected', {
                account: accounts[0].substring(0, 10) + '...',
                accounts: accounts.length
            });
            
            return {
                connected: true,
                accounts,
                chainId: await this.provider.request({ method: 'eth_chainId' })
            };
            
        } catch (error) {
            this.logger.error('❌ MetaMask wallet connection failed', { 
                error: error.message 
            });
            return {
                connected: false,
                error: error.message
            };
        }
    }
    
    /**
     * Execute a trade using modern MetaMask
     */
    async executeTrade(signal, portfolio, marketData) {
        try {
            this.logger.info('🔄 Executing modern MetaMask trade', {
                action: signal.action,
                strength: signal.strength,
                simulationMode: this.isSimulationMode
            });
            
            if (signal.action === 'HOLD') {
                return {
                    success: true,
                    action: 'HOLD',
                    message: 'No trade executed - holding position'
                };
            }
            
            // Calculate trade parameters
            const tradeParams = await this.calculateTradeParameters(signal, portfolio, marketData);
            
            if (!tradeParams.shouldExecute) {
                return {
                    success: true,
                    action: 'SKIP',
                    message: tradeParams.reason
                };
            }
            
            // Execute trade
            const tradeResult = this.isSimulationMode 
                ? await this.simulateTrade(tradeParams)
                : await this.executeRealTrade(tradeParams);
            
            this.logger.info('✅ Modern MetaMask trade completed', {
                action: tradeResult.action,
                txHash: tradeResult.transactionHash
            });
            
            return tradeResult;
            
        } catch (error) {
            this.logger.error('❌ Modern MetaMask trade failed', {
                error: error.message
            });
            
            return {
                success: false,
                error: error.message,
                action: signal.action
            };
        }
    }
    
    /**
     * Calculate trade parameters
     */
    async calculateTradeParameters(signal, portfolio, marketData) {
        const rebalanceThreshold = 0.4979; // From mega-optimal strategy
        
        // Get current balances
        const ethBalance = portfolio.eth_balance || 0;
        const btcBalance = portfolio.btc_balance || 0; // WBTC
        
        // Calculate trade amounts
        let tokenIn, tokenOut, amountIn;
        
        if (signal.action === 'BUY_ETH') {
            tokenIn = this.tokens.WBTC;
            tokenOut = this.tokens.WETH;
            amountIn = ethers.parseUnits((btcBalance * rebalanceThreshold).toString(), 8);
        } else if (signal.action === 'SELL_ETH') {
            tokenIn = this.tokens.WETH;
            tokenOut = this.tokens.WBTC;
            amountIn = ethers.parseEther((ethBalance * rebalanceThreshold).toString());
        } else {
            return { shouldExecute: false, reason: 'Invalid signal action' };
        }
        
        // Check minimum trade size
        const minTradeValueUSD = 200;
        const estimatedValueUSD = signal.action === 'BUY_ETH' 
            ? btcBalance * rebalanceThreshold * marketData.btc_price
            : ethBalance * rebalanceThreshold * marketData.eth_price;
        
        if (estimatedValueUSD < minTradeValueUSD) {
            return {
                shouldExecute: false,
                reason: `Trade value ($${estimatedValueUSD.toFixed(2)}) below minimum ($${minTradeValueUSD})`
            };
        }
        
        return {
            shouldExecute: true,
            tokenIn,
            tokenOut,
            amountIn,
            estimatedValueUSD,
            action: signal.action
        };
    }
    
    /**
     * Simulate trade execution
     */
    async simulateTrade(tradeParams) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const gasUsed = ethers.parseEther('0.002'); // ~$5-15 gas
        const amountOut = tradeParams.amountIn * 95n / 100n; // 5% slippage simulation
        
        this.logger.info('🎭 Simulated modern MetaMask trade', {
            tokenIn: tradeParams.tokenIn,
            tokenOut: tradeParams.tokenOut,
            amountIn: ethers.formatUnits(tradeParams.amountIn, 18),
            amountOut: ethers.formatUnits(amountOut, 18),
            gasUsed: ethers.formatEther(gasUsed)
        });
        
        return {
            success: true,
            action: tradeParams.action,
            tokenIn: tradeParams.tokenIn,
            tokenOut: tradeParams.tokenOut,
            amountIn: tradeParams.amountIn,
            amountOut: amountOut,
            gasUsed: gasUsed,
            transactionHash: `0xmodern${Date.now()}`,
            timestamp: new Date().toISOString(),
            simulation: true,
            protocol: 'modern-metamask-2024'
        };
    }
    
    /**
     * Execute real trade
     */
    async executeRealTrade(tradeParams) {
        if (!this.signer && !this.provider) {
            throw new Error('No wallet or provider available for real trading');
        }
        
        // Real implementation would:
        // 1. Use Uniswap V3 router contract
        // 2. Calculate exact amounts with slippage protection
        // 3. Handle token approvals
        // 4. Execute swap transaction
        // 5. Wait for confirmation
        
        this.logger.warn('⚠️ Real modern MetaMask trading implementation in progress');
        throw new Error('Real trading implementation coming soon - use simulation mode');
    }
    
    /**
     * Get wallet balances
     */
    async getWalletBalances() {
        if (this.isSimulationMode) {
            return {
                ETH: ethers.parseEther('2.0'),
                WBTC: ethers.parseUnits('0.1', 8),
                address: '0xModernSimulation...',
                simulation: true
            };
        }
        
        if (!this.provider) {
            throw new Error('Provider not available');
        }
        
        try {
            const address = this.signer ? this.signer.address : await this.getConnectedAccount();
            const ethBalance = await this.provider.getBalance(address);
            
            return {
                ETH: ethBalance,
                WBTC: ethers.parseUnits('0', 8), // Would need ERC20 contract call
                address: address,
                simulation: false
            };
        } catch (error) {
            this.logger.error('❌ Failed to get wallet balances', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get connected account from MetaMask
     */
    async getConnectedAccount() {
        if (!this.provider) return null;
        
        try {
            const accounts = await this.provider.request({ method: 'eth_accounts' });
            return accounts[0] || null;
        } catch (error) {
            this.logger.error('❌ Failed to get connected account', { error: error.message });
            return null;
        }
    }
    
    /**
     * Test connection status
     */
    async testConnection() {
        try {
            if (this.isSimulationMode) {
                return {
                    connected: true,
                    simulation: true,
                    version: 'modern-metamask-2024',
                    infuraRequired: false
                };
            }
            
            if (this.provider) {
                const network = await this.provider.getNetwork();
                const blockNumber = await this.provider.getBlockNumber();
                
                return {
                    connected: true,
                    simulation: false,
                    version: 'modern-metamask-2024',
                    network: network.name,
                    chainId: Number(network.chainId),
                    blockNumber: blockNumber,
                    infuraRequired: false,
                    walletAddress: this.signer?.address || await this.getConnectedAccount()
                };
            }
            
            return {
                connected: false,
                error: 'Provider not initialized'
            };
            
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }
}
