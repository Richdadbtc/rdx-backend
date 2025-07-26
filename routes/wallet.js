const express = require('express');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { getCryptoPrice } = require('../utils/crypto');

const router = express.Router();

// Get wallet balance
router.get('/balance', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Get current crypto prices
    const prices = await getCryptoPrice(['bitcoin', 'ethereum', 'tether', 'pi-network']);
    
    // Calculate USD values
    const balanceWithUSD = {};
    Object.keys(wallet.balances).forEach(currency => {
      const balance = wallet.balances[currency];
      const total = balance.available + balance.locked;
      const priceKey = currency === 'BTC' ? 'bitcoin' : 
                      currency === 'ETH' ? 'ethereum' : 
                      currency === 'USDT' ? 'tether' : 'pi-network';
      const usdValue = total * (prices[priceKey]?.usd || 0);
      
      balanceWithUSD[currency] = {
        ...balance,
        total,
        usdValue
      };
    });

    res.json({
      success: true,
      wallet: {
        ...wallet.toObject(),
        balances: balanceWithUSD
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get wallet addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      addresses: wallet.addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Fund wallet (simulate deposit)
router.post('/fund', auth, async (req, res) => {
  try {
    const { currency, amount } = req.body;
    
    if (!currency || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency or amount'
      });
    }

    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Update wallet balance
    await wallet.updateBalance(currency, parseFloat(amount));

    // Create transaction record
    const transaction = new Transaction({
      userId: req.userId,
      type: 'deposit',
      currency,
      amount: parseFloat(amount),
      status: 'completed',
      description: `Deposit ${amount} ${currency}`,
      toAddress: wallet.addresses[currency]
    });
    await transaction.save();

    res.json({
      success: true,
      message: 'Wallet funded successfully',
      transaction
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;