<script lang="ts">
	import Meter from './Meter.svelte';
	import { SENSORY_KEYS, SENSORY_LABELS, describeIntensity } from '$lib/brewing/sensory';
	import type { SensoryKey, SensoryVector } from '$lib/brewing/types';

	let { sensory }: { sensory: SensoryVector } = $props();

	const rows = $derived(SENSORY_KEYS.map((key) => ({ key, value: sensory[key] })));

	/** A plain gloss for the axes whose names are trade words, said once, in place. */
	const GLOSS: Partial<Record<SensoryKey, string>> = {
		fruitEsters: 'Esters are the fruity smells the yeast makes: pear, banana, apple.',
		phenols: 'Phenols are the spicy ones: clove, pepper, sometimes smoke.',
		body: 'Body is how thick it feels in the mouth, from watery to syrupy.',
		crispness: 'Crispness is the dry snap at the end that makes you want another sip.',
		alcoholWarmth: 'The warmth alcohol leaves in the chest and throat.',
		hopFlavour:
			'What the hops taste of once the beer is in your mouth, as opposed to what they smell of.',
		caramel: 'Toffee and stewed-sugar sweetness from crystal malt.',
		roast: 'Coffee, chocolate and burnt-toast character from roasted grain.'
	};
</script>

<!--
	Thirteen axes, and the ones a reader had never met — esters, phenols,
	body, crispness — are answered in place rather than left as bars with
	unfamiliar names on them.
-->
<div class="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
	{#each rows as row (row.key)}
		<Meter
			label={SENSORY_LABELS[row.key]}
			value={row.value}
			accent={row.value >= 7 ? 'amber' : 'copper'}
			hint="{describeIntensity(row.value).charAt(0).toUpperCase() +
				describeIntensity(row.value).slice(1)}.{GLOSS[row.key] ? ` ${GLOSS[row.key]}` : ''}"
		/>
	{/each}
</div>
