const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['daily_login', 'referral', 'bonus'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  claimed: { type: Boolean, default: false },
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);