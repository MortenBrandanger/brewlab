<script lang="ts">
	/**
	 * A number with the one thing it was always missing: a scale.
	 *
	 * "34 IBU", "1.052", "26 EBC", "78%" all appeared bare. A reader with no
	 * brewing behind them cannot tell whether any of those is high, low or
	 * ordinary, which makes every control that moves them a guess. Opening this
	 * shows what the number measures, which way is more, and where the value
	 * sits against beers a person has actually drunk.
	 *
	 * It is a `<details>` rather than a tooltip on purpose: a tooltip does not
	 * exist on a phone, and this is not decoration.
	 */
	import { figureFor } from '$lib/brewing/glossary';

	let {
		id,
		value,
		display,
		label
	}: {
		/** A figure id from the glossary, e.g. 'og', 'ibu', 'ebc'. */
		id: string;
		value: number;
		/** How the value is written. Defaults to the raw number. */
		display?: string;
		/** Overrides the glossary's own name, for places that already have a label. */
		label?: string;
	} = $props();

	const figure = $derived(figureFor(id));
	const shown = $derived(display ?? String(value));

	/** Where the value sits on the figure's track, clamped to the ends. */
	const position = $derived.by(() => {
		if (!figure) return 0;
		const [lo, hi] = figure.range;
		return Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
	});

	const band = $derived.by(() => {
		if (!figure?.typical) return undefined;
		const [lo, hi] = figure.range;
		const [tLo, tHi] = figure.typical;
		return {
			start: ((tLo - lo) / (hi - lo)) * 100,
			width: ((tHi - tLo) / (hi - lo)) * 100
		};
	});
</script>

{#if figure}
	<!--
		The panel spans its nearest positioned ancestor rather than its own grid
		cell: inside a three-column sidebar the definition was rendering in a
		column ten characters wide. Consumers put `relative` on the container.
	-->
	<details class="group">
		<summary
			class="inline-flex cursor-pointer list-none items-baseline gap-1 rounded-sm hover:underline"
		>
			<span class="tnum font-medium text-fg">{shown}</span>
			<span
				class="grid h-3.5 w-3.5 shrink-0 translate-y-[-1px] place-items-center rounded-full text-[0.5625rem] font-bold text-copper-text ring-1 ring-copper-dim"
				aria-hidden="true">?</span
			>
			<span class="sr-only">What {label ?? figure.name} means</span>
		</summary>

		<div
			class="absolute inset-x-0 z-20 mt-2 rounded-lg bg-surface-2 p-3 shadow-lg ring-1 ring-line-strong"
		>
			<p class="text-xs font-medium text-fg">
				{label ?? figure.name}<span class="text-subtle"> ({figure.short})</span>
			</p>
			<p class="prose-measure mt-1 text-xs text-muted">{figure.plain}</p>
			<p class="prose-measure mt-1.5 text-xs text-subtle">{figure.direction}</p>

			<div class="relative mt-3 h-2 rounded-full bg-ui-active">
				{#if band}
					<div
						class="absolute inset-y-0 rounded-full bg-hop-dim"
						style="left:{band.start}%; width:{band.width}%"
						aria-hidden="true"
					></div>
				{/if}
				<div
					class="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper"
					style="left:{position}%"
					aria-hidden="true"
				></div>
			</div>

			<ul class="mt-2.5 flex flex-col gap-1">
				{#each figure.anchors as anchor (anchor.at)}
					<li class="flex items-baseline gap-2 text-xs">
						<span class="tnum w-14 shrink-0 text-subtle">{anchor.at}</span>
						<span class="text-muted">{anchor.label}</span>
					</li>
				{/each}
			</ul>
		</div>
	</details>
{:else}
	<span class="tnum font-medium text-fg">{shown}</span>
{/if}
