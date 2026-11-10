This is a Node.JS script made to give yourself 
any score you want in any <b>leaderboard</b> enabled
WordWall game.

Install Node.js and pnpm, then run:

```sh
pnpm install
pnpm start
```

Paste a full HTTPS game URL, such as `https://wordwall.net/resource/55028459`.
Localized resource URLs also work. Scores must be nonnegative integers; enter
time in seconds, such as `12.345`. The script converts seconds to milliseconds.

Run the CLI regression checks with `pnpm test`. Tests mock network requests
and do not submit entries to Wordwall.

WARNING: This script is probably against the ToS. I am not liable for any trouble you get into. (i hope)
