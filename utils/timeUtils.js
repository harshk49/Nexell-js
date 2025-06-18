/**
 * Time tracking utility functions
 */

/**
 * Round time value to the nearest interval
 * @param {number} minutes - Time in minutes
 * @param {number} interval - Rounding interval in minutes (1, 5, 10, 15, 30, 60)
 * @returns {number} - Rounded time in minutes
 */
const roundTimeToInterval = (minutes, interval = 1) => {
  if (interval <= 1) return Math.round(minutes);

  return Math.ceil(minutes / interval) * interval;
};

/**
 * Check if current time is within user's working hours
 * @param {Object} workingHours - User's working hours settings
 * @returns {boolean} - True if current time is within working hours
 */
const isWithinWorkingHours = (workingHours) => {
  if (!workingHours.enabled) return true;

  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7

  // Check if current day is a work day
  if (!workingHours.workDays.includes(currentDay)) {
    return false;
  }

  // Parse working hours
  const [startHour, startMinute] = workingHours.start
    .split(":")
    .map((n) => parseInt(n, 10));
  const [endHour, endMinute] = workingHours.end
    .split(":")
    .map((n) => parseInt(n, 10));

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Convert to minutes for easier comparison
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  return (
    currentTimeInMinutes >= startTimeInMinutes &&
    currentTimeInMinutes <= endTimeInMinutes
  );
};

/**
 * Calculate billable amount from duration and hourly rate
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} hourlyRate - Rate per hour
 * @returns {number} - Billable amount
 */
const calculateBillableAmount = (durationMinutes, hourlyRate) =>
  (durationMinutes / 60) * hourlyRate;

/**
 * Format duration in human-readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration (e.g. "2h 30m")
 */
const formatDuration = (minutes) => {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Detect if a timer has been running for too long
 * @param {Date} startTime - When the timer was started
 * @param {number} threshold - Threshold in hours
 * @returns {boolean} - True if timer is running for too long
 */
const isLongRunningTimer = (startTime, threshold = 8) => {
  const now = new Date();
  const diffHours = (now - new Date(startTime)) / (1000 * 60 * 60);
  return diffHours >= threshold;
};

/**
 * Calculate pomodoro session information
 * @param {Object} settings - Pomodoro settings
 * @param {number} completedSessions - Number of completed sessions
 * @returns {Object} - Session info with duration and type
 */
const getPomodoroSessionInfo = (settings, completedSessions) => {
  const isLongBreak =
    completedSessions > 0 &&
    completedSessions % settings.sessionsBeforeLongBreak === 0;

  const isBreak = completedSessions > 0;

  let duration;
  let sessionType;

  if (isBreak) {
    if (isLongBreak) {
      duration = settings.longBreakDuration;
      sessionType = "longBreak";
    } else {
      duration = settings.breakDuration;
      sessionType = "break";
    }
  } else {
    duration = settings.workDuration;
    sessionType = "work";
  }

  return {
    duration,
    sessionType,
    isBreak,
    isLongBreak,
  };
};

export {
  roundTimeToInterval,
  isWithinWorkingHours,
  calculateBillableAmount,
  formatDuration,
  isLongRunningTimer,
  getPomodoroSessionInfo,
};
