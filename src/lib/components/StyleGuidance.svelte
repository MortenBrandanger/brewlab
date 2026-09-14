<script lang="ts">
	import { brew } from '$lib/state/brew.svelte';
	import { targetMisses } from '$lib/brewing/target';

	/**
	 * Every figure the target defines, whether the brew day has made it yet or
	 * not. A settled row is a measurement; a projected one is where the recipe
	 * as written is heading, and it says so.
	 *
	 * This panel used to hide a row until it was true, which was honest about
	 * the beer and useless about the decision: the moment you can still do
	 * something about 87 IBU is while the hop is going in, not after the boil.
	 * A target is a claim about the intention, not about the beer, and "heading
	 * for 87, this style wants 25–45" is true the instant you set it.
	 */
	const target = $derived(brew.target);
	const style = $derived(target?.style);
	const rows = $derived(target?.rows ?? []);
	const allSettled = $derived(rows.length > 0 && rows.every((r) => r.settled));
	const conformity = $derived(brew.result.targetStyle);
	const misses = $derived(targetMisses(rows));

	/** Position on a track that extends a little past the style range on both sides. */
	function track(low: number, high: number, min: number, max: number) {
		const pad = (max - min) * 0.9;
		const lo = min - pad;
		const hi = max + pad;
		const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
		return {
			rangeStart: ((min - lo) / (hi - lo)) * 100,
			rangeWidth: ((max - min) / (hi - lo)) * 100,
			from: pos(low),
			to: pos(high)
		};
	}
</script>

{#if style}
	<section class="panel p-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="font-display text-base font-semibold">
				Brewing to {style.name}<!--
					The two paragraphs that used to sit under this panel on every one of
					twenty-one screens — "what this beer asks for", "guidance only, nothing
					here is blocked" — say the same thing every time. Once is enough, and
					once is a question mark.
				-->
				<details class="group relative inline">
					<summary
						class="ms-1.5 inline-grid h-4 w-4 translate-y-0.5 cursor-pointer list-none place-items-center rounded-full align-baseline text-[0.625rem] font-bold text-copper-text ring-1 ring-copper-dim hover:bg-copper-dim/30"
					>
						?<span class="sr-only">What this panel is</span>
					</summary>
					<div
						class="absolute top-full left-0 z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg bg-surface-2 p-3 font-sans text-xs font-normal shadow-lg ring-1 ring-line-strong"
					>
						<p class="prose-measure text-muted">
							What this beer asks for. Once there is grain in the kettle, each figure shows where
							you are heading; a hollow marker is a projection, a solid one has been made.
						</p>
						<p class="prose-measure mt-2 text-subtle">
							Guidance only. Nothing here is blocked, and conformity is kept entirely separate from
							the quality scores: a beer can be a perfect example of a style and still be badly
							made, or excellent and fit nothing at all.
						</p>
					</div>
				</details>
			</h2>
			{#if conformity && allSettled}
				<span class="tnum text-sm font-medium text-copper-text">{conformity.match}% conformity</span
				>
			{/if}
		</div>
		<p class="prose-measure mt-1 text-xs text-muted">{style.blurb}</p>

		{#if rows.length === 0}
			<!-- Nothing is knowable yet, so show the target rather than a score. -->
			<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
				<div>
					<dt class="text-xs text-subtle">Original gravity</dt>
					<dd class="tnum text-sm font-medium">
						{style.og.min.toFixed(3)}–{style.og.max.toFixed(3)}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Final gravity</dt>
					<dd class="tnum text-sm font-medium">
						{style.fg.min.toFixed(3)}–{style.fg.max.toFixed(3)}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Alcohol</dt>
					<dd class="tnum text-sm font-medium">
						{style.abv.min.toFixed(1)}–{style.abv.max.toFixed(1)}%
					</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Bitterness</dt>
					<dd class="tnum text-sm font-medium">{style.ibu.min}–{style.ibu.max} IBU</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Colour</dt>
					<dd class="tnum text-sm font-medium">{style.ebc.min}–{style.ebc.max} EBC</dd>
				</div>
			</dl>
		{:else}
			<ul class="mt-4 flex flex-col gap-3">
				{#each rows as row (row.key)}
					{@const t = track(row.low, row.high, row.range.min, row.range.max)}
					<li>
						<div class="flex items-baseline justify-between gap-3 text-xs">
							<span class="text-muted">
								{row.label}
								{#if !row.settled}
									<span class="text-subtle"> · heading for</span>
								{/if}
							</span>
							<span class="tnum">
								<span
									class="font-medium"
									class:text-hop={row.state === 'inside'}
									class:text-warn={row.state !== 'inside'}
								>
									{row.low === row.high
										? row.format(row.low)
										: `${row.format(row.low)}–${row.format(row.high)}`}
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
							{#if row.low === row.high}
								<!-- A settled figure is a solid marker; a projection is hollow. -->
								<div
									class="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
									class:bg-hop={row.state === 'inside' && row.settled}
									class:bg-warn={row.state !== 'inside' && row.settled}
									class:ring-2={!row.settled}
									class:ring-hop={!row.settled && row.state === 'inside'}
									class:ring-warn={!row.settled && row.state !== 'inside'}
									class:bg-surface={!row.settled}
									style="left:{t.from}%"
									aria-hidden="true"
								></div>
							{:else}
								<!-- A range still open: the span it could land in. -->
								<div
									class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
									class:bg-hop={row.state === 'inside'}
									class:bg-warn={row.state !== 'inside'}
									style="left:{t.from}%; width:{Math.max(1.5, t.to - t.from)}%"
									aria-hidden="true"
								></div>
							{/if}
						</div>
						<p class="sr-only">
							{row.label}
							{row.settled ? 'is' : 'is heading for'}
							{row.low === row.high
								? row.format(row.low)
								: `between ${row.format(row.low)} and ${row.format(row.high)}`}, which is {row.state ===
							'inside'
								? 'inside'
								: row.state}
							the style range of {row.format(row.range.min)} to {row.format(row.range.max)}.
						</p>
					</li>
				{/each}
			</ul>
			{#if misses.length}
				<ul class="mt-3 flex flex-col gap-1">
					{#each misses as row (row.key)}
						<li class="prose-measure text-xs text-warn-bright">{row.miss}</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>
{/if}
