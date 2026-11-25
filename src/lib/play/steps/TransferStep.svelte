<script lang="ts">
	/**
	 * Siphon it into the fermenter, gently.
	 *
	 * The hose end follows your pointer inside the bucket. Under the surface
	 * the wort slides in; above it, it splashes and takes air with it. What is
	 * logged is the share of the batch that went in splashing, and past
	 * `CARELESS_SPLASH` the engine reads the cold side as carelessly handled.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { day } from '../day.svelte';
	import { CARELESS_SPLASH } from '../actual';
	import { TransferScene } from '../coldTransfer';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import type { PointerInput } from '../kit';

	const plan = day.plan!;
	// The colour of the beer actually being made, not the card's.
	const wort = srmToCss(day.result?.metrics.srm ?? 6);
	const totalL = day.kettle.wortL > 1 ? day.kettle.wortL : plan.batchVolumeL;
	const bench = new TransferScene(totalL);

	let running = $state(false);
	let moved = $state(0);
	let splashing = $state(false);
	let share = $state(0);
	let held = $state<'above' | 'bottom'>('above');

	function tick(dt: number, input: PointerInput, calm: boolean) {
		bench.running = running;
		bench.update(dt, input, calm);
		const m = Math.round(bench.movedL * 10) / 10;
		if (m !== moved) moved = m;
		if (bench.splashing !== splashing) splashing = bench.splashing;
		const s = bench.movedL > 0 ? bench.splashL / bench.movedL : 0;
		if (Math.abs(s - share) > 0.01) share = s;
		const where = bench.held() ? 'above' : 'bottom';
		if (where !== held) held = where;
	}

	const done = $derived(moved >= totalL - 0.05);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, pal, wort, calm)}
			pan={day.step.pan}
			cursor="move"
			label="The kettle of cooled wort on the bench, with a siphon cane in it. A clear hose runs from the cane down to a white fermenting bucket on the floor. Move your pointer over the bucket to place the end of the hose."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn btn-ghost min-h-12 px-5"
				disabled={done}
				onclick={() => (running = !running)}
			>
				{running ? 'Pinch the hose' : moved > 0 ? 'Let it run again' : 'Start the siphon'}
			</button>
			<button
				type="button"
				class="btn btn-ghost min-h-12 px-5"
				onclick={() => bench.place(held === 'above' ? 'bottom' : 'above')}
			>
				{held === 'above' ? 'Lower the hose end to the bottom' : 'Hold the hose end above'}
			</button>
		</div>
	{/snippet}
	{#snippet readout()}
		{moved.toFixed(1)} of {totalL.toFixed(1)} L across.
		{#if !running && moved === 0}
			The hose end is {held === 'above' ? 'held above the bucket' : 'at the bottom of the bucket'}.
		{:else if splashing}
			It is splashing, and every splash mixes air into the beer.
		{:else if running && !done}
			The hose end is under the surface, so the wort goes in quietly.
		{/if}
		{#if moved > 0}
			{Math.round(share * 100)}% of it went in splashing{share > CARELESS_SPLASH
				? ', which counts as careless: from here on, air is the enemy'
				: ''}.
		{/if}
	{/snippet}
	{#snippet card()}
		<p class="text-muted">Siphon gently. Keep the hose end under the surface.</p>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary min-h-12 px-5"
			disabled={!done}
			onclick={() => day.finish({ splash: bench.splashL / bench.totalL })}
		>
			It is all in the fermenter
		</button>
	{/snippet}
</StepFrame>
