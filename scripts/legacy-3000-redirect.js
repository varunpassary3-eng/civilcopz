const express = require('express');
const app = express();
const PORT = 3000;

/**
 * CivilCOPZ Legacy Redirection Substrate (Operations-Grade - Phase 11)
 * Decommissions Port 3000 and enforces Port 5173 as the single UI entry point.
 */
app.use((req, res) => {
    const target = `http://localhost:5173${req.originalUrl}`;
    console.log(`[LEGACY-3000] ⚠️  Redirecting ${req.method} ${req.originalUrl} -> ${target}`);
    return res.redirect(301, target);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LEGACY-3000] Legacy Shim Active on :3000 -> Redirecting to http://localhost:5173`);
});
