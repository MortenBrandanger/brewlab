<script lang="ts">
	/**
	 * Pick the recipe card for the day.
	 *
	 * Cards, because this is a "pick one". The card is what you aim for; the
	 * beer you get is what your hands make of it. Repair recipes are left out:
	 * they are broken on purpose, and following a broken card by hand teaches
	 * nothing the question flow does not teach better.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { EXAMPLES } from '$lib/brewing/recipes';
	import { simulate } from '$lib/brewing/simulate';
	import { day } from '../day.svelte';
	import { PLAY_STEPS } from '../steps';

	const cards = EXAMPLES.filter((e) => e.family !== 'repair').map((example) => {
		const recipe = example.build();
		return { example, recipe, metrics: simulate(recipe).metrics };
	});
	const step = PLAY_STEPS[0];
</script>

<header>
	<p class="field-label">Hands-on brew day</p>
	<h1 class="mt-1 font-display text-xl">{step.ask}</h1>
	<p class="prose-measure mt-1.5 text-sm text-muted">{step.hint}</p>
</header>

<ul class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each cards as c (c.example.id)}
		<li>
			<button
				type="button"
				class="panel flex h-full w-full items-start gap-3 p-4 text-start transition-colors hover:bg-ui"
				onclick={() => day.pick(c.example.id)}
			>
				<span
					class="mt-1 h-10 w-7 shrink-0 rounded-t-sm rounded-b-md ring-1 ring-line-strong"
					style="background:{srmToCss(c.metrics.srm)}"
					aria-hidden="true"
				></span>
				<span class="flex min-w-0 flex-col gap-0.5">
					<span class="font-display text-lg">{c.example.name}</span>
					<span class="text-sm text-muted">{c.example.tagline}</span>
					<span class="tnum mt-1 text-xs text-subtle">
						{c.metrics.abv.toFixed(1)}% · {Math.round(c.metrics.ibu)} IBU · {c.recipe.batchVolumeL} L
					</span>
				</span>
			</button>
		</li>
	{/each}
</ul>
