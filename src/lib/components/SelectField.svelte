<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value = $bindable(),
		id = `sel-${Math.random().toString(36).slice(2, 9)}`,
		hint = '',
		children
	}: { label: string; value: string; id?: string; hint?: string; children: Snippet } = $props();
</script>

<div>
	<label class="field-label mb-1" for={id}>{label}</label>
	<select {id} class="input" bind:value aria-describedby={hint ? `${id}-hint` : undefined}>
		{@render children()}
	</select>
	{#if hint}
		<p id="{id}-hint" class="mt-1 text-xs text-subtle">{hint}</p>
	{/if}
</div>
