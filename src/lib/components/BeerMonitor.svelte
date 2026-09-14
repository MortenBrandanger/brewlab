<script lang="ts">
	import Vessel from './Vessel.svelte';
	import Meter from './Meter.svelte';
	import FigureValue from './FigureValue.svelte';
	import { appearanceOf } from '$lib/brewing/appearance';
	import { SENSORY_LABELS } from '$lib/brewing/sensory';
	import { getFermentable, getHop, getYeast } from '$lib/brewing/ingredients';
	import { WATER_PROFILE_BY_ID } from '$lib/brewing/water';
	import { brew } from '$lib/state/brew.svelte';
	import { forecastAbv } from '$lib/brewing/forecast';
	import { targetMisses } from '$lib/brewing/target';
	import { playbackFor, type Playback } from '$lib/brewing/playback';
	import { prefs } from '$lib/state/prefs.svelte';
	import { untrack } from 'svelte';
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

	/**
	 * Only the numbers that exist at this point in the brew day.
	 *
	 * Each carries its full name and a figure id, because this panel is on every
	 * screen and a column of seven bare abbreviations taught nobody anything —
	 * one reader said they tuned it out entirely, which defeats the point of it.
	 */
	const metrics = $derived(
		[
			{
				label: 'Mash pH',
				figure: 'mash-ph',
				raw: result.metrics.mashPh,
				value: result.metrics.mashPh.toFixed(2),
				reveal: 'potential' as Reveal
			},
			{
				label: 'Colour',
				figure: 'ebc',
				raw: result.metrics.ebc,
				value: `${Math.round(result.metrics.ebc)} EBC`,
				reveal: 'colour' as Reveal
			},
			{
				label: 'Starting sugar',
				figure: 'og',
				raw: result.metrics.og,
				value: result.metrics.og.toFixed(3),
				reveal: 'gravity' as Reveal
			},
			{
				label: 'Bitterness',
				figure: 'ibu',
				raw: result.metrics.ibu,
				value: `${Math.round(result.metrics.ibu)} IBU`,
				reveal: 'bitterness' as Reveal
			},
			{
				label: 'Sugar left',
				figure: 'fg',
				raw: result.metrics.fg,
				value: result.metrics.fg.toFixed(3),
				reveal: 'alcohol' as Reveal
			},
			{
				label: 'Alcohol',
				figure: 'abv',
				raw: result.metrics.abv,
				value: `${result.metrics.abv.toFixed(1)}%`,
				reveal: 'alcohol' as Reveal
			},
			{
				label: 'Fizz',
				figure: 'co2-volumes',
				raw: result.metrics.co2Volumes,
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

	/**
	 * Where the recipe as written misses the target, projected — shown the
	 * moment it is set, because that is the moment something can still be done
	 * about it. Reported once the glass is poured too, but by then the report
	 * says it in full.
	 */
	const misses = $derived(
		brew.knows('judgement') || !brew.target ? [] : targetMisses(brew.target.rows)
	);

	/** The quieter findings, so "nothing flagged" is never said over a caution. */
	const cautions = $derived(
		result.findings.filter((f) => {
			if (f.severity !== 'caution') return false;
			const stage = stageForFields(f.fields);
			return !stage || brew.brewedTo >= stageIndex(stage);
		}).length
	);

	const closest = $derived(brew.knows('judgement') ? result.styles[0] : undefined);

	/**
	 * Where the beer is heading, as a range until the thing that would close it
	 * has been decided. Hidden once the beer is poured, because by then the
	 * report is the answer and a forecast of a finished thing is just noise.
	 */
	const forecast = $derived(brew.knows('judgement') ? undefined : forecastAbv(brew.recipe));

	/**
	 * What has physically gone into the brew so far. Once you are three stages
	 * past the grain you can no longer see your own grist, so this is the one
	 * place that keeps the whole build visible.
	 */
	const contents = $derived.by(() => {
		const rows: { label: string; value: string }[] = [];
		const profile = WATER_PROFILE_BY_ID.get(brew.recipe.water.profileId);
		rows.push({
			label: 'Water',
			// The water you actually pour, not the beer that comes out at the end.
			value: brew.recipe.water.profileId
				? `${profile?.name ?? 'Custom'} · ${(brew.context?.totalWaterL ?? brew.recipe.preBoilVolumeL).toFixed(0)} L`
				: 'Not chosen yet'
		});

		if (brew.knows('potential')) {
			const names = brew.recipe.fermentables
				.map((f) => getFermentable(f.fermentableId)?.name)
				.filter((n) => n !== undefined);
			rows.push({
				label: 'Grain',
				// Emptying the grist after milling left a row reading "0.00 kg · ".
				value: names.length
					? `${result.metrics.grainKg.toFixed(2)} kg · ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`
					: 'Nothing weighed out'
			});
		}

		if (brew.knows('bitterness')) {
			const names = [
				...new Set(
					brew.recipe.hops.map((h) => getHop(h.hopId)?.name).filter((n) => n !== undefined)
				)
			];
			rows.push({
				label: 'Hops',
				value: names.length
					? `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`
					: 'none'
			});
		}

		if (brew.knows('alcohol')) {
			rows.push({
				label: 'Yeast',
				value: getYeast(brew.recipe.fermentation.yeastId)?.name ?? 'none'
			});
		}
		return rows;
	});

	/**
	 * The process the reader just set going, played back from the model's own
	 * frames. Runs once per act, compressed to a few seconds; a click skips to
	 * the end. Nothing plays when motion is off — the end state is what the
	 * panel shows anyway.
	 */
	let playing = $state<{ playback: Playback; progress: number } | undefined>(undefined);
	let raf = 0;
	$effect(() => {
		const did = brew.justDid;
		if (!did) return;
		const ctx = untrack(() => brew.context);
		const playback = ctx && prefs.animate ? playbackFor(did.stage, ctx) : undefined;
		if (!playback) {
			// Committing a stage with nothing to play — the chill, say — while the
			// boil was still playing used to freeze the boil's last frame on screen
			// for the rest of the brew day.
			playing = undefined;
			return;
		}
		const started = performance.now();
		cancelAnimationFrame(raf);
		const tick = (now: number) => {
			const progress = Math.min(1, (now - started) / playback.runMs);
			playing = { playback, progress };
			if (progress < 1) raf = requestAnimationFrame(tick);
			else {
				// Hold the last frame for a moment, then hand back to the panel.
				setTimeout(() => {
					playing = undefined;
					brew.justDid = undefined;
				}, 900);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	function skip() {
		cancelAnimationFrame(raf);
		playing = undefined;
		brew.justDid = undefined;
	}

	const frame = $derived.by(() => {
		if (!playing) return undefined;
		const { samples } = playing.playback;
		const i = Math.min(samples.length - 1, Math.floor(playing.progress * (samples.length - 1)));
		return samples[i];
	});

	/** The trace up to now: a path through every sample already played. */
	const tracePath = $derived.by(() => {
		if (!playing) return '';
		const { samples } = playing.playback;
		const n = Math.max(1, Math.floor(playing.progress * (samples.length - 1)));
		return samples
			.slice(0, n + 1)
			.map(
				(s, i) =>
					`${i === 0 ? 'M' : 'L'} ${(s.at * 100).toFixed(2)} ${(30 - s.level * 28).toFixed(2)}`
			)
			.join(' ');
	});

	const status = $derived(
		brew.brewedTo < 0
			? 'Nothing brewed yet. The water is on.'
			: brew.brewedTo >= STAGES.length - 1
				? result.verdict.headline
				: (STAGES[brew.brewedTo]?.done ?? '')
	);

	const nextUp = $derived(STAGES[brew.brewedTo + 1]);
	const finished = $derived(brew.brewedTo >= STAGES.length - 1);
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
			{#if playing && frame}
				<!--
					Not an animation of brewing: the model's own frames, played back.
					Every figure here was computed on the way to the report.
				-->
				<button
					type="button"
					class="mt-0.5 block w-full rounded-md text-start hover:bg-ui-hover"
					onclick={skip}
					aria-label="{playing.playback.title}, {frame.when}: {frame.primary}. Skip to the end."
				>
					<p class="text-xs text-muted">
						{playing.playback.title}
						<span class="text-subtle">· {playing.playback.duration}, played in seconds</span>
					</p>
					<p class="tnum mt-1 font-display text-lg leading-tight text-fg">{frame.primary}</p>
					<p class="tnum text-xs text-muted">
						{frame.when}{frame.secondary ? ` · ${frame.secondary}` : ''}
					</p>
					<svg
						viewBox="0 0 100 32"
						preserveAspectRatio="none"
						class="mt-2 h-8 w-full"
						aria-hidden="true"
					>
						<line
							x1="0"
							y1="30"
							x2="100"
							y2="30"
							stroke="var(--color-line)"
							stroke-width="0.5"
							vector-effect="non-scaling-stroke"
						/>
						<path
							d={tracePath}
							fill="none"
							stroke="var(--color-amber)"
							stroke-width="2"
							vector-effect="non-scaling-stroke"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			{:else}
				<p class="mt-0.5 text-xs text-muted">{status}</p>
			{/if}

			{#if closest}
				<p class="mt-3 text-xs text-subtle">
					Closest style
					<span class="mt-0.5 block text-sm font-medium text-copper-text">{closest.name}</span>
					<span class="tnum text-xs text-muted">{closest.match}% match</span>
				</p>
			{/if}
		</div>
	</div>

	<section class="border-t border-line pt-4">
		<h3 class="field-label mb-2">In the brew</h3>
		<dl class="flex flex-col gap-1.5">
			{#each contents as row (row.label)}
				<div class="flex items-baseline justify-between gap-3 text-xs">
					<dt class="shrink-0 text-subtle">{row.label}</dt>
					<dd class="text-end text-fg">{row.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	{#if forecast}
		<section class="border-t border-line pt-4">
			<h3 class="field-label mb-1">Heading for</h3>
			{#if forecast.open}
				<p class="tnum text-sm font-medium text-fg">
					{forecast.low.toFixed(1)}–{forecast.high.toFixed(1)}% alcohol
				</p>
				<p class="prose-measure mt-0.5 text-xs text-subtle">
					depending on {forecast.dependsOn}
				</p>
			{:else}
				<p class="tnum text-sm font-medium text-fg">{forecast.low.toFixed(1)}% alcohol</p>
			{/if}
		</section>
	{/if}

	{#if nextUp}
		<p class="prose-measure border-t border-line pt-4 text-xs text-subtle">
			Up next: {nextUp.action.toLowerCase()}.
		</p>
	{:else if finished}
		<div class="border-t border-line pt-4">
			<p class="prose-measure text-xs text-subtle">
				This brew is finished. Keep changing it to see what each decision does, or empty the kettle
				and start again.
			</p>
			<button type="button" class="btn btn-ghost mt-2 w-full" onclick={() => brew.startFresh()}>
				Start a new brew day
			</button>
		</div>
	{/if}

	{#if metrics.length || axes.length}
		<!--
			Numbers and flavour fold away. This panel answers "what have I got so
			far", and a column of readouts was competing with the answer.
		-->
		<details class="group border-t border-line pt-4">
			<summary
				class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs font-medium text-copper-text hover:underline"
			>
				<svg
					viewBox="0 0 16 16"
					class="h-3 w-3 transition-transform group-open:rotate-90"
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
				The numbers so far
			</summary>

			{#if metrics.length}
				<dl class="relative mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
					{#each metrics as metric (metric.label)}
						<div class="min-w-0">
							<dt class="text-xs text-subtle">{metric.label}</dt>
							<dd class="text-sm">
								<FigureValue
									id={metric.figure}
									value={metric.raw}
									display={metric.value}
									label={metric.label}
								/>
							</dd>
						</div>
					{/each}
				</dl>
			{/if}

			{#if axes.length}
				<div class="mt-4 flex flex-col gap-1.5">
					{#each axes as [key, value] (key)}
						<Meter label={SENSORY_LABELS[key]} {value} accent={value > 7 ? 'amber' : 'copper'} />
					{/each}
				</div>
			{/if}
		</details>
	{/if}

	{#if brew.brewedTo >= 0}
		<section class="border-t border-line pt-4">
			<h3 class="field-label mb-2">Watch list</h3>
			{#if problems.length === 0 && misses.length === 0 && cautions === 0}
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
					{#each misses.slice(0, 3) as row (row.key)}
						<li class="flex items-start gap-2 text-xs">
							<span
								class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-warn"
								aria-hidden="true"
							></span>
							<span class="text-muted">
								<span class="sr-only">Off target: </span>
								{row.miss}
							</span>
						</li>
					{/each}
					{#if cautions > 0}
						<li class="text-xs text-subtle">
							{cautions === 1 ? 'One thing' : `${cautions} things`} worth checking in the report.
						</li>
					{/if}
				</ul>
			{/if}
		</section>
	{/if}
</div>
