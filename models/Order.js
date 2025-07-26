const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  orderType: { type: String, enum: ['market', 'limit'], required: true },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true },
  price: { type: Number },
  status: { type: String, enum: ['pending', 'filled', 'cancelled'], default: 'pending' },
  filledAmount: { type: Number, default: 0 },
  fee: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);