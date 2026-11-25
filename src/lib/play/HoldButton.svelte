<script lang="ts">
	/**
	 * A button you hold down for as long as the action lasts: pouring grain,
	 * running a tap, squeezing a spray bottle. Space and Enter hold it from the
	 * keyboard the same way a finger does.
	 */
	import type { Snippet } from 'svelte';

	let {
		held = $bindable(false),
		disabled = false,
		children
	}: { held?: boolean; disabled?: boolean; children: Snippet } = $props();

	const release = () => (held = false);
	// A button that becomes disabled mid-press never sees the pointer lift.
	$effect(() => {
		if (disabled) held = false;
	});
</script>

<button
	type="button"
	class="btn btn-ghost min-h-12 touch-none px-5 text-base select-none data-[held=true]:border-amber data-[held=true]:bg-ui-active"
	data-held={held}
	aria-pressed={held}
	{disabled}
	onpointerdown={(e) => {
		if (disabled) return;
		// Capture can fail for a pointer the browser no longer tracks; the press still counts.
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* nothing to capture */
		}
		held = true;
	}}
	onpointerup={release}
	onpointercancel={release}
	onkeydown={(e) => {
		if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
			e.preventDefault();
			held = true;
		}
	}}
	onkeyup={(e) => {
		if (e.key === ' ' || e.key === 'Enter') release();
	}}
	onblur={release}
	oncontextmenu={(e) => e.preventDefault()}
>
	{@render children()}
</button>
