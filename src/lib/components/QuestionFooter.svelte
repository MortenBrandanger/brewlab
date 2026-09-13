<script lang="ts">
	/**
	 * What you press when the question is answered.
	 *
	 * Inside a stage it is simply the next question. At the end of a stage it is
	 * the brewing act — you mill the grain, you boil the wort — because that is
	 * the moment the brew day actually moves, and the moment the simulator is
	 * allowed to start claiming new things about the beer.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import { QUESTIONS } from '$lib/state/questions';
	import { STAGES, stageIndex } from '$lib/state/stages';

	let { onmoved }: { onmoved: () => void } = $props();

	const question = $derived(brew.question);
	const meta = $derived(STAGES[stageIndex(question.stage)]);
	const endsStage = $derived(brew.endsStage);
	const blocked = $derived(endsStage ? brew.blockedBecause(question.stage) : undefined);
	const stageDone = $derived(brew.isDone(question.stage));
	const nextQuestion = $derived(QUESTIONS[brew.at + 1]);
	/*
	 * The last question still has an act to carry out — you pour the glass —
	 * and hiding the button on it left a brew made from scratch one click short
	 * of its own verdict, permanently. Only a stage that is already done has
	 * nothing left to press.
	 */
	const last = $derived(brew.at === QUESTIONS.length - 1 && stageDone);

	function go() {
		if (endsStage && !stageDone) {
			if (!brew.commit(question.stage)) return;
		} else {
			brew.next();
		}
		onmoved();
	}
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-3">
	{#if brew.at > 0}
		<button
			type="button"
			class="btn btn-quiet"
			onclick={() => {
				brew.back();
				onmoved();
			}}
		>
			<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
				<path
					d="M10 3.5 L5 8 L10 12.5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
			Back
		</button>
	{/if}

	{#if blocked}
		<p class="flex min-w-[12rem] flex-1 items-start gap-1.5 text-sm text-warn">
			<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
				<path
					d="M8 2 L15 14 L1 14 Z"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linejoin="round"
				/>
				<path
					d="M8 6.5 V9.5 M8 11.5 V11.6"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
			</svg>
			{blocked}
		</p>
	{:else if question.optional}
		<p class="min-w-[12rem] flex-1 text-sm text-subtle">Optional — skipping is a real answer.</p>
	{:else}
		<span class="flex-1"></span>
	{/if}

	{#if !last}
		<button type="button" class="btn btn-primary h-11 px-5" disabled={!!blocked} onclick={go}>
			{#if endsStage && !stageDone}
				{meta.action}
			{:else if question.optional}
				{nextQuestion ? 'Skip' : 'Next'}
			{:else}
				Next
			{/if}
			<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
				<path
					d="M6 3.5 L11 8 L6 12.5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	{/if}
</div>
