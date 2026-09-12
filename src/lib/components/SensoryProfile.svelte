<script lang="ts">
	import Meter from './Meter.svelte';
	import { SENSORY_KEYS, SENSORY_LABELS, describeIntensity } from '$lib/brewing/sensory';
	import type { SensoryVector } from '$lib/brewing/types';

	let { sensory }: { sensory: SensoryVector } = $props();

	const rows = $derived(SENSORY_KEYS.map((key) => ({ key, value: sensory[key] })));
</script>

<div class="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
	{#each rows as row (row.key)}
		<Meter
			label={SENSORY_LABELS[row.key]}
			value={row.value}
			accent={row.value >= 7 ? 'amber' : 'copper'}
			hint="{SENSORY_LABELS[row.key]}: {describeIntensity(row.value)}"
		/>
	{/each}
</div>
