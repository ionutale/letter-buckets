# Coach tip for the open word panel sits outside the modal dialog

- **Severity:** low
- **Area:** a11y
- **Location:** `src/lib/components/CoachMark.svelte:12`
- **Confidence:** likely

## What happens

Coach step 2 explains how to move a letter and is displayed while the word panel is open, but it is a sibling of the panel, not a child, and it is stacked above it. Because the panel is `aria-modal="true"`, assistive technology confines users to the dialog: the tip may never be announced, and its "Got it" button is outside the panel's focus trap, so a keyboard user cannot reach it while the panel is open.

## Evidence

```svelte
12	<aside class="coach" class:top={step === 2} role="status">
...
26	<button type="button" onclick={onclose}>{m.got_it()}</button>
```

```css
35	z-index: 40;   /* .coach */
```

versus `WordPanel.svelte:398` `.panel { z-index: 20 }`. The level page renders `<WordPanel>` (line 246-248) and then `<CoachMark>` (line 259-261) as siblings, and the step-2 transition fires exactly while the panel is open:

```ts
67	$effect(() => {
68		if (coachStep === 1 && session?.openIndex != null) coachStep = 2;
69	});
```

`role="status"` is also a live-region role that should only carry text, not an interactive button, so the tip is announced as passive status content while it actually blocks part of the dialog.

## Suggested fix

Render the step-2 tip inside the word panel (pass the coach step down and place it in the panel's grid) so it is part of the `aria-modal` subtree and its button is inside the focus trap; or make it a proper `role="dialog"` with its own Escape/close handling. Keep `role="status"` for text-only hints.

## Test

Open a bucket on a fresh save (coach done = false), assert the "Got it" button is a descendant of `[role="dialog"]`, and Tab through the open panel to confirm it can be reached and activated by keyboard.
