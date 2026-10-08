// Verifies the deployed backend accepts the payload the v1.3.0 SDK sends.
// Usage:  node verify_deploy.mjs <app_live_key> [baseUrl]
//
// The decisive check is the `target` + `client_timestamp` ingest: it returns
// 201 only if migration 006 has run. Without those columns the INSERT fails
// and the server answers 500.

const key = process.argv[2];
const base = process.argv[3] ?? 'https://ai-performance-intelligence-backend.onrender.com';

if (!key) {
  console.error('usage: node verify_deploy.mjs <app_live_key> [baseUrl]');
  process.exit(1);
}

let failed = 0;

const check = async (label, expected, path, init = {}) => {
  let status, body = '';
  try {
    const res = await fetch(base + path, init);
    status = res.status;
    try { body = JSON.stringify(await res.json()); } catch { body = '<non-json>'; }
  } catch (e) {
    status = 'ERR';
    body = e.message;
  }
  const ok = status === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  console.log(`      expected ${expected}, got ${status}  ${body.slice(0, 100)}`);
  return ok;
};

const json = (payload) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key },
  body: JSON.stringify(payload),
});

console.log(`Verifying ${base}\n`);

console.log('--- service is up and running the new code ---');
await check('GET /health', 200, '/health');
await check('unknown route returns JSON 404', 404, '/no-such-route');
await check('rotate-key route is deployed', 401, '/apps/abc/rotate-key', { method: 'POST' });

console.log('\n--- API key is accepted ---');
await check('minimal metric ingests', 201, '/metrics', json({
  event: 'app_render', screen: '/verify', render_time: 12, frame_dropped: false,
}));

console.log('\n--- MIGRATION 006: target + client_timestamp (the decisive check) ---');
await check('api_call with target ingests', 201, '/metrics', json({
  event: 'api_call',
  screen: '/verify',
  target: '/v1/users',
  api_latency: 140,
  client_timestamp: new Date().toISOString(),
}));

await check('app_crash with target ingests', 201, '/metrics', json({
  event: 'app_crash',
  screen: '/verify',
  target: 'FlutterError.onError',
  is_error: true,
  error_message: 'verify-deploy smoke test',
  client_timestamp: new Date().toISOString(),
}));

console.log('\n--- batch path (what the SDK actually uses) ---');
await check('batch with target ingests', 201, '/metrics/batch', json({
  metrics: [
    { event: 'screen_open', screen: '/verify', screen_load_time: 100, client_timestamp: new Date().toISOString() },
    { event: 'api_error', screen: '/verify', target: '/v1/orders', api_latency: 900, is_error: true, client_timestamp: new Date().toISOString() },
  ],
}));

console.log('\n--- validation still rejects a bad target ---');
await check('empty target rejected', 400, '/metrics', json({
  event: 'api_call', screen: '/verify', target: '',
}));

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
if (failed > 0) {
  console.log('\nIf the `target` ingests returned 500, migration 006 has not run yet.');
}
process.exit(failed === 0 ? 0 : 1);
