<script lang="ts">
	/**
	 * A stage as an ordered set of acts rather than one panel of controls.
	 *
	 * A brew day is a sequence of things you do with your hands, in an order that
	 * cannot change: you cannot add hops to a kettle that is not boiling, or
	 * whirlpool before the flame is out. Showing every control at once turned
	 * that sequence into a form, and the reader had no idea which part of it they
	 * were supposed to be doing.
	 *
	 * Acts already done stay on screen as a one-line record you can reopen, so
	 * nothing is hidden and the stage reads back as the story of what you did.
	 * Acts still ahead are named but not reachable — the same rule the nine
	 * stages follow.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import type { StageId } from '$lib/state/stages';

	export type Step = {
		id: string;
		/** The physical act, in the imperative: "Bring it to a boil". */
		title: string;
		/** One line of narration: what is happening, and what you are deciding. */
		says: string;
		/** What this act came to, once it is behind you. */
		summary?: string;
	};

	let {
		stage,
		steps,
		content
	}: {
		stage: StageId;
		steps: Step[];
		content: import('svelte').Snippet<[string]>;
	} = $props();

	/** A finished stage is a record: every act is behind you. */
	const stageDone = $derived(brew.isDone(stage));
	const current = $derived(
		stageDone ? steps.length : Math.min(brew.stepFor(stage), steps.length - 1)
	);
	/** Reopening a finished act does not undo it, so it is tracked separately. */
	let reopened = $state<string | undefined>(undefined);

	function open(index: number) {
		reopened = steps[index].id;
		if (!stageDone) brew.setStep(stage, index);
	}
</script>

<ol class="flex flex-col gap-2">
	{#each steps as step, index (step.id)}
		{@const done = index < current}
		{@const active = index === current || reopened === step.id}
		{@const ahead = index > current}
		<li
			class="rounded-lg border transition-colors {active
				? 'border-copper-dim bg-copper-dim/10'
				: 'border-line bg-surface'}"
		>
			{#if active}
				<div class="p-4">
					<div class="flex items-baseline gap-2.5">
						<span
							class="tnum grid h-5 w-5 shrink-0 translate-y-0.5 place-items-center rounded-full bg-copper text-[0.625rem] font-bold text-ink"
							aria-hidden="true">{index + 1}</span
						>
						<div class="min-w-0 flex-1">
							<h3 class="font-display text-sm font-semibold">{step.title}</h3>
							<p class="prose-measure mt-1 text-sm text-muted">{step.says}</p>
						</div>
					</div>
					<div class="mt-4">{@render content(step.id)}</div>

					{#if index < steps.length - 1 && !stageDone && reopened !== step.id}
						<button
							type="button"
							class="btn btn-ghost mt-4"
							onclick={() => brew.setStep(stage, index + 1)}
						>
							Next: {steps[index + 1].title.toLowerCase()}
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
					{:else if reopened === step.id}
						<button type="button" class="btn btn-ghost mt-4" onclick={() => (reopened = undefined)}>
							Close
						</button>
					{/if}
				</div>
			{:else}
				<button
					type="button"
					class="flex w-full items-baseline gap-2.5 p-3 text-start"
					class:cursor-default={ahead}
					aria-disabled={ahead ? 'true' : undefined}
					onclick={() => !ahead && open(index)}
				>
					<span
						class="tnum grid h-5 w-5 shrink-0 translate-y-0.5 place-items-center rounded-full text-[0.625rem] font-bold {done
							? 'bg-hop-dim text-fg'
							: 'bg-ui-active text-muted'}"
						aria-hidden="true"
					>
						{#if done}
							<svg viewBox="0 0 16 16" class="h-3 w-3"
								><path
									d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
									fill="none"
									stroke="currentColor"
									stroke-width="2.2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/></svg
							>
						{:else}
							{index + 1}
						{/if}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-sm {done ? 'text-fg' : 'text-subtle'}">{step.title}</span>
						{#if done && step.summary}
							<span class="prose-measure mt-0.5 block text-xs text-muted">{step.summary}</span>
						{/if}
					</span>
					<span class="sr-only">{done ? '(done — reopen)' : '(not reached yet)'}</span>
				</button>
			{/if}
		</li>
	{/each}
</ol>
