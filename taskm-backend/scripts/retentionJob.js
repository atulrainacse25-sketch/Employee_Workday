const cron = require('node-cron');
const axios = require('axios');

// This script will call the backend endpoint to archive old AI logs.
// It is intended to be required from the main server start file.

module.exports = function startRetentionJob(appUrl, options = {}) {
  const schedule = options.schedule || '0 3 * * *'; // default: daily at 03:00
  const days = options.days || 90;
  const apiKey = options.apiKey || null; // optional admin API key if needed

  const task = cron.schedule(schedule, async () => {
    try {
      const url = `${appUrl.replace(/\/$/, '')}/api/notifications/ai/logs/archive-old`;
      await axios.post(url, { days }, { headers: apiKey ? { 'x-admin-key': apiKey } : {}, timeout: 20000 });
      console.log('Retention job executed: archived logs older than', days, 'days');
    } catch (err) {
      console.warn('Retention job failed:', err.message || err);
    }
  }, { scheduled: true });

  return task;
};


