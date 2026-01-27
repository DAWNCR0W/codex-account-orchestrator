const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateAccountHealth,
  summarizeHealth
} = require('../dist/account_health.js');

function createInspection(overrides = {}) {
  return {
    name: 'accountA',
    isDefault: false,
    accountDir: '/tmp/accountA',
    authFilePath: '/tmp/accountA/auth.json',
    loggedIn: true,
    status: {},
    ...overrides
  };
}

test('evaluateAccountHealth reports token expiry and cooldown warnings', () => {
  const nowMs = 1_000_000;
  const inspection = createInspection({
    tokenDetails: { expiresAtMs: nowMs + 60 * 60 * 1000 },
    status: { cooldownUntilMs: nowMs + 30 * 60 * 1000 }
  });

  const issues = evaluateAccountHealth(
    inspection,
    { expiresWithinHours: 24, maxFailures: 3 },
    nowMs
  );

  const codes = issues.map((issue) => issue.code).sort();
  assert.ok(codes.includes('token_expiring_soon'));
  assert.ok(codes.includes('cooldown_active'));
});

test('summarizeHealth flags errors for missing auth', () => {
  const nowMs = 1_000_000;
  const inspections = [
    createInspection({ name: 'accountA', loggedIn: false }),
    createInspection({ name: 'accountB', tokenDetails: { expiresAtMs: nowMs + 1000 } })
  ];

  const summary = summarizeHealth(inspections, { expiresWithinHours: 1, maxFailures: 3 }, nowMs);

  assert.equal(summary.errorCount, 1);
  assert.ok(summary.issues.some((issue) => issue.code === 'not_logged_in'));
});
