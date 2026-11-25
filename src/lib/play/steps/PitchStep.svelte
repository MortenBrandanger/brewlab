<script lang="ts">
	/**
	 * Add the yeast.
	 *
	 * The card says how many packets; the bench has one more than that, so an
	 * over-pitch is something you can actually do rather than a setting. Fewer
	 * packets than the card is an under-pitch. The count is what the engine
	 * gets, through `pitchRateFor` in `actual.ts`.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { getYeast } from '$lib/brewing/ingredients';
	import { day } from '../day.svelte';
	import { applyLog, cardPackets } from '../actual';
	import { simulate } from '$lib/brewing/simulate';
	import { PitchScene } from '../fermenterScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import type { PointerInput } from '../kit';

	const plan = day.plan!;
	const wanted = cardPackets(plan);
	const yeast = getYeast(plan.fermentation.yeastId);
	// Snapshots: the store's `actual` clones a reactive proxy, which throws.
	const actual = applyLog($state.snapshot(plan), $state.snapshot(day.log));
	const wort = srmToCss(simulate(actual).metrics.srm);
	const level = Math.min(0.9, actual.batchVolumeL / 30);
	const pitchC = day.kettle.tempC;

	const bench = new PitchScene(wanted + 1);
	let packets = $state(0);
	let busy = $state(false);
	let cursor = $state('default');
	let calmNow = false;
	bench.onTear = () => (packets += 1);

	function tear() {
		if (bench.tear(calmNow)) packets += 1;
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		calmNow = calm;
		bench.update(dt, { wort, level, calm }, input);
		const b = bench.busy;
		if (b !== busy) busy = b;
		const c = bench.cursor(input);
		if (c !== cursor) cursor = c;
	}
	const left = $derived(wanted + 1 - packets);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, { wort, level, calm }, pal)}
			pan={day.step.pan}
			{cursor}
			label="An open white fermenting bucket of cooled wort on the bench, with foil packets of yeast beside it. Click a packet to tear it and tip it in."
		/>
	{/snippet}
	{#snippet controls()}
		<button
			type="button"
			class="btn btn-ghost min-h-12 px-5 text-base"
			disabled={busy || left <= 0}
			onclick={tear}
		>
			{left <= 0 ? 'No packets left' : 'Tear a packet and tip it in'}
		</button>
	{/snippet}
	{#snippet readout()}
		{#if packets === 0}
			No yeast in yet. The wort is at {pitchC.toFixed(0)} °C.
		{:else}
			{packets}
			{packets === 1 ? 'packet' : 'packets'} in.
			{#if packets < wanted}
				Fewer than the card asks for. The yeast has to grow more before it gets going, and growing
				yeast makes more fruity and hot-tasting flavours.
			{:else if packets > wanted}
				More than the card asks for. The yeast starts fast and has less growing to do, so the beer
				comes out cleaner.
			{:else}
				That is what the card asks for.
			{/if}
		{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Yeast</dt>
			<dd>{yeast?.name ?? 'Yeast'}</dd>
			<dt class="text-muted">Packets</dt>
			<dd class="tnum">{wanted}</dd>
			<dt class="text-muted">Pitch at</dt>
			<dd class="tnum">{plan.chill.pitchTempC} °C</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary min-h-12 px-5"
			disabled={packets === 0 || busy}
			onclick={() => day.finish({ packets })}
		>
			Lid on, into the fridge
		</button>
	{/snippet}
</StepFrame>
