<script lang="ts">
	/**
	 * Bottles or a keg?
	 *
	 * The choice, and — for bottles only — where the crate sits while it
	 * carbonates, because that is part of the same decision.
	 */
	import SegmentedControl from '../SegmentedControl.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	/** Optional on older saved recipes, so both are read with a fallback. */
	const packaging = $derived(brew.recipe.conditioning.packaging ?? 'bottles');
	const carbonationTempC = $derived(brew.recipe.conditioning.carbonationTempC ?? 20);
	/**
	 * Bottle yeast is dormant in the cold. Sending bottles straight to a cellar
	 * means the priming sugar never ferments and the beer stays flat, which the
	 * stage used to allow silently while still printing a sugar dose.
	 */
	const tooColdToCarbonate = $derived(packaging === 'bottles' && carbonationTempC < 15);

	/** Where a crate of freshly capped bottles can stand for a fortnight. */
	const SPOTS = [
		{
			id: 'room',
			name: 'Indoors',
			tempC: 20,
			what: 'Room temperature, out of the light. The yeast left in the bottle is awake here and eats the priming sugar in about two weeks.'
		},
		{
			id: 'cool',
			name: 'A cool room',
			tempC: 15,
			what: 'The edge of what the yeast will work at. It gets there, but slowly — give it three weeks rather than two.'
		},
		{
			id: 'cold',
			name: 'Straight into the cold',
			tempC: 8,
			what: 'Too cold. The yeast goes dormant before it has touched the sugar, and the bottles stay flat however long you wait.'
		}
	];
</script>

<div class="flex flex-col gap-6">
	<!-- The first decision of the stage: it changes what the rest of it asks. -->
	<SegmentedControl
		label="How are you packaging it"
		bind:value={() => packaging, (v) => (brew.recipe.conditioning.packaging = v)}
		defaultValue={DEFAULTS.conditioning.packaging}
		options={[
			{
				value: 'bottles' as const,
				label: 'Bottles',
				hint: 'Filled with a measured dose of sugar and capped. The yeast still in the beer eats that sugar and the gas has nowhere to go, so the bottle carbonates itself over about two weeks in the warm.'
			},
			{
				value: 'keg' as const,
				label: 'Keg',
				hint: 'Sealed and connected to a CO₂ bottle, which pushes gas in until the beer holds what you asked for. No sugar, no waiting, and it can go straight into the cold.'
			}
		]}
	/>

	{#if packaging === 'bottles'}
		<!-- Where the crate sits for the first fortnight. A place, not a number. -->
		<div>
			<p class="field-label mb-2">Where the crate sits while it carbonates</p>
			<ul class="grid gap-2 sm:grid-cols-3">
				{#each SPOTS as spot (spot.id)}
					{@const selected = carbonationTempC === spot.tempC}
					<li>
						<button
							type="button"
							class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
								? 'bg-copper-dim ring-copper'
								: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
							aria-pressed={selected}
							onclick={() => (brew.recipe.conditioning.carbonationTempC = spot.tempC)}
						>
							<span class="flex items-baseline justify-between gap-2">
								<span class="text-sm font-medium">
									{spot.name}
									{#if selected && spot.tempC === DEFAULTS.conditioning.carbonationTempC}
										<span class="ms-1.5 text-[0.625rem] tracking-wide text-fg/70 uppercase"
											>default</span
										>
									{/if}
								</span>
								<span class="tnum text-xs {selected ? 'text-fg' : 'text-muted'}"
									>{spot.tempC} °C</span
								>
							</span>
							<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
								>{spot.what}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		</div>
		{#if tooColdToCarbonate}
			<p class="flex items-start gap-1.5 text-sm text-warn">
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
				At {carbonationTempC} °C the yeast in the bottle stays dormant, so the priming sugar is never
				eaten and the beer stays flat. Give it a fortnight somewhere around 20 °C first, then move the
				crate somewhere cold.
			</p>
		{/if}
	{/if}
</div>
