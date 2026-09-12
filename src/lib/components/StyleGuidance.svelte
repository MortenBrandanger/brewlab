<script lang="ts">
	import { styleGuidance } from '$lib/brewing/classify';
	import { getStyle } from '$lib/brewing/styles';
	import { brew } from '$lib/state/brew.svelte';

	const style = $derived(
		brew.recipe.targetStyleId ? getStyle(brew.recipe.targetStyleId) : undefined
	);
	const rows = $derived(
		brew.recipe.targetStyleId ? styleGuidance(brew.recipe.targetStyleId, brew.result.metrics) : []
	);
	const conformity = $derived(brew.result.targetStyle);

	/** Position on a track that extends a little past the style range on both sides. */
	function track(value: number, min: number, max: number) {
		const pad = (max - min) * 0.9;
		const lo = min - pad;
		const hi = max + pad;
		return {
			rangeStart: ((min - lo) / (hi - lo)) * 100,
			rangeWidth: ((max - min) / (hi - lo)) * 100,
			marker: Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100))
		};
	}
</script>

{#if style}
	<section class="panel p-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="font-display text-base font-semibold">Brewing to {style.name}</h2>
			{#if conformity}
				<span class="tnum text-sm font-medium text-copper-text">{conformity.match}% conformity</span
				>
			{/if}
		</div>
		<p class="prose-measure mt-1 text-xs text-muted">{style.blurb}</p>

		<ul class="mt-4 flex flex-col gap-3">
			{#each rows as row (row.key)}
				{@const t = track(row.value, row.range.min, row.range.max)}
				<li>
					<div class="flex items-baseline justify-between gap-3 text-xs">
						<span class="text-muted">{row.label}</span>
						<span class="tnum">
							<span
								class="font-medium"
								class:text-hop={row.state === 'inside'}
								class:text-warn={row.state !== 'inside'}
							>
								{row.format(row.value)}
							</span>
							<span class="text-subtle">
								· style {row.format(row.range.min)}–{row.format(row.range.max)}</span
							>
						</span>
					</div>
					<div class="relative mt-1.5 h-2 rounded-full bg-ui-active">
						<div
							class="absolute inset-y-0 rounded-full bg-hop-dim"
							style="left:{t.rangeStart}%; width:{t.rangeWidth}%"
							aria-hidden="true"
						></div>
						<div
							class="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
							class:bg-hop={row.state === 'inside'}
							class:bg-warn={row.state !== 'inside'}
							style="left:{t.marker}%"
							aria-hidden="true"
						></div>
					</div>
					<p class="sr-only">
						{row.label} is {row.format(row.value)}, which is {row.state === 'inside'
							? 'inside'
							: row.state === 'below'
								? 'below'
								: 'above'} the style range of {row.format(row.range.min)} to {row.format(
							row.range.max
						)}.
					</p>
				</li>
			{/each}
		</ul>

		<p class="prose-measure mt-3 text-xs text-subtle">
			Guidance only. Nothing here is blocked, and conformity is kept entirely separate from the
			quality scores: a beer can be a perfect example of a style and still be badly made, or
			excellent and fit nothing at all.
		</p>
	</section>
{/if}
