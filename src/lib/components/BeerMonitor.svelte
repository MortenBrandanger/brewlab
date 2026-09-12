<script lang="ts">
	import Vessel from './Vessel.svelte';
	import Meter from './Meter.svelte';
	import { appearanceOf } from '$lib/brewing/appearance';
	import { SENSORY_LABELS } from '$lib/brewing/sensory';
	import { brew } from '$lib/state/brew.svelte';
	import { STAGES, stageForFields, stageIndex, type Reveal } from '$lib/state/stages';
	import type { SensoryKey } from '$lib/brewing/types';

	const result = $derived(brew.result);
	const appearance = $derived(
		brew.context
			? appearanceOf(brew.context, result.metrics.srm)
			: { srm: result.metrics.srm, haze: 0.2, head: 0.5, carbonation: 0.6 }
	);

	/**
	 * When each flavour axis becomes knowable. Malt and roast come from the grist,
	 * so they are readable as soon as the grain is milled. Bitterness needs the
	 * boil. Esters and alcohol need the yeast to have finished.
	 */
	const AXIS_REVEAL: Record<SensoryKey, Reveal> = {
		malt: 'colour',
		caramel: 'colour',
		roast: 'colour',
		bitterness: 'bitterness',
		hopFlavour: 'bitterness',
		hopAroma: 'bitterness',
		sweetness: 'alcohol',
		body: 'alcohol',
		fruitEsters: 'alcohol',
		phenols: 'alcohol',
		alcoholWarmth: 'alcohol',
		acidity: 'alcohol',
		crispness: 'flavour'
	};

	const axes = $derived(
		(Object.entries(result.sensory) as [SensoryKey, number][])
			.filter(([key, value]) => value >= 0.8 && brew.knows(AXIS_REVEAL[key]))
			.sort((a, b) => b[1] - a[1])
			.slice(0, 6)
	);

	/** Only the numbers that exist at this point in the brew day. */
	const metrics = $derived(
		[
			{ label: 'Mash pH', value: result.metrics.mashPh.toFixed(2), reveal: 'potential' as Reveal },
			{
				label: 'Grain',
				value: `${result.metrics.grainKg.toFixed(2)} kg`,
				reveal: 'potential' as Reveal
			},
			{ label: 'EBC', value: String(Math.round(result.metrics.ebc)), reveal: 'colour' as Reveal },
			{ label: 'OG', value: result.metrics.og.toFixed(3), reveal: 'gravity' as Reveal },
			{
				label: 'IBU',
				value: String(Math.round(result.metrics.ibu)),
				reveal: 'bitterness' as Reveal
			},
			{ label: 'FG', value: result.metrics.fg.toFixed(3), reveal: 'alcohol' as Reveal },
			{ label: 'ABV', value: `${result.metrics.abv.toFixed(1)}%`, reveal: 'alcohol' as Reveal },
			{
				label: 'CO₂',
				value: `${result.metrics.co2Volumes.toFixed(1)} vol`,
				reveal: 'flavour' as Reveal
			}
		].filter((m) => brew.knows(m.reveal))
	);

	/** Warnings only make sense about stages that have actually happened. */
	const problems = $derived(
		result.findings.filter((f) => {
			if (f.severity !== 'severe' && f.severity !== 'warning') return false;
			const stage = stageForFields(f.fields);
			return !stage || brew.brewedTo >= stageIndex(stage);
		})
	);

	const closest = $derived(brew.knows('judgement') ? result.styles[0] : undefined);
	const doneCount = $derived(brew.brewedTo + 1);

	const status = $derived(
		brew.brewedTo < 0
			? 'Nothing brewed yet. The water is on.'
			: brew.brewedTo >= STAGES.length - 1
				? result.verdict.headline
				: (STAGES[brew.brewedTo]?.done ?? '')
	);

	const nextUp = $derived(STAGES[brew.brewedTo + 1]);
</script>

<div class="flex flex-col gap-5 p-4">
	<div class="flex items-start gap-3">
		<Vessel
			brewedTo={brew.brewedTo}
			srm={result.metrics.srm}
			haze={appearance.haze}
			head={appearance.head}
			carbonation={appearance.carbonation}
		/>
		<div class="min-w-0 flex-1">
			<h2 class="font-display text-base font-semibold">
				{brew.knows('judgement') ? 'Your beer' : 'Brew day'}
			</h2>
			<p class="mt-0.5 text-xs text-muted">{status}</p>

			<div class="mt-3">
				<div class="flex items-center gap-1" aria-hidden="true">
					{#each STAGES as stage, index (stage.id)}
						<span
							class="h-1.5 flex-1 rounded-full {index <= brew.brewedTo
								? 'bg-copper'
								: 'bg-ui-active'}"
						></span>
					{/each}
				</div>
				<p class="tnum mt-1.5 text-xs text-subtle">{doneCount} of {STAGES.length} stages done</p>
			</div>

			{#if closest}
				<p class="mt-3 text-xs text-subtle">
					Closest style
					<span class="mt-0.5 block text-sm font-medium text-copper-text">{closest.name}</span>
					<span class="tnum text-xs text-muted">{closest.match}% match</span>
				</p>
			{/if}
		</div>
	</div>

	{#if metrics.length}
		<dl class="grid grid-cols-3 gap-x-3 gap-y-3 border-t border-line pt-4">
			{#each metrics as metric (metric.label)}
				<div>
					<dt class="text-xs text-subtle">{metric.label}</dt>
					<dd class="tnum text-sm font-medium text-fg">{metric.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if nextUp}
		<p class="prose-measure border-t border-line pt-4 text-xs text-subtle">
			<span class="text-muted">Up next: {nextUp.action.toLowerCase()}.</span>
			That is what lets the model tell you {nextUp.reveals}.
		</p>
	{/if}

	{#if axes.length}
		<section class="border-t border-line pt-4">
			<h3 class="field-label mb-2">Flavour so far</h3>
			<div class="flex flex-col gap-1.5">
				{#each axes as [key, value] (key)}
					<Meter label={SENSORY_LABELS[key]} {value} accent={value > 7 ? 'amber' : 'copper'} />
				{/each}
			</div>
		</section>
	{/if}

	{#if brew.brewedTo >= 0}
		<section class="border-t border-line pt-4">
			<h3 class="field-label mb-2">Watch list</h3>
			{#if problems.length === 0}
				<p class="flex items-start gap-2 text-xs text-muted">
					<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-hop" aria-hidden="true">
						<path
							d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Nothing flagged so far.
				</p>
			{:else}
				<ul class="flex flex-col gap-1.5">
					{#each problems.slice(0, 4) as finding (finding.code)}
						<li class="flex items-start gap-2 text-xs">
							<span
								class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
								class:bg-danger={finding.severity === 'severe'}
								class:bg-warn={finding.severity !== 'severe'}
								aria-hidden="true"
							></span>
							<span class="text-muted">
								<span class="sr-only"
									>{finding.severity === 'severe' ? 'Severe: ' : 'Warning: '}</span
								>
								{finding.title}
							</span>
						</li>
					{/each}
					{#if problems.length > 4}
						<li class="text-xs text-subtle">and {problems.length - 4} more in the report</li>
					{/if}
				</ul>
			{/if}
		</section>
	{/if}
</div>
