<script lang="ts">
	/**
	 * One screen of the hands-on brew day: what to do, the bench you do it at,
	 * the controls in your hands, and the recipe card pinned beside it.
	 *
	 * The scene is the big thing on the screen. The text above it is one
	 * instruction and one or two sentences of why; the card on the right says
	 * what the recipe wants at this step and nothing else. `readout` is
	 * where a step says, in words, what the instruments in the picture show,
	 * so the picture never holds information a screen reader cannot reach.
	 */
	import type { Snippet } from 'svelte';
	import { day } from './day.svelte';
	import { PLAY_STEPS } from './steps';

	let {
		scene,
		controls,
		readout,
		card,
		action
	}: {
		scene: Snippet;
		controls?: Snippet;
		readout?: Snippet;
		card?: Snippet;
		action: Snippet;
	} = $props();

	const step = $derived(day.step);
	let heading = $state<HTMLElement>();
	$effect(() => {
		void step.id;
		queueMicrotask(() => heading?.focus({ preventScroll: true }));
	});
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
	<div class="flex min-w-0 flex-col gap-3">
		<header>
			<p class="field-label">
				{step.place} · step {day.at} of {PLAY_STEPS.length - 1}
			</p>
			<h1 bind:this={heading} tabindex="-1" class="mt-1 font-display text-xl" style="outline: none">
				{step.ask}
			</h1>
			<p class="prose-measure mt-1.5 text-sm text-muted">{step.hint}</p>
		</header>

		<div class="overflow-hidden rounded-lg shadow-[var(--shadow-float)]">
			{@render scene()}
		</div>

		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			{#if controls}{@render controls()}{/if}
			<div class="ms-auto flex flex-wrap items-center gap-2">
				{@render action()}
			</div>
		</div>
		{#if readout}
			<p class="tnum min-h-5 text-sm text-fg" aria-live="polite">{@render readout()}</p>
		{/if}
	</div>

	<aside class="panel h-fit p-4 lg:sticky lg:top-4">
		<p class="field-label">Recipe card</p>
		<p class="mt-1 font-display text-lg">{day.plan?.name}</p>
		{#if card}
			<div class="mt-3 border-t border-line pt-3 text-sm">{@render card()}</div>
		{/if}
		<ol class="mt-4 flex flex-wrap gap-1" aria-label="The brew day">
			{#each PLAY_STEPS.slice(1) as s, i (s.id)}
				<li
					class="h-1.5 w-4 rounded-full {i + 1 < day.at
						? 'bg-copper'
						: i + 1 === day.at
							? 'bg-amber'
							: 'bg-ui-active'}"
					title={s.ask}
				>
					<span class="sr-only">{s.ask}{i + 1 < day.at ? ' (done)' : ''}</span>
				</li>
			{/each}
		</ol>
	</aside>
</div>
