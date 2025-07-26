const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'trading', 'security', 'notifications'],
    required: true
  },
  description: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);