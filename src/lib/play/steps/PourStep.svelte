<script lang="ts">
	/**
	 * Pour the first glass, then hand the beer to the report.
	 *
	 * Colour, haze, head and fizz in the glass are the engine's appearance of
	 * the beer you actually made, so this is the first honest look at it. The
	 * pour itself is decoration: the engine does not model technique, so the
	 * screen does not pretend a careful pour made a better beer.
	 *
	 * "Taste it" loads the beer your hands wrote into the brew store as a
	 * finished brew and opens the ordinary report on it, where the panel and
	 * "what did I do?" judge it like any other.
	 */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { describeAppearance, srmToCss } from '$lib/brewing/appearance';
	import { brew } from '$lib/state/brew.svelte';
	import { day } from '../day.svelte';
	import { PourScene } from '../pourScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';

	const actual = $state.snapshot(day.actual!);
	const result = day.result!;
	const look = result.appearance;
	const srm = result.metrics.srm;
	const colours = {
		beer: srmToCss(srm),
		beerLight: srmToCss(Math.max(1, srm * 0.85)),
		beerDeep: srmToCss(srm * 1.5 + 2)
	};
	const glass = new PourScene();

	let pouring = $state(false);
	let level = $state(0);
	let full = $state(false);

	function frame(calm: boolean) {
		return {
			pouring,
			...colours,
			srm,
			haze: look.haze,
			head: look.head,
			carbonation: look.carbonation,
			calm
		};
	}

	function tick(dt: number, _input: unknown, calm: boolean) {
		glass.update(dt, frame(calm));
		const l = Math.round((glass.liquid + glass.foam) * 100) / 100;
		if (l !== level) level = l;
		if (glass.full !== full) full = glass.full;
		if (full && pouring) pouring = false;
	}

	/** A glass three-quarters full is enough to taste. */
	const ready = $derived(level >= 0.75 && !pouring);

	function taste() {
		brew.load(actual);
		brew.leaveChallenge();
		brew.setStage('taste');
		void goto(resolve('/'));
	}
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => glass.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="An empty pint glass on the bench and one of your bottles beside it."
		/>
	{/snippet}
	{#snippet controls()}
		<HoldButton bind:held={pouring} disabled={full}>
			{full ? 'The glass is full' : 'Hold to pour'}
		</HoldButton>
	{/snippet}
	{#snippet readout()}
		{#if level < 0.05}
			The glass is empty.
		{:else if !ready}
			Pouring.
		{:else}
			{describeAppearance(look, result.metrics.ebc)}
		{/if}
	{/snippet}
	{#snippet card()}
		<p class="text-muted">
			Brewed by hand from the card. The beer in the glass is the one you made, not the one on the
			card.
		</p>
	{/snippet}
	{#snippet action()}
		<button type="button" class="btn btn-quiet min-h-12 px-4" onclick={() => day.reset()}>
			Brew another
		</button>
		<button type="button" class="btn btn-primary min-h-12 px-5" disabled={!ready} onclick={taste}>
			Taste it
		</button>
	{/snippet}
</StepFrame>
