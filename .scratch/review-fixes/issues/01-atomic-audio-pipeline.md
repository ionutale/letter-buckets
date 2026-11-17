# 01: The audio and art pipelines cannot ship a truncated file

**What to build:** A render that is interrupted must leave nothing behind. Today a killed `generate_audio` or `generate_word_art` run leaves a partially written MP3 or WebP in the published folder, and every later run skips it because the file exists. Those truncated files pass the 0.15–3 s duration check and ship silently. The same ticket makes the release gate measure what it claims: the install size, not the deploy size, and it stops publishing local noise such as `.DS_Store`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A render writes to a temporary file and renames it into place only on success, for both word clips and word art (`D02`)
- [ ] A deliberately killed render leaves no file that a later run will skip, verified by a test that simulates the abort
- [ ] The size gate reports and asserts the precache install size alongside the deploy size (`D05`)
- [ ] `.DS_Store` and other local noise are excluded from the published build (`A09`)
- [ ] The build still fails when a genuine asset count is wrong, and the failure names the count (`D03` acceptable to fold in here if it is cheap)
