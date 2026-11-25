<script lang="ts">
	/**
	 * The gas knob. You turn it; the flame follows a moment later.
	 *
	 * A rotary control rather than a slider because that is the thing in your
	 * hand, and because a quarter turn reads as "about half" without a number
	 * on it — which is how anybody actually sets a flame. Drag round it, or use
	 * the arrow keys; Home is off and End is full.
	 */
	let { value = $bindable(0), label = 'Gas' }: { value?: number; label?: string } = $props();

	const id = $props.id();
	let knob = $state<HTMLDivElement>();
	let dragging = false;

	/** Off at the bottom left, full at the bottom right: a 270° sweep. */
	const angle = $derived(-135 + value * 270);

	function fromPointer(e: PointerEvent) {
		const rect = knob!.getBoundingClientRect();
		const dx = e.clientX - (rect.left + rect.width / 2);
		const dy = e.clientY - (rect.top + rect.height / 2);
		// 0° straight up, clockwise positive.
		let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
		if (deg < -135 && deg > -180) deg = -135;
		if (deg > 135) deg = 135;
		value = Math.max(0, Math.min(1, (deg + 135) / 270));
	}

	const words = $derived(
		value < 0.02 ? 'off' : value < 0.3 ? 'low' : value < 0.7 ? 'medium' : 'full'
	);
</script>

<div class="flex items-center gap-3">
	<div
		bind:this={knob}
		id="{id}-knob"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(value * 100)}
		aria-valuetext={words}
		class="relative grid h-16 w-16 shrink-0 cursor-grab touch-none place-items-center rounded-full bg-ui shadow-[var(--shadow-float)] select-none active:cursor-grabbing"
		onpointerdown={(e) => {
			knob?.setPointerCapture(e.pointerId);
			dragging = true;
			fromPointer(e);
		}}
		onpointermove={(e) => dragging && fromPointer(e)}
		onpointerup={() => (dragging = false)}
		onpointercancel={() => (dragging = false)}
		onkeydown={(e) => {
			const step = e.shiftKey ? 0.2 : 0.05;
			if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = Math.min(1, value + step);
			else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = Math.max(0, value - step);
			else if (e.key === 'Home') value = 0;
			else if (e.key === 'End') value = 1;
			else return;
			e.preventDefault();
		}}
	>
		<!-- The sweep, so you can see how far round it is. -->
		<svg viewBox="0 0 64 64" class="pointer-events-none absolute inset-0" aria-hidden="true">
			<circle
				cx="32"
				cy="32"
				r="29"
				fill="none"
				stroke="var(--color-line)"
				stroke-width="3"
				stroke-dasharray="136.6 45.5"
				transform="rotate(135 32 32)"
				stroke-linecap="round"
			/>
			<circle
				cx="32"
				cy="32"
				r="29"
				fill="none"
				stroke="var(--color-scene-flame)"
				stroke-width="3"
				stroke-dasharray="{136.6 * value} 200"
				transform="rotate(135 32 32)"
				stroke-linecap="round"
			/>
		</svg>
		<div
			class="h-11 w-11 rounded-full bg-linear-to-b from-ui-active to-surface ring-1 ring-line-strong"
			style="transform: rotate({angle}deg)"
		>
			<div class="mx-auto mt-1 h-4 w-1.5 rounded-full bg-fg"></div>
		</div>
	</div>
	<div class="text-sm">
		<div class="field-label">{label}</div>
		<div class="text-fg capitalize">{words}</div>
	</div>
</div>
