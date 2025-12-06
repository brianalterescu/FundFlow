// src/utils/notificationLogic.js

/**
 * Pure utility functions for computing notifications from Firestore data
 * These functions have no side effects and can be easily tested
 */

// 
//   Check if a saving goal has been achieved
//   @param {Object} goal - Goal object from Firestore
//   @param {number} goal.targetAmount - Target amount to save
//   @param {number} goal.currentAmount - Current saved amount
//   @param {Date} goal.createdAt - When goal was created
//   @param {Date} lastCheck - Last time notifications were checked
//   @returns {Object|null} Notification object or null
// 
export const checkSavingGoalAchieved = (goal, lastCheck) => {
    // Only notify if goal was completed after last check
    if (goal.currentAmount >= goal.targetAmount) {
      const achievedDate = goal.updatedAt || new Date();
      
      // Check if achievement happened after last notification check
      if (achievedDate > lastCheck) {
        return {
          id: `goal-achieved-${goal.id}`,
          type: 'GOAL_ACHIEVED',
          title: '🎉 Saving Goal Achieved!',
          message: `Congratulations! You've reached your goal: ${goal.name}`,
          timestamp: achievedDate,
          data: {
            goalId: goal.id,
            goalName: goal.name,
            amount: goal.targetAmount
          }
        };
      }
    }
    
    return null;
  };
  
//   
//     Check if user has hit a spending limit for a budget
//     @param {Object} budget - Budget object from Firestore
//     @param {Array} expenses - Array of expense objects
//     @param {Date} lastCheck - Last time notifications were checked
//     @returns {Object|null} Notification object or null
//    
  export const checkSpendingLimitHit = (budget, expenses, lastCheck) => {
    // Calculate total spent in this budget for current period
    const budgetStart = new Date(budget.startDate);
    const budgetEnd = new Date(budget.endDate);
    
    const relevantExpenses = expenses.filter(expense => {
      const expenseDate = expense.date.toDate ? expense.date.toDate() : new Date(expense.date);
      return (
        expense.category === budget.category &&
        expenseDate >= budgetStart &&
        expenseDate <= budgetEnd
      );
    });
    
    const totalSpent = relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const percentSpent = (totalSpent / budget.limit) * 100;
    
    // Check if limit was hit (100% or more)
    if (percentSpent >= 100) {
      // Find the expense that pushed us over the limit
      let runningTotal = 0;
      let triggeringExpense = null;
      
      for (const expense of relevantExpenses.sort((a, b) => {
        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      })) {
        runningTotal += expense.amount;
        if (runningTotal >= budget.limit) {
          triggeringExpense = expense;
          break;
        }
      }
      
      if (triggeringExpense) {
        const expenseDate = triggeringExpense.date.toDate ? 
          triggeringExpense.date.toDate() : 
          new Date(triggeringExpense.date);
        
        // Only notify if limit was hit after last check
        if (expenseDate > lastCheck) {
          return {
            id: `spending-limit-${budget.id}`,
            type: 'SPENDING_LIMIT',
            title: '⚠️ Spending Limit Reached',
            message: `You've reached your ${budget.category} budget limit of $${budget.limit}`,
            timestamp: expenseDate,
            data: {
              budgetId: budget.id,
              category: budget.category,
              limit: budget.limit,
              spent: totalSpent,
              percentSpent: Math.round(percentSpent)
            }
          };
        }
      }
    }
    
    // Optionally: Check for 80% warning threshold
    if (percentSpent >= 80 && percentSpent < 100) {
      const latestExpense = relevantExpenses[relevantExpenses.length - 1];
      if (latestExpense) {
        const expenseDate = latestExpense.date.toDate ? 
          latestExpense.date.toDate() : 
          new Date(latestExpense.date);
        
        if (expenseDate > lastCheck) {
          return {
            id: `spending-warning-${budget.id}`,
            type: 'SPENDING_WARNING',
            title: '💡 Budget Alert',
            message: `You've used ${Math.round(percentSpent)}% of your ${budget.category} budget`,
            timestamp: expenseDate,
            data: {
              budgetId: budget.id,
              category: budget.category,
              limit: budget.limit,
              spent: totalSpent,
              percentSpent: Math.round(percentSpent)
            }
          };
        }
      }
    }
    
    return null;
  };
  
//   
//      Check for new followers
//      @param {Array} followers - Array of follower objects
//      @param {Date} lastCheck - Last time notifications were checked
//      @returns {Array} Array of notification objects
//    
  export const checkNewFollowers = (followers, lastCheck) => {
    const newFollowers = followers.filter(follower => {
      const followDate = follower.followedAt.toDate ? 
        follower.followedAt.toDate() : 
        new Date(follower.followedAt);
      return followDate > lastCheck;
    });
    
    return newFollowers.map(follower => ({
      id: `follower-${follower.userId}`,
      type: 'NEW_FOLLOWER',
      title: '👥 New Follower',
      message: `${follower.displayName || 'Someone'} started following you`,
      timestamp: follower.followedAt.toDate ? 
        follower.followedAt.toDate() : 
        new Date(follower.followedAt),
      data: {
        userId: follower.userId,
        displayName: follower.displayName,
        photoURL: follower.photoURL
      }
    }));
  };
  
//   /**
//     Compute all notifications from app data
//     @param {Object} data - Object containing all relevant Firestore data
//     @param {Date} lastCheck - Last notification check timestamp
//     @returns {Array} Sorted array of notification objects (newest first)
//    
  export const computeAllNotifications = (data, lastCheck) => {
    const notifications = [];
    
    // Check saving goals
    if (data.goals && Array.isArray(data.goals)) {
      data.goals.forEach(goal => {
        const notification = checkSavingGoalAchieved(goal, lastCheck);
        if (notification) notifications.push(notification);
      });
    }
    
    // Check spending limits
    if (data.budgets && Array.isArray(data.budgets) && data.expenses) {
      data.budgets.forEach(budget => {
        const notification = checkSpendingLimitHit(budget, data.expenses, lastCheck);
        if (notification) notifications.push(notification);
      });
    }
    
    // Check new followers
    if (data.followers && Array.isArray(data.followers)) {
      const followerNotifications = checkNewFollowers(data.followers, lastCheck);
      notifications.push(...followerNotifications);
    }
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    
    return notifications;
  };
  
//   
//     Get relative time string (e.g., "2 hours ago")
//     @param {Date} timestamp - Notification timestamp
//     @returns {string} Human-readable relative time
//    
  export const getRelativeTime = (timestamp) => {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return timestamp.toLocaleDateString();
  };