<script lang="ts">
	/**
	 * Where did it land?
	 *
	 * The one moment every brewer recognises and every calculator skips: the
	 * thermometer goes in after the grain and does not read what you aimed for.
	 * The miss is rolled by the engine — deterministically, from the recipe —
	 * and the two things you can do about it are both real, both costed, and
	 * both written into the model. Top it up and the mash thins; live with it
	 * and the first rest runs where it landed.
	 */
	import { computeMashProfile } from '$lib/brewing/calculations';
	import { mashLanding } from '$lib/brewing/mashLanding';
	import { gristDiastaticPower } from '$lib/brewing/simulate';
	import { brew } from '$lib/state/brew.svelte';

	const landing = $derived(mashLanding(brew.recipe));
	const grainKg = $derived(brew.context?.gravity.grist.grainKg ?? 0);
	const mash = $derived(brew.recipe.mash);

	const kept = $derived(mash.landedTempC !== undefined);
	const topped = $derived(mash.toppedUpL !== undefined);

	/** What each choice does to the wort, so the cards can be compared. */
	const inputs = $derived({
		mashPh: brew.context?.water.mashPh,
		diastaticPowerLintner: gristDiastaticPower(brew.recipe.fermentables)
	});
	const aimed = $derived(
		computeMashProfile({ ...mash, landedTempC: undefined, toppedUpL: undefined }, inputs)
	);
	const lived = $derived(
		landing
			? computeMashProfile({ ...mash, landedTempC: landing.landedC, toppedUpL: undefined }, inputs)
			: undefined
	);
	const eatAimed = $derived(Math.round(aimed.kinetics.attenuationLimit * 100));
	const eatLived = $derived(lived ? Math.round(lived.kinetics.attenuationLimit * 100) : eatAimed);
	const thinner = $derived(
		landing && grainKg > 0
			? mash.thicknessLPerKg - (topped ? mash.toppedUpL! / grainKg : 0) + landing.topUpL / grainKg
			: mash.thicknessLPerKg
	);

	function liveWithIt() {
		if (!landing) return;
		if (topped && grainKg > 0) mash.thicknessLPerKg -= mash.toppedUpL! / grainKg;
		mash.toppedUpL = undefined;
		mash.landedTempC = landing.landedC;
	}

	function topItUp() {
		if (!landing) return;
		if (!topped && grainKg > 0) mash.thicknessLPerKg += landing.topUpL / grainKg;
		mash.toppedUpL = landing.topUpL;
		mash.landedTempC = undefined;
	}
</script>

{#if !landing}
	<p class="prose-measure text-sm text-muted">
		No rest sits in the range where the enzymes work, so there is nothing to read. Set a mash on the
		previous screen.
	</p>
{:else}
	<div class="flex flex-col gap-5">
		<!-- The reading. One line, because that is what a thermometer gives you. -->
		<p class="prose-measure text-base">
			You aimed for <span class="tnum font-medium">{landing.aimC} °C</span>. The thermometer reads
			<span class="tnum font-display text-2xl text-fg">{landing.landedC.toFixed(1)} °C</span>
			{#if landing.closeEnough}
				— close enough to call it a hit.
			{:else if landing.missC < 0}
				— {Math.abs(landing.missC).toFixed(1)} degrees cold.
			{:else}
				— {landing.missC.toFixed(1)} degrees hot.
			{/if}
		</p>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#if landing.closeEnough}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 {kept
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={kept}
						onclick={liveWithIt}
					>
						<span class="block text-sm font-medium">Carry on</span>
						<span class="mt-0.5 block text-xs {kept ? 'text-fg' : 'text-subtle'}">
							Half a degree is inside what any brewer would call a hit. The lid goes on and the hour
							starts.
						</span>
					</button>
				</li>
			{:else}
				{#if landing.missC < 0}
					<li>
						<button
							type="button"
							class="h-full w-full rounded-lg p-3 text-start ring-1 {topped
								? 'bg-copper-dim ring-copper'
								: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
							aria-pressed={topped}
							onclick={topItUp}
						>
							<span class="block text-sm font-medium">Top it up with hot water</span>
							<span class="mt-0.5 block text-xs {topped ? 'text-fg' : 'text-subtle'}">
								Boil the kettle and stir in near-boiling water until it reads {landing.aimC} °C. You get
								the mash you planned, a little wetter than you planned it.
							</span>
							<span class="mt-1.5 block text-xs {topped ? 'text-fg' : 'text-muted'}">
								About <span class="tnum">{landing.topUpL.toFixed(1)} L</span> at 98 °C · mash thins
								to
								<span class="tnum">{thinner.toFixed(2)} L/kg</span> · the yeast can eat
								<span class="tnum">{eatAimed}%</span>
							</span>
						</button>
					</li>
				{:else}
					<li>
						<button
							type="button"
							class="h-full w-full rounded-lg p-3 text-start ring-1 {topped
								? 'bg-copper-dim ring-copper'
								: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
							aria-pressed={topped}
							onclick={topItUp}
						>
							<span class="block text-sm font-medium">Stir in a little cold water</span>
							<span class="mt-0.5 block text-xs {topped ? 'text-fg' : 'text-subtle'}">
								A jug of cold water and a stir brings it down to {landing.aimC} °C. You get the mash you
								planned, marginally thinner.
							</span>
							<span class="mt-1.5 block text-xs {topped ? 'text-fg' : 'text-muted'}">
								The yeast can eat <span class="tnum">{eatAimed}%</span>, as planned
							</span>
						</button>
					</li>
				{/if}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 {kept
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={kept}
						onclick={liveWithIt}
					>
						<span class="block text-sm font-medium">Live with it</span>
						<span class="mt-0.5 block text-xs {kept ? 'text-fg' : 'text-subtle'}">
							Close the lid on {landing.landedC.toFixed(1)} °C. The enzymes do not know what you intended;
							the mash you get is the mash of the number on the thermometer.
						</span>
						<span class="mt-1.5 block text-xs {kept ? 'text-fg' : 'text-muted'}">
							The yeast can eat <span class="tnum">{eatLived}%</span> instead of
							<span class="tnum">{eatAimed}%</span> —
							{eatLived > eatAimed
								? 'a drier, thinner beer than you planned'
								: eatLived < eatAimed
									? 'a fuller, sweeter beer than you planned'
									: 'and it hardly shows'}
						</span>
					</button>
				</li>
			{/if}
		</ul>

		<p class="prose-measure text-xs text-subtle">
			The miss is rolled by the model from this recipe, the way a real brew day misses — one
			standard deviation of about a degree — so the same recipe always lands in the same place, and
			a different grain bill lands somewhere else.
		</p>
	</div>
{/if}
