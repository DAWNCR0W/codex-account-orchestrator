const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI_PATH = path.join(__dirname, '..', 'dist', 'cli_main.js');

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwt(payload) {
  const header = { alg: 'none', typ: 'JWT' };
  return `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}.sig`;
}

function createAuthJson(accountId, expiresAtMs) {
  const exp = Math.floor(expiresAtMs / 1000);
  const accessToken = createJwt({
    exp,
    'https://api.openai.com/auth': {
      chatgpt_account_id: accountId,
      chatgpt_user_id: 'user',
      user_id: 'user'
    }
  });

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: 'refresh_token',
      id_token: accessToken,
      account_id: accountId
    },
    last_refresh: new Date(expiresAtMs - 3600 * 1000).toISOString()
  };
}

function withTempDir(run) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cao-cli-'));

  try {
    run(baseDir);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

function writeRegistry(baseDir, accounts, defaultAccount) {
  const registry = {
    accounts,
    default_account: defaultAccount
  };
  fs.writeFileSync(path.join(baseDir, 'registry.json'), JSON.stringify(registry, null, 2));
}

function writeAccount(baseDir, name, authJson) {
  const accountDir = path.join(baseDir, name);
  fs.mkdirSync(accountDir, { recursive: true });
  fs.writeFileSync(path.join(accountDir, 'auth.json'), JSON.stringify(authJson, null, 2));
}

function runCli(baseDir, args) {
  return spawnSync('node', [CLI_PATH, '--data-dir', baseDir, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  });
}

test('status default output is compact (non-tty)', () => {
  withTempDir((baseDir) => {
    const now = Date.now();
    writeRegistry(baseDir, ['alpha', 'beta'], 'alpha');
    writeAccount(baseDir, 'alpha', createAuthJson('acc-alpha', now + 48 * 3600 * 1000));
    writeAccount(baseDir, 'beta', createAuthJson('acc-beta', now + 24 * 3600 * 1000));

    const result = runCli(baseDir, ['status']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /alpha/);
    assert.match(result.stdout, /beta/);
    assert.match(result.stdout, /expires:/);
  });
});

test('status --pretty renders a framed dashboard', () => {
  withTempDir((baseDir) => {
    const now = Date.now();
    writeRegistry(baseDir, ['alpha'], 'alpha');
    writeAccount(baseDir, 'alpha', createAuthJson('acc-alpha', now + 24 * 3600 * 1000));

    const result = runCli(baseDir, ['status', '--pretty']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /CAO Status/);
    assert.match(result.stdout, /Accounts:/);
    assert.match(result.stdout, /alpha/);
  });
});

test('status --doctor --json returns JSON and exit code 0', () => {
  withTempDir((baseDir) => {
    const now = Date.now();
    writeRegistry(baseDir, ['alpha'], 'alpha');
    writeAccount(baseDir, 'alpha', createAuthJson('acc-alpha', now + 48 * 3600 * 1000));

    const result = runCli(baseDir, ['status', '--doctor', '--json']);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.totals.errors, 0);
  });
});

test('list shows registered accounts', () => {
  withTempDir((baseDir) => {
    const now = Date.now();
    writeRegistry(baseDir, ['alpha', 'beta'], 'beta');
    writeAccount(baseDir, 'alpha', createAuthJson('acc-alpha', now + 24 * 3600 * 1000));
    writeAccount(baseDir, 'beta', createAuthJson('acc-beta', now + 24 * 3600 * 1000));

    const result = runCli(baseDir, ['list']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /alpha/);
    assert.match(result.stdout, /beta/);
  });
});
