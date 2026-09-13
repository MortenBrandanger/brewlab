<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import { SALTS, WATER_PROFILES, WATER_PROFILE_BY_ID } from '$lib/brewing/water';
	import { strikeTempC } from '$lib/brewing/calculations';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const water = $derived(brew.context?.water);
	const profile = $derived(WATER_PROFILE_BY_ID.get(brew.recipe.water.profileId));

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

	function choosePreset(id: string) {
		brew.recipe.water.profileId = id;
		// A preset means what it says, so it starts from its own ions.
		for (const salt of SALTS) brew.recipe.water.salts[salt.key] = 0;
		brew.recipe.water.lacticAcidMl = 0;
		buildingOwn = false;
	}

	const hasGrist = $derived(brew.recipe.fermentables.length > 0);

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

	/** Which way this water leans, in words rather than a ratio. */
	const lean = $derived.by(() => {
		if (!water) return '';
		const { sulfate, chloride } = water.final;
		// A ratio between two near-zero numbers says nothing useful.
		if (sulfate + chloride < 40) {
			return 'Almost no minerals at all: nothing pushes the beer either way. Exactly what a delicate pale lager wants, and what a hoppy beer will find hollow.';
		}
		if (sulfate > chloride * 1.5) return 'Leans dry and sharp — bitterness will feel pointed.';
		if (chloride > sulfate * 1.5) return 'Leans full and round — malt will come forward.';
		return 'Balanced between sharp and round.';
	});

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
		<h3 class="field-label mb-2">Choose your water</h3>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each WATER_PROFILES as option (option.id)}
				{@const selected = !custom && option.id === brew.recipe.water.profileId}
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
					onclick={() => (buildingOwn = true)}
				>
					<span class="block text-sm font-medium">Treat it myself</span>
					<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
						Add brewing salts and acid by hand
					</span>
				</button>
			</li>
		</ul>

		<p class="prose-measure mt-3 text-sm text-muted">
			{#if custom}
				{profile?.name ?? 'Custom'} water with your own additions. {lean}
			{:else}
				{lean}
			{/if}
		</p>
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

	{#if strike !== undefined && firstRest}
		<p class="prose-measure text-sm">
			<span class="tnum font-medium">
				About {totalWaterL.toFixed(0)} litres, heated to
				<span class="text-copper-text">{strike.toFixed(0)} °C</span>
			</span>
			<span class="text-muted">
				— {(strike - firstRest.tempC).toFixed(0)} degrees above your {firstRest.tempC} °C mash rest, because
				the cold grain will pull it down.
			</span>
		</p>
	{/if}

	{#if hasGrist && water}
		<p class="prose-measure text-sm">
			<span class="text-subtle">Estimated mash pH</span>
			<span class="tnum font-medium"> {water.mashPh.toFixed(2)}</span>
			<span class={water.mashPh > 5.6 || water.mashPh < 5.2 ? 'text-warn' : 'text-hop'}>
				{water.mashPh > 5.6
					? ' — above the 5.2–5.6 window'
					: water.mashPh < 5.2
						? ' — below the 5.2–5.6 window'
						: ' — inside the 5.2–5.6 window'}
			</span>
		</p>
	{/if}
</div>
