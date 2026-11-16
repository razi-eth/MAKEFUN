# MAKEFUN

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/razi-eth/MAKEFUN/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/razi-eth/MAKEFUN/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only frontend for make.fun, made of static files on make.fun's public API: the live bounty board with each bounty's live pot, entry fee and time left; a bounty's page with its rules and rewards; its leaderboard; and an account's public profile — each reachable by a link and by its own URL.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no sign-in, no writes: the app only reads `https://make.fun/api` (GET) and caches answers for a minute with ETag revalidation.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
