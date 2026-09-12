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

<div class="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-x-3 gap-y-1" title={hint}>
	<span class="text-xs text-muted">{label}</span>
	<div class="h-2 rounded-full bg-ui-active" aria-hidden="true">
		<div
			class="h-full rounded-full transition-[width] duration-200 ease-out"
			style="width:{pct}%; background:{fill}"
		></div>
	</div>
	<span class="tnum text-right text-xs text-fg">{format(value)}</span>
</div>
