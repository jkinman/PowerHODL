# DateTime Utilities Refactor

## Problem Statement

Date/time handling bugs kept recurring throughout the codebase:
- Chart labels switching between dates and times incorrectly
- `item.collected_at.split is not a function` errors when data format changed
- Inconsistent date formatting across API routes and frontend
- Ad-hoc date transformations scattered throughout files

## Solution: Centralized DateTime Library

### Created Files:

1. **`lib/utils/DateTimeUtils.js`** - Full-featured utility library (Node.js/ES modules)
2. **`public/js/utils/datetime-loader.js`** - Browser-compatible version with global availability

### Key Features:

#### **Data Validation & Normalization**
```javascript
DateTimeUtils.validateDataset(data)       // Validates and cleans dataset
DateTimeUtils.normalizeToISO(date)        // Handles string/Date/timestamp inputs
DateTimeUtils.extractDateOnly(date)       // Gets YYYY-MM-DD format
```

#### **Intelligent Chart Labeling**
```javascript
DateTimeUtils.calculateDatasetSpan(data)  // Determines time span in days
DateTimeUtils.getChartLabelFormat(data)   // Chooses appropriate format
DateTimeUtils.formatChartLabels(data)     // Returns formatted labels array
```

#### **Smart Data Sampling**
```javascript
DateTimeUtils.sampleDataForChart(data, maxPoints)  // Prevents chart overcrowding
DateTimeUtils.groupByPeriod(data, 'day')           // Groups by time periods
```

#### **Format Logic:**
- **0 days (intraday)**: `"14:30"` (time format)
- **1-7 days**: `"Mon Sep 25"` (weekday + date)
- **8-90 days**: `"Sep 25"` (month + day)
- **91-730 days**: `"Sep '24"` (month + year)
- **730+ days**: `"2024"` (year only)

### Refactored Components:

#### **Frontend (`public/js/components/charts.js`)**
```javascript
// Before: Manual date span calculation and formatting
const firstDate = new Date(data[0].timestamp);
const lastDate = new Date(data[data.length - 1].timestamp);
const daySpan = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

// After: Centralized utility with fallback
if (DateTimeUtils) {
    const spanDays = DateTimeUtils.calculateDatasetSpan(historicalData);
    chartData = DateTimeUtils.sampleDataForChart(historicalData, 30);
    labels = DateTimeUtils.formatChartLabels(chartData);
} else {
    // Fallback to old logic for compatibility
}
```

#### **API Routes (`api/routes/historical.js`)**
```javascript
// Before: Manual date type checking
if (typeof item.collected_at === 'string') {
    timestamp = item.collected_at;
    dateOnly = item.collected_at.split('T')[0];
} else if (item.collected_at instanceof Date) {
    timestamp = item.collected_at.toISOString();
    dateOnly = item.collected_at.toISOString().split('T')[0];
}

// After: Centralized normalization
const timestamp = normalizeDate(item.collected_at);
const dateOnly = extractDateOnly(item.collected_at);
```

### Benefits:

✅ **Prevents recurring bugs** - Centralized logic means fixing issues once fixes everywhere
✅ **Consistent formatting** - Same date handling logic across frontend and backend  
✅ **Intelligent labeling** - Automatically chooses appropriate format based on data span
✅ **Graceful fallbacks** - Works even if utility isn't loaded (compatibility)
✅ **Data validation** - Catches and reports date format issues early
✅ **Performance optimization** - Smart sampling prevents chart overcrowding

### Usage Pattern:

```javascript
// Validate data first
const validation = DateTimeUtils.validateDataset(rawData);
if (!validation.valid) {
    console.error('Invalid data:', validation.errors);
    return;
}

// Smart sampling and formatting
const chartData = DateTimeUtils.sampleDataForChart(rawData, 50);
const labels = DateTimeUtils.formatChartLabels(chartData);

// Use in chart
chart.data.labels = labels;
chart.data.datasets[0].data = chartData.map(d => d.value);
```

### Future Extensions:

- Time zone handling
- Relative date parsing ("1 week ago")
- Date range validation
- Performance metrics (data age warnings)
- Custom format templates
- Internationalization support

This refactor eliminates the root cause of date/time formatting issues and provides a scalable foundation for future date handling needs.
