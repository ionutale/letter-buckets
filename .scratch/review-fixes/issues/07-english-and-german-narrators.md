# 07: English and German narrators sound native

**What to build:** English and German get the same treatment Italian received. Both currently use the `serena` preset, which carries a foreign accent on Italian and is likely doing the same here. Each language gets a native narrator, the accent instruction is dropped where the voice supplies the accent, and the clips are regenerated for all three packages.

**Blocked by:** 01 (Asset regeneration must not risk truncated files)

**Status:** ready-for-agent

- [ ] Two or more candidate voices are designed per language and compared on the same words before a choice
- [ ] The chosen voice is used by the generator for that language, with its instruction reduced to pacing only
- [ ] All clips for the language are regenerated across packages 1-3 and pass the validators
- [ ] Manifests reflect the new clips and the download sizes stay within budget
