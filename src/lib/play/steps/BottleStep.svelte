<script lang="ts">
	/**
	 * Weigh the priming sugar, then bottle.
	 *
	 * The dose is the only decision, so it is the only control: spoon sugar
	 * into the bowl on the scale, spoon some out if you overshoot, and the
	 * display reads the grams. Stirring it in plays the filling and capping by
	 * itself — every bottle gets the same dose, so there is nothing left to
	 * choose. What the readout says about the fizz comes from the same
	 * priming relationship the engine uses, and the warnings stop where the
	 * fault model stops: past 3.2 volumes is a caution, not a burst bottle.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { day } from '../day.svelte';
	import { co2FromPriming, primingGrams } from '../actual';
	import { BottleScene } from '../bottleScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';

	/** Grams a second while the spoon is going. */
	const SPOON_G_S = 22;
	/** Real seconds the filling and capping takes. */
	const FILL_S = 4.5;

	const actual = $state.snapshot(day.actual!);
	const target = Math.round(primingGrams(actual));
	const cardCo2 = actual.conditioning.co2Volumes;
	const beer = srmToCss(day.result!.metrics.srm);
	const bench = new BottleScene();

	let grams = $state(0);
	let spooning = $state(false);
	let removing = $state(false);
	let fill = $state(0);
	let bottling = $state(false);

	const co2 = $derived(co2FromPriming(actual, grams));

	function frame(calm: boolean) {
		return { grams, spooning, removing, fill, beer, calm };
	}

	function tick(dt: number, _input: unknown, calm: boolean) {
		if (!bottling) {
			if (spooning) grams += SPOON_G_S * dt;
			if (removing) grams = Math.max(0, grams - SPOON_G_S * dt);
		} else {
			fill = calm ? 1 : Math.min(1, fill + dt / FILL_S);
			if (fill >= 1) {
				bottling = false;
				day.finish({ primingG: Math.round(grams * 10) / 10 });
				return;
			}
		}
		bench.update(dt, frame(calm));
	}

	/** How that dose will drink, against the card. */
	const verdict = $derived.by(() => {
		if (grams < 1) return 'No sugar yet. Without it, the bottles stay as flat as the beer is now.';
		if (co2 < 1.5) return 'That is very little. The beer will pour flat and taste heavy.';
		if (co2 > 3.2)
			return 'That is champagne-level fizz. It scrubs the smell out of the glass and sharpens the bitterness, and ordinary bottles are not made for much more.';
		const gap = co2 - cardCo2;
		if (Math.abs(gap) < 0.2) return 'That is what the card asks for.';
		return gap < 0 ? 'Softer than the card asks for.' : 'Livelier than the card asks for.';
	});
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => bench.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="A kitchen scale with a bowl of priming sugar on it, a sack of dextrose, and a bottling bucket on a crate above a row of brown bottles."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			<HoldButton bind:held={spooning} disabled={bottling}>Hold to spoon in sugar</HoldButton>
			<HoldButton bind:held={removing} disabled={bottling || grams <= 0}>Spoon some out</HoldButton>
		</div>
	{/snippet}
	{#snippet readout()}
		The scale reads {Math.round(grams)} g, about {co2.toFixed(1)} volumes of CO₂. {verdict}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Sugar</dt>
			<dd class="tnum">{target} g dextrose</dd>
			<dt class="text-muted">For</dt>
			<dd class="tnum">{actual.batchVolumeL.toFixed(1)} L of beer</dd>
			<dt class="text-muted">Fizz</dt>
			<dd class="tnum">{cardCo2.toFixed(1)} volumes</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary min-h-12 px-5"
			disabled={grams < 1 || bottling}
			onclick={() => {
				spooning = false;
				removing = false;
				bottling = true;
			}}
		>
			{bottling ? 'Filling the bottles…' : 'Stir it in and fill the bottles'}
		</button>
	{/snippet}
</StepFrame>
