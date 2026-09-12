<script lang="ts">
	import type { FermentationStep, Yeast } from '$lib/brewing/types';

	let {
		steps,
		yeast,
		pitchTempC,
		coldCrash
	}: { steps: FermentationStep[]; yeast: Yeast; pitchTempC: number; coldCrash: boolean } = $props();

	const totalDays = $derived(
		Math.max(1, steps.reduce((sum, s) => sum + Math.max(0, s.days), 0) + (coldCrash ? 2 : 0))
	);
	const temps = $derived([pitchTempC, ...steps.map((s) => s.tempC), coldCrash ? 2 : pitchTempC]);
	const minTemp = $derived(Math.min(yeast.tempMinC, ...temps) - 2);
	const maxTemp = $derived(Math.max(yeast.tempMaxC, ...temps) + 2);

	const W = 100;
	const H = 100;

	const x = (day: number) => (day / totalDays) * W;
	const y = (temp: number) => H - ((temp - minTemp) / Math.max(1, maxTemp - minTemp)) * H;

	/** A step chart: temperature holds through each step, then jumps. */
	const path = $derived.by(() => {
		let day = 0;
		const points: string[] = [`M ${x(0)} ${y(pitchTempC)}`];
		for (const s of steps) {
			points.push(`L ${x(day)} ${y(s.tempC)}`);
			day += Math.max(0, s.days);
			points.push(`L ${x(day)} ${y(s.tempC)}`);
		}
		if (coldCrash) {
			points.push(`L ${x(day + 1)} ${y(2)}`);
			points.push(`L ${x(totalDays)} ${y(2)}`);
		}
		return points.join(' ');
	});

	const bandTop = $derived(y(yeast.tempMaxC));
	const bandHeight = $derived(Math.max(1, y(yeast.tempMinC) - y(yeast.tempMaxC)));
	const summary = $derived(
		`Pitched at ${pitchTempC} °C, then ${steps
			.map((s) => `${s.days} days at ${s.tempC} °C`)
			.join(
				', '
			)}${coldCrash ? ', then cold crashed to 2 °C' : ''}. ${yeast.name} prefers ${yeast.tempMinC} to ${yeast.tempMaxC} °C.`
	);
</script>

<figure class="m-0 rounded-lg bg-surface p-4 ring-1 ring-line">
	<div class="flex gap-3">
		<div
			class="flex flex-col justify-between py-0.5 text-[0.625rem] text-subtle"
			aria-hidden="true"
		>
			<span class="tnum">{Math.round(maxTemp)} °C</span>
			<span class="tnum">{Math.round(minTemp)} °C</span>
		</div>
		<svg
			viewBox="0 0 {W} {H}"
			preserveAspectRatio="none"
			class="h-32 flex-1"
			role="img"
			aria-label={summary}
		>
			<rect
				x="0"
				y={bandTop}
				width={W}
				height={bandHeight}
				fill="var(--color-hop-dim)"
				opacity="0.45"
			/>
			<path
				d={path}
				fill="none"
				stroke="var(--color-amber)"
				stroke-width="2"
				vector-effect="non-scaling-stroke"
				stroke-linejoin="round"
			/>
		</svg>
	</div>
	<figcaption class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.625rem] text-subtle">
		<span class="flex items-center gap-1.5">
			<span class="h-2 w-3 rounded-sm bg-hop-dim" aria-hidden="true"></span>
			{yeast.name}'s comfortable range
		</span>
		<span class="flex items-center gap-1.5">
			<span class="h-0.5 w-3 bg-amber" aria-hidden="true"></span>
			your schedule
		</span>
		<span class="tnum ms-auto">{totalDays} days</span>
	</figcaption>
</figure>
