<script lang="ts">
	import { scoreBand } from '$lib/brewing/scoring';

	let {
		label,
		value,
		size = 'md'
	}: { label: string; value: number; size?: 'md' | 'lg' } = $props();

	const radius = $derived(size === 'lg' ? 42 : 30);
	const circumference = $derived(2 * Math.PI * radius);
	const dash = $derived((value / 100) * circumference);
	const stroke = $derived(
		value >= 76
			? 'var(--color-hop)'
			: value >= 55
				? 'var(--color-amber)'
				: 'var(--color-danger-text)'
	);
	const box = $derived(size === 'lg' ? 100 : 72);
</script>

<div class="flex flex-col items-center gap-1.5">
	<div class="relative" style="width:{box}px;height:{box}px">
		<svg viewBox="0 0 {box} {box}" class="h-full w-full -rotate-90" aria-hidden="true">
			<circle
				cx={box / 2}
				cy={box / 2}
				r={radius}
				fill="none"
				stroke="var(--color-ui-active)"
				stroke-width="7"
			/>
			<circle
				cx={box / 2}
				cy={box / 2}
				r={radius}
				fill="none"
				{stroke}
				stroke-width="7"
				stroke-linecap="round"
				stroke-dasharray="{dash} {circumference}"
				class="transition-[stroke-dasharray] duration-300 ease-out"
			/>
		</svg>
		<span
			class="tnum absolute inset-0 flex items-center justify-center font-display font-semibold"
			class:text-lg={size === 'lg'}
			class:text-base={size !== 'lg'}
		>
			{value}<span class="text-xs font-normal text-subtle">/100</span>
		</span>
	</div>
	<span class="text-center text-xs text-muted">{label}</span>
	<span class="sr-only">{value} out of 100, {scoreBand(value)}</span>
</div>
