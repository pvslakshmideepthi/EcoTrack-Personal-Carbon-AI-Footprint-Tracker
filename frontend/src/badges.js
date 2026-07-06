export const evaluateBadges = (history, currentLog, existingBadges = []) => {
  const newBadges = [];
  const earnedBadgeIds = existingBadges.map(b => b.id);

  const checkAndAward = (id, name, condition) => {
    if (!earnedBadgeIds.includes(id) && condition) {
      newBadges.push({ id, name, dateEarned: new Date().toISOString() });
    }
  };

  // 1. First Step: Logged your first day of habits
  checkAndAward('first_step', 'First Step', history.length >= 0);

  // 2. Low Energy: Energy emissions under 2 kg CO2 in one day
  checkAndAward('low_energy', 'Low Energy', currentLog.energy_emissions < 2.0);

  // 3. Plant Day: Log a vegetarian or vegan diet
  checkAndAward('plant_day', 'Plant Day', ['Vegetarian', 'Vegan'].includes(currentLog.diet_type));

  // 4. Pedal Power: Log bicycle or walking as transport
  checkAndAward('pedal_power', 'Pedal Power', ['Bicycle', 'Walking'].includes(currentLog.transport_mode));

  // 5. Budget Clear: Stay under daily budget
  checkAndAward('budget_clear', 'Budget Clear', currentLog.total <= 8.0);

  // 6. Zero Waster: No food waste reported
  checkAndAward('zero_waster', 'Zero Waster', currentLog.food_waste === false);

  // 7. 3-Day Streak: 3 consecutive days logged
  checkAndAward('streak_3', '3-Day Streak', history.length >= 2); 

  // 8. Week Warrior: 7 consecutive days logged
  checkAndAward('streak_7', 'Week Warrior', history.length >= 6);

  // 9. Monthly Hero: Stay under budget 20 days in a month
  checkAndAward('monthly_hero', 'Monthly Hero', history.filter(log => log.total <= 8.0).length >= 20);

  // 10. Monthly Master: 30 consecutive days logged
  checkAndAward('monthly_master', 'Monthly Master', history.length >= 29);

  return [...existingBadges, ...newBadges];
};
