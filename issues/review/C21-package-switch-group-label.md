# Package switch group is labelled "Package 1"

- **Severity:** low
- **Area:** a11y
- **Location:** `src/routes/+page.svelte:147`
- **Confidence:** certain

## What happens

The container that groups the three package buttons carries `aria-label={m.package_1()}`. For a sighted user nothing is wrong, but the label describes one of the buttons rather than the group, and it never changes when Package 2 or 3 becomes active. Because the element has no role, the label is dropped entirely, so the group is anonymous to assistive technology.

## Evidence

```svelte
147	<div class="package-switch" aria-label={m.package_1()}>
148		<button
149			type="button"
150			class:active={packageId === 'p1'}
151			aria-pressed={packageId === 'p1'}
152			onclick={() => selectPackage('p1')}
153		>
154			{m.package_1()}
```

`aria-label` on a plain `div` (generic role) is prohibited and ignored (same defect class as `levels/[level]/+page.svelte:227` and `WordPanel.svelte:366`). If a role is added, the constant "Package 1" label would then be wrong for the other two states — the group needs its own message.

## Suggested fix

`<div class="package-switch" role="group" aria-label={m.packages()}>` with a new `packages` message ("Packages"/"Pachete"/"Pacchetti"/"Pakete"/"Пакеты"). The individual buttons already announce their own names and `aria-pressed` state.

## Test

`expect(page.locator('.package-switch')).toHaveAttribute('role', 'group')` and `getByRole('group', { name: /packages/i })` resolves; after switching to Package 2 the group name is unchanged and still correct, while `aria-pressed` moves between the buttons.
