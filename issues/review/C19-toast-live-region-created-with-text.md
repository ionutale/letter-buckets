# Locked-level message is a live region created together with its text

- **Severity:** low
- **Area:** a11y
- **Location:** `src/routes/levels/+page.svelte:105`
- **Confidence:** likely

## What happens

The only feedback for a locked level is delivered by inserting a `role="status"` paragraph that already contains the message. A live region must exist in the accessibility tree before its content changes to be reliably announced, so screen-reader users who tap a locked level — or arrive with `?locked=1` — can get no feedback at all and are left on an unchanged screen.

## Evidence

```svelte
105 {#if toast}
	106 <p class="toast" role="status">{toast}</p>
	107
{/if}
```

The element and its text appear in the same DOM update. The redirect branch fills `toast` during `onMount` (lines 30-36), i.e. before the region is even rendered, and the click branch (lines 59-64) sets the text at the same moment the node is created. There is no persistent live region on the route, and the map itself does not change when a locked level is tapped.

## Suggested fix

Keep an always-rendered, visually hidden status node — `<p class="sr-only" role="status" aria-live="polite">{toast}</p>` — and render the visible pill separately, so only the text of an existing region changes.

## Test

In Playwright, install a `MutationObserver` on a persistent `[role="status"]` before clicking a locked level and assert it fires with the message; verify manually with VoiceOver that both the tap and the `?locked=1` arrival are spoken.
