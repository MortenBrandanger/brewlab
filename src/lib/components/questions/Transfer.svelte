<script lang="ts">
	/**
	 * How carefully does it go into the fermenter? — and the last acts of the
	 * cold side, which belong to the same move across: read the gravity, seal it,
	 * shake air back in.
	 */
	import SegmentedControl from '../SegmentedControl.svelte';
	import FigureValue from '../FigureValue.svelte';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-4">
		<SegmentedControl
			label="How carefully does it go across"
			bind:value={brew.recipe.chill.transferQuality}
			defaultValue={DEFAULTS.chill.transferQuality}
			options={[
				{
					value: 'careless',
					label: 'Splashed',
					hint: 'Poured from height with the lid off. Air beaten into the wort, and whatever is in the room goes in with it.'
				},
				{
					value: 'normal',
					label: 'Ordinary care',
					hint: 'Siphoned gently through sanitised tubing, with the tube reaching the bottom so it does not splash.'
				},
				{
					value: 'closed',
					label: 'Closed transfer',
					hint: 'The receiving vessel filled with CO₂ first so the beer never meets air at all. Worth the trouble for a hoppy beer.'
				}
			]}
		/>
		<p class="prose-measure text-xs text-subtle">
			Before fermentation a splash of air is harmless, and the yeast even wants some. After
			fermentation the same splash is what turns hop aroma into wet cardboard — which is why this
			choice matters more later than it does now.
		</p>
	</div>

	<div class="relative flex flex-col gap-4">
		<h4 class="field-label">Then read the gravity and seal it</h4>
		<dl class="flex flex-wrap items-baseline gap-x-8 gap-y-2">
			<div>
				<dt class="text-xs text-subtle">Original gravity</dt>
				<dd class="text-sm">
					<FigureValue
						id="og"
						value={brew.result.metrics.og}
						display={brew.result.metrics.og.toFixed(3)}
						label="Original gravity"
					/>
				</dd>
			</div>
			<div>
				<dt class="text-xs text-subtle">Into the fermenter</dt>
				<dd class="tnum text-sm font-medium text-fg">
					{brew.recipe.batchVolumeL.toFixed(1)} L
				</dd>
			</div>
		</dl>
		<p class="prose-measure text-xs text-muted">
			Then shake the sealed fermenter hard for a minute, or run oxygen through a stone if you have
			one. Yeast needs air to build itself before it can start on the sugar, and this is the only
			point in the whole process where putting air in is a good idea.
		</p>
	</div>
</div>
