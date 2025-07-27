const mongoose = require('mongoose');

const userReferralSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referralCode: { type: String, required: true, unique: true },
  totalReferrals: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRewards: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('UserReferral', userReferralSchema);