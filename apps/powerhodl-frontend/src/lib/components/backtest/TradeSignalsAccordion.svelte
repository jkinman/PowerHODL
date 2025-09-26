<script>
    export let trades = [];
    export let isExpanded = false;
    
    function toggleExpanded() {
        isExpanded = !isExpanded;
    }
    
    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
    
    function formatNumber(num, decimals = 4) {
        return Number(num).toFixed(decimals);
    }
    
    function getActionColor(action) {
        if (action.includes('ACCUMULATE_BTC') || action.includes('SELL_ETH')) {
            return 'text-red-600';
        } else if (action.includes('ACCUMULATE_ETH') || action.includes('BUY_ETH')) {
            return 'text-green-600';
        }
        return 'text-gray-600';
    }
    
    function getActionIcon(action) {
        if (action.includes('ACCUMULATE_BTC') || action.includes('SELL_ETH')) {
            return '🔴';
        } else if (action.includes('ACCUMULATE_ETH') || action.includes('BUY_ETH')) {
            return '🟢';
        }
        return '⚪';
    }
</script>

<div class="trade-signals-accordion">
    <button 
        class="accordion-header"
        on:click={toggleExpanded}
        aria-expanded={isExpanded}
    >
        <div class="header-content">
            <span class="header-title">
                📊 Trade Signals ({trades.length} trades)
            </span>
            <svg 
                class="chevron {isExpanded ? 'rotate-180' : ''}" 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="currentColor"
            >
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </div>
    </button>
    
    {#if isExpanded}
        <div class="accordion-content">
            <div class="trades-table-container">
                <table class="trades-table">
                    <thead>
                        <tr>
                            <th>Date/Time</th>
                            <th>Action</th>
                            <th>Z-Score</th>
                            <th>ETH/BTC Ratio</th>
                            <th>Target Allocation</th>
                            <th>ETH Amount</th>
                            <th>BTC Amount</th>
                            <th>Fees (BTC)</th>
                            <th>Portfolio Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each trades as trade, index}
                            <tr class="trade-row {index % 2 === 0 ? 'even' : 'odd'}">
                                <td class="date-cell">{formatDate(trade.timestamp)}</td>
                                <td class="{getActionColor(trade.action)} font-medium">
                                    {getActionIcon(trade.action)} {trade.action}
                                </td>
                                <td class="z-score-cell {Math.abs(trade.zScore) > 3 ? 'font-bold' : ''}">
                                    {formatNumber(trade.zScore, 3)}
                                </td>
                                <td>{formatNumber(trade.ratio, 6)}</td>
                                <td class="allocation-cell">
                                    {trade.targetAllocation ? `${(trade.targetAllocation * 100).toFixed(1)}% ETH` : 'N/A'}
                                </td>
                                <td class="{trade.ethAmount > 0 ? 'text-green-600' : 'text-red-600'}">
                                    {trade.ethAmount > 0 ? '+' : ''}{formatNumber(trade.ethAmount, 4)}
                                </td>
                                <td class="{trade.btcAmount > 0 ? 'text-green-600' : 'text-red-600'}">
                                    {trade.btcAmount > 0 ? '+' : ''}{formatNumber(trade.btcAmount, 6)}
                                </td>
                                <td class="text-orange-600">{formatNumber(trade.fees, 6)}</td>
                                <td class="impact-cell">
                                    <div class="portfolio-values">
                                        <span class="before">{formatNumber(trade.portfolioValueBefore, 4)}</span>
                                        <span class="arrow">→</span>
                                        <span class="after">{formatNumber(trade.portfolioValueAfter, 4)}</span>
                                    </div>
                                    <div class="impact-percent {trade.portfolioValueAfter > trade.portfolioValueBefore ? 'positive' : 'negative'}">
                                        {((trade.portfolioValueAfter - trade.portfolioValueBefore) / trade.portfolioValueBefore * 100).toFixed(3)}%
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            
            {#if trades.length === 0}
                <div class="no-trades">
                    <p>No trades executed during this backtest period.</p>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .trade-signals-accordion {
        margin-top: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
        background: white;
    }
    
    .accordion-header {
        width: 100%;
        padding: 1rem;
        background: #f9fafb;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .accordion-header:hover {
        background: #f3f4f6;
    }
    
    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .header-title {
        font-weight: 600;
        color: #1f2937;
    }
    
    .chevron {
        transition: transform 0.2s;
        color: #6b7280;
    }
    
    .rotate-180 {
        transform: rotate(180deg);
    }
    
    .accordion-content {
        padding: 1rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .trades-table-container {
        overflow-x: auto;
    }
    
    .trades-table {
        width: 100%;
        font-size: 0.875rem;
        border-collapse: collapse;
    }
    
    .trades-table th {
        text-align: left;
        padding: 0.5rem;
        font-weight: 600;
        color: #4b5563;
        border-bottom: 2px solid #e5e7eb;
        white-space: nowrap;
    }
    
    .trades-table td {
        padding: 0.5rem;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .trade-row.even {
        background: #f9fafb;
    }
    
    .trade-row:hover {
        background: #f3f4f6;
    }
    
    .date-cell {
        white-space: nowrap;
        font-size: 0.75rem;
        color: #6b7280;
    }
    
    .z-score-cell {
        text-align: right;
    }
    
    .allocation-cell {
        text-align: center;
        font-weight: 500;
    }
    
    .impact-cell {
        text-align: right;
    }
    
    .portfolio-values {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #6b7280;
    }
    
    .arrow {
        color: #9ca3af;
    }
    
    .impact-percent {
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .impact-percent.positive {
        color: #10b981;
    }
    
    .impact-percent.negative {
        color: #ef4444;
    }
    
    .no-trades {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }
    
    @media (max-width: 768px) {
        .trades-table {
            font-size: 0.75rem;
        }
        
        .trades-table th,
        .trades-table td {
            padding: 0.25rem;
        }
    }
</style>
