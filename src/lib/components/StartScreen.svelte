<script lang="ts">
	import { resolve } from '$app/paths';
	import { srmToCss } from '$lib/brewing/appearance';
	import { EXAMPLES } from '$lib/brewing/recipes';
	import { simulate } from '$lib/brewing/simulate';
	import { brew } from '$lib/state/brew.svelte';

	/** A handful of starting points, not the whole library. */
	const featured = ['house-pale-ale', 'west-coast-ipa', 'dry-stout', 'czech-lager'];
	const picks = $derived(
		featured
			.map((id) => EXAMPLES.find((e) => e.id === id))
			.filter((e) => e !== undefined)
			.map((example) => {
				const recipe = example.build();
				return { example, recipe, result: simulate(recipe) };
			})
	);
</script>

<div class="mx-auto flex w-full max-w-[52rem] flex-1 flex-col justify-center px-3 py-10 sm:px-5">
	<h1 class="font-display text-xl">Brew a beer</h1>
	<p class="prose-measure mt-2 text-sm text-muted">
		Nine stages, from treating the water to pouring the glass. Every choice you make changes the
		beer, and the simulator will tell you exactly which choice did what.
	</p>

	<div class="mt-6 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
		<button
			type="button"
			class="panel flex flex-col items-start gap-2 p-5 text-start ring-1 ring-copper-dim transition-colors hover:bg-ui"
			onclick={() => brew.startFresh()}
		>
			<span class="font-display text-lg">Start a brew day</span>
			<span class="prose-measure text-sm text-muted">
				An empty kettle and a tank of water. You choose the grain, the hops and the yeast, and
				nothing is decided until you decide it.
			</span>
			<span class="btn btn-primary mt-auto">Start from scratch</span>
		</button>

		<div class="panel flex flex-col p-5">
			<span class="font-display text-lg">Or open a finished recipe</span>
			<span class="prose-measure mt-2 text-sm text-muted">
				A complete, brewed beer you can pull apart. Good for seeing what a change does.
			</span>
			<ul class="mt-3 flex flex-col gap-1">
				{#each picks as pick (pick.example.id)}
					<li>
						<button
							type="button"
							class="flex w-full items-center gap-2.5 rounded-md p-2 text-start transition-colors hover:bg-ui-hover"
							onclick={() => {
								brew.load(pick.recipe);
								brew.setStage('taste');
							}}
						>
							<span
								class="h-5 w-5 shrink-0 rounded-full ring-1 ring-line-strong"
								style="background:{srmToCss(pick.result.metrics.srm)}"
								aria-hidden="true"
							></span>
							<span class="min-w-0 flex-1 text-sm">{pick.example.name}</span>
							<span class="tnum text-xs text-subtle">
								{pick.result.metrics.abv.toFixed(1)}% · {Math.round(pick.result.metrics.ibu)} IBU
							</span>
						</button>
					</li>
				{/each}
			</ul>
			<a class="btn btn-quiet mt-2 self-start" href={resolve('/recipes')}>All recipes</a>
		</div>
	</div>

	<p class="mt-5 text-sm text-muted">
		Prefer a goal to work towards? <a
			class="text-copper-text underline"
			href={resolve('/challenges')}
		>
			Take a challenge
		</a>.
	</p>
</div>
