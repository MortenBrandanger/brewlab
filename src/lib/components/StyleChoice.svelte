<script lang="ts">
	/**
	 * The first question of a brew day: what are you aiming at?
	 *
	 * Three testers who had never brewed all reported the same thing — the app
	 * never asks what beer you are making, yet every stage judges you against
	 * one. Stage one offers waters labelled "Pale ales and IPAs" and "Stouts and
	 * porters only"; the malts are described by comparison to finished beers; the
	 * mash asks whether you want it dry or full. All of that is unanswerable
	 * until this question has been put.
	 *
	 * Answering "surprise me" is a real answer, not a skipped one — the beer is
	 * then judged on its own terms rather than against a target.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { ebcToSrm } from '$lib/brewing/calculations';
	import { STYLE_BY_ID } from '$lib/brewing/styles';

	let { onchoose }: { onchoose: (styleId: string | undefined) => void } = $props();

	/**
	 * Nine beers someone who does not brew has drunk or at least seen on a tap
	 * list, spread across colour and strength so the row reads as a range rather
	 * than a catalogue. The full list of twenty-nine stays available from the
	 * header once the brew has started.
	 */
	const PICKS: { id: string; why: string }[] = [
		{ id: 'pale-lager', why: 'Pale, clean and easy. The beer most people picture.' },
		{ id: 'czech-pilsner', why: 'A lager with more bite and a floral nose.' },
		{ id: 'pale-ale', why: 'Balanced and hoppy without going far.' },
		{ id: 'ipa', why: 'Bitter and aromatic. The modern craft standard.' },
		{ id: 'neipa', why: 'Soft, cloudy and heavy on fruit, light on bitterness.' },
		{ id: 'hefeweizen', why: 'Wheat beer. Banana and clove, from the yeast.' },
		{ id: 'porter', why: 'Dark and chocolatey, but not heavy.' },
		{ id: 'dry-stout', why: 'Black, roasty and dry. A pint of the obvious one.' },
		{ id: 'imperial-stout', why: 'Very dark, very strong, built to keep for years.' }
	];

	const styles = $derived(
		PICKS.map((pick) => ({ ...pick, style: STYLE_BY_ID.get(pick.id) })).filter(
			(p) => p.style !== undefined
		)
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h2 class="font-display text-lg">What are you aiming at?</h2>
		<p class="prose-measure mt-1 text-sm text-muted">
			Pick a beer to brew towards and every stage will tell you whether you are still heading for it
			— which water suits it, how bitter it wants to be, how dark. You can change your mind at any
			point, or work without a target.
		</p>
	</div>

	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each styles as pick (pick.id)}
			{@const style = pick.style!}
			<!-- The midpoint, not the top of the range: judging by the maximum called
			     a Czech pilsner "strongly bitter" and a pale lager "moderately" so,
			     which is the wrong way round. -->
			{@const ibu = (style.ibu.min + style.ibu.max) / 2}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg bg-surface p-3 text-start ring-1 ring-line transition-colors hover:bg-ui-hover hover:ring-line-strong"
					onclick={() => onchoose(pick.id)}
				>
					<span class="flex items-center gap-2.5">
						<span
							class="h-6 w-6 shrink-0 rounded-full ring-1 ring-line-strong"
							style="background:{srmToCss(ebcToSrm((style.ebc.min + style.ebc.max) / 2))}"
							aria-hidden="true"
						></span>
						<span class="min-w-0 text-sm font-medium">{style.name}</span>
					</span>
					<span class="mt-1.5 block text-xs text-subtle">{pick.why}</span>
					<span class="tnum mt-1.5 block text-[0.6875rem] text-muted">
						{style.abv.min.toFixed(1)}–{style.abv.max.toFixed(1)}% alcohol ·
						{#if ibu < 20}
							barely bitter
						{:else if ibu < 40}
							moderately bitter
						{:else if ibu < 60}
							clearly bitter
						{:else}
							very bitter
						{/if}
					</span>
				</button>
			</li>
		{/each}
	</ul>

	<button
		type="button"
		class="rounded-lg bg-surface p-3 text-start ring-1 ring-line transition-colors hover:bg-ui-hover hover:ring-line-strong"
		onclick={() => onchoose(undefined)}
	>
		<span class="block text-sm font-medium">No target — see what comes out</span>
		<span class="mt-0.5 block text-xs text-subtle">
			The beer is judged on its own terms, and named at the end by whatever it turns out closest to.
		</span>
	</button>
</div>
