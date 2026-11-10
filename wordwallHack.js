const axios = require('axios');
const readline = require('readline');

axios.defaults.timeout = 15000;

function describeRequestError(error) {
    if (error.code === 'EACCES' || error.code === 'EPERM') {
        return 'Network access was blocked by this environment. Run from a terminal that allows HTTPS access to wordwall.net.';
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return 'The request timed out. Check your connection and try again.';
    }
    if (error.response) {
        return `Wordwall returned HTTP ${error.response.status}.`;
    }
    return error.message;
}

// Create an interface for reading input from the user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt the user for input
const answers = rl[Symbol.asyncIterator]();

async function prompt(query) {
    process.stdout.write(query);
    const answer = await answers.next();
    if (answer.done) throw new Error('Input ended before all questions were answered.');
    return answer.value.trim();
}

function parseGameUrl(input) {
    let url;
    try {
        url = new URL(input);
    } catch {
        throw new Error('Enter a full Wordwall resource URL.');
    }
    if (url.protocol !== 'https:' || !['wordwall.net', 'www.wordwall.net'].includes(url.hostname) || url.port || url.username || url.password) {
        throw new Error('Use an HTTPS resource URL on wordwall.net.');
    }
    const match = url.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?resource\/(\d+)(?:\/|$)/i);
    if (!match) throw new Error('The URL must contain /resource/ followed by the game ID.');
    return { url: url.href, activityId: match[1] };
}

function parseNonnegativeNumber(value, label, integer = false) {
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number < 0 || (integer && !Number.isSafeInteger(number))) {
        throw new Error(`${label} must be a nonnegative ${integer ? 'safe integer' : 'number'}.`);
    }
    return number;
}

function parseLeaderboardData(leaderboardData) {
    if (typeof leaderboardData === 'string') {
        try {
            leaderboardData = JSON.parse(leaderboardData);
        } catch (error) {
            console.error('Failed to parse leaderboard data:', error);
            return [];
        }
    }

    if (!Array.isArray(leaderboardData)) {
        console.error('Invalid leaderboard data');
        return [];
    }

    return leaderboardData.map(entry => ({
        entryId: entry.EntryId,
        name: entry.Name,
        score: entry.Score,
        time: entry.Time
    }));
}

function parseLeaderboardOptions(str) {
    if (!str) {
        console.error("Leaderboard options data is undefined or null.");
        return null;
    }

    // If it's already an object, use it directly
    if (typeof str === 'object') {
        return str;
    }

    let jsonString = String(str).replace(/'/g, '"');

    jsonString = jsonString.replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null');

    if (jsonString.trim().charAt(0) !== '{') {
        jsonString = `{${jsonString}}`;
    }

    try {
        const data = JSON.parse(jsonString);
        return data;
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }
}

async function leaderboard(url, score, time, leaderboardFunc, templateId, name = null, params = null) {
    let leaderboardURL = `https://wordwall.net/leaderboardajax/${leaderboardFunc}`;
    let mode = 1;
    let { activityId } = parseGameUrl(url);

    let paramsStr;
    let paramsJson;

    if (params == null) {
        paramsJson = {
            score: score,
            time: time,
            name: name ?? '',
            mode: mode,
            activityId: activityId,
            templateId: templateId
        };
        paramsStr = new URLSearchParams(paramsJson).toString();
    } else {
        paramsStr = params;
        paramsJson = params;
    }

    try {
        let response;
        const headers = {
            'Content-Type': leaderboardFunc === 'addentry' ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json; charset=UTF-8',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': 'https://wordwall.net',
            'Referer': url,
            'User-Agent': 'Mozilla/5.0',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Wordwall-Version': '1.0.9055.15470'
        };

        if (leaderboardFunc !== 'addentry') {
            response = await axios.get(leaderboardURL, { headers, params: paramsJson });
        } else {
            response = await axios.post(leaderboardURL, paramsStr, { headers });
        }

        if (leaderboardFunc === 'getentries') {
            const data = parseLeaderboardData(response.data);
            if (data.length > 0) {
                data.forEach(entry => {
                    console.log(`Name: ${entry.name} ||| Score: ${entry.score} ||| Time: ${entry.time / 1000}`);
                });
            } else {
                console.log('No leaderboard entries found.');
            }
        } else if (leaderboardFunc === 'getentryrank') {
            console.log(`You would be in place ${response.data}`);
        } else if (leaderboardFunc === 'getoption') {
            return response.data;
        }
    } catch (error) {
        console.error('Error with leaderboard request:', describeRequestError(error));
        process.exitCode = 1;
    }
}

(async () => {
    console.log('Welcome to the Wordwall Hack. Please choose a function;');
    let func = await prompt('Add Entry (1), Get Leaderboard (2), Get Entry Position on Leaderboard (3), Flood Leaderboard(4): ');
    if (!['1', '2', '3', '4'].includes(func)) throw new Error('Choose a function from 1 to 4.');
    let { url } = parseGameUrl(await prompt('Wordwall game URL: '));
    let templateId;
    let authorUserId;

    try {
        const response = await axios.get(url);
        const data = String(response.data);
        const readId = key => {
            const assignment = new RegExp('\\b(?:s|window\\.ServerModel|ServerModel)\\s*\\.\\s*' + key + '\\s*=\\s*(?:Number\\s*\\(\\s*)?["\']?(\\d+)');
            const property = new RegExp('["\']?' + key + '["\']?\\s*:\\s*(?:Number\\s*\\(\\s*)?["\']?(\\d+)');
            const match = data.match(assignment) || data.match(property);
            return match ? Number(match[1]) : null;
        };
        templateId = readId('templateId');
        authorUserId = readId('authorUserId');
        if (templateId === null) {
            const title = data.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
            throw new Error('Game metadata was missing from the response' + (title ? ' (page title: ' + title + ')' : '') + '. The page format may have changed or Wordwall may have returned an access page.');
        }
        if (func == 4 && authorUserId === null) {
            throw new Error('The game page did not contain an author user ID.');
        }
        console.log('Template ID:', templateId);
        if (authorUserId !== null) console.log('Author User ID:', authorUserId);
    } catch (error) {
        console.error('Could not load game:', describeRequestError(error));
        process.exitCode = 1;
        return;
    }

    let score;
    let time;
    let name;
    if (func == 1 || func == 3) {
        score = parseNonnegativeNumber(await prompt('Score: '), 'Score', true);
        time = Math.round(parseNonnegativeNumber(await prompt('Time in seconds (EX: 12.345): '), 'Time') * 1000);
        if (!Number.isSafeInteger(time)) throw new Error('Time is too large.');
    }

    if (func == 1) {
        name = await prompt('Name: ');
        await leaderboard(url, score, time, 'addentry', templateId, name);
    } else if (func == 2) {
        await leaderboard(url, null, null, 'getentries', templateId);
    } else if (func == 3) {
        await leaderboard(url, score, time, 'getentryrank', templateId);
    } else if (func == 4) {
        time = "00001";
        score = 69420;
        let { activityId } = parseGameUrl(url);
        name = await prompt('Name to flood leaderboard with: ');

        const paramsJson = {
            activityId: activityId,
            templateId: templateId,
            authorUserId: authorUserId
        };

        let leaderboardStats = await leaderboard(url, score, time, 'getoption', templateId, null, paramsJson);

        if (leaderboardStats) {
            leaderboardStats = parseLeaderboardOptions(leaderboardStats);
            console.log('Leaderboard options retrieved successfully.');
            console.log(JSON.stringify(leaderboardStats, null, 2));

            if (leaderboardStats && leaderboardStats.EntryCount) {
                for (let i = 0; i < leaderboardStats.EntryCount; i++) {
                    leaderboard(url, score, time, 'addentry', templateId, `${name}${i}`);
                }
                console.log('Leaderboard Flooded!');
            } else {
                console.log('No entries to flood or invalid leaderboard data.');
            }
        } else {
            console.log('Could not retrieve leaderboard options.');
        }
    }
})().catch(error => {
    console.error('Unable to complete request:', describeRequestError(error));
    process.exitCode = 1;
}).finally(() => rl.close());
