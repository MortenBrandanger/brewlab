<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import { SALTS, WATER_PROFILES, WATER_PROFILE_BY_ID } from '$lib/brewing/water';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const water = $derived(brew.context?.water);
	const profile = $derived(WATER_PROFILE_BY_ID.get(brew.recipe.water.profileId));

	/** What each source water is actually for, in one line a beginner can act on. */
	const SUITS: Record<string, string> = {
		'soft-pilsner': 'Czech and German lagers, delicate pale beers',
		balanced: 'Almost anything. Start here if you are not sure',
		'hop-forward': 'Pale ales and IPAs',
		'malt-forward': 'Stouts, hazy IPAs, malty lagers',
		'dark-alkaline': 'Stouts and porters only',
		ro: 'Building a profile from nothing'
	};

	let adjusting = $state(false);

	const ions = $derived(
		water
			? ([
					['Calcium', water.final.calcium, 'Ca²⁺'],
					['Magnesium', water.final.magnesium, 'Mg²⁺'],
					['Sodium', water.final.sodium, 'Na⁺'],
					['Sulfate', water.final.sulfate, 'SO₄²⁻'],
					['Chloride', water.final.chloride, 'Cl⁻'],
					['Bicarbonate', water.final.bicarbonate, 'HCO₃⁻']
				] as [string, number, string][])
			: []
	);

	/** Mash pH is a property of water *and* grain, so it means nothing on its own. */
	const hasGrist = $derived(brew.recipe.fermentables.length > 0);
	const phState = $derived(
		!water || !hasGrist
			? 'unknown'
			: water.mashPh > 5.6
				? 'high'
				: water.mashPh < 5.2
					? 'low'
					: 'good'
	);

	/** Which way this water leans, in words rather than a ratio. */
	const lean = $derived.by(() => {
		if (!water) return '';
		const { sulfate, chloride } = water.final;
		if (sulfate > chloride * 1.5) return 'Leans dry and sharp — bitterness will feel pointed.';
		if (chloride > sulfate * 1.5) return 'Leans full and round — malt will come forward.';
		return 'Balanced between sharp and round.';
	});

	const usedSalts = $derived(SALTS.filter((s) => (brew.recipe.water.salts[s.key] ?? 0) > 0));
</script>

<div class="flex flex-col gap-6">
	<section>
		<h3 class="field-label mb-2">Choose your source water</h3>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each WATER_PROFILES as option (option.id)}
				{@const selected = option.id === brew.recipe.water.profileId}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 transition-colors
							{selected
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={selected}
						onclick={() => (brew.recipe.water.profileId = option.id)}
					>
						<span class="block text-sm font-medium">{option.name}</span>
						<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
							{SUITS[option.id] ?? option.description}
						</span>
					</button>
				</li>
			{/each}
		</ul>
		{#if profile}
			<p class="prose-measure mt-2 text-xs text-muted">{profile.description}</p>
		{/if}
	</section>

	<section class="rounded-lg bg-surface p-4 ring-1 ring-line">
		<h3 class="field-label mb-3">What this water will do</h3>
		<p class="prose-measure text-sm text-muted">{lean}</p>

		<div class="mt-4 border-t border-line pt-3">
			<p class="text-xs text-subtle">Estimated mash pH</p>
			{#if hasGrist}
				<p class="flex items-baseline gap-2">
					<span class="tnum font-display text-xl font-semibold"
						>{water?.mashPh.toFixed(2) ?? '—'}</span
					>
					<span
						class="chip"
						class:text-hop={phState === 'good'}
						class:text-warn={phState !== 'good'}
					>
						{phState === 'good'
							? 'inside 5.2–5.6'
							: phState === 'high'
								? 'above the window'
								: 'below the window'}
					</span>
				</p>
			{:else}
				<p class="prose-measure mt-0.5 text-sm text-muted">
					Not knowable yet. Mash pH comes from the water and the grain together — malt is acidic,
					and roasted malt strongly so. Choose a grist and this fills in.
				</p>
			{/if}
		</div>

		{#if usedSalts.length || brew.recipe.water.lacticAcidMl > 0}
			<p class="tnum mt-3 text-xs text-subtle">
				Adding
				{usedSalts
					.map((s) => `${brew.recipe.water.salts[s.key]} g ${s.name.toLowerCase()}`)
					.join(', ')}
				{#if brew.recipe.water.lacticAcidMl > 0}
					{usedSalts.length ? ' and ' : ''}{brew.recipe.water.lacticAcidMl} mL lactic acid
				{/if}.
			</p>
		{/if}
		<LearningNote
			why="Mash pH matters more than any single ion. Between 5.2 and 5.6 the enzymes work well, the husks keep their tannins to themselves and the beer tastes bright rather than dull."
			deepDive="Sulfate makes bitterness read as dry and sharp, which is why Burton water suits pale ales. Chloride does the opposite: it fills the palate out and pushes malt forward. What matters is where each sits in absolute terms, not the ratio between them that gets quoted online. Calcium helps enzymes work, drops pH, encourages the yeast to flocculate and helps protein settle out — most brewers want 50 to 150 ppm of it."
		/>
	</section>

	<section>
		<button
			type="button"
			class="btn btn-ghost"
			aria-expanded={adjusting}
			onclick={() => (adjusting = !adjusting)}
		>
			<svg
				viewBox="0 0 16 16"
				class="h-4 w-4 transition-transform {adjusting ? 'rotate-90' : ''}"
				aria-hidden="true"
			>
				<path
					d="M6 3.5 L11 8 L6 12.5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			{adjusting ? 'Hide mineral adjustments' : 'Adjust the minerals yourself'}
		</button>
		<p class="mt-1.5 text-xs text-subtle">
			Optional. The source water above is already a sensible starting point.
		</p>

		{#if adjusting}
			<div class="mt-4 flex flex-col gap-5">
				<div>
					<h3 class="field-label mb-2">Water after additions</h3>
					<dl
						class="grid grid-cols-3 gap-3 rounded-lg bg-surface p-3 ring-1 ring-line sm:grid-cols-6"
					>
						{#each ions as [name, value, symbol] (name)}
							<div>
								<dt class="text-xs text-subtle">{name} <span aria-hidden="true">{symbol}</span></dt>
								<dd class="tnum text-sm font-medium">
									{Math.round(value)}<span class="text-xs text-muted"> ppm</span>
								</dd>
							</div>
						{/each}
					</dl>
				</div>

				<div>
					<div class="flex items-center justify-between gap-3">
						<h3 class="field-label">Brewing salts</h3>
						<button
							type="button"
							class="btn btn-quiet text-xs"
							aria-expanded={prefs.advanced}
							onclick={() => {
								prefs.advanced = !prefs.advanced;
								prefs.persist();
							}}
						>
							{prefs.advanced ? 'Fewer' : 'All five salts'}
						</button>
					</div>
					<div class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
						{#each SALTS as salt (salt.key)}
							{#if prefs.advanced || salt.key === 'gypsum' || salt.key === 'calciumChloride'}
								<SliderField
									label="{salt.name} ({salt.formula})"
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
							why="The direct way to bring mash pH down. About 11.5 milliequivalents per millilitre against a grist that buffers at roughly 40 per kilogram, so a 5 kg grist moves about 0.06 pH per millilitre."
						/>
					</div>
				</div>

				{#if water && hasGrist && water.phTerms.length}
					<div class="rounded-lg bg-surface p-3 ring-1 ring-line">
						<h3 class="field-label mb-2">Where that pH estimate comes from</h3>
						<ul class="flex flex-col gap-1">
							{#each water.phTerms as term (term.label)}
								<li class="flex items-baseline justify-between gap-4 text-xs">
									<span class="text-muted">{term.label}</span>
									<span class="tnum text-fg">
										{term.delta > 0 && term.label !== 'Grist on distilled water'
											? '+'
											: ''}{term.delta.toFixed(2)}
									</span>
								</li>
							{/each}
							<li
								class="flex items-baseline justify-between gap-4 border-t border-line pt-1 text-xs font-medium"
							>
								<span>Estimated mash pH</span>
								<span class="tnum">{water.mashPh.toFixed(2)}</span>
							</li>
						</ul>
						<p class="prose-measure mt-2 text-xs text-subtle">
							A teaching model, not a titration. Real malt varies batch to batch, and 0.1 pH of
							disagreement with your own meter is entirely normal.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</section>
</div>
