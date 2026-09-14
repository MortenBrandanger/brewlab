<script lang="ts">
	/**
	 * How long?
	 *
	 * Three lengths as cards, each with what this beer looks like at the end
	 * of it — where it finishes, and whether the yeast has had time to clean up
	 * the buttery taste it made on the way. That second thing is the one the
	 * slider never taught anyone: diacetyl is produced early and reabsorbed
	 * late, so stopping at the moment the bubbling slows leaves it in the beer.
	 */
	import SliderField from '../SliderField.svelte';
	import FermentationCurve from '../FermentationCurve.svelte';
	import Meter from '../Meter.svelte';
	import { buildContext } from '$lib/brewing/simulate';
	import { FAULT_THRESHOLD } from '$lib/brewing/faults';
	import { brew } from '$lib/state/brew.svelte';
	import { untrack } from 'svelte';

	const steps = $derived(brew.recipe.fermentation.steps);
	const total = $derived(steps.reduce((sum, s) => sum + s.days, 0));

	const CARDS = [
		{
			days: 7,
			name: 'A week',
			what: 'Long enough for the bubbling to stop, and no longer. Kveik and other fast strains are done; most ales are not quite.'
		},
		{
			days: 14,
			name: 'Two weeks',
			what: 'What most ales want. The sugar is gone in the first few days; the second week is the yeast finishing the last points and tidying up after itself.'
		},
		{
			days: 28,
			name: 'Four weeks',
			what: 'Lagers, and anything strong. Cold yeast works slowly, and a big beer has more to get through.'
		}
	];

	/** An unusual length is a deliberate choice, so it survives a revisit. */
	let other = $state(
		untrack(() => steps.length === 1 && !CARDS.some((c) => c.days === steps[0]?.days))
	);
	const custom = $derived(other);

	function choose(days: number) {
		if (steps.length === 1) steps[0].days = days;
		other = false;
	}

	/** Where this beer stands at the end of each length. */
	const perCard = $derived.by(() => {
		const out: Record<number, { fg: number; clean: boolean }> = {};
		if (steps.length !== 1) return out;
		for (const card of CARDS) {
			const ctx = buildContext({
				...brew.recipe,
				fermentation: {
					...brew.recipe.fermentation,
					steps: [{ ...steps[0], days: card.days }]
				}
			});
			if (ctx)
				out[card.days] = {
					fg: ctx.attenuation.fg,
					clean: ctx.risks.diacetyl <= FAULT_THRESHOLD.diacetyl * 0.6
				};
		}
		return out;
	});

	const attenuation = $derived(brew.context?.attenuation);
	const risks = $derived(brew.context?.risks);
</script>

<div class="flex flex-col gap-5">
	{#if steps.length > 1}
		<p class="prose-measure text-sm text-muted">
			You set a schedule by hand on the previous screen:
			{steps
				.map((s) => `${s.tempC} °C for ${s.days} ${s.days === 1 ? 'day' : 'days'}`)
				.join(', then ')}
			— <span class="tnum text-fg">{total} days</span> in all.
		</p>
	{:else}
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
			{#each CARDS as card (card.days)}
				{@const selected = !custom && steps[0]?.days === card.days}
				{@const effect = perCard[card.days]}
				<li>
					<button
						type="button"
						class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
							? 'bg-copper-dim ring-copper'
							: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
						aria-pressed={selected}
						onclick={() => choose(card.days)}
					>
						<span class="flex items-baseline justify-between gap-2">
							<span class="text-sm font-medium">{card.name}</span>
							{#if selected && card.days === 14}
								<span class="text-[0.625rem] tracking-wide text-fg/70 uppercase">default</span>
							{/if}
						</span>
						<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
							>{card.what}</span
						>
						{#if effect}
							<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
								Finishes at <span class="tnum">{effect.fg.toFixed(3)}</span> ·
								{effect.clean ? 'butterscotch cleaned up' : 'butterscotch still in it'}
							</span>
						{/if}
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
					onclick={() => (other = true)}
				>
					<span class="block text-sm font-medium">Another length</span>
					<span class="mt-0.5 block text-xs {custom ? 'text-fg' : 'text-subtle'}">
						However long you can leave it alone.
					</span>
				</button>
			</li>
		</ul>

		{#if custom}
			<div class="max-w-sm">
				<SliderField
					label="Days"
					bind:value={steps[0].days}
					min={1}
					max={60}
					step={1}
					unit={steps[0].days === 1 ? ' day' : ' days'}
					marks={[
						{ at: 14, label: 'most ales' },
						{ at: 28, label: 'lagers' }
					]}
				/>
			</div>
		{/if}
	{/if}

	{#if attenuation && risks}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<p class="tnum mb-3 text-sm">
				The yeast gets through
				<span class="font-medium">{Math.round(attenuation.apparent * 100)}%</span> of the sugar,
				finishing at
				<span class="font-medium">{attenuation.fg.toFixed(3)}</span> and
				<span class="font-medium">{attenuation.abv.toFixed(1)}% alcohol</span>.
			</p>
			<!-- Every point is an hour of the simulation. A stall flattens early because it did. -->
			<div class="mb-3">
				<FermentationCurve kinetics={attenuation.kinetics} />
			</div>
			<Meter
				label="Butterscotch left in it"
				value={risks.diacetyl}
				accent={risks.diacetyl > FAULT_THRESHOLD.diacetyl ? 'danger' : 'hop'}
				hint="Diacetyl: a butterscotch taste and a slick film on the tongue. The yeast makes it while it is growing and eats it again while it is finishing, so it is a question of time."
			/>
		</section>
	{/if}
</div>
