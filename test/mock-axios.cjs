const assert = require('node:assert/strict');
const axios = require('axios');

axios.get = async (url, config) => {
    if (!url.includes('/leaderboardajax/')) {
        return { data: 's.templateId = Number(22); s.authorUserId = Number(570207);' };
    }
    assert.equal(config.params.activityId, '55028459');
    if (process.env.TEST_HTTP_ERROR) {
        throw Object.assign(new Error('Unavailable'), { response: { status: 503 } });
    }
    if (url.endsWith('/getentryrank')) {
        assert.equal(config.params.time, 12346);
        assert.equal(config.params.score, 100);
        return { data: 7 };
    }
    assert.ok(url.endsWith('/getentries'));
    return { data: JSON.stringify([{ Name: "O'Brien", Score: 100, Time: 12345 }]) };
};

axios.post = async (url, body) => {
    assert.ok(url.endsWith('/addentry'));
    const params = new URLSearchParams(body);
    assert.equal(params.get('name'), 'A&B + café');
    assert.equal(params.get('time'), '12346');
    assert.equal(params.get('activityId'), '55028459');
    process.stdout.write('Mock submission received correctly.\n');
    return { data: {} };
};
