<script lang="ts">
	/**
	 * Cool it down to pitching temperature.
	 *
	 * The chiller follows Newton's law of cooling towards the tap, so the first
	 * forty degrees go quickly and the last few take patience. What is logged
	 * is what the engine reads: minutes on the chiller, and the temperature
	 * you actually pitched at. A hot stand before the chiller goes in is not
	 * counted — the recipes count chilling from when it starts, and wort above
	 * about 60 °C is too hot for anything to grow in. The slow, risky part is
	 * the chill itself.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { getYeast } from '$lib/brewing/ingredients';
	import { day } from '../day.svelte';
	import { newChill, outletC, stepChill } from '../chill';
	import { ChillScene } from '../coldChill';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import GasKnob from '../GasKnob.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second. */
	const SPEED = 1.5;
	const HURRY = 4;

	const plan = day.plan!;
	const target = plan.chill.pitchTempC;
	/** Above this the engine marks the pitch as hot: two degrees past the strain's top end. */
	const hotPitch = (getYeast(plan.fermentation.yeastId)?.tempMaxC ?? 24) + 2;
	// The colour of the beer actually being made, not the card's.
	const wort = srmToCss(day.result?.metrics.srm ?? 6);
	const startC = day.kettle.tempC > 30 ? day.kettle.tempC : 95;
	const wortL = day.kettle.wortL > 1 ? day.kettle.wortL : plan.batchVolumeL;
	const before = day.kettle.sinceFlameoutMin;

	let flow = $state(0);
	let stirring = $state(false);
	let hurry = $state(false);
	let reading = $state(startC);
	let outlet = $state(startC);
	let elapsed = $state(0);
	let cooler = newChill(startC, wortL);
	const bench = new ChillScene(startC);

	function frame(calm: boolean) {
		return { chill: cooler, elapsed: Math.floor(cooler.minute), targetC: target, wort, calm };
	}

	function tick(dt: number, _input: PointerInput, calm: boolean) {
		cooler = stepChill(
			{ ...cooler, flow, stir: stirring ? 1 : 0 },
			dt * SPEED * (hurry ? HURRY : 1)
		);
		bench.update(dt, frame(calm));
		const r = Math.round(cooler.tempC * 10) / 10;
		if (r !== reading) reading = r;
		const o = Math.round(outletC(cooler));
		if (o !== outlet) outlet = o;
		const m = Math.floor(cooler.minute);
		if (m !== elapsed) elapsed = m;
	}

	const gap = $derived(reading - target);

	function finish() {
		day.kettle = { ...day.kettle, tempC: cooler.tempC, sinceFlameoutMin: before + cooler.minute };
		day.finish({ chill: { minutes: cooler.minute, pitchTempC: cooler.tempC } });
	}
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, pal, frame(calm))}
			pan={day.step.pan}
			label="The kettle off the heat with a copper cooling coil in the hot wort. A green hose runs from the cold tap into the coil and another from the coil into a bucket. A dial thermometer and a kitchen timer stand beside it."
		/>
	{/snippet}
	{#snippet controls()}
		<GasKnob bind:value={flow} label="Cold tap" />
		<div class="flex flex-wrap items-center gap-2">
			<HoldButton bind:held={stirring}>Hold to move the coil</HoldButton>
			<HoldButton bind:held={hurry}>Hold to wait faster</HoldButton>
		</div>
	{/snippet}
	{#snippet readout()}
		The wort is at {reading.toFixed(1)} °C, {elapsed} minutes on the chiller.
		{#if flow > 0.01}
			The water out of the coil is {outlet > 45 ? 'hot' : outlet > 25 ? 'warm' : 'cool'} ({outlet} °C).
		{/if}
		{#if Math.abs(gap) < 1}
			That is the card's pitching temperature.
		{:else if reading > 40}
			Still warm and unprotected. The longer it sits like this, the more chance germs get in first.
		{:else if reading > hotPitch}
			Too warm for this yeast. Pitched this hot, it makes a hot, solvent taste that never ages out.
		{:else if gap > 0}
			{gap.toFixed(1)} °C above the card, but still within what this yeast can take.
		{:else}
			{(-gap).toFixed(1)} °C below the card.
		{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Pitch at</dt>
			<dd class="tnum">{target} °C</dd>
			<dt class="text-muted">Chill in</dt>
			<dd class="tnum">{plan.chill.minutes} min</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {Math.abs(gap) < 2 ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			disabled={reading > 45}
			onclick={finish}
		>
			Cool enough, into the fermenter
		</button>
	{/snippet}
</StepFrame>
