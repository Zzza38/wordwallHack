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
    // Check if the data is a string and attempt to replace single quotes with double quotes for valid JSON
    if (typeof leaderboardData === 'string') {
        try {
            // Replace single quotes with double quotes
            leaderboardData = leaderboardData.replace(/'/g, '"');
            // Parse the JSON string
            leaderboardData = JSON.parse(leaderboardData);
        } catch (error) {
            console.error('Failed to parse leaderboard data:', error);
            return [];
        }
    }

    // Check if the input is now a valid array and not empty
    if (!Array.isArray(leaderboardData) || leaderboardData.length === 0) {
        console.error('Invalid leaderboard data');
        return [];
    }

    // Map over the leaderboard data to extract desired fields
    return leaderboardData.map(entry => {
        return {
            entryId: entry.EntryId,
            name: entry.Name,
            score: entry.Score,
            time: entry.Time
        };
    });
}




function leaderboard(url, score, time, leaderboardFunc, name = null, params = null, templateId = 22) {
    // Concatenate the leaderboard URL and function
    let leaderboardURL = `https://wordwall.net/leaderboardajax/${leaderboardFunc}`;

    let mode = 1;
    let activityId = url.split('/')[4];  // Extract activityId from the provided URL

    // Build the params string dynamically for form data if not provided
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
        paramsStr = params
        paramsJson = params
    }

    // Make the POST request with the provided headers and params
    if (leaderboardFunc != 'addentry') {
        const headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': 'https://wordwall.net',
            'Pragma': 'no-cache',
            'Referer': url,
            'Sec-CH-UA': '"Not)A;Brand";v="99", "Opera";v="113", "Chromium";v="127"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Wordwall-Version': '1.0.9055.15470'
        };
        axios.get(leaderboardURL, { headers, params: paramsJson }) // Use axios.get with correct params
            .then((response) => {
                if (leaderboardFunc == 'getentries') {
                    const data = parseLeaderboardData(response.data); // Use 'response' correctly
                    data.forEach(entry => {
                        console.log(`Name: ${entry.name} ||| Score: ${entry.score} ||| Time: ${entry.time/1000}`);
                    });
                } else if (leaderboardFunc === 'getentryrank') {
                    console.log(`You would be in place ${response.data}`);
                }

            })
            .catch((error) => {
                console.error('Axios Get Error:', error.message);
                console.log('Axios Get URL: ' + leaderboardURL + '?' + new URLSearchParams({ activityId, templateId }).toString());
            })
            .finally(() => rl.close()); // Close the readline interface when done
    } else {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Origin': 'https://wordwall.net',
            'Pragma': 'no-cache',
            'Referer': url,
            'Sec-CH-UA': '"Not)A;Brand";v="99", "Opera";v="113", "Chromium";v="127"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Wordwall-Version': '1.0.9055.15470'
        };
        axios.post(leaderboardURL, paramsStr, { headers }) // POST to the correct URL with params
            .then((response) => {
                console.log(`Success, added/moved ${name} into place ${response.data + 1}`);
            })
            .catch((error) => {
                console.error('Axios Post Error:', error.message);
                console.log('Axios Post URL: ' + leaderboardURL + '?' + params);
            })
            .finally(() => rl.close()); // Close the readline interface when done
    }
}

(async () => {
    console.log('Welcome to the Wordwall Hack. Please choose a function;');
    let func = await prompt('Add Entry (1), Get Leaderboard (2), Get Entry Position on Leaderboard (3), Flood Leaderboard(4): ');
    let url = await prompt('Wordwall game URL: ');
    let score;
    let time;
    let name;
    let templateId;
    if (func != 2) { // Check if func is not equal to 2
        score = await prompt('Score: ');
        time = await prompt("Time (EX: 12.345): ");
        templateId = await prompt('Template ID: ')
        time = parseFloat(time).toFixed(3);
        time = time.split('.')[0] + time.split('.')[1].padEnd(3, '0');
        time = time.replace('.', '');
    }

    // Call the leaderboard function based on user input
    if (func == 1) {
        name = await prompt('Name: ');
        leaderboard(url, score, time, 'addentry', name);
    } else if (func == 2) {
        leaderboard(url, null, null, 'getentries'); // No need to pass score and time
    } else if (func == 3) {
        leaderboard(url, score, time, 'getentryrank');
    } else if (func == 4) {
        name = await prompt('Name to flood leaderboard with: ');
        for (let i = 0; i < 10; i++) {
            leaderboard(url, score, time, 'addentry', name + i, null, templateId);
        }
    }
})();
