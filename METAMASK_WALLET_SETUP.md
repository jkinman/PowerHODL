# 🦊 **MetaMask Wallet Setup for PowerHODL**

## 📱 **Step 1: Install MetaMask**

### **Browser Extension:**
1. Go to [metamask.io](https://metamask.io)
2. Click **"Download"**
3. Choose your browser (Chrome, Firefox, Brave, Edge)
4. Click **"Add to Chrome"** (or your browser)
5. Pin the extension to your browser toolbar

### **Mobile App:**
- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

## 🔐 **Step 2: Create New Wallet**

1. **Open MetaMask** and click **"Get Started"**
2. Click **"Create a Wallet"**
3. **Agree** to help improve MetaMask (optional)
4. **Create a strong password** (8+ characters)
5. **Read and accept** the terms

## 🔑 **Step 3: Secure Your Seed Phrase**

⚠️ **CRITICAL: Your seed phrase is your wallet backup!**

1. Click **"Reveal Secret Recovery Phrase"**
2. **Write down all 12 words** in order on paper
3. **Store safely** - never digital, never photos
4. **Confirm** by entering the words in order
5. Click **"All Done"**

### **Example Seed Phrase:**
```
abandon abandon abandon abandon abandon abandon
abandon abandon abandon abandon abandon about
```

## 🏠 **Step 4: Get Your Wallet Address**

1. **Copy your wallet address** from MetaMask
2. It looks like: `0x742d35Cc6F6B4C4E4E0C84F5c5D67d03...`
3. This is your **public address** (safe to share)

## 🔑 **Step 5: Export Private Key (For PowerHODL)**

⚠️ **WARNING: Never share your private key with anyone!**

### **Method 1: Through MetaMask**
1. Click the **account menu** (top right)
2. Click **"Account Details"**
3. Click **"Export Private Key"**
4. Enter your **MetaMask password**
5. Click **"Confirm"**
6. **Copy the private key** (64 characters)

### **Method 2: Through Settings**
1. Click **MetaMask menu** → **Settings**
2. Go to **Security & Privacy**
3. Click **"Reveal Secret Recovery Phrase"**
4. Use a tool like [iancoleman.io/bip39](https://iancoleman.io/bip39/) (offline)

## 💰 **Step 6: Fund Your Wallet**

### **For Real Trading:**
1. **Buy ETH and BTC** on any exchange (Coinbase, Kraken, etc.)
2. **Withdraw to your MetaMask address**
3. For BTC, you'll need **WBTC** (Wrapped Bitcoin on Ethereum)
4. **Minimum suggested**: 0.1 ETH + 0.01 WBTC to start

### **For Testing:**
1. Use **testnets** (Goerli, Sepolia)
2. Get **free test tokens** from faucets
3. PowerHODL supports **simulation mode**

## ⚙️ **Step 7: Configure PowerHODL**

### **Add to your `.env.local`:**
```bash
# Modern MetaMask mode (no external APIs needed)
TRADING_MODE=metamask
METAMASK_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
DEX_SIMULATION_MODE=true  # Start with simulation
```

### **Example Private Key Format:**
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```
- **64 characters** of hex (0-9, a-f)
- **Must start with `0x`**

## 🛡️ **Security Best Practices**

### **✅ DO:**
- **Use a strong, unique password** for MetaMask
- **Write seed phrase on paper** (never digital)
- **Store seed phrase in safe** or safety deposit box
- **Test with small amounts** first
- **Use hardware wallet** for large amounts (Ledger, Trezor)
- **Keep MetaMask updated**

### **❌ DON'T:**
- **Never share private key** or seed phrase
- **Never store seed phrase digitally** (photos, cloud, etc.)
- **Never enter seed phrase** on suspicious websites
- **Don't use obvious passwords**
- **Don't ignore security warnings**

## 🚨 **Recovery Options**

### **If You Lose Your Password:**
1. **Use your seed phrase** to restore wallet
2. Import into new MetaMask installation
3. Create new password

### **If You Lose Your Seed Phrase:**
1. **Export private key immediately** while you still have access
2. **Create new wallet** with new seed phrase
3. **Transfer funds** to new wallet

## 🧪 **Testing Your Setup**

### **1. Verify Wallet Connection:**
```bash
node -e "
const wallet = '0x' + process.env.METAMASK_PRIVATE_KEY.substring(2);
console.log('Wallet configured:', wallet.substring(0, 10) + '...');
"
```

### **2. Test PowerHODL Integration:**
```bash
yarn test:metamask
```

## 💡 **Tips for PowerHODL**

### **Optimal Setup:**
- **Start with simulation mode** (`DEX_SIMULATION_MODE=true`)
- **Use small amounts** for initial real trading
- **Monitor gas prices** (use during low-traffic hours)
- **Keep some ETH** for gas fees

### **Gas Fee Management:**
- **ETH needed for transactions**: ~0.01-0.05 ETH for gas
- **Optimal timing**: Weekends, late night/early morning
- **Gas tracking**: Use [etherscan.io/gastracker](https://etherscan.io/gastracker)

## 📊 **Expected Costs**

| Action | Gas Cost | USD (at $30 gwei) |
|--------|----------|-------------------|
| **Swap ETH→WBTC** | ~150,000 gas | $3-8 |
| **Swap WBTC→ETH** | ~150,000 gas | $3-8 |
| **Approve Token** | ~50,000 gas | $1-3 |

## 🎯 **Ready for PowerHODL!**

Once you have:
- ✅ **MetaMask wallet created**
- ✅ **Private key exported**
- ✅ **Wallet funded** (or simulation mode)
- ✅ **PowerHODL configured**

You're ready to start accumulating BTC through automated ETH/BTC ratio trading! 🚀

---

## 🆘 **Need Help?**

- **MetaMask Support**: [support.metamask.io](https://support.metamask.io)
- **PowerHODL Issues**: Check the dashboard for connection status
- **Gas Fee Help**: [ethereum.org/en/developers/docs/gas](https://ethereum.org/en/developers/docs/gas)
