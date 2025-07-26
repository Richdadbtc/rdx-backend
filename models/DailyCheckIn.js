const mongoose = require('mongoose');

const dailyCheckInSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  streak: { type: Number, default: 1 },
  reward: { type: Number, required: true },
  currency: { type: String, default: 'RDX' }
}, { timestamps: true });

// Ensure one check-in per user per day
dailyCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyCheckIn', dailyCheckInSchema);