<script lang="ts">
	import LearningNote from './LearningNote.svelte';

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		unit = '',
		format = (n: number) => String(n),
		why = '',
		deepDive = '',
		deepDiveTitle = 'Why this matters',
		/** Marks shown under the track, e.g. the normal working range. */
		marks = [] as { at: number; label: string }[],
		/**
		 * The value a brand-new brew starts on. While the slider still sits there
		 * the reader has not decided anything, and saying so is the difference
		 * between a setting you chose and one the simulator chose for you.
		 */
		defaultValue = undefined as number | undefined,
		id = `slider-${Math.random().toString(36).slice(2, 9)}`
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		format?: (n: number) => string;
		why?: string;
		deepDive?: string;
		deepDiveTitle?: string;
		marks?: { at: number; label: string }[];
		defaultValue?: number;
		id?: string;
	} = $props();

	const fill = $derived(((value - min) / (max - min)) * 100);
	const untouched = $derived(defaultValue !== undefined && value === defaultValue);
</script>

<div class="py-1">
	<div class="flex items-baseline justify-between gap-3">
		<label class="field-label" for={id}>{label}</label>
		<span class="flex items-baseline gap-2">
			{#if untouched}
				<span class="text-[0.625rem] tracking-wide text-subtle uppercase">default</span>
			{/if}
			<output class="tnum text-sm font-medium text-fg" for={id}>{format(value)}{unit}</output>
		</span>
	</div>
	<input {id} type="range" {min} {max} {step} bind:value style="--fill:{fill}" class="mt-0.5" />
	{#if marks.length}
		<div class="relative -mt-1 h-3.5" aria-hidden="true">
			{#each marks as mark (mark.at)}
				<span
					class="absolute -translate-x-1/2 text-[0.625rem] whitespace-nowrap text-subtle"
					style="left:{Math.max(0, Math.min(100, ((mark.at - min) / (max - min)) * 100))}%"
				>
					{mark.label}
				</span>
			{/each}
		</div>
	{/if}
	{#if why}
		<LearningNote {why} {deepDive} title={deepDiveTitle} />
	{/if}
</div>
