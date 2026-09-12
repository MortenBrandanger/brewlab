<script lang="ts">
	import { brew } from '$lib/state/brew.svelte';

	const challenge = $derived(brew.challenge);
	const evaluation = $derived(brew.challengeEvaluation);

	$effect(() => {
		if (evaluation?.complete) void brew.recordProgress();
	});
</script>

{#if challenge && evaluation}
	<section class="panel p-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="font-display text-base font-semibold">{challenge.name}</h2>
			<span class="tnum chip">{evaluation.passedCount} of {evaluation.total}</span>
		</div>
		<p class="prose-measure mt-1 text-xs text-muted">{challenge.brief}</p>

		<ul class="mt-3 flex flex-col gap-1.5">
			{#each evaluation.checks as check (check.id)}
				<li class="flex items-start gap-2 text-xs">
					{#if check.passed}
						<svg
							viewBox="0 0 16 16"
							class="mt-0.5 h-3.5 w-3.5 shrink-0 text-hop"
							aria-hidden="true"
						>
							<path
								d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<svg
							viewBox="0 0 16 16"
							class="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle"
							aria-hidden="true"
						>
							<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
						</svg>
					{/if}
					<span class={check.passed ? 'text-fg' : 'text-muted'}>
						<span class="sr-only">{check.passed ? 'Met: ' : 'Not yet met: '}</span>{check.label}
					</span>
				</li>
			{/each}
		</ul>

		{#if evaluation.complete}
			<p class="mt-3 rounded-md bg-hop-dim p-2.5 text-xs text-fg">
				Challenge complete, with an overall score of {brew.result.scores.overall}. Keep tuning if
				you want to beat it.
			</p>
		{:else}
			<details class="group mt-3">
				<summary
					class="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm py-1 text-xs font-medium text-copper-text hover:underline"
				>
					<svg
						viewBox="0 0 16 16"
						class="h-3 w-3 transition-transform group-open:rotate-90"
						aria-hidden="true"
					>
						<path
							d="M6 3.5 L11 8 L6 12.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					Hint
				</summary>
				<p class="prose-measure mt-1 text-xs text-subtle">{challenge.hint}</p>
			</details>
		{/if}
	</section>
{/if}
