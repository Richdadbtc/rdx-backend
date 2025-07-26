const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['daily_login', 'referral', 'bonus'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  claimed: { type: Boolean, default: false },
<<<<<<< HEAD
  description: String,
  title: String,
  referralCode: String
=======
  description: String
>>>>>>> 1c7fda1d166e3a37d4bc00e963bd1f9907eeafb8
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);