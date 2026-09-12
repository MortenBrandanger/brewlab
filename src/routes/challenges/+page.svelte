<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CHALLENGES } from '$lib/brewing/challenges';
	import { buildExample, defaultRecipe } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';

	$effect(() => {
		void brew.hydrateProgress();
	});

	const DIFFICULTY_LABEL = { easy: 'Gentle', medium: 'Involved', hard: 'Hard' } as const;

	function start(id: string, startingRecipeId?: string) {
		const recipe = startingRecipeId
			? (buildExample(startingRecipeId) ?? defaultRecipe())
			: defaultRecipe();
		brew.startChallenge(id, recipe);
		void goto(resolve('/'));
	}

	const completed = $derived(CHALLENGES.filter((c) => brew.progress[c.id]).length);
</script>

<svelte:head><title>Challenges — BrewLab</title></svelte:head>

<main id="main" class="mx-auto w-full max-w-[80rem] flex-1 px-3 py-6 sm:px-5">
	<h1 class="font-display text-xl">Challenges</h1>
	<p class="prose-measure mt-2 text-sm text-muted">
		Every one of these is solvable with the ingredients and controls already in the simulator. There
		is no single right answer, and the hint is there the moment you want it.
	</p>
	<p class="tnum mt-3 text-sm text-muted">
		<span class="font-medium text-fg">{completed}</span> of {CHALLENGES.length} completed. Progress is
		kept in this browser.
	</p>

	<ul class="mt-6 grid gap-3 md:grid-cols-2">
		{#each CHALLENGES as challenge (challenge.id)}
			{@const done = brew.progress[challenge.id]}
			<li class="panel flex flex-col gap-3 p-4">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<h2 class="font-display text-base font-semibold">{challenge.name}</h2>
					<div class="flex items-center gap-1.5">
						<span class="chip">{DIFFICULTY_LABEL[challenge.difficulty]}</span>
						{#if done}
							<span class="chip text-hop">
								<svg viewBox="0 0 16 16" class="h-3 w-3" aria-hidden="true">
									<path
										d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
										fill="none"
										stroke="currentColor"
										stroke-width="2.4"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								Best {done.bestOverall}
							</span>
						{/if}
					</div>
				</div>
				<p class="prose-measure text-sm text-muted">{challenge.brief}</p>
				<ul class="flex flex-col gap-1">
					{#each challenge.checks as check (check.id)}
						<li class="flex items-start gap-2 text-xs text-subtle">
							<span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-line-strong" aria-hidden="true"
							></span>
							{check.label}
						</li>
					{/each}
				</ul>
				<button
					type="button"
					class="btn btn-primary mt-auto self-start"
					onclick={() => start(challenge.id, challenge.startingRecipeId)}
				>
					{done
						? 'Try again'
						: challenge.startingRecipeId
							? 'Open the broken recipe'
							: 'Start brewing'}
				</button>
			</li>
		{/each}
	</ul>
</main>
