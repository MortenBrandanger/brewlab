<script lang="ts" generics="T extends string">
	let {
		label,
		value = $bindable(),
		options,
		/** The value a brand-new brew starts on. See SliderField. */
		defaultValue = undefined as T | undefined,
		name = `seg-${Math.random().toString(36).slice(2, 9)}`
	}: {
		label: string;
		value: T;
		options: { value: T; label: string; hint?: string }[];
		defaultValue?: T;
		name?: string;
	} = $props();
</script>

<fieldset class="min-w-0">
	<legend class="field-label mb-1.5">
		{label}
		{#if defaultValue !== undefined && value === defaultValue}
			<span class="ms-1.5 text-[0.625rem] tracking-wide text-subtle">default</span>
		{/if}
	</legend>
	<div class="flex flex-wrap gap-1 rounded-md bg-surface p-1 ring-1 ring-line">
		{#each options as option (option.value)}
			<label
				class="flex-1 cursor-pointer rounded-sm px-2.5 py-1.5 text-center text-xs font-medium whitespace-nowrap transition-colors
					{value === option.value ? 'bg-copper text-ink' : 'text-muted hover:bg-ui-hover hover:text-fg'}"
				title={option.hint}
			>
				<input class="sr-only" type="radio" {name} value={option.value} bind:group={value} />
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>
