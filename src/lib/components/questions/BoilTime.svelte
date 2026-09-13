<script lang="ts">
	/**
	 * How long do you boil it for?
	 */
	import SliderField from '../SliderField.svelte';
	import LearningNote from '../LearningNote.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	/** An unusual boil length is a deliberate choice, so it survives a revisit. */
	let customBoil = $state(![30, 60, 90].includes(brew.recipe.boilTimeMin));
</script>

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
		why="Sixty minutes is the default because that is roughly how long it takes to turn most of the hop resin into bitterness. Pilsner malt wants ninety, to drive off the compound that would otherwise taste of cooked sweetcorn."
	/>
</div>
