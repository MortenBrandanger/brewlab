<script lang="ts">
	/**
	 * How much beer do you want?
	 *
	 * One number, and everything else on the brew day scales to hit it.
	 */
	import SliderField from '../SliderField.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	/** The four sizes people actually brew, so the slider is for the rest. */
	const SIZES = [
		{ litres: 10, note: 'A half batch. About fifteen bottles.' },
		{ litres: 20, note: 'The usual homebrew batch. About a case of bottles.' },
		{ litres: 23, note: 'A full five-gallon batch, if your kit is American.' },
		{ litres: 40, note: 'A double batch, if your kettle and fermenter are big enough.' }
	];
</script>

<div class="flex flex-col gap-6">
	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
		{#each SIZES as size (size.litres)}
			{@const selected = brew.recipe.batchVolumeL === size.litres}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => (brew.recipe.batchVolumeL = size.litres)}
				>
					<span class="block text-sm font-medium">{size.litres} L</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
						{size.note}
					</span>
				</button>
			</li>
		{/each}
	</ul>

	<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
		<SliderField
			label="Batch size"
			bind:value={brew.recipe.batchVolumeL}
			defaultValue={DEFAULTS.batchVolumeL}
			min={1}
			max={60}
			step={0.5}
			unit=" L"
			format={(n) => n.toFixed(1)}
			why="How much beer you want at the end. Twenty litres is a normal homebrew batch — about a case of bottles. Gravity, bitterness and colour are all concentrations, so this one number moves every figure in the report at once."
		/>
	</div>
</div>
