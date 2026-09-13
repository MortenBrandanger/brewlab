<script lang="ts">
	import { FERMENTABLES, getFermentable } from '$lib/brewing/ingredients';
	import { srmToCss } from '$lib/brewing/appearance';
	import { ebcToSrm } from '$lib/brewing/calculations';
	import { ferm } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import type { FermentableCategory } from '$lib/brewing/types';

	const CATEGORY_LABEL: Record<FermentableCategory, string> = {
		base: 'Base malt',
		speciality: 'Speciality malt',
		roast: 'Roasted malt',
		adjunct: 'Adjunct',
		sugar: 'Sugar'
	};

	const grist = $derived(brew.context?.gravity.grist);
	const totalKg = $derived(
		brew.recipe.fermentables.reduce((sum, f) => sum + Math.max(0, f.weightKg), 0)
	);

	let picking = $state(false);
	let pickerCategory = $state<FermentableCategory>('base');

	function add(id: string) {
		const existing = brew.recipe.fermentables.find((f) => f.fermentableId === id);
		if (existing) {
			existing.weightKg = Math.round((existing.weightKg + 0.25) * 100) / 100;
		} else {
			brew.recipe.fermentables.push(ferm(id, id === 'pale-ale' || id === 'pilsner' ? 4 : 0.25));
		}
		picking = false;
	}

	function remove(additionId: string) {
		brew.recipe.fermentables = brew.recipe.fermentables.filter((f) => f.id !== additionId);
	}

	const categories = ['base', 'speciality', 'roast', 'adjunct', 'sugar'] as const;

	/** Three grists that go somewhere, for a brewer staring at an empty scale. */
	const STARTERS = [
		{
			name: 'Pale and hoppy',
			note: 'A clean base for pale ales and IPAs.',
			grist: [
				['pale-ale', 4.4],
				['munich-light', 0.4]
			] as [string, number][]
		},
		{
			name: 'Continental lager',
			note: 'Pilsner malt with a little depth behind it.',
			grist: [
				['pilsner', 4.3],
				['munich-light', 0.4]
			] as [string, number][]
		},
		{
			name: 'Dark and roasty',
			note: 'The backbone of a stout or porter.',
			grist: [
				['pale-ale', 3.6],
				['flaked-oats', 0.3],
				['roasted-barley', 0.4]
			] as [string, number][]
		}
	];

	function useStarter(grist: [string, number][]) {
		brew.recipe.fermentables = grist.map(([id, kg]) => ferm(id, kg));
	}
</script>

{#snippet addControl()}
	<button
		type="button"
		class="btn btn-ghost"
		onclick={() => (picking = !picking)}
		aria-expanded={picking}
	>
		<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
			<path
				d="M8 3 V13 M3 8 H13"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
			/>
		</svg>
		Add malt or sugar
	</button>
{/snippet}

<div class="flex flex-col gap-5">
	{#if brew.recipe.fermentables.length === 0}
		<!--
			Both ways in live inside this box. Splitting the starting grists from the
			"add one at a time" button put two answers to the same question in two
			places, with a border between them.
		-->
		<section class="rounded-lg border border-dashed border-line-strong p-5">
			<h3 class="font-display text-sm font-semibold">Nothing weighed out yet</h3>
			<p class="prose-measure mt-1 text-sm text-muted">
				A beer needs something to ferment. Start from one of these and change it, or build the grist
				yourself.
			</p>
			<ul class="mt-4 grid gap-2 sm:grid-cols-3">
				{#each STARTERS as starter (starter.name)}
					<li>
						<button
							type="button"
							class="h-full w-full rounded-lg bg-surface p-3 text-start ring-1 ring-line transition-colors hover:bg-ui-hover hover:ring-line-strong"
							onclick={() => useStarter(starter.grist)}
						>
							<span class="block text-sm font-medium">{starter.name}</span>
							<span class="mt-0.5 block text-xs text-subtle">{starter.note}</span>
						</button>
					</li>
				{/each}
			</ul>
			<div class="mt-3">{@render addControl()}</div>
		</section>
	{:else}
		<!-- The grist at a glance: real colours, real proportions. -->
		<div>
			<div class="flex h-7 overflow-hidden rounded-md ring-1 ring-line" aria-hidden="true">
				{#each brew.recipe.fermentables as addition (addition.id)}
					{@const f = getFermentable(addition.fermentableId)}
					{#if f && totalKg > 0}
						<div
							class="transition-[width] duration-200"
							style="width:{(addition.weightKg / totalKg) * 100}%; background:{srmToCss(
								ebcToSrm(f.colourEbc)
							)}"
							title="{f.name} — {Math.round((addition.weightKg / totalKg) * 100)}%"
						></div>
					{/if}
				{/each}
			</div>
			{#if prefs.showWhy}
				<!-- A glossary note belongs against the numbers it decodes, not floating
				     at the top of the panel where it explains nothing yet. -->
				<p class="prose-measure mt-1.5 text-xs text-muted">
					EBC is the colour scale brewers use, measured on the malt and on the finished beer.
					Roughly: 4 is pale straw, 12 gold, 25 amber, 60 brown and anything past 200 is black.
				</p>
			{/if}
			<p class="tnum mt-1.5 text-xs text-subtle">
				{totalKg.toFixed(2)} kg of grist
				{#if grist}
					· {Math.round(grist.diastaticShare * 100)}% carries enzymes
					{#if grist.specialityShare > 0}
						· {Math.round(grist.specialityShare * 100)}% speciality
					{/if}
					{#if grist.roastShare > 0}
						· {Math.round(grist.roastShare * 100)}% roasted
					{/if}
				{/if}
			</p>
		</div>
		<ul class="flex flex-col gap-2">
			{#each brew.recipe.fermentables as addition (addition.id)}
				{@const f = getFermentable(addition.fermentableId)}
				{#if f}
					{@const share = totalKg > 0 ? addition.weightKg / totalKg : 0}
					{@const over = share > f.maxShare}
					<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
						<div class="flex flex-wrap items-start gap-x-3 gap-y-2">
							<span
								class="mt-1 h-7 w-7 shrink-0 rounded-full ring-1 ring-line-strong"
								style="background:{srmToCss(ebcToSrm(f.colourEbc))}"
								aria-hidden="true"
							></span>
							<div class="min-w-[9rem] flex-1">
								<p class="text-sm font-medium">{f.name}</p>
								<p class="text-xs text-subtle">
									{CATEGORY_LABEL[f.category]} · {Math.round(f.colourEbc)} EBC
								</p>
							</div>
							<div class="flex items-center gap-2">
								<label class="sr-only" for="w-{addition.id}">{f.name} weight in kilograms</label>
								<input
									id="w-{addition.id}"
									class="input w-24"
									type="number"
									min="0"
									max="100"
									step="0.05"
									inputmode="decimal"
									bind:value={addition.weightKg}
								/>
								<span class="text-xs text-muted">kg</span>
								<span class="tnum w-12 text-right text-sm font-medium" class:text-warn={over}>
									{Math.round(share * 100)}%
								</span>
								<button
									type="button"
									class="btn btn-quiet h-9 w-9 !px-0"
									onclick={() => remove(addition.id)}
									aria-label="Remove {f.name}"
								>
									<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
										<path
											d="M4 4 L12 12 M12 4 L4 12"
											fill="none"
											stroke="currentColor"
											stroke-width="1.8"
											stroke-linecap="round"
										/>
									</svg>
								</button>
							</div>
						</div>
						<p class="mt-1.5 text-xs text-muted">{f.blurb}</p>
						{#if over}
							<p class="mt-1.5 flex items-start gap-1.5 text-xs text-warn">
								<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
									<path
										d="M8 2 L15 14 L1 14 Z"
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linejoin="round"
									/>
									<path
										d="M8 6.5 V9.5 M8 11.5 V11.6"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
								</svg>
								Usually kept under {Math.round(f.maxShare * 100)}%. Allowed, but make it deliberate.
							</p>
						{/if}
					</li>
				{/if}
			{/each}
		</ul>

		<!-- The grist bar above already carries the weight and the shares. -->
		<div>{@render addControl()}</div>
	{/if}

	{#if picking}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<div class="mb-3 flex flex-wrap gap-1">
				{#each categories as category (category)}
					<button
						type="button"
						class="btn h-8 text-xs {pickerCategory === category ? 'btn-primary' : 'btn-quiet'}"
						onclick={() => (pickerCategory = category)}
						aria-pressed={pickerCategory === category}
					>
						{CATEGORY_LABEL[category]}
					</button>
				{/each}
			</div>
			<ul class="grid gap-1.5 sm:grid-cols-2">
				{#each FERMENTABLES.filter((f) => f.category === pickerCategory) as option (option.id)}
					<li>
						<button
							type="button"
							class="flex w-full items-start gap-2.5 rounded-md p-2 text-start transition-colors hover:bg-ui-hover"
							onclick={() => add(option.id)}
						>
							<span
								class="mt-0.5 h-5 w-5 shrink-0 rounded-full ring-1 ring-line-strong"
								style="background:{srmToCss(ebcToSrm(option.colourEbc))}"
								aria-hidden="true"
							></span>
							<span class="min-w-0">
								<span class="block text-sm font-medium">{option.name}</span>
								<span class="block text-xs text-subtle">{option.blurb}</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
