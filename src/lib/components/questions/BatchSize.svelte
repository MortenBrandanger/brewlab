<script lang="ts">
	/**
	 * How much beer do you want?
	 *
	 * Four sizes and nothing else. The slider that used to sit under them asked
	 * the same question a second time, in a worse unit, and a card saying "20 L
	 * — about a case of bottles" is a better answer than a handle at 20.0. The
	 * odd size is still reachable, folded behind its own card the way an unusual
	 * boil length is.
	 */
	import SliderField from '../SliderField.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import { collectVolumeL, rigFor } from '$lib/brewing/rigs';

	/** The four sizes people actually brew. */
	const SIZES = [
		{ litres: 10, note: 'A half batch. About fifteen bottles.' },
		{ litres: 20, note: 'The usual homebrew batch. About a case of bottles.' },
		{ litres: 23, note: 'A full five-gallon batch, if your kit is American.' },
		{ litres: 40, note: 'A double batch, if your kettle and fermenter are big enough.' }
	];

	let custom = $state(!SIZES.some((size) => size.litres === brew.recipe.batchVolumeL));

	/*
	 * Everything downstream is measured against the batch, so the volume to
	 * collect has to follow it. Leaving it behind would put the next screen in
	 * the position of quietly correcting a number the reader had already seen.
	 */
	function setBatch(litres: number) {
		brew.recipe.batchVolumeL = litres;
		brew.recipe.preBoilVolumeL = collectVolumeL(
			rigFor(brew.recipe.efficiencyPct),
			litres,
			brew.recipe.boilTimeMin
		);
	}
</script>

<div class="flex flex-col gap-5">
	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each SIZES as size (size.litres)}
			{@const selected = !custom && brew.recipe.batchVolumeL === size.litres}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => {
						setBatch(size.litres);
						custom = false;
					}}
				>
					<span class="block text-sm font-medium">{size.litres} L</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
						{size.note}
					</span>
				</button>
			</li>
		{/each}
		<li>
			<button
				type="button"
				class="h-full w-full rounded-lg p-3 text-start ring-1 {custom
					? 'bg-copper-dim ring-copper'
					: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
				aria-pressed={custom}
				onclick={() => (custom = true)}
			>
				<span class="block text-sm font-medium">Another size</span>
				<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
					Whatever your fermenter actually holds.
				</span>
			</button>
		</li>
	</ul>

	{#if custom}
		<div class="max-w-sm">
			<SliderField
				label="Batch size"
				bind:value={() => brew.recipe.batchVolumeL, setBatch}
				defaultValue={DEFAULTS.batchVolumeL}
				min={1}
				max={60}
				step={0.5}
				unit=" L"
				format={(n) => n.toFixed(1)}
				why="Gravity, bitterness and colour are all concentrations, so this one number moves every figure in the report at once."
			/>
		</div>
	{/if}
</div>
