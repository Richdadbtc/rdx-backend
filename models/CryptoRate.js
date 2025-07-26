const mongoose = require('mongoose');

const cryptoRateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    unique: true
  },
  marketPrice: {
    type: Number,
    required: true,
    min: 0
  },
  buyRate: {
    type: Number,
    required: true,
    min: 0
  },
  sellRate: {
    type: Number,
    required: true,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate spread percentage
cryptoRateSchema.virtual('spread').get(function() {
  return ((this.buyRate - this.sellRate) / this.marketPrice * 100).toFixed(2);
});

// Update lastUpdated on save
cryptoRateSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('CryptoRate', cryptoRateSchema);