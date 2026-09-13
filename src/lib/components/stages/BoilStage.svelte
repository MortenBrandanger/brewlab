<script lang="ts">
	/**
	 * The boil, as the three acts it actually is.
	 *
	 * This is the only stage of a brew day literally driven by a running clock,
	 * and it was the one presented as the most static: every control for ninety
	 * minutes of work laid out at once, with no sense that anything happens in an
	 * order. You weigh the hops out into cups before you light the burner; the
	 * kettle takes twenty minutes to come up and tries to boil over on the way;
	 * then the clock runs and each charge goes in at its minute; then the flame
	 * goes out and the whirlpool is a separate, cooler thing.
	 */
	import SliderField from '../SliderField.svelte';
	import FigureValue from '../FigureValue.svelte';
	import LearningNote from '../LearningNote.svelte';
	import HopTimeline from '../HopTimeline.svelte';
	import HopAdditions from '../HopAdditions.svelte';
	import StageSteps, { type Step } from '../StageSteps.svelte';
	import { getHop } from '$lib/brewing/ingredients';
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

	const kettleHops = $derived(brew.recipe.hops.filter((h) => h.use === 'boil'));
	const whirlpoolHops = $derived(brew.recipe.hops.filter((h) => h.use === 'whirlpool'));

	function listOf(hops: typeof brew.recipe.hops): string {
		const names = hops.map((h) => `${getHop(h.hopId)?.name ?? 'hop'} ${h.grams} g`);
		return names.length ? names.join(', ') : 'nothing';
	}

	const steps: Step[] = $derived([
		{
			id: 'plan',
			title: 'Weigh the hops out and set the clock',
			says: 'Before the burner goes on. Every charge into its own cup, labelled with the minute it goes in — once the kettle is boiling you will not have time to weigh anything.',
			summary: `${brew.recipe.boilTimeMin} min · ${listOf(kettleHops)} in the kettle`
		},
		{
			id: 'boil',
			title: 'Bring it to a boil and start the timer',
			says: 'Twenty minutes of nothing, then the hot break: a head of foam climbs the kettle fast and will go over the side. Lift the lid, turn it down, and it settles. Once it is rolling properly the clock starts, and every addition below goes in at its minute.',
			summary: `${Math.round(brew.result.metrics.ibu)} IBU from the kettle`
		},
		{
			id: 'flameout',
			title: 'Kill the heat and whirlpool',
			says: 'The clock runs out. You stir the kettle hard into a whirlpool so the spent hops and protein settle into a cone in the middle, and let it fall to the temperature you want before anything else goes in. It is still hot enough to steep, so aroma survives here where the boil destroyed it.',
			summary: whirlpoolHops.length ? listOf(whirlpoolHops) : 'straight to the chiller'
		}
	]);
</script>

<StageSteps stage="boil" {steps}>
	{#snippet content(id)}
		{#if id === 'plan'}
			<div class="flex flex-col gap-5">
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

				<HopAdditions use="boil" />
			</div>
		{:else if id === 'boil'}
			<div class="flex flex-col gap-5">
				<div>
					<h4 class="field-label mb-2">The schedule, from kettle to fermenter</h4>
					<HopTimeline
						hops={brew.recipe.hops}
						boilTimeMin={brew.recipe.boilTimeMin}
						{ibuByAddition}
					/>
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
					<p class="prose-measure mt-2 text-xs text-subtle">
						The second figure is the better guide of the two: the same bitterness feels sharp in a
						small beer and mild in a big one, so it weighs one against the other. Most balanced
						beers land between 0.4 and 0.8.
					</p>
				</div>

				<p class="prose-measure text-xs text-subtle">
					Changed your mind about a charge? Reopen the act above — nothing here is fixed until the
					stage is done.
				</p>
			</div>
		{:else}
			<HopAdditions use="whirlpool" />
		{/if}
	{/snippet}
</StageSteps>
