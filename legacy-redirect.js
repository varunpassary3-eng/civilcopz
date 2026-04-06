const express = require('express');
const app = express();

/**
 * CivilCOPZ National Redirect Substrate
 * Enforces transition from Port 3000 (Legacy) to Port 5173 (Industrial).
 */

app.get('/', (req, res) => {
  console.log('[REDIRECT] Root :3000 -> :5173');
  return res.redirect(301, 'http://localhost:5173');
});

app.use((req, res) => {
  console.log(`[REDIRECT] :3000${req.originalUrl} -> :5173${req.originalUrl}`);
  return res.redirect(301, `http://localhost:5173${req.originalUrl}`);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`⚠️  Legacy 3000 active -> Redirecting to http://localhost:5173`);
});
