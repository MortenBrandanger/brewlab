<script lang="ts">
	/**
	 * The sparge: rinse the grain until the kettle reaches its mark.
	 *
	 * The first runnings drain into the kettle on their own; then you pour hot
	 * rinse water over the bed and the tap keeps running after you stop, by
	 * however much is still standing in the tun. When to close the tap is the
	 * decision, and it is judged as it would be: `applyLog` boils what you
	 * collected, so more than the mark is a weaker beer and more of it, less is
	 * a stronger one and less of it.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { day } from '../day.svelte';
	import { newRunoff, stepRunoff, tapFlow, firstRunningsL } from '../lauter';
	import { LauterScene } from '../lauterScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Litres a second off the pot while you hold it tipped. */
	const POUR_LPS = 1.6;
	/** The rinse water is hot enough to keep the sugar runny and stop the enzymes. */
	const RINSE_C = 76;

	const plan = day.plan!;
	const wort = srmToCss(simulate(plan).metrics.srm);
	const mashWater = day.log.mashWaterL ?? day.mashWaterL;
	const first = firstRunningsL(mashWater, day.grainKg);
	const mark = plan.preBoilVolumeL;
	const rinse = day.spargeWaterL;
	/** The pot holds more than the card asks for, so it is possible to overdo it. */
	const potCap = Math.ceil(rinse * 1.35);
	const bench = new LauterScene('sparge');

	let pouring = $state(false);
	let run = $state(newRunoff(mashWater, day.grainKg, potCap));
	let flow = $state(0);

	const gap = $derived(run.collectedL - mark);

	function frame(calm: boolean) {
		return {
			mode: 'sparge' as const,
			wort,
			grainKg: day.grainKg,
			headL: run.headL,
			flowLps: flow,
			cloud: 0,
			sparge: {
				potL: run.potL,
				potCapL: potCap,
				pouring,
				kettleL: run.collectedL,
				markL: mark,
				thin: run.spargedL / Math.max(0.1, first + run.spargedL)
			},
			calm
		};
	}

	function tick(dt: number, _input: PointerInput, calm: boolean) {
		run = stepRunoff(run, dt, pouring ? POUR_LPS : 0);
		flow = tapFlow(run.headL);
		bench.update(dt, frame(calm));
	}
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="The mash tun on its crate, running into the boil kettle below. A pot of hot rinse water stands ready on the bench; the kettle has a fill mark."
		/>
	{/snippet}
	{#snippet controls()}
		<HoldButton bind:held={pouring} disabled={run.potL <= 0.01}>
			{run.potL <= 0.01 ? 'The pot is empty' : 'Hold to pour rinse water'}
		</HoldButton>
	{/snippet}
	{#snippet readout()}
		In the kettle: {run.collectedL.toFixed(1)} L of the card's {mark} L.
		{#if run.headL > 0.3}
			Still {run.headL.toFixed(1)} L running out of the tun.
		{/if}
		{#if Math.abs(gap) < 0.4}
			On the mark.
		{:else if gap > 0}
			{gap.toFixed(1)} L over: the beer will be a little weaker, and there will be more of it.
		{:else if run.headL < 0.3}
			{(-gap).toFixed(1)} L under: less beer, and a little stronger.
		{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Rinse water</dt>
			<dd class="tnum">{rinse.toFixed(1)} L at {RINSE_C} °C</dd>
			<dt class="text-muted">Into the kettle</dt>
			<dd class="tnum">{mark} L</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {Math.abs(gap) < 0.6 ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			disabled={run.collectedL < 1}
			onclick={() => {
				const collectedL = Math.round(run.collectedL * 10) / 10;
				day.kettle = { wortL: collectedL, tempC: 70, sinceFlameoutMin: 0 };
				day.finish({ collectedL });
			}}
		>
			Close the tap
		</button>
	{/snippet}
</StepFrame>
