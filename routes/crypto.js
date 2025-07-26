const express = require('express');
const { getCryptoPrice } = require('../utils/crypto');
const router = express.Router();

// Get current prices
router.get('/prices', async (req, res) => {
  try {
    const coinIds = ['bitcoin', 'tether', 'pi-network']; // CoinGecko IDs
    const prices = await getCryptoPrice(coinIds);
    
    // Format response for our app
    const formattedPrices = {
      BTC: {
        usd: prices.bitcoin?.usd || 0,
        usd_24h_change: prices.bitcoin?.usd_24h_change || 0,
        ngn: (prices.bitcoin?.usd || 0) * 800, // Convert to NGN (you can get real NGN rate)
        symbol: 'BTC',
        name: 'Bitcoin'
      },
      USDT: {
        usd: prices.tether?.usd || 0,
        usd_24h_change: prices.tether?.usd_24h_change || 0,
        ngn: (prices.tether?.usd || 0) * 800,
        symbol: 'USDT',
        name: 'Tether'
      },
      PI: {
        usd: prices['pi-network']?.usd || 2.8,
        usd_24h_change: prices['pi-network']?.usd_24h_change || 0,
        ngn: (prices['pi-network']?.usd || 2.8) * 800,
        symbol: 'PI',
        name: 'Pi Network'
      }
    };
    
    res.json({
      success: true,
      data: formattedPrices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prices'
    });
  }
});

// Get price history/charts
router.get('/charts/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;
    
    const coinIdMap = {
      'BTC': 'bitcoin',
      'USDT': 'tether',
      'PI': 'pi-network'
    };
    
    const coinId = coinIdMap[symbol.toUpperCase()];
    if (!coinId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid symbol'
      });
    }
    
    // This would require additional API call to CoinGecko for historical data
    res.json({
      success: true,
      data: [],
      message: 'Chart data endpoint - implementation needed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
});

// Get market statistics
router.get('/market-stats', async (req, res) => {
  try {
    const coinIds = ['bitcoin', 'tether', 'pi-network'];
    const prices = await getCryptoPrice(coinIds);
    
    res.json({
      success: true,
      data: {
        totalMarketCap: 0, // Calculate from prices
        totalVolume: 0,
        btcDominance: 0,
        activeCryptocurrencies: 3
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market stats'
    });
  }
});

module.exports = router;