<script lang="ts">
	/**
	 * How are you cooling it down? — and what the cold side put at risk.
	 *
	 * The risks live with this question because they are what the minutes cost:
	 * the simulator does not model sanitation, and pretending it did would be
	 * worse than saying so.
	 */
	import SliderField from '../SliderField.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const risks = $derived(brew.context?.risks);

	/**
	 * How you cool it is the decision; the minutes are its consequence. Asking
	 * for the minutes directly asked the reader to know the answer before the
	 * question, and left one end of the slider with no visible downside.
	 */
	/**
	 * How you cool it is the decision; the minutes are its consequence. Asking
	 * for the minutes directly asked the reader to know the answer before the
	 * question, and left one end of the slider with no visible downside.
	 */
	const METHODS = [
		{
			id: 'immersion',
			label: 'Immersion coil',
			/** Minutes for a 20-litre batch; see `minutesFor`. */
			base: 25,
			active: true,
			says: 'A coil of copper pipe dropped into the kettle with the cold tap running through it. Stir the wort around it and twenty-odd minutes gets you there.'
		},
		{
			id: 'plate',
			label: 'Plate chiller',
			base: 10,
			active: true,
			says: 'The wort runs through a stack of thin plates against cold water flowing the other way. Very fast, and a nuisance to clean properly.'
		},
		{
			id: 'ice',
			label: 'Sink of ice',
			base: 60,
			active: true,
			says: 'The whole pot stood in ice water. No equipment to buy, but an hour of swapping ice and the last few degrees take forever.'
		},
		{
			id: 'slow',
			label: 'Let it cool overnight',
			base: 240,
			active: false,
			says: 'Lid on, left to fall on its own. Brewers do make good beer this way by keeping everything sealed — but every hour in the warm is an hour something else could take hold.'
		}
	] as const;

	/**
	 * A method takes longer on a bigger batch, and the cards used to claim the
	 * same figure whether you were chilling ten litres or forty.
	 *
	 * Actively chilled, the heat to remove is proportional to the volume while
	 * the chiller pulls it out at a roughly fixed rate, so the time scales
	 * linearly. Left to cool on its own it is the surface of the pot doing the
	 * work, and surface grows more slowly than volume — as the two-thirds power
	 * of it — so a bigger batch is slower, but not proportionally.
	 */
	function minutesFor(m: (typeof METHODS)[number]): number {
		const ratio = Math.max(0.25, brew.recipe.batchVolumeL / 20);
		const scaled = m.active ? m.base * ratio : m.base * Math.pow(ratio, 2 / 3);
		return Math.max(5, Math.round(scaled / 5) * 5);
	}

	let byHand = $state(false);
	const method = $derived.by(() => {
		if (byHand) return 'custom';
		const match = METHODS.find((m) => minutesFor(m) === brew.recipe.chill.minutes);
		return match?.id ?? 'custom';
	});

	const riskRows = $derived(
		risks
			? [
					{
						label: 'Contamination',
						value: risks.infection,
						note: 'Wild yeast and bacteria get their head start in warm wort.'
					},
					{
						label: 'Cooked corn (DMS)',
						value: risks.dms,
						note: 'Pilsner malt keeps producing it until the wort is cold.'
					},
					{
						label: 'Oxidation',
						value: risks.oxidation,
						note: 'After fermentation, oxygen turns hop aroma into cardboard.'
					}
				]
			: []
	);
</script>

<div class="flex flex-col gap-5">
	<div>
		<!--
			The cards answer the question; setting the minutes by hand is one more
			card among them rather than a second control underneath answering the
			same thing twice.
		-->
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each METHODS as option (option.id)}
				{@const mins = minutesFor(option)}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 {method === option.id
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={method === option.id}
						onclick={() => {
							brew.recipe.chill.minutes = mins;
							byHand = false;
						}}
					>
						<span class="flex items-baseline justify-between gap-2">
							<span class="text-sm font-medium">
								{option.label}
								{#if method === option.id && mins === DEFAULTS.chill.minutes}
									<span class="ms-1.5 text-[0.625rem] tracking-wide text-fg/70 uppercase"
										>default</span
									>
								{/if}
							</span>
							<span class="tnum text-xs {method === option.id ? 'text-fg' : 'text-muted'}">
								about {mins} min
							</span>
						</span>
						<span class="mt-1 block text-xs {method === option.id ? 'text-fg' : 'text-subtle'}">
							{option.says}
						</span>
					</button>
				</li>
			{/each}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {method === 'custom'
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={method === 'custom'}
					onclick={() => (byHand = true)}
				>
					<span class="text-sm font-medium">Set the minutes myself</span>
					<span class="mt-1 block text-xs {method === 'custom' ? 'text-fg' : 'text-subtle'}">
						If you have timed your own kit. The figures above are for
						{brew.recipe.batchVolumeL.toFixed(0)} litres — a bigger batch takes longer, because there
						is more heat to pull out of it.
					</span>
				</button>
			</li>
		</ul>
	</div>

	{#if method === 'custom'}
		<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
			<SliderField
				label="Time to pitching temperature"
				bind:value={brew.recipe.chill.minutes}
				defaultValue={DEFAULTS.chill.minutes}
				min={5}
				max={240}
				step={5}
				unit=" min"
				marks={[
					{ at: 20, label: 'fast' },
					{ at: 120, label: 'slow' }
				]}
				why="Every extra minute between 60 °C and pitching temperature is a minute something else could take hold."
			/>
		</div>
	{/if}

	<section>
		<h4 class="field-label mb-2">What the cold side put at risk</h4>
		<ul class="flex flex-col gap-2">
			{#each riskRows as row (row.label)}
				<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
					<div class="flex items-center justify-between gap-3">
						<span class="text-sm font-medium">{row.label}</span>
						<span
							class="chip"
							class:text-hop={row.value < 3}
							class:text-warn={row.value >= 3 && row.value < 6}
							class:text-danger-text={row.value >= 6}
						>
							<!-- The word alone had no scale. The figure is out of ten, like every other risk in the app. -->
							<span class="tnum">{row.value.toFixed(1)}<span class="opacity-70">/10</span></span>
							· {row.value < 3 ? 'low' : row.value < 6 ? 'moderate' : 'high'}
						</span>
					</div>
					<div class="mt-2 h-1.5 rounded-full bg-ui-active" aria-hidden="true">
						<div
							class="h-full rounded-full transition-[width] duration-200"
							style="width:{Math.min(100, row.value * 10)}%; background:{row.value < 3
								? 'var(--color-hop)'
								: row.value < 6
									? 'var(--color-warn)'
									: 'var(--color-danger)'}"
						></div>
					</div>
					<p class="prose-measure mt-1.5 text-xs text-muted">{row.note}</p>
				</li>
			{/each}
		</ul>
	</section>
</div>
