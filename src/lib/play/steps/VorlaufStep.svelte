<script lang="ts">
	/**
	 * The vorlauf: pour the cloudy first runnings back until they run clear.
	 *
	 * The tap runs into a jug. Hold to tip the jug back over the grain; each
	 * jugful poured back settles the bed a little more, and what comes out next
	 * is clearer. You decide when to send it to the kettle — straight away if
	 * you like, and the report will find the flour in the beer, because
	 * `applyLog` counts the jugs against the same threshold this screen uses.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { day } from '../day.svelte';
	import { JUG_L, firstRunningsL, runningsCloud, runsClear } from '../lauter';
	import { LauterScene } from '../lauterScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Litres a second out of the tap into the jug, and back over the grain. */
	const TAP_LPS = 0.55;
	const POUR_LPS = 0.45;

	const plan = day.plan!;
	const wort = srmToCss(simulate(plan).metrics.srm);
	const mashWater = day.log.mashWaterL ?? day.mashWaterL;
	const first = firstRunningsL(mashWater, day.grainKg);
	const bench = new LauterScene('vorlauf');

	let pouring = $state(false);
	let jugL = $state(0);
	let jugCloud = $state(1);
	let backL = $state(0);

	const jugsBack = $derived(backL / JUG_L);
	const cloudNow = $derived(runningsCloud(jugsBack));
	const clear = $derived(runsClear(jugsBack));
	const full = $derived(jugL >= JUG_L - 1e-6);
	let filling = false;

	function frame(calm: boolean) {
		return {
			mode: 'vorlauf' as const,
			wort,
			grainKg: day.grainKg,
			headL: Math.max(0, first - jugL),
			flowLps: filling ? TAP_LPS : 0,
			cloud: cloudNow,
			jug: { litres: jugL, cloud: jugCloud, pouring },
			calm
		};
	}

	function tick(dt: number, _input: PointerInput, calm: boolean) {
		filling = !pouring && jugL < JUG_L;
		if (filling) {
			const add = Math.min(JUG_L - jugL, TAP_LPS * dt);
			// What is in the jug is the mix of everything that ran into it.
			jugCloud = jugL + add > 0 ? (jugCloud * jugL + cloudNow * add) / (jugL + add) : cloudNow;
			jugL += add;
		} else if (pouring && jugL > 0) {
			const out = Math.min(jugL, POUR_LPS * dt);
			jugL -= out;
			backL += out;
		}
		bench.update(dt, frame(calm));
	}
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="The mash tun on a crate with its tap open into a glass jug. The boil kettle waits to one side."
		/>
	{/snippet}
	{#snippet controls()}
		<HoldButton bind:held={pouring} disabled={jugL <= 0.01 && !pouring}>
			Hold to pour the jug back
		</HoldButton>
	{/snippet}
	{#snippet readout()}
		{#if jugsBack < 0.05}
			{full ? 'The jug is full' : 'The jug is filling'}: cloudy with flour and bits of husk.
		{:else if clear}
			You have poured back {jugsBack.toFixed(1)} jugs. It is running clear now.
		{:else}
			You have poured back {jugsBack.toFixed(1)}
			{jugsBack < 1.05 ? 'jug' : 'jugs'}. Clearer, but still cloudy.
		{/if}
		{#if full && !clear}Pour it back over the grain.{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Run-off</dt>
			<dd>Pour back until clear</dd>
			<dt class="text-muted">Usually</dt>
			<dd class="tnum">2–3 jugs</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {clear ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			onclick={() => day.finish({ vorlaufJugs: Math.round(jugsBack * 10) / 10 })}
		>
			Run it to the kettle
		</button>
	{/snippet}
</StepFrame>
