import http from 'node:http';
import { handler as manualHandler } from '../lambdas/manual/handler';
import { handler as dailyHandler } from '../lambdas/daily/handler';
import { handler as everyMinuteHandler } from '../lambdas/everyMinute/handler';
import { handler as every10MinHandler } from '../lambdas/every10Minutes/handler';

const PORT = process.env.PORT ?? 3000;
const EVERY_MINUTE_MS = 60 * 1000;
const EVERY_10_MIN_MS = 10 * 60 * 1000;
const DAILY_MS = 24 * 60 * 60 * 1000;

// --- Local cron schedulers ---
function startCronJobs() {
  console.log('  Cron jobs started:');

  setInterval(async () => {
    console.log(`\n  [CRON] everyMinute triggered at ${new Date().toISOString()}`);
    try {
      const result = await everyMinuteHandler({ source: 'cron-local' });
      console.log(`  [CRON] everyMinute result:`, result.body);
    } catch (err) {
      console.error('  [CRON] everyMinute error:', err);
    }
  }, EVERY_MINUTE_MS);
  console.log(`    - everyMinute: every 60s`);

  setInterval(async () => {
    console.log(`\n  [CRON] every10Min triggered at ${new Date().toISOString()}`);
    try {
      const result = await every10MinHandler({ source: 'cron-local' });
      console.log(`  [CRON] every10Min result:`, result.body);
    } catch (err) {
      console.error('  [CRON] every10Min error:', err);
    }
  }, EVERY_10_MIN_MS);
  console.log(`    - every10Min: every 10m`);

  setInterval(async () => {
    console.log(`\n  [CRON] daily triggered at ${new Date().toISOString()}`);
    try {
      const result = await dailyHandler({ source: 'cron-local' });
      console.log(`  [CRON] daily result:`, result.body);
    } catch (err) {
      console.error('  [CRON] daily error:', err);
    }
  }, DAILY_MS);
  console.log(`    - daily: every 24h`);

  console.log('');
}

// --- HTTP server for manual triggers ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/trigger' && req.method === 'GET') {
    const result = await manualHandler({ source: 'local', path: '/trigger' });
    res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
    res.end(result.body);
    return;
  }

  if (url.pathname === '/invoke/daily' && req.method === 'GET') {
    const result = await dailyHandler({ source: 'local', path: '/invoke/daily' });
    res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
    res.end(result.body);
    return;
  }

  if (url.pathname === '/invoke/every-minute' && req.method === 'GET') {
    const result = await everyMinuteHandler({ source: 'local', path: '/invoke/every-minute' });
    res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
    res.end(result.body);
    return;
  }

  if (url.pathname === '/invoke/every-10-min' && req.method === 'GET') {
    const result = await every10MinHandler({ source: 'local', path: '/invoke/every-10-min' });
    res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
    res.end(result.body);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n  Local dev server running at http://localhost:${PORT}\n`);
  console.log('  HTTP endpoints (manual invoke):');
  console.log(`    GET http://localhost:${PORT}/trigger              → manual handler`);
  console.log(`    GET http://localhost:${PORT}/invoke/daily         → daily handler`);
  console.log(`    GET http://localhost:${PORT}/invoke/every-minute  → everyMinute handler`);
  console.log(`    GET http://localhost:${PORT}/invoke/every-10-min   → every10Min handler\n`);
  startCronJobs();
  console.log('  Watching for file changes...\n');
});
