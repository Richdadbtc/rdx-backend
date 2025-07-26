const axios = require('axios');

const getCryptoPrice = async (coinIds) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: coinIds.join(','),
        vs_currencies: 'usd',
        include_24hr_change: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {};
  }
};

// Get USD to NGN exchange rate
const getUsdToNgnRate = async () => {
  try {
    // You can use a real forex API here
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data.rates.NGN || 800; // Fallback to 800
  } catch (error) {
    console.error('Error fetching USD to NGN rate:', error);
    return 800; // Fallback rate
  }
};

// Get historical price data
const getHistoricalPrices = async (coinId, days = 7) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return null;
  }
};

module.exports = { 
  getCryptoPrice, 
  getUsdToNgnRate, 
  getHistoricalPrices 
};