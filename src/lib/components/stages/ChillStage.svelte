<script lang="ts">
	/**
	 * The cold side, in the order it happens.
	 *
	 * A brewer reviewing this stage found more missing acts here than anywhere
	 * else: sanitising everything the beer will touch, choosing how you are
	 * cooling it at all, letting the trub settle, leaving it behind, topping up,
	 * floating a hydrometer, putting air back in. The screen asked for two
	 * numbers and a radio group and did the rest silently.
	 *
	 * Two of those are decisions the engine models and are now asked for. The
	 * others are narrated at the act they belong to rather than invented as
	 * controls: the simulator does not model sanitation, and pretending it did
	 * would be worse than saying so.
	 */
	import SliderField from '../SliderField.svelte';
	import SegmentedControl from '../SegmentedControl.svelte';
	import FigureValue from '../FigureValue.svelte';
	import StageSteps, { type Step } from '../StageSteps.svelte';
	import { getYeast } from '$lib/brewing/ingredients';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const yeast = $derived(getYeast(brew.recipe.fermentation.yeastId));
	const risks = $derived(brew.context?.risks);

	/**
	 * How you cool it is the decision; the minutes are its consequence. Asking
	 * for the minutes directly asked the reader to know the answer before the
	 * question, and left one end of the slider with no visible downside.
	 */
	const METHODS = [
		{
			id: 'immersion',
			label: 'Immersion coil',
			minutes: 25,
			says: 'A coil of copper pipe dropped into the kettle with the cold tap running through it. Stir the wort around it and twenty-odd minutes gets you there.'
		},
		{
			id: 'plate',
			label: 'Plate chiller',
			minutes: 10,
			says: 'The wort runs through a stack of thin plates against cold water flowing the other way. Very fast, and a nuisance to clean properly.'
		},
		{
			id: 'ice',
			label: 'Sink of ice',
			minutes: 60,
			says: 'The whole pot stood in ice water. No equipment to buy, but an hour of swapping ice and the last few degrees take forever.'
		},
		{
			id: 'slow',
			label: 'Let it cool overnight',
			minutes: 240,
			says: 'Lid on, left to fall on its own. Brewers do make good beer this way by keeping everything sealed — but every hour in the warm is an hour something else could take hold.'
		}
	] as const;

	const method = $derived(
		METHODS.find((m) => m.minutes === brew.recipe.chill.minutes)?.id ?? 'custom'
	);

	const riskRows = $derived(
		risks
			? [
					{
						label: 'Contamination',
						value: risks.infection,
						note: 'Wild yeast and bacteria get their head start in warm wort.'
					},
					{
						label: 'Cooked corn (DMS)',
						value: risks.dms,
						note: 'Pilsner malt keeps producing it until the wort is cold.'
					},
					{
						label: 'Oxidation',
						value: risks.oxidation,
						note: 'After fermentation, oxygen turns hop aroma into cardboard.'
					}
				]
			: []
	);

	const TRANSFER_SUMMARY: Record<string, string> = {
		careless: 'splashed in',
		normal: 'siphoned with ordinary care',
		closed: 'closed transfer'
	};

	const steps: Step[] = $derived([
		{
			id: 'cool',
			title: 'Cool it down',
			says: 'Hoses on the tap, checked for leaks before the water goes through. Then you stir slowly and watch the thermometer fall, throttling the flow as it slows near the end. From about 60 °C down to pitching temperature the wort is warm, sugary and defenceless, so how long you spend in that window is the whole decision here.',
			summary: `${brew.recipe.chill.minutes} min, down to ${brew.recipe.chill.pitchTempC} °C`
		},
		{
			id: 'transfer',
			title: 'Let it settle, then siphon it over',
			says: 'Stop, and give it a few minutes: the spent hops and clumped protein cone into the middle of the kettle. Everything the wort now touches has been sanitised and left to dry — from here the beer has no heat defending it, and this is the half hour that decides whether you made beer or bucket juice. Then the siphon goes in above the sludge.',
			summary: TRANSFER_SUMMARY[brew.recipe.chill.transferQuality] ?? ''
		},
		{
			id: 'measure',
			title: 'Float the hydrometer and seal it',
			says: 'A sample into a tall jar, the hydrometer dropped in, and you read where it settles. This is the number the whole brew day has been building, and the last chance to write it down. Then the lid goes on, the airlock is filled to the line, and the wort is out of your hands.',
			summary: `${brew.result.metrics.og.toFixed(3)} into the fermenter`
		}
	]);
</script>

<StageSteps stage="chill" {steps}>
	{#snippet content(id)}
		{#if id === 'cool'}
			<div class="flex flex-col gap-5">
				<div>
					<h4 class="field-label mb-2">How are you cooling it</h4>
					<ul class="grid gap-2 sm:grid-cols-2">
						{#each METHODS as option (option.id)}
							<li>
								<button
									type="button"
									class="h-full w-full rounded-lg p-3 text-start ring-1 {method === option.id
										? 'bg-copper-dim ring-copper'
										: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
									aria-pressed={method === option.id}
									onclick={() => (brew.recipe.chill.minutes = option.minutes)}
								>
									<span class="flex items-baseline justify-between gap-2">
										<span class="text-sm font-medium">{option.label}</span>
										<span class="tnum text-xs {method === option.id ? 'text-fg' : 'text-muted'}">
											about {option.minutes} min
										</span>
									</span>
									<span
										class="mt-1 block text-xs {method === option.id ? 'text-fg' : 'text-subtle'}"
									>
										{option.says}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
					<SliderField
						label="Time to pitching temperature"
						bind:value={brew.recipe.chill.minutes}
						defaultValue={DEFAULTS.chill.minutes}
						min={5}
						max={240}
						step={5}
						unit=" min"
						marks={[
							{ at: 20, label: 'fast' },
							{ at: 120, label: 'slow' }
						]}
						why="Pick a method above, or set the minutes yourself if you know your own kit. Every extra minute between 60 °C and pitching temperature is a minute something else could take hold."
					/>
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

				<section>
					<h4 class="field-label mb-2">What the cold side put at risk</h4>
					<ul class="flex flex-col gap-2">
						{#each riskRows as row (row.label)}
							<li class="rounded-lg bg-surface p-3 ring-1 ring-line">
								<div class="flex items-center justify-between gap-3">
									<span class="text-sm font-medium">{row.label}</span>
									<span
										class="chip"
										class:text-hop={row.value < 3}
										class:text-warn={row.value >= 3 && row.value < 6}
										class:text-danger-text={row.value >= 6}
									>
										{row.value < 3 ? 'low' : row.value < 6 ? 'moderate' : 'high'}
									</span>
								</div>
								<div class="mt-2 h-1.5 rounded-full bg-ui-active" aria-hidden="true">
									<div
										class="h-full rounded-full transition-[width] duration-200"
										style="width:{Math.min(100, row.value * 10)}%; background:{row.value < 3
											? 'var(--color-hop)'
											: row.value < 6
												? 'var(--color-warn)'
												: 'var(--color-danger)'}"
									></div>
								</div>
								<p class="prose-measure mt-1.5 text-xs text-muted">{row.note}</p>
							</li>
						{/each}
					</ul>
					<p class="prose-measure mt-2 text-xs text-subtle">
						Treat these as odds, not prophecy. A slow chill does not guarantee an infection — it
						widens the range of what might happen.
					</p>
				</section>
			</div>
		{:else if id === 'transfer'}
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
					fermentation the same splash is what turns hop aroma into wet cardboard — which is why
					this choice matters more later than it does now.
				</p>
			</div>
		{:else}
			<div class="relative flex flex-col gap-4">
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
					Then shake the sealed fermenter hard for a minute, or run oxygen through a stone if you
					have one. Yeast needs air to build itself before it can start on the sugar, and this is
					the only point in the whole process where putting air in is a good idea.
				</p>
			</div>
		{/if}
	{/snippet}
</StageSteps>
