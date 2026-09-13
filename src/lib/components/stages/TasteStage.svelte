<script lang="ts">
	import ScoreDial from '../ScoreDial.svelte';
	import FigureValue from '../FigureValue.svelte';
	import SensoryProfile from '../SensoryProfile.svelte';
	import FindingList from '../FindingList.svelte';
	import ShowTheModel from '../ShowTheModel.svelte';
	import AgeCurve from '../AgeCurve.svelte';
	import BeerGlass from '../BeerGlass.svelte';
	import { appearanceOf, describeAppearance } from '$lib/brewing/appearance';
	import { scoreBand } from '$lib/brewing/scoring';
	import { brew } from '$lib/state/brew.svelte';
	import { STAGES, type StageId } from '$lib/state/stages';

	let { onadjust }: { onadjust: (stage: StageId) => void } = $props();

	const result = $derived(brew.result);
	const appearance = $derived(
		brew.context
			? appearanceOf(brew.context, result.metrics.srm)
			: { srm: result.metrics.srm, haze: 0.2, head: 0.5, carbonation: 0.6 }
	);

	/** There is nothing to taste until the beer has been made. */
	const pourable = $derived(brew.knows('flavour'));
	const judged = $derived(brew.knows('judgement'));
	const remaining = $derived(STAGES.slice(brew.brewedTo + 1, STAGES.length - 1));

	const strengths = $derived(result.findings.filter((f) => f.severity === 'info'));
	const risks = $derived(result.findings.filter((f) => f.severity !== 'info'));

	/**
	 * Every figure here carries its glossary entry. This grid was ten numbers
	 * deep and a reader with no brewing behind them could read exactly one of
	 * them — the calories. Colour drops SRM: showing the same property twice in
	 * two systems, neither explained, helped nobody.
	 */
	const technical = $derived([
		{
			label: 'Original gravity',
			figure: 'og',
			raw: result.metrics.og,
			value: result.metrics.og.toFixed(3)
		},
		{
			label: 'Final gravity',
			figure: 'fg',
			raw: result.metrics.fg,
			value: result.metrics.fg.toFixed(3)
		},
		{
			label: 'Alcohol',
			figure: 'abv',
			raw: result.metrics.abv,
			value: `${result.metrics.abv.toFixed(1)}%`
		},
		{
			label: 'Bitterness',
			figure: 'ibu',
			raw: result.metrics.ibu,
			value: `${Math.round(result.metrics.ibu)} IBU`
		},
		{
			label: 'Colour',
			figure: 'ebc',
			raw: result.metrics.ebc,
			value: `${Math.round(result.metrics.ebc)} EBC`
		},
		{
			label: 'Attenuation',
			figure: 'attenuation',
			raw: result.metrics.attenuation,
			value: `${Math.round(result.metrics.attenuation)}%`
		},
		{
			label: 'Bitterness against sugar',
			figure: 'bu-gu',
			raw: result.metrics.buGu,
			value: result.metrics.buGu.toFixed(2)
		},
		{
			label: 'Mash pH',
			figure: 'mash-ph',
			raw: result.metrics.mashPh,
			value: result.metrics.mashPh.toFixed(2)
		},
		{
			label: 'Carbonation',
			figure: 'co2-volumes',
			raw: result.metrics.co2Volumes,
			value: `${result.metrics.co2Volumes.toFixed(1)} vol`
		},
		{ label: 'Energy', figure: '', raw: 0, value: `${result.metrics.kcalPer330} kcal / 330 ml` }
	]);
</script>

{#if !pourable}
	<div class="flex flex-col items-start gap-4">
		<p class="prose-measure text-sm text-muted">
			Nothing has been poured yet. The simulator will not guess at a beer that has not been made —
			there is no alcohol before fermentation and no balance to judge before it is packaged.
		</p>
		<div class="rounded-lg bg-surface p-4 ring-1 ring-line">
			<h2 class="field-label mb-2">Still to do</h2>
			<ol class="flex flex-col gap-1.5">
				{#each remaining as step, i (step.id)}
					<li class="flex items-baseline gap-2.5 text-sm">
						<span class="tnum text-xs text-subtle">{i + 1}.</span>
						<button
							type="button"
							class="text-start text-copper-text hover:underline"
							onclick={() => onadjust(step.id)}
						>
							{step.action}
						</button>
						{#if step.reveals}
							<span class="text-xs text-subtle">— unlocks {step.reveals}</span>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-8">
		<!-- Verdict -->
		<section class="flex flex-wrap items-center gap-6">
			<BeerGlass {appearance} ebc={result.metrics.ebc} size="hero" />
			<div class="min-w-[16rem] flex-1">
				<p class="field-label">{judged ? 'Verdict' : 'Ready to pour'}</p>
				<h2 class="mt-1 font-display text-xl">
					{judged ? result.verdict.headline : 'The beer is packaged'}
				</h2>
				<p class="prose-measure mt-2 text-sm text-muted">
					{judged
						? result.verdict.summary
						: 'Everything is done. Pour a glass and the model will say what it thinks, and why.'}
				</p>
				<p class="prose-measure mt-2 text-sm text-subtle">
					{describeAppearance(appearance, result.metrics.ebc)}
				</p>
				{#if result.validation.length}
					<ul class="mt-3 flex flex-col gap-1">
						{#each result.validation as message (message)}
							<li class="text-xs text-warn">{message}</li>
						{/each}
					</ul>
				{/if}
			</div>
			{#if judged}
				<div class="flex items-start gap-5">
					<ScoreDial label="Overall" value={result.scores.overall} size="lg" />
					<div class="flex gap-4">
						<ScoreDial label="Technical" value={result.scores.technical.value} />
						<ScoreDial label="Coherence" value={result.scores.coherence.value} />
						<ScoreDial label="Enjoyment" value={result.scores.enjoyment.value} />
					</div>
				</div>
			{/if}
		</section>

		{#if judged}
			<p class="sr-only">
				Overall {result.scores.overall} out of 100, {scoreBand(result.scores.overall)}.
			</p>
		{/if}

		<!-- Numbers -->
		<section>
			<h3 class="field-label mb-3">Technical values</h3>
			<dl class="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{#each technical as row (row.label)}
					<div class="min-w-0">
						<dt class="text-xs text-subtle">{row.label}</dt>
						<dd class="text-sm">
							{#if row.figure}
								<FigureValue
									id={row.figure}
									value={row.raw}
									display={row.value}
									label={row.label}
								/>
							{:else}
								<span class="tnum font-medium text-fg">{row.value}</span>
							{/if}
						</dd>
					</div>
				{/each}
			</dl>
		</section>

		<!-- Sensory -->
		<section>
			<h3 class="field-label mb-3">Sensory profile</h3>
			<SensoryProfile sensory={result.sensory} />
			<p class="prose-measure mt-3 text-xs text-subtle">
				These are predictions on a 0–10 scale, not measurements. They describe what the model
				expects a taster to notice, given everything you chose.
			</p>
		</section>

		<!-- Styles -->
		{#if judged}
			<section>
				<h3 class="field-label mb-3">Closest styles</h3>
				{#if result.styles.length === 0}
					<p class="text-sm text-muted">
						Nothing in the catalogue is close. That is not a fault — it just means you have made
						something the style guidelines do not describe.
					</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each result.styles as style (style.styleId)}
							<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<h4 class="font-display text-sm font-semibold">{style.name}</h4>
									<span class="tnum text-sm font-medium text-copper-text">{style.match}% match</span
									>
								</div>
								<div class="mt-2 h-1.5 rounded-full bg-ui-active" aria-hidden="true">
									<div class="h-full rounded-full bg-copper" style="width:{style.match}%"></div>
								</div>
								{#if style.deviations.length}
									<ul class="mt-2 flex flex-wrap gap-1.5">
										{#each style.deviations as deviation (deviation)}
											<li class="chip">{deviation}</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ul>
					<p class="mt-2 text-xs text-subtle">
						A match is a distance measurement against the style's published ranges, not a
						probability.
					</p>
				{/if}
			</section>
		{/if}

		<!-- Key decisions -->
		<section>
			<h3 class="field-label mb-3">The decisions that shaped this beer</h3>
			<ol class="flex flex-col gap-2">
				{#each result.keyDecisions as decision, index (decision.title)}
					<li class="flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-line">
						<span
							class="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold
							{decision.direction === 1
								? 'bg-hop-dim'
								: decision.direction === -1
									? 'bg-danger-dim'
									: 'bg-ui-active'}"
							aria-hidden="true"
						>
							{index + 1}
						</span>
						<div class="min-w-0">
							<h4 class="text-sm font-medium">
								{decision.title}
								<span class="sr-only">
									{decision.direction === 1
										? '(helped the beer)'
										: decision.direction === -1
											? '(hurt the beer)'
											: ''}
								</span>
							</h4>
							<p class="prose-measure mt-0.5 text-xs text-muted">{decision.detail}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Findings -->
		<div class="grid gap-8 lg:grid-cols-2">
			<section>
				<h3 class="field-label mb-3">Risks and faults</h3>
				{#if risks.length === 0}
					<p class="text-sm text-muted">The model found nothing to warn you about.</p>
				{:else}
					<FindingList findings={risks} ongoto={onadjust} />
				{/if}
			</section>
			<section>
				<h3 class="field-label mb-3">Strengths</h3>
				{#if strengths.length === 0}
					<p class="text-sm text-muted">Nothing stood out as particularly well judged.</p>
				{:else}
					<FindingList findings={strengths} />
				{/if}
			</section>
		</div>

		<!-- Improvements -->
		<section>
			<h3 class="field-label mb-3">What to change next time</h3>
			<ul class="grid gap-2 sm:grid-cols-2">
				{#each result.improvements as improvement (improvement.title)}
					<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
						<h4 class="font-display text-sm font-semibold">{improvement.title}</h4>
						<p class="prose-measure mt-1 text-xs text-muted">{improvement.detail}</p>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Ageing -->
		<section>
			<h3 class="field-label mb-3">How it develops over time</h3>
			<AgeCurve curve={result.ageCurve} />
		</section>

		<!-- Show the model -->
		{#if judged}
			<section>
				<details class="group">
					<summary
						class="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 font-display text-sm font-semibold text-copper-text hover:underline"
					>
						<svg
							viewBox="0 0 16 16"
							class="h-3.5 w-3.5 transition-transform group-open:rotate-90"
							aria-hidden="true"
						>
							<path
								d="M6 3.5 L11 8 L6 12.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
						Show the model
					</summary>
					<div class="mt-3">
						<ShowTheModel scores={result.scores} />
					</div>
				</details>
			</section>
		{/if}
	</div>
{/if}
