<script lang="ts">
	/**
	 * Gravity falling, day by day, as the simulation actually computed it.
	 *
	 * Not a curve drawn between a start and an end point: every sample is an
	 * hour of yeast eating sugar, so the shape is the shape. A fast start and a
	 * long tail, a stall that flattens early, a diastatic strain still creeping
	 * down after a fortnight — they are all visible because they all happened.
	 */
	import type { FermentationKinetics } from '$lib/brewing/fermentationKinetics';
	import { pointsToSg } from '$lib/brewing/calculations';

	let { kinetics }: { kinetics: FermentationKinetics } = $props();

	const uid = $props.id();
	const fillId = `ferm-${uid}`;

	const W = 300;
	const H = 90;

	const days = $derived(kinetics.curve.at(-1)?.day ?? 1);
	const start = $derived(kinetics.curve[0]?.points ?? 1);

	const x = (day: number) => (days > 0 ? (day / days) * W : 0);
	// Gravity starts high and falls, so high points sit at the top of the box.
	const y = (points: number) => (start > 0 ? H * 0.04 + (1 - points / start) * H * 0.92 : 0);

	const path = $derived(
		kinetics.curve
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day).toFixed(1)} ${y(p.points).toFixed(1)}`)
			.join(' ')
	);
	const area = $derived(`${path} L ${W} ${H} L 0 ${H} Z`);

	/** The day the beer was within a point of where it finished. */
	const settled = $derived.by(() => {
		const end = kinetics.curve.at(-1)?.points ?? 0;
		return kinetics.curve.find((p) => p.points - end < 1)?.day ?? days;
	});
</script>

<!-- preserveAspectRatio: the box stretches to the container rather than
     being letterboxed inside it, so the curve uses the full width. -->
<figure class="m-0">
	<svg
		viewBox="0 0 {W} {H}"
		preserveAspectRatio="none"
		class="h-24 w-full"
		role="img"
		aria-label="Gravity falling from {pointsToSg(start).toFixed(
			3
		)} over {days} days, most of it done by day {settled}."
	>
		<defs>
			<linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="var(--color-hop)" stop-opacity="0.28" />
				<stop offset="100%" stop-color="var(--color-hop)" stop-opacity="0" />
			</linearGradient>
		</defs>
		<path d={area} fill="url(#{fillId})" />
		<path
			d={path}
			fill="none"
			stroke="var(--color-hop)"
			stroke-width="2"
			vector-effect="non-scaling-stroke"
			stroke-linejoin="round"
		/>
	</svg>
	<figcaption
		class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-subtle"
	>
		<span class="tnum">{pointsToSg(start).toFixed(3)} at the pitch</span>
		<span class="text-muted">most of it done by day {settled}</span>
		<span class="tnum">day {days}</span>
	</figcaption>
</figure>
