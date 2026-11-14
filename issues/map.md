# Map: Letter Buckets follow-up

## Destination

Finish the per-word clue game with the new difficulty curve, audio pacing, motion,
progress metrics and three hint-budget modes; validate it; deploy it to Cloudflare;
publish the source in a public GitHub repository.

## Open

- [004 — Solved vs unsolved buckets](004-solved-vs-unsolved-buckets.md) — implementation in progress.
- [006 — Audio pacing and regional accents](006-audio-pacing-and-accents.md) — regeneration in progress.
- [007 — Calm motion pass](007-motion-pass.md) — implementation in progress.
- [008 — Repeat-word button](008-repeat-word-button.md) — implementation in progress.
- [009 — Progress metrics](009-progress-metrics.md) — ready to build.
- [010 — Game modes and hint budgets](010-game-modes-and-hint-budgets.md) — ready to build.
- [011 — Clue-image QA](011-clue-image-qa.md) — review in progress.
- [012 — Release validation](012-release-validation.md) — blocked by 006, 007, 008 and 011.
- [013 — Cloudflare deploy and public repo](013-cloudflare-public-repo.md) — blocked by 012.

## Closed

- [001 — Per-word clue images](001-per-word-clue-images.md)
- [002 — Gap ramp and clue in the word panel](002-gap-ramp-and-panel-clue.md)
- [003 — Random stable gap positions](003-random-gap-positions.md)
- [005 — Specific clue-image corrections](005-clue-image-corrections.md)

## Prompt disposition

| # | User prompt | Disposition |
|---|---|---|
| 1 | Each bucket needs an image of its word | 001 (closed), QA in 011 |
| 2 | 1/2/3/4 missing letters by level position + image in the missing-letter view | 002 (closed) |
| 3 | Missing letters in random places | 003 (closed) |
| 4 | Go | no ticket |
| 5 | I want to test it | 012 |
| 6 | Who is using the GPU | no ticket |
| 7 | Solved/unsolved words are not clear enough | 004 |
| 8 | Deploy to Cloudflare and push to a public repo | 013 |
| 9 | “Latte” is a cappuccino | 005 (closed) |
| 10 | “Seme” is a leaf | 005 (closed) |
| 11 | Audio too fast; add motion; configure voice language and regional accent | 006 + 007 |
| 12 | “Moneta” should be a 2 euro coin; “cura” is wrong | 005 (closed) |
| 13 | “Binario” should not be a carriage | 005 (closed) |
| 14 | “Stazione” should not be a carriage | 005 (closed) |
| 15 | “Freddo” should be snow and wind | 005 (closed) |
| 16 | “Notte” wrong; “stelle” needs multiple stars | 005 (closed) |
| 17 | Repeat-audio button while solving | 008 |
| 18 | “Quadro” should be a rectangle | 005 (closed) |
| 19 | “Regina” should look like a queen | 005 (closed) |
| 20 | Metrics view + easy/medium/hard hint modes | 009 + 010 |
| 21 | List the last 30 prompts | this map |
