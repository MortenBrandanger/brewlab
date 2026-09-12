<script lang="ts">
	import { resolve } from '$app/paths';
	import { getFermentable, getHop, getYeast } from '$lib/brewing/ingredients';
	import {
		hopAdditionSummary,
		SENSORY_KEYS,
		SENSORY_LABELS,
		describeIntensity
	} from '$lib/brewing/sensory';
	import { WATER_PROFILE_BY_ID, SALTS } from '$lib/brewing/water';
	import { brew } from '$lib/state/brew.svelte';

	const recipe = $derived(brew.recipe);
	const result = $derived(brew.result);
	const totalKg = $derived(
		recipe.fermentables.reduce((sum, f) => sum + Math.max(0, f.weightKg), 0)
	);
	const yeast = $derived(getYeast(recipe.fermentation.yeastId));
	const waterProfile = $derived(WATER_PROFILE_BY_ID.get(recipe.water.profileId));
	const activeSalts = $derived(SALTS.filter((s) => (recipe.water.salts[s.key] ?? 0) > 0));
</script>

<svelte:head><title>{recipe.name} — recipe sheet</title></svelte:head>

<main id="main" class="mx-auto w-full max-w-[52rem] flex-1 px-4 py-6">
	<div class="no-print mb-5 flex flex-wrap gap-2">
		<button type="button" class="btn btn-primary" onclick={() => window.print()}
			>Print this sheet</button
		>
		<a class="btn btn-ghost" href={resolve('/')}>Back to the brewery</a>
	</div>

	<article class="panel p-6">
		<header>
			<h1 class="font-display text-xl">{recipe.name}</h1>
			<p class="tnum mt-2 text-sm text-muted">
				{recipe.batchVolumeL.toFixed(1)} L · OG {result.metrics.og.toFixed(3)} · FG
				{result.metrics.fg.toFixed(3)} · {result.metrics.abv.toFixed(1)}% ABV ·
				{Math.round(result.metrics.ibu)} IBU · {Math.round(result.metrics.ebc)} EBC
			</p>
			{#if result.styles[0]}
				<p class="mt-1 text-sm text-subtle">
					Closest style: {result.styles[0].name} ({result.styles[0].match}% match)
				</p>
			{/if}
		</header>

		<section class="mt-6">
			<h2 class="field-label mb-2">Grist</h2>
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-line text-start text-xs text-subtle">
						<th class="py-1 text-start font-medium">Fermentable</th>
						<th class="py-1 text-end font-medium">Weight</th>
						<th class="py-1 text-end font-medium">Share</th>
					</tr>
				</thead>
				<tbody>
					{#each recipe.fermentables as addition (addition.id)}
						{@const f = getFermentable(addition.fermentableId)}
						{#if f}
							<tr class="border-b border-line/60">
								<td class="py-1.5">{f.name}</td>
								<td class="tnum py-1.5 text-end">{addition.weightKg.toFixed(2)} kg</td>
								<td class="tnum py-1.5 text-end"
									>{Math.round((addition.weightKg / Math.max(0.001, totalKg)) * 100)}%</td
								>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</section>

		<section class="mt-6">
			<h2 class="field-label mb-2">Hops</h2>
			<table class="w-full text-sm">
				<tbody>
					{#each recipe.hops as addition (addition.id)}
						{@const hop = getHop(addition.hopId)}
						{#if hop}
							<tr class="border-b border-line/60">
								<td class="py-1.5"
									>{hop.name} <span class="text-subtle">({hop.alphaAcid.toFixed(1)}% AA)</span></td
								>
								<td class="tnum py-1.5 text-end">{addition.grams} g</td>
								<td class="py-1.5 text-end text-subtle">{hopAdditionSummary(addition)}</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</section>

		<div class="mt-6 grid gap-6 sm:grid-cols-2">
			<section>
				<h2 class="field-label mb-2">Water</h2>
				<p class="text-sm">{waterProfile?.name ?? 'Custom'}</p>
				<ul class="mt-1 text-sm text-muted">
					{#each activeSalts as salt (salt.key)}
						<li class="tnum">{salt.name}: {recipe.water.salts[salt.key]} g</li>
					{/each}
					{#if recipe.water.lacticAcidMl > 0}
						<li class="tnum">Lactic acid 88%: {recipe.water.lacticAcidMl} mL</li>
					{/if}
					<li class="tnum">Estimated mash pH {result.metrics.mashPh.toFixed(2)}</li>
				</ul>
			</section>

			<section>
				<h2 class="field-label mb-2">Mash</h2>
				<ul class="text-sm text-muted">
					{#each recipe.mash.steps as step (step.id)}
						<li class="tnum">{step.tempC} °C for {step.minutes} min</li>
					{/each}
					<li class="tnum">Thickness {recipe.mash.thicknessLPerKg.toFixed(1)} L/kg</li>
				</ul>
			</section>

			<section>
				<h2 class="field-label mb-2">Boil and volumes</h2>
				<ul class="tnum text-sm text-muted">
					<li>Boil {recipe.boilTimeMin} min</li>
					<li>
						Pre-boil {recipe.preBoilVolumeL.toFixed(1)} L → {recipe.batchVolumeL.toFixed(1)} L
					</li>
					<li>Efficiency {recipe.efficiencyPct}%</li>
					<li>Chill in {recipe.chill.minutes} min, pitch at {recipe.chill.pitchTempC} °C</li>
				</ul>
			</section>

			<section>
				<h2 class="field-label mb-2">Fermentation</h2>
				<p class="text-sm">
					{yeast?.name ?? 'No yeast selected'} · {recipe.fermentation.pitchRate} pitch
				</p>
				<ul class="tnum mt-1 text-sm text-muted">
					{#each recipe.fermentation.steps as step (step.id)}
						<li>{step.label}: {step.days} days at {step.tempC} °C</li>
					{/each}
					{#if recipe.fermentation.coldCrash}<li>Cold crash before packaging</li>{/if}
					<li>
						Condition {recipe.conditioning.days} days at {recipe.conditioning.tempC} °C to
						{recipe.conditioning.co2Volumes.toFixed(1)} volumes
					</li>
				</ul>
			</section>
		</div>

		<section class="mt-6">
			<h2 class="field-label mb-2">Expected profile</h2>
			<p class="prose-measure text-sm text-muted">{result.verdict.summary}</p>
			<ul class="mt-2 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-3">
				{#each SENSORY_KEYS.filter((k) => result.sensory[k] >= 1) as key (key)}
					<li class="text-muted">
						{SENSORY_LABELS[key]}:
						<span class="text-fg">{describeIntensity(result.sensory[key])}</span>
					</li>
				{/each}
			</ul>
		</section>

		{#if recipe.notes}
			<section class="mt-6">
				<h2 class="field-label mb-2">Notes</h2>
				<p class="prose-measure text-sm text-muted">{recipe.notes}</p>
			</section>
		{/if}

		<footer class="mt-6 border-t border-line pt-3 text-xs text-subtle">
			Generated by BrewLab. Every figure is a model estimate, not a measurement.
		</footer>
	</article>
</main>
