<script lang="ts">
	/** A labelled 0–max bar. Never relies on colour alone: the value is always written out. */
	let {
		label,
		value,
		max = 10,
		accent = 'copper',
		format = (n: number) => n.toFixed(1),
		hint = ''
	}: {
		label: string;
		value: number;
		max?: number;
		accent?: 'copper' | 'amber' | 'hop' | 'danger';
		format?: (n: number) => string;
		hint?: string;
	} = $props();

	const pct = $derived(Math.max(0, Math.min(100, (value / max) * 100)));
	const fill = $derived(
		{
			copper: 'var(--color-copper)',
			amber: 'var(--color-amber)',
			hop: 'var(--color-hop)',
			danger: 'var(--color-danger)'
		}[accent]
	);
</script>

<!--
	The denominator is printed. A bare "6.4" on an invisible scale told the reader
	nothing, and the hint that would have explained the label ("Diacetyl" =
	"butter or butterscotch left behind") used to live in a `title`, where a
	phone never shows it. Both are visible now.
-->
<div>
	<div class="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-x-3">
		<span class="text-xs text-muted">{label}</span>
		<div class="h-2 rounded-full bg-ui-active" aria-hidden="true">
			<div
				class="h-full rounded-full transition-[width] duration-200 ease-out"
				style="width:{pct}%; background:{fill}"
			></div>
		</div>
		<span class="tnum text-right text-xs text-fg">
			{format(value)}<span class="text-subtle">/{Number.isInteger(max) ? max : format(max)}</span>
		</span>
	</div>
	{#if hint}
		<p class="prose-measure mt-0.5 ps-0 text-xs text-subtle sm:ps-[8.25rem]">{hint}</p>
	{/if}
</div>
