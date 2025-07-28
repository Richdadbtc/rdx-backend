const express = require('express');
const auth = require('../middleware/auth');
const Reward = require('../models/Reward');
const UserReferral = require('../models/UserReferral');
const DailyCheckIn = require('../models/DailyCheckIn');
const User = require('../models/User');
const router = express.Router();

// Daily reward configuration
const DAILY_REWARDS = {
  1: 5.0,
  2: 10.0,
  3: 15.0,
  4: 20.0,
  5: 25.0,
  6: 30.0,
  7: 50.0
};

// Get user rewards
router.get('/', auth, async (req, res) => {
  try {
    const rewards = await Reward.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    const formattedRewards = rewards.map(reward => ({
      id: reward._id,
      type: reward.type,
      title: reward.title,
      description: reward.description,
      amount: reward.amount,
      currency: reward.currency,
      earnedDate: reward.createdAt,
      claimed: reward.claimed,
      referralCode: reward.referralCode
    }));
    
    res.json({
      success: true,
      data: formattedRewards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rewards',
      error: error.message
    });
  }
});

// Get referral data
router.get('/referral', auth, async (req, res) => {
  try {
    let referralData = await UserReferral.findOne({ userId: req.user.id });
    
    if (!referralData) {
      // Create referral data if doesn't exist
      const referralCode = `RDX${Date.now().toString().substring(8)}`;
      referralData = new UserReferral({
        userId: req.user.id,
        referralCode: referralCode
      });
      await referralData.save();
    }
    
    // Get referred users emails
    const referredUsers = await User.find(
      { _id: { $in: referralData.referredUsers } },
      'email'
    );
    
    res.json({
      success: true,
      data: {
        referralCode: referralData.referralCode,
        totalReferrals: referralData.totalReferrals,
        totalEarnings: referralData.totalEarnings,
        referredUsers: referredUsers.map(user => user.email),
        pendingRewards: referralData.pendingRewards
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral data',
      error: error.message
    });
  }
});

// Get daily check-in status
router.get('/daily-checkin/status', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get user's check-in history (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const checkIns = await DailyCheckIn.find({
      userId: req.user.id,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });
    
    // Calculate current streak
    let currentStreak = 0;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if user checked in yesterday to maintain streak
    const yesterdayCheckIn = await DailyCheckIn.findOne({
      userId: req.user.id,
      date: yesterday
    });
    
    if (yesterdayCheckIn) {
      currentStreak = yesterdayCheckIn.streak;
    }
    
    // Check if user can check in today
    const todayCheckIn = await DailyCheckIn.findOne({
      userId: req.user.id,
      date: today
    });
    
    const canCheckInToday = !todayCheckIn;
    
    // Build daily check-ins array for UI
    const dailyCheckIns = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      
      const checkIn = checkIns.find(c => 
        c.date.getTime() === date.getTime()
      );
      
      dailyCheckIns.push({
        date: date,
        checked: !!checkIn,
        reward: DAILY_REWARDS[i + 1] || 5.0,
        currency: 'RDX',
        streak: i + 1
      });
    }
    
    res.json({
      success: true,
      data: {
        currentStreak,
        canCheckInToday,
        dailyCheckIns
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch check-in status',
      error: error.message
    });
  }
});

// Perform daily check-in
router.post('/daily-checkin', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already checked in today
    const existingCheckIn = await DailyCheckIn.findOne({
      userId: req.user.id,
      date: today
    });
    
    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }
    
    // Calculate streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayCheckIn = await DailyCheckIn.findOne({
      userId: req.user.id,
      date: yesterday
    });
    
    let newStreak = 1;
    if (yesterdayCheckIn) {
      newStreak = yesterdayCheckIn.streak + 1;
      if (newStreak > 7) newStreak = 1; // Reset after 7 days
    }
    
    const rewardAmount = DAILY_REWARDS[newStreak] || 5.0;
    
    // Create check-in record
    const checkIn = new DailyCheckIn({
      userId: req.user.id,
      date: today,
      streak: newStreak,
      reward: rewardAmount,
      currency: 'RDX'
    });
    await checkIn.save();
    
    // Create reward record
    const reward = new Reward({
      userId: req.user.id,
      type: 'daily_login',
      title: 'Daily Login Bonus',
      description: `Day ${newStreak} login reward`,
      amount: rewardAmount,
      currency: 'RDX',
      claimed: true
    });
    await reward.save();
    
    res.json({
      success: true,
      data: {
        newStreak,
        reward: {
          id: reward._id,
          type: reward.type,
          title: reward.title,
          description: reward.description,
          amount: reward.amount,
          currency: reward.currency,
          earnedDate: reward.createdAt,
          claimed: reward.claimed
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to perform check-in',
      error: error.message
    });
  }
});

// Claim reward
router.post('/claim/:rewardId', auth, async (req, res) => {
  try {
    const reward = await Reward.findOne({
      _id: req.params.rewardId,
      userId: req.user.id
    });
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    if (reward.claimed) {
      return res.status(400).json({
        success: false,
        message: 'Reward already claimed'
      });
    }
    
    reward.claimed = true;
    await reward.save();
    
    res.json({
      success: true,
      message: 'Reward claimed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward',
      error: error.message
    });
  }
});

// Get daily reward configuration
router.get('/daily-config', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: DAILY_REWARDS
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily config',
      error: error.message
    });
  }
});

// After successful daily check-in
if (checkInResult.success) {
  // Create notification
  const notification = new Notification({
    userId: req.user.id,
    title: 'Daily Reward Claimed! 🎁',
    message: `You've earned ${reward.amount} ${reward.currency}. Current streak: ${newStreak} days!`,
    type: 'reward'
  });
  
  await notification.save();
  
  // Send push notification
  await sendPushNotification(
    req.user.id,
    'Daily Reward Claimed! 🎁',
    `You've earned ${reward.amount} ${reward.currency}`,
    'reward'
  );
}

module.exports = router;