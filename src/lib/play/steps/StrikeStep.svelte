<script lang="ts">
	/**
	 * Heat the strike water.
	 *
	 * The whole skill is cutting the gas early: the pot bottom keeps delivering
	 * heat for half a minute after the knob is turned, so a brewer who waits
	 * for the number overshoots it. Nothing is rolled — the water is wherever
	 * your hand on the knob put it.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { day } from '../day.svelte';
	import { probeC, stepTun } from '../mashHeat';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import GasKnob from '../GasKnob.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second while the water heats. */
	const SPEED = 1.5;

	let flame = $state(day.tun.flame);
	let reading = $state(day.tun.tempC);
	const target = day.strikeTargetC;
	const wort = srmToCss(simulate(day.plan!).metrics.srm);
	const mash = day.mashScene;

	function frame(calm: boolean) {
		return {
			tun: day.tun,
			probeC: probeC(day.tun),
			grainTotalKg: day.grainKg,
			targetC: target,
			pouring: false,
			autoStir: false,
			fermentable: 0,
			dextrins: 0,
			wort,
			calm
		};
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		day.tun = stepTun({ ...day.tun, flame }, dt * SPEED);
		mash.update(dt, frame(calm), input);
		const r = Math.round(probeC(day.tun) * 10) / 10;
		if (r !== reading) reading = r;
	}

	const gap = $derived(reading - target);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => mash.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="A copper pot of water on a gas ring, with a dial thermometer clipped to the rim. A bucket of crushed malt waits on the bench."
		/>
	{/snippet}
	{#snippet controls()}
		<GasKnob bind:value={flame} />
	{/snippet}
	{#snippet readout()}
		The thermometer reads {reading.toFixed(1)} °C.
		{#if Math.abs(gap) < 0.6}
			That is where the card wants it.
		{:else if gap < 0}
			{(-gap).toFixed(1)} °C to go.
		{:else}
			{gap.toFixed(1)} °C over. The grain will still pull it down, just further than the card planned.
		{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Water</dt>
			<dd class="tnum">{day.mashWaterL.toFixed(1)} L</dd>
			<dt class="text-muted">Heat to</dt>
			<dd class="tnum">{target.toFixed(1)} °C</dd>
			<dt class="text-muted">Then mash at</dt>
			<dd class="tnum">{day.mashTargetC} °C</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary min-h-12 px-5"
			disabled={reading < 40}
			onclick={() => day.finish({ strikeC: day.tun.tempC })}
		>
			The water is ready
		</button>
	{/snippet}
</StepFrame>
