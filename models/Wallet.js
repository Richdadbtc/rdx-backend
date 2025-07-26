const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['spot', 'futures', 'savings'],
    default: 'spot'
  },
  balances: {
    BTC: {
      available: { type: Number, default: 0 },
      locked: { type: Number, default: 0 }
    },
    ETH: {
      available: { type: Number, default: 0 },
      locked: { type: Number, default: 0 }
    },
    USDT: {
      available: { type: Number, default: 0 },
      locked: { type: Number, default: 0 }
    },
    PI: {
      available: { type: Number, default: 0 },
      locked: { type: Number, default: 0 }
    }
  },
  addresses: {
    BTC: String,
    ETH: String,
    USDT: String,
    PI: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate total balance for a specific currency
walletSchema.methods.getTotalBalance = function(currency) {
  const balance = this.balances[currency];
  return balance ? balance.available + balance.locked : 0;
};

// Update balance
walletSchema.methods.updateBalance = function(currency, amount, type = 'available') {
  if (!this.balances[currency]) {
    this.balances[currency] = { available: 0, locked: 0 };
  }
  this.balances[currency][type] += amount;
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);