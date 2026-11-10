const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function run(input, env = {}) {
    return spawnSync(process.execPath, [
        '--require', path.join(__dirname, 'mock-axios.cjs'),
        path.join(__dirname, '..', 'wordwallHack.js')
    ], { input, encoding: 'utf8', timeout: 5000, env: { ...process.env, ...env } });
}

test('reads piped answers and preserves apostrophes in leaderboard names', () => {
    const result = run('2\nhttps://wordwall.net/resource/55028459/title\n');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /O'Brien/);
});

test('extracts activity ID from localized resource URLs', () => {
    const result = run('2\nhttps://wordwall.net/es/resource/55028459/title\n');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /O'Brien/);
});

test('rounds seconds to milliseconds for rank requests', () => {
    const result = run('3\nhttps://wordwall.net/resource/55028459\n100\n12.3456\n');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /place 7/);
});

test('encodes names in mock submissions', () => {
    const result = run('1\nhttps://wordwall.net/resource/55028459\n100\n12.3456\nA&B + café\n');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Mock submission received correctly/);
});

test('rejects invalid menu selections', () => {
    const result = run('9\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Choose a function/);
});

test('rejects non-Wordwall URLs', () => {
    const result = run('2\nhttps://example.com/resource/55028459\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HTTPS resource URL on wordwall.net/);
});

test('rejects invalid scores and times', () => {
    for (const values of ['-1\n', '100\nnope\n', '100\nInfinity\n']) {
        const result = run(`3\nhttps://wordwall.net/resource/55028459\n${values}`);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /must be a nonnegative/);
    }
});

test('reports incomplete input instead of hanging or silently exiting', () => {
    const result = run('2\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Input ended/);
});

test('reports HTTP failures with a failing exit status', () => {
    const result = run('2\nhttps://wordwall.net/resource/55028459\n', { TEST_HTTP_ERROR: '1' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HTTP 503/);
});
