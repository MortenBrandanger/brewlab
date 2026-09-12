<script lang="ts">
	let {
		label,
		value = $bindable(),
		min = 0,
		max = 9999,
		step = 1,
		unit = '',
		width = 'w-24',
		id = `num-${Math.random().toString(36).slice(2, 9)}`
	}: {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		width?: string;
		id?: string;
	} = $props();
</script>

<div>
	<label class="field-label mb-1" for={id}>{label}</label>
	<div class="flex items-center gap-1.5">
		<input
			{id}
			class="input {width}"
			type="number"
			{min}
			{max}
			{step}
			bind:value
			inputmode="decimal"
		/>
		{#if unit}<span class="text-xs text-muted">{unit}</span>{/if}
	</div>
</div>
