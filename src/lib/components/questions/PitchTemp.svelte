<script lang="ts">
	/**
	 * How cold before the yeast goes in?
	 */
	import SliderField from '../SliderField.svelte';
	import { getYeast } from '$lib/brewing/ingredients';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId));
</script>

<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
	<SliderField
		label="Pitching temperature"
		bind:value={brew.recipe.chill.pitchTempC}
		defaultValue={DEFAULTS.chill.pitchTempC}
		min={2}
		max={40}
		step={1}
		unit=" °C"
		marks={yeast
			? [
					{ at: yeast.tempMinC, label: `${yeast.tempMinC}` },
					{ at: yeast.tempMaxC, label: `${yeast.tempMaxC}` }
				]
			: []}
		why={yeast
			? `${yeast.name} works between ${yeast.tempMinC} and ${yeast.tempMaxC} °C. Stop at or below where you mean to ferment: the first twelve hours set the fruit and spice of the whole batch, and there is no taking them back.`
			: 'Stop at or below where you mean to ferment. You have not chosen a yeast yet, so its range is not marked.'}
	/>
</div>
