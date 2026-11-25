<script lang="ts">
	/**
	 * The hands-on brew day.
	 *
	 * A separate route from the question flow while it proves itself: the two
	 * share the engine, the ingredients and the report, and nothing else. When
	 * the glass is poured, the beer you actually made is handed to the brew
	 * store and the ordinary report judges it — the same panel, the same "what
	 * did I do?", on the recipe your hands wrote.
	 *
	 * In development, `?card=<recipe id>&step=<step id>` walks straight to a
	 * step with everything before it done exactly as the card says, so a bench
	 * can be looked at without brewing up to it every time.
	 */
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { day } from '$lib/play/day.svelte';
	import type { PlayStepId } from '$lib/play/steps';
	import CardStep from '$lib/play/steps/CardStep.svelte';
	import StrikeStep from '$lib/play/steps/StrikeStep.svelte';
	import DoughInStep from '$lib/play/steps/DoughInStep.svelte';
	import RestStep from '$lib/play/steps/RestStep.svelte';
	import VorlaufStep from '$lib/play/steps/VorlaufStep.svelte';
	import SpargeStep from '$lib/play/steps/SpargeStep.svelte';
	import BoilStep from '$lib/play/steps/BoilStep.svelte';
	import FlameoutStep from '$lib/play/steps/FlameoutStep.svelte';
	import SanitiseStep from '$lib/play/steps/SanitiseStep.svelte';
	import ChillStep from '$lib/play/steps/ChillStep.svelte';
	import TransferStep from '$lib/play/steps/TransferStep.svelte';
	import PitchStep from '$lib/play/steps/PitchStep.svelte';
	import FermentStep from '$lib/play/steps/FermentStep.svelte';
	import BottleStep from '$lib/play/steps/BottleStep.svelte';
	import PourStep from '$lib/play/steps/PourStep.svelte';

	const id = $derived(day.step.id);

	onMount(() => {
		if (!dev) return;
		const params = new URLSearchParams(location.search);
		const card = params.get('card');
		if (card) day.skipTo(card, (params.get('step') ?? 'strike') as PlayStepId);
	});
</script>

<svelte:head>
	<title>{day.plan ? `${day.plan.name} by hand — BrewLab` : 'Brew it by hand — BrewLab'}</title>
</svelte:head>

<main id="main" class="mx-auto w-full max-w-[90rem] flex-1 px-3 py-5 sm:px-5">
	{#key id}
		{#if id === 'card' || !day.plan}
			<CardStep />
		{:else if id === 'strike'}
			<StrikeStep />
		{:else if id === 'dough-in'}
			<DoughInStep />
		{:else if id === 'rest'}
			<RestStep />
		{:else if id === 'vorlauf'}
			<VorlaufStep />
		{:else if id === 'sparge'}
			<SpargeStep />
		{:else if id === 'boil'}
			<BoilStep />
		{:else if id === 'flameout'}
			<FlameoutStep />
		{:else if id === 'sanitise'}
			<SanitiseStep />
		{:else if id === 'chill'}
			<ChillStep />
		{:else if id === 'transfer'}
			<TransferStep />
		{:else if id === 'pitch'}
			<PitchStep />
		{:else if id === 'ferment'}
			<FermentStep />
		{:else if id === 'bottle'}
			<BottleStep />
		{:else}
			<PourStep />
		{/if}
	{/key}
</main>
