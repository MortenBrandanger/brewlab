<script lang="ts">
	import SelectField from '../SelectField.svelte';
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import { SALTS, WATER_PROFILES, WATER_PROFILE_BY_ID } from '$lib/brewing/water';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const water = $derived(brew.context?.water);
	const profile = $derived(WATER_PROFILE_BY_ID.get(brew.recipe.water.profileId));

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

	const phState = $derived(
		!water ? 'unknown' : water.mashPh > 5.6 ? 'high' : water.mashPh < 5.2 ? 'low' : 'good'
	);
</script>

<div class="flex flex-col gap-6">
	<div class="grid items-start gap-5 sm:grid-cols-[minmax(0,18rem)_1fr]">
		<SelectField
			label="Source water"
			bind:value={brew.recipe.water.profileId}
			hint={profile?.description}
		>
			{#each WATER_PROFILES as option (option.id)}
				<option value={option.id}>{option.name}</option>
			{/each}
		</SelectField>

		<div>
			<span class="field-label mb-1">Estimated mash pH</span>
			<p class="flex items-baseline gap-2">
				<span class="tnum font-display text-xl font-semibold"
					>{water?.mashPh.toFixed(2) ?? '—'}</span
				>
				<span class="chip" class:text-hop={phState === 'good'} class:text-warn={phState !== 'good'}>
					{phState === 'good'
						? 'inside 5.2–5.6'
						: phState === 'high'
							? 'above the window'
							: 'below the window'}
				</span>
			</p>
			<p class="mt-1 text-xs text-subtle">
				Residual alkalinity {water?.residualAlkalinity.toFixed(0) ?? '—'} ppm · sulfate to chloride
				{water && water.sulfateChlorideRatio < 90 ? water.sulfateChlorideRatio.toFixed(2) : '∞'} : 1
			</p>
		</div>
	</div>

	<section>
		<h3 class="field-label mb-2">Water after additions</h3>
		<dl class="grid grid-cols-3 gap-3 rounded-lg bg-surface p-3 ring-1 ring-line sm:grid-cols-6">
			{#each ions as [name, value, symbol] (name)}
				<div>
					<dt class="text-xs text-subtle">{name} <span aria-hidden="true">{symbol}</span></dt>
					<dd class="tnum text-sm font-medium">
						{Math.round(value)}<span class="text-xs text-muted"> ppm</span>
					</dd>
				</div>
			{/each}
		</dl>
		<LearningNote
			why="Sulfate makes bitterness read as dry and sharp; chloride makes the beer taste fuller and rounder. Which one dominates changes the beer more than the total mineral content does."
			deepDive="Calcium helps enzymes work, drops mash pH, encourages yeast to flocculate and helps protein settle out — most brewers want 50–150 ppm. Magnesium is needed in tiny amounts and tastes metallic above roughly 30 ppm. Bicarbonate resists the acidity that malt brings, which is why alkaline water suits dark grists and ruins pale ones. The ratio talk you see online is a shorthand: what actually matters is where each ion sits in absolute terms."
		/>
	</section>

	<section>
		<div class="flex items-center justify-between gap-3">
			<h3 class="field-label">Brewing salts</h3>
			<button
				type="button"
				class="btn btn-quiet text-xs"
				onclick={() => {
					prefs.advanced = !prefs.advanced;
					prefs.persist();
				}}
				aria-expanded={prefs.advanced}
			>
				{prefs.advanced ? 'Hide' : 'Show'} all salts
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
				why="The direct way to bring mash pH down. Roughly 11.5 milliequivalents per millilitre against a grist that buffers at about 40 per kilogram, so a 5 kg grist moves about 0.06 pH per millilitre."
				deepDive="Acidulated malt does the same job from inside the grist: about 1% of the grain bill drops pH by roughly 0.1. Both are preferable to guessing, and neither replaces actually measuring your mash with a calibrated meter. This model is built from published buffering figures, and real malt varies enough batch to batch that 0.1 pH of disagreement is normal."
			/>
		</div>
	</section>

	{#if water && water.phTerms.length}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<h3 class="field-label mb-2">Where that pH estimate comes from</h3>
			<ul class="flex flex-col gap-1">
				{#each water.phTerms as term (term.label)}
					<li class="flex items-baseline justify-between gap-4 text-xs">
						<span class="text-muted">{term.label}</span>
						<span class="tnum text-fg"
							>{term.delta > 0 && term.label !== 'Grist on distilled water'
								? '+'
								: ''}{term.delta.toFixed(2)}</span
						>
					</li>
				{/each}
				<li
					class="flex items-baseline justify-between gap-4 border-t border-line pt-1 text-xs font-medium"
				>
					<span>Estimated mash pH</span>
					<span class="tnum">{water.mashPh.toFixed(2)}</span>
				</li>
			</ul>
		</section>
	{/if}
</div>
