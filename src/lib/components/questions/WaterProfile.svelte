<script lang="ts">
	/**
	 * Which water are you brewing with?
	 *
	 * The whole screen is that one question: a source water, or your own salts on
	 * top of one, and what the choice does to the strike water and the mash pH.
	 */
	import SliderField from '../SliderField.svelte';
	import { SALTS, WATER_PROFILES, computeWater } from '$lib/brewing/water';
	import { salts } from '$lib/brewing/recipes';
	import { strikeTempC } from '$lib/brewing/calculations';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const water = $derived(brew.context?.water);

	/** What each source water is for, in one line a beginner can act on. */
	const SUITS: Record<string, string> = {
		'soft-pilsner': 'Czech and German lagers, delicate pale beers',
		balanced: 'Almost anything. Start here if you are not sure',
		'hop-forward': 'Pale ales and IPAs',
		'malt-forward': 'Stouts, hazy IPAs, malty lagers',
		'dark-alkaline': 'Stouts and porters only',
		ro: 'Nothing on its own — a blank slate to build on'
	};

	/**
	 * Either you pick a water or you build one. Letting someone choose "Balanced"
	 * and then crank the gypsum to 300 ppm of sulfate leaves the card claiming
	 * something the water is no longer true to.
	 */
	const hasAdditions = $derived(
		SALTS.some((salt) => (brew.recipe.water.salts[salt.key] ?? 0) > 0) ||
			brew.recipe.water.lacticAcidMl > 0
	);
	let buildingOwn = $state(false);
	const custom = $derived(buildingOwn || hasAdditions);

	function treatItMyself() {
		// Salts are added to a base water, so building your own still needs one.
		// Reverse osmosis is the blank slate; an existing choice is kept.
		if (!brew.recipe.water.profileId) brew.recipe.water.profileId = 'ro';
		buildingOwn = true;
	}

	function choosePreset(id: string) {
		brew.recipe.water.profileId = id;
		// A preset means what it says, so it starts from its own ions.
		for (const salt of SALTS) brew.recipe.water.salts[salt.key] = 0;
		brew.recipe.water.lacticAcidMl = 0;
		buildingOwn = false;
	}

	const hasGrist = $derived(brew.recipe.fermentables.length > 0);

	/**
	 * What each water would do to the mash you have actually built.
	 *
	 * The pH is the single thing the water choice is really for, and it used to
	 * appear in a box below the cards, describing only the one already selected.
	 * A reader could not use it to choose. Worked out per card it becomes the
	 * reason to pick one: this water lands your mash in the window and that one
	 * does not.
	 */
	const perProfile = $derived.by(() => {
		const out: Record<string, { mashPh: number; lean: string }> = {};
		if (!hasGrist) return out;
		for (const option of WATER_PROFILES) {
			const result = computeWater(
				{ profileId: option.id, salts: salts(), lacticAcidMl: 0 },
				brew.recipe.fermentables,
				totalWaterL,
				brew.recipe.mash.thicknessLPerKg
			);
			out[option.id] = { mashPh: result.mashPh, lean: leanOf(result.final) };
		}
		return out;
	});

	/** Which way a water leans, in three words rather than a ratio. */
	function leanOf(final: { sulfate: number; chloride: number }): string {
		const { sulfate, chloride } = final;
		if (sulfate + chloride < 40) return 'pushes nothing either way';
		if (sulfate > chloride * 1.5) return 'leans dry and sharp';
		if (chloride > sulfate * 1.5) return 'leans full and round';
		return 'balanced between sharp and round';
	}

	/**
	 * How hot to heat it, and how much.
	 *
	 * Neither is a free choice. The temperature follows from the mash rest and
	 * the mash thickness — cold grain pulls the mash down the moment it goes in,
	 * so the liquor has to start above the target. The volume follows from the
	 * batch size and what boils away. Both are shown here because "heat the
	 * water" is meaningless without them.
	 */
	const firstRest = $derived(
		brew.recipe.mash.steps.find((step) => step.tempC >= 40 && step.tempC <= 78) ??
			brew.recipe.mash.steps[0]
	);
	const strike = $derived(
		firstRest ? strikeTempC(firstRest.tempC, brew.recipe.mash.thicknessLPerKg) : undefined
	);
	const totalWaterL = $derived(brew.context?.totalWaterL ?? brew.recipe.preBoilVolumeL);

	const ions = $derived(
		water
			? ([
					['Ca', water.final.calcium],
					['Mg', water.final.magnesium],
					['Na', water.final.sodium],
					['SO₄', water.final.sulfate],
					['Cl', water.final.chloride],
					['HCO₃', water.final.bicarbonate]
				] as [string, number][])
			: []
	);
</script>

<div class="flex flex-col gap-5">
	<section>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each WATER_PROFILES as option (option.id)}
				{@const selected = !custom && option.id === brew.recipe.water.profileId}
				{@const effect = perProfile[option.id]}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1
							{selected
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={selected}
						onclick={() => choosePreset(option.id)}
					>
						<span class="block text-sm font-medium">{option.name}</span>
						<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
							{SUITS[option.id] ?? option.description}
						</span>
						{#if effect}
							<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
								{effect.lean.charAt(0).toUpperCase() + effect.lean.slice(1)} ·
								<span
									class="tnum"
									class:text-warn={!selected && (effect.mashPh > 5.6 || effect.mashPh < 5.2)}
									class:text-warn-bright={selected && (effect.mashPh > 5.6 || effect.mashPh < 5.2)}
								>
									mash pH {effect.mashPh.toFixed(2)}
								</span>
							</span>
						{/if}
					</button>
				</li>
			{/each}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1
						{custom
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={custom}
					onclick={treatItMyself}
				>
					<span class="block text-sm font-medium">Treat it myself</span>
					<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
						Add brewing salts and acid by hand
					</span>
				</button>
			</li>
		</ul>
	</section>

	{#if custom}
		<section class="flex flex-col gap-4">
			<div class="grid gap-x-8 gap-y-1 sm:grid-cols-2">
				{#each SALTS as salt (salt.key)}
					{#if prefs.advanced || salt.key === 'gypsum' || salt.key === 'calciumChloride'}
						<SliderField
							label={salt.name}
							bind:value={brew.recipe.water.salts[salt.key]}
							min={0}
							max={salt.key === 'chalk' || salt.key === 'bakingSoda' ? 12 : 20}
							step={0.5}
							unit=" g"
							format={(n) => n.toFixed(1)}
							why={salt.blurb}
						/>
					{/if}
				{/each}
				<SliderField
					label="Lactic acid (88%)"
					bind:value={brew.recipe.water.lacticAcidMl}
					min={0}
					max={20}
					step={0.5}
					unit=" mL"
					format={(n) => n.toFixed(1)}
					why="The direct way to bring mash pH down. Roughly 0.06 pH per millilitre on a 5 kg grist."
				/>
			</div>

			<div
				class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-3"
			>
				<dl class="tnum flex flex-wrap gap-x-5 gap-y-1 text-xs">
					{#each ions as [symbol, value] (symbol)}
						<div class="flex gap-1.5">
							<dt class="text-subtle">{symbol}</dt>
							<dd>{Math.round(value)}</dd>
						</div>
					{/each}
					<span class="text-subtle">ppm</span>
				</dl>
				<button
					type="button"
					class="btn btn-quiet text-xs"
					aria-pressed={prefs.advanced}
					onclick={() => {
						prefs.advanced = !prefs.advanced;
						prefs.persist();
					}}
				>
					{prefs.advanced ? 'Just the two common salts' : 'All five salts'}
				</button>
			</div>
		</section>
	{/if}

	<!--
		What is left once the cards carry their own consequence: the instruction
		for the act itself. It is the same figure whichever water you picked —
		it follows from the batch size and the mash — so it cannot live in a card,
		and the pH for your own blend cannot either, because only this screen
		knows what you put in it.
	-->
	{#if strike !== undefined && firstRest}
		<p class="prose-measure text-sm text-muted">
			Fill the pot with
			<span class="tnum text-fg"
				>about {totalWaterL.toFixed(0)} litres and heat it to {strike.toFixed(0)} °C</span
			>
			— {(strike - firstRest.tempC).toFixed(0)} degrees above the {firstRest.tempC} °C you will mash at,
			because the cold grain will pull it down the moment it goes in.
			{#if custom && hasGrist && water}
				Your own blend lands the mash at
				<span
					class="tnum font-medium"
					class:text-warn={water.mashPh > 5.6 || water.mashPh < 5.2}
					class:text-hop={water.mashPh <= 5.6 && water.mashPh >= 5.2}
					>pH {water.mashPh.toFixed(2)}</span
				>.
			{/if}
		</p>
	{/if}
</div>
