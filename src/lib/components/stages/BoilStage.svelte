<script lang="ts">
	import SliderField from '../SliderField.svelte';
	import FigureValue from '../FigureValue.svelte';
	import LearningNote from '../LearningNote.svelte';
	import HopTimeline from '../HopTimeline.svelte';
	import HopAdditions from '../HopAdditions.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	/** The timeline labels each addition with the bitterness it actually buys. */
	const ibuByAddition = $derived(
		new Map(
			brew.result ? (brew.context?.ibu.contributions ?? []).map((c) => [c.additionId, c.ibu]) : []
		)
	);

	/** An unusual boil length is a deliberate choice, so it survives a revisit. */
	let customBoil = $state(![30, 60, 90].includes(brew.recipe.boilTimeMin));

	const descriptors = $derived(brew.context?.hopLoad.descriptors ?? []);
</script>

<div class="flex flex-col gap-6">
	<div>
		<span class="field-label mb-1.5">
			How long to boil
			{#if brew.recipe.boilTimeMin === DEFAULTS.boilTimeMin && !customBoil}
				<span class="ms-1.5 text-[0.625rem] tracking-wide text-subtle">default</span>
			{/if}
		</span>
		<div class="flex flex-wrap items-center gap-1.5">
			{#each [30, 60, 90] as preset (preset)}
				<button
					type="button"
					class="btn h-9 text-xs {brew.recipe.boilTimeMin === preset && !customBoil
						? 'btn-primary'
						: 'btn-ghost'}"
					aria-pressed={brew.recipe.boilTimeMin === preset && !customBoil}
					onclick={() => {
						brew.recipe.boilTimeMin = preset;
						customBoil = false;
					}}
				>
					{preset} min
				</button>
			{/each}
			<button
				type="button"
				class="btn h-9 text-xs {customBoil ? 'btn-primary' : 'btn-ghost'}"
				aria-pressed={customBoil}
				onclick={() => (customBoil = true)}
			>
				Other
			</button>
		</div>

		{#if customBoil}
			<div class="mt-2 max-w-sm">
				<SliderField
					label="Boil time"
					bind:value={brew.recipe.boilTimeMin}
					defaultValue={DEFAULTS.boilTimeMin}
					min={0}
					max={180}
					step={5}
					unit=" min"
				/>
			</div>
		{/if}

		<LearningNote
			why="Sixty minutes is the default because that is roughly how long it takes to isomerise most of the alpha acid you are going to get. Pilsner malt wants ninety, to drive off the precursor that becomes cooked-corn DMS."
		/>
	</div>

	<section>
		<h3 class="field-label mb-2">The hop schedule, from kettle to fermenter</h3>
		<HopTimeline hops={brew.recipe.hops} boilTimeMin={brew.recipe.boilTimeMin} {ibuByAddition} />
	</section>

	<div class="relative">
		<dl class="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
			<div>
				<dt class="text-xs text-subtle">Bitterness</dt>
				<dd>
					<FigureValue
						id="ibu"
						value={brew.result.metrics.ibu}
						display="{Math.round(brew.result.metrics.ibu)} IBU"
						label="Bitterness"
					/>
				</dd>
			</div>
			<div>
				<dt class="text-xs text-subtle">Bitterness against sugar</dt>
				<dd>
					<FigureValue
						id="bu-gu"
						value={brew.result.metrics.buGu}
						display={brew.result.metrics.buGu.toFixed(2)}
						label="Bitterness against sugar"
					/>
				</dd>
			</div>
			{#if descriptors.length}
				<div>
					<dt class="text-xs text-subtle">Aroma</dt>
					<dd class="text-sm font-medium text-fg">{descriptors.join(', ')}</dd>
				</div>
			{/if}
		</dl>
		<p class="prose-measure mt-2 text-xs text-subtle">
			The second figure is the better guide of the two: the same bitterness feels sharp in a small
			beer and mild in a big one, so it weighs one against the other. Most balanced beers land
			between 0.4 and 0.8.
		</p>
	</div>

	<section>
		<HopAdditions use="boil" />
	</section>

	<section>
		<HopAdditions use="whirlpool" />
	</section>
</div>
