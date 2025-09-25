# PowerHODL Development Guide

## Two-App Architecture

PowerHODL is currently running with **two applications** during the migration:

### 1. Original App (Vanilla JS + Express)
- **Location**: `/Users/jkinman/dev/jk/abitrage-ratio-pair/`
- **Package**: `package.json` (root)
- **Frontend**: `public/index.html` (vanilla JS)
- **Backend**: `api/` (Express routes)

### 2. New Svelte App 
- **Location**: `/Users/jkinman/dev/jk/abitrage-ratio-pair/powerhodl-svelte/`
- **Package**: `powerhodl-svelte/package.json`
- **Frontend**: `src/routes/+page.svelte` (Svelte)
- **Backend**: Will share API with original

## 🚀 Quick Start

### Start Original App (Current Production)
```bash
# From root directory
cd /Users/jkinman/dev/jk/abitrage-ratio-pair
npm run dev                        # Runs on http://localhost:3001
```

**What this does:**
- Starts Express server with API routes
- Serves static files from `public/`
- Available endpoints: `/api/signal`, `/api/backtest`, etc.
- Serves dashboard at `http://localhost:3001`

### Start New Svelte App (Migration Target)
```bash
# From svelte directory  
cd /Users/jkinman/dev/jk/abitrage-ratio-pair/powerhodl-svelte
npm run dev                        # Runs on http://localhost:5173
```

**What this does:**
- Starts Vite dev server with hot reload
- Compiles Svelte components on-demand
- Development dashboard at `http://localhost:5173`

### Run Both Simultaneously (Recommended)
```bash
# Terminal 1 - Original App (API + Old Dashboard)
cd /Users/jkinman/dev/jk/abitrage-ratio-pair
npm run dev

# Terminal 2 - New Svelte App
cd /Users/jkinman/dev/jk/abitrage-ratio-pair/powerhodl-svelte  
npm run dev
```

## 📊 Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Original Dashboard** | http://localhost:3001 | Current production dashboard |
| **API Endpoints** | http://localhost:3001/api/* | Shared by both apps |
| **New Svelte Dashboard** | http://localhost:5173 | Migration target dashboard |
| **Health Check** | http://localhost:3001/health | Server status |

## 🔧 Available Scripts

### Original App Scripts
```bash
npm run dev              # Start development server (fixed!)
npm run dev:vercel       # Use Vercel dev (if needed)
npm run deploy           # Deploy to production
npm run build            # No-op (serverless functions)
npm run test             # Run tests
npm run seed             # Populate historical data
```

### Svelte App Scripts  
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
vercel --prod            # Deploy Svelte version
```

## 🛠️ Debugging the Original Fix

### Problem Fixed:
- **Before**: `npm run dev` → `vercel dev` → Recursive invocation error
- **After**: `npm run dev` → `node server.js` → Direct Express server

### What Changed:
1. **Created `server.js`**: Dedicated development server
2. **Updated `package.json`**: Changed dev script from `vercel dev` to `node server.js`
3. **Added `dev:vercel`**: Backup script if you need Vercel dev mode

### Benefits:
- ✅ **No more recursive errors**
- ✅ **Faster startup** (no Vercel CLI overhead)
- ✅ **Better logging** (clear endpoint listing)
- ✅ **Hot reload** for API changes with nodemon
- ✅ **Vercel still available** via `npm run dev:vercel`

## 🔄 Migration Workflow

1. **Keep original running**: `npm run dev` (port 3000)
2. **Develop Svelte components**: `npm run dev` in svelte folder (port 5173)  
3. **Share API**: Both apps use `http://localhost:3000/api/*`
4. **Test components**: Individually in Svelte app
5. **Deploy when ready**: Switch production to Svelte version

## 🚨 If You Still Get Errors

### Recursive Vercel Error:
```bash
# Use the direct server instead
npm run dev              # NOT npm run dev:vercel
```

### Port Conflicts:
```bash
# Check what's running on ports
lsof -i :3001            # Original app
lsof -i :5173            # Svelte app

# Kill processes if needed
kill -9 <PID>
```

### API Not Working:
```bash
# Test API directly
curl http://localhost:3001/health
curl http://localhost:3001/api/signal
```

---

**🎯 Current Status**: Original app fixed and running, Svelte app ready for development!

Both applications are now properly configured and can run in parallel during the migration.
