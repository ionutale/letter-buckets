# 06: The validators catch what they claim, and the docs match reality

**What to build:** The release checks should fail when something is actually wrong and pass only when it is right. Today alternate narrators are never opened, manifests silently drop files, an empty generator run exits successfully, the gloss fallback can draw the wrong word, the download order is never asserted, the LCP budget never runs, and the preview server answers 200 with HTML for missing assets. The README and design notes are also stale.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every alternate narrator clip is opened and duration-checked (`D04`)
- [ ] The manifest builder asserts an expected file count before writing (`D03`)
- [ ] A generator run that would produce nothing fails loudly (`D07`)
- [ ] A missing gloss for a package word falls back to that word, never to a Package 1 gloss (`D06`)
- [ ] A test asserts the download order, not just the counts (`D08`)
- [ ] The LCP budget is measured and enforced (`D09`)
- [ ] The preview server returns 404 for missing assets so E2E status assertions are meaningful (`D10`)
- [ ] Asset validation uses the active package's paths (`B04`)
- [ ] Theme prompts are checked against their words so a swapped word cannot leave a stale scene (`B06`)
- [ ] README inventory, the download spec's service-worker claim and the manifest ordering description match the code (`D11`, `D12`, `D13`)
- [ ] Word art progress and ETA no longer hardcode 750 (`D14`)
