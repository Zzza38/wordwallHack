const axios = require('axios');
const readline = require('readline');

// Create an interface for reading input from the user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt the user for input
function prompt(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function parseLeaderboardData(leaderboardData) {
    if (typeof leaderboardData === 'string') {
        try {
            leaderboardData = leaderboardData.replace(/'/g, '"');
            leaderboardData = JSON.parse(leaderboardData);
        } catch (error) {
            console.error('Failed to parse leaderboard data:', error);
            return [];
        }
    }

    if (!Array.isArray(leaderboardData) || leaderboardData.length === 0) {
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

    let jsonString = str.replace(/'/g, '"');

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
    let activityId = url.split('/')[4];

    let paramsStr;
    let paramsJson;

    if (params == null) {
        paramsStr = `score=${score}&time=${time}&name=${encodeURIComponent(name)}&mode=${mode}&activityId=${activityId}&templateId=${templateId}`;
        paramsJson = {
            score: score,
            time: time,
            name: encodeURIComponent(name),
            mode: mode,
            activityId: activityId,
            templateId: templateId
        };
    } else {
        paramsStr = params;
        paramsJson = params;
    }

    try {
        let response;
        const headers = {
            'Content-Type': leaderboardFunc === 'addentry' ? 'application/x-www-form-urlencoded; charset=UTF-8' : 'application/json; charset=UTF-8',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
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
        console.error('Error with leaderboard request:', error.message);
    } finally {
        rl.close();  // Ensure readline is closed properly
    }
}

(async () => {
    console.log('Welcome to the Wordwall Hack. Please choose a function;');
    let func = await prompt('Add Entry (1), Get Leaderboard (2), Get Entry Position on Leaderboard (3), Flood Leaderboard(4): ');
    let url = await prompt('Wordwall game URL: ');
    let templateId;
    let authorUserId;

    try {
        const response = await axios.get(url);
        let data = String(response.data);
        let search = "var s=window.ServerModel={};";
        let start = data.indexOf(search);
        if (start === -1) {
            console.error("Search string not found in the response.");
            return;
        }

        let end = data.indexOf("</script>", start);
        if (end === -1) {
            console.error("End of script block not found.");
            return;
        }
        end--;

        data = data.slice(start, end);

        let nsearch = "s.templateId=Number(";
        let nstart = data.indexOf(nsearch);
        if (nstart === -1) {
            console.error("Template ID search string not found.");
            return;
        }

        let nend = data.indexOf(")", nstart);
        if (nend === -1) {
            console.error("Closing parenthesis not found for templateId.");
            return;
        }

        templateId = Number(data.slice(nstart + nsearch.length, nend));
        console.log(`Template ID: ${templateId}`);
        
        search = "s.authorUserId=Number(";
        start = data.indexOf(search);
        if (start === -1) {
            console.error("Author User ID search string not found.");
            return;
        }

        end = data.indexOf(")", start);
        if (end === -1) {
            console.error("Closing parenthesis not found for authorUserId.");
            return;
        }

        authorUserId = Number(data.slice(start + search.length, end));
        console.log('Author User ID:', authorUserId);
    } catch (error) {
        console.error('Axios Get Error:', error.message);
        console.log('Axios Get URL: ' + url);
    }

    let score;
    let time;
    let name;
    if (func != 2 && func != 4) {
        score = await prompt('Score: ');
        time = await prompt("Time (EX: 12.345): ");
        time = parseFloat(time).toFixed(3);
        time = time.split('.')[0] + time.split('.')[1].padEnd(3, '0');
        time = time.replace('.', '');
    }

    if (func == 1) {
        name = await prompt('Name: ');
        leaderboard(url, score, time, 'addentry', templateId, name);
    } else if (func == 2) {
        leaderboard(url, null, null, 'getentries', templateId);
    } else if (func == 3) {
        leaderboard(url, score, time, 'getentryrank', templateId);
    } else if (func == 4) {
        time = "00001";
        score = 69420;
        let activityId = url.split('/')[4];
        name = await prompt('Name to flood leaderboard with: ');

        const paramsJson = {
            activityId: activityId,
            templateId: templateId,
            authorUserId: authorUserId
        };

        let leaderboardStats = await leaderboard(url, score, time, 'getoption', templateId, null, paramsJson);
        
        if (leaderboardStats) {
            leaderboardStats = parseLeaderboardOptions(leaderboardStats);
            if (leaderboardStats && leaderboardStats.EntryCount) {
                for (let i = 0; i < leaderboardStats.EntryCount; i++) {
                    leaderboard(url, score, time, 'addentry', templateId, `${name}${i}`);
                }
                console.log('Leaderboard Flooded!')
            } else {
                console.log('No entries to flood or invalid leaderboard data.');
            }
        } else {
            console.log('Could not retrieve leaderboard options.');
        }
    }
})();
