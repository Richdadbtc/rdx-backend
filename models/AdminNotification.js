const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'announcement'],
    default: 'info'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'scheduled'],
    default: 'draft'
  },
  recipients: {
    type: String,
    enum: ['all', 'verified', 'premium', 'custom'],
    default: 'all'
  },
  scheduledAt: Date,
  sentAt: Date,
  readCount: {
    type: Number,
    default: 0
  },
  totalRecipients: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);