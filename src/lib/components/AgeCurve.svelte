<script lang="ts">
	import type { AgePoint } from '$lib/brewing/types';
	import { bestBefore } from '$lib/brewing/explain';

	let { curve }: { curve: AgePoint[] } = $props();

	const uid = $props.id();
	const fillId = `age-${uid}`;

	const W = 300;
	const H = 110;
	const maxWeek = $derived(curve.at(-1)?.week ?? 52);
	/*
	 * A fixed axis, not one fitted to the data. Auto-ranging drew a beer that
	 * drifts two points and one that collapses forty with the same dramatic
	 * slope, so the chart said nothing about how much ageing actually costs.
	 */
	const low = 0;
	const high = 100;

	const x = (week: number) => (week / maxWeek) * W;
	const y = (quality: number) => H - ((quality - low) / Math.max(1, high - low)) * H;

	const path = $derived(
		curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.week)} ${y(p.quality)}`).join(' ')
	);
	const area = $derived(`${path} L ${W} ${H} L 0 ${H} Z`);
	const peak = $derived(bestBefore(curve));
</script>

<figure class="m-0">
	<svg
		viewBox="0 0 {W} {H}"
		class="h-28 w-full"
		role="img"
		aria-label="Predicted drinking quality out of 100, from packaging to one year, peaking at {peak.quality} around week {peak.week}."
	>
		<defs>
			<linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="var(--color-copper)" stop-opacity="0.35" />
				<stop offset="100%" stop-color="var(--color-copper)" stop-opacity="0" />
			</linearGradient>
		</defs>
		<path d={area} fill="url(#{fillId})" />
		<path
			d={path}
			fill="none"
			stroke="var(--color-copper-text)"
			stroke-width="2"
			vector-effect="non-scaling-stroke"
			stroke-linejoin="round"
		/>
		<circle cx={x(peak.week)} cy={y(peak.quality)} r="4" fill="var(--color-amber)" />
	</svg>
	<figcaption
		class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-subtle"
	>
		<span>packaged</span>
		<span class="text-muted">best around week {peak.week}, at {peak.quality}/100</span>
		<span>1 year</span>
	</figcaption>
</figure>

<ul class="mt-2 flex flex-col gap-1">
	{#each curve.filter((p) => p.note) as point (point.week)}
		<li class="flex gap-2 text-xs">
			<span class="tnum w-14 shrink-0 text-subtle">week {point.week}</span>
			<span class="text-muted">{point.note}</span>
		</li>
	{/each}
</ul>
