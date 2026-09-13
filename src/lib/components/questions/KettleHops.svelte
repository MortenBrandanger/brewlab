<script lang="ts">
	/**
	 * What goes in the kettle — and, below it, the bitterness that buys.
	 */
	import FigureValue from '../FigureValue.svelte';
	import HopTimeline from '../HopTimeline.svelte';
	import HopAdditions from '../HopAdditions.svelte';
	import { brew } from '$lib/state/brew.svelte';

	/** The timeline labels each addition with the bitterness it actually buys. */
	const ibuByAddition = $derived(
		new Map(
			brew.result ? (brew.context?.ibu.contributions ?? []).map((c) => [c.additionId, c.ibu]) : []
		)
	);

	const descriptors = $derived(brew.context?.hopLoad.descriptors ?? []);
</script>

<div class="flex flex-col gap-6">
	<HopAdditions use="boil" />

	<div class="flex flex-col gap-5">
		<div>
			<h4 class="field-label mb-2">The schedule, from kettle to fermenter</h4>
			<HopTimeline hops={brew.recipe.hops} boilTimeMin={brew.recipe.boilTimeMin} {ibuByAddition} />
		</div>

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
		</div>
	</div>
</div>
