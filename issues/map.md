# Map: Letter Buckets follow-up

## Destination

Finish the per-word clue game, add progress metrics and three hint-budget modes,
validate it, deploy it to Cloudflare, and publish the source in a public GitHub
repository.

## Tickets

- [01 — Interaction polish acceptance](01-interaction-polish-acceptance.md)
- [02 — Progress metrics](02-progress-metrics.md)
- [03 — Game modes and hint budgets](03-game-modes-and-hint-budgets.md)
- [04 — Clue-image QA](04-clue-image-qa.md)
- [05 — Release validation](05-release-validation.md) (blocked by 01–04)
- [06 — Publish to Cloudflare and a public repo](06-publish.md) (blocked by 05)
- [07 — Package 2 art and audio](07-package-2-assets.md)
- [08 — Package 3 art and audio](08-package-3-assets.md)

## Prompt disposition

| #    | User prompt                                                | Ticket                   |
| ---- | ---------------------------------------------------------- | ------------------------ |
| 1    | Each bucket needs an image of its word                     | Closed feature; QA in 04 |
| 2    | 1/2/3/4 missing letters + image in the missing-letter view | Closed                   |
| 3    | Missing letters in random places                           | Closed                   |
| 4    | Go                                                         | —                        |
| 5    | I want to test it                                          | 05                       |
| 6    | Who is using the GPU                                       | —                        |
| 7    | Solved/unsolved words are not clear enough                 | 01                       |
| 8    | Deploy to Cloudflare and push to a public repo             | 06                       |
| 9–19 | Specific clue-image corrections                            | Closed; ongoing QA in 04 |
| 11   | Audio too fast; add motion; regional accents               | 01                       |
| 17   | Repeat-audio button while solving                          | 01                       |
| 20   | Metrics view + easy/medium/hard modes                      | 02 + 03                  |
| 21   | List the last 30 prompts                                   | This map                 |

## 2026-11-17 code review

Four review passes wrote 45 evidence-backed tickets into `issues/review/`, one
file per finding, prefixed by area: `A` audio/PWA/build, `B` storage/game,
`C` routes/components/a11y, `D` scripts/tests/docs.

Current state, shipped features and the prioritised backlog live in
[`docs/status.md`](../docs/status.md).
