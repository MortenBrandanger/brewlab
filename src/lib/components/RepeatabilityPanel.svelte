<script lang="ts">
	/**
	 * What this recipe does when the brew day does not go to plan.
	 *
	 * Every other number in the report answers "what did you make". This one
	 * answers "would you make it again" — and it is the only place in the app
	 * where the beer is treated as something a person executes rather than
	 * something a spreadsheet computes.
	 *
	 * The panel deliberately leads with the sensitivity rather than the range.
	 * "Five point one to six point five" tells a brewer they have a problem;
	 * "most of that is the mash temperature" tells them what to do about it.
	 */
	import { analyseVariance } from '$lib/brewing/variance';
	import { brew } from '$lib/state/brew.svelte';

	const report = $derived(analyseVariance(brew.recipe));
	const top = $derived(report.sensitivity[0]);

	const verdict = $derived(
		report.fragility < 3.5
			? 'Forgiving. Small slips on the day barely move it.'
			: report.fragility < 6.5
				? 'Ordinary. It will vary between batches the way most beers do.'
				: 'Fragile. Two brews from this sheet will not taste the same.'
	);
</script>

<section>
	<h3 class="field-label mb-2">If you brewed it again</h3>
	<p class="prose-measure text-sm text-muted">
		The engine brewed this beer {report.runs} more times, missing the mash temperature, the efficiency,
		the volumes and the fermentation by as much as a real brew day usually does.
		<span class="text-fg">{verdict}</span>
	</p>

	<dl class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div>
			<dt class="text-xs text-subtle">Alcohol, 9 times in 10</dt>
			<dd class="tnum text-sm font-medium">
				{report.abv.low.toFixed(1)}–{report.abv.high.toFixed(1)}%
			</dd>
		</div>
		<div>
			<dt class="text-xs text-subtle">Finishing gravity</dt>
			<dd class="tnum text-sm font-medium">
				{report.fg.low.toFixed(3)}–{report.fg.high.toFixed(3)}
			</dd>
		</div>
		<div>
			<dt class="text-xs text-subtle">Bitterness</dt>
			<dd class="tnum text-sm font-medium">
				{Math.round(report.ibu.low)}–{Math.round(report.ibu.high)} IBU
			</dd>
		</div>
		{#if report.inStyle !== undefined}
			<div>
				<dt class="text-xs text-subtle">Lands in style</dt>
				<dd class="tnum text-sm font-medium">{Math.round(report.inStyle * 100)}% of the time</dd>
			</div>
		{/if}
	</dl>

	<div class="mt-4">
		<p class="field-label mb-2">What decides that</p>
		<ul class="flex flex-col gap-1.5">
			{#each report.sensitivity.filter((s) => s.weight > 0.02) as source (source.source)}
				<li class="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-x-3">
					<span class="text-xs text-muted">{source.label}</span>
					<span class="h-1.5 rounded-full bg-ui-active" aria-hidden="true">
						<span
							class="block h-full rounded-full"
							style="width:{Math.round(source.weight * 100)}%; background:{source ===
							report.sensitivity[0]
								? 'var(--color-amber)'
								: 'var(--color-copper-dim)'}"
						></span>
					</span>
					<span class="tnum text-end text-xs text-subtle">
						{Math.round(source.weight * 100)}%
					</span>
				</li>
			{/each}
		</ul>
		{#if top && top.weight > 0.3}
			<p class="prose-measure mt-2 text-xs text-muted">
				Most of the difference between one batch and the next comes down to
				<span class="text-fg">{top.label.toLowerCase()}</span>. That is the one worth getting right,
				and the rest matters far less than it feels like it should.
			</p>
		{/if}
	</div>
</section>
