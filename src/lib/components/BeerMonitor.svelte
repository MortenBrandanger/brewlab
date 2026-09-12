<script lang="ts">
	import BeerGlass from './BeerGlass.svelte';
	import Meter from './Meter.svelte';
	import { appearanceOf } from '$lib/brewing/appearance';
	import { SENSORY_LABELS } from '$lib/brewing/sensory';
	import { brew } from '$lib/state/brew.svelte';
	import type { SensoryKey } from '$lib/brewing/types';

	const result = $derived(brew.result);
	const appearance = $derived(
		brew.context
			? appearanceOf(brew.context, result.metrics.srm)
			: { srm: result.metrics.srm, haze: 0.2, head: 0.5, carbonation: 0.6 }
	);

	/** The five loudest axes, so the monitor stays readable while you work. */
	const topAxes = $derived(
		(Object.entries(result.sensory) as [SensoryKey, number][])
			.filter(([, v]) => v >= 0.8)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
	);

	const problems = $derived(
		result.findings.filter((f) => f.severity === 'severe' || f.severity === 'warning')
	);
	const closest = $derived(result.styles[0]);

	const metrics = $derived([
		{ label: 'OG', value: result.metrics.og.toFixed(3) },
		{ label: 'FG', value: result.metrics.fg.toFixed(3) },
		{ label: 'ABV', value: `${result.metrics.abv.toFixed(1)}%` },
		{ label: 'IBU', value: String(Math.round(result.metrics.ibu)) },
		{ label: 'EBC', value: String(Math.round(result.metrics.ebc)) },
		{ label: 'Mash pH', value: result.metrics.mashPh.toFixed(2) }
	]);
</script>

<div class="flex flex-col gap-5 p-4">
	<div class="flex items-start gap-3">
		<BeerGlass {appearance} ebc={result.metrics.ebc} />
		<div class="min-w-0 flex-1">
			<h2 class="font-display text-base font-semibold">Your beer</h2>
			<p class="mt-0.5 text-xs text-muted">{result.verdict.headline}</p>
			{#if closest}
				<p class="mt-2 text-xs text-subtle">
					Closest style
					<span class="mt-1 block text-sm font-medium text-copper-text">{closest.name}</span>
					<span class="tnum text-xs text-muted">{closest.match}% match</span>
				</p>
			{/if}
		</div>
	</div>

	<dl class="grid grid-cols-3 gap-x-3 gap-y-3 border-t border-line pt-4">
		{#each metrics as metric (metric.label)}
			<div>
				<dt class="text-xs text-subtle">{metric.label}</dt>
				<dd class="tnum text-sm font-medium text-fg">{metric.value}</dd>
			</div>
		{/each}
	</dl>

	{#if topAxes.length}
		<section class="border-t border-line pt-4">
			<h3 class="field-label mb-2">Flavour so far</h3>
			<div class="flex flex-col gap-1.5">
				{#each topAxes as [key, value] (key)}
					<Meter label={SENSORY_LABELS[key]} {value} accent={value > 7 ? 'amber' : 'copper'} />
				{/each}
			</div>
		</section>
	{/if}

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
				Nothing serious flagged yet.
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
							<span class="sr-only">{finding.severity === 'severe' ? 'Severe: ' : 'Warning: '}</span
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
</div>
