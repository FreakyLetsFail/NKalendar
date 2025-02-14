// cron.js
const cron = require('node-cron');
const axios = require('axios');

// Da du lokal mit HTTPS (selbstsigniert) arbeitest, kann es nötig sein, SSL-Fehler zu ignorieren (nur für Testzwecke!).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cronjob: Führt alle Minute die API-Route /api/send-push aus.
cron.schedule('* * * * *', async () => {
  try {
    console.log('Cron Job: Sende Anfrage an /api/send-push');
    const response = await axios.get('https://localhost:3000/api/send-push');
    console.log('Antwort:', response.data);
  } catch (err) {
    console.error('Cron Job Fehler:', err);
  }
});

console.log('Cron Job läuft: Alle Minute wird /api/send-push aufgerufen.');
