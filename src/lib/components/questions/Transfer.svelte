<script lang="ts">
	/**
	 * How carefully does it go into the fermenter?
	 *
	 * Cards rather than a segmented control, so the three ways of doing it can be
	 * read against each other before you pick. As a segmented control only the
	 * chosen option's description was visible, which meant the screen could not
	 * be used to decide — it could only confirm a decision already made.
	 *
	 * Nothing else lives here. The screen previously carried three paragraphs
	 * that read the same whichever option was selected — and the last of them,
	 * "a little air here is harmless", argued against the question it sat under.
	 * It is not harmless: the model charges up to fourteen points for oxidation
	 * and credits four for a closed transfer. That consequence now lives in the
	 * cards, where the choice is made, and the paragraph is gone.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import type { ChillSetup } from '$lib/brewing/types';

	const OPTIONS: { value: ChillSetup['transferQuality']; label: string; says: string }[] = [
		{
			value: 'careless',
			label: 'Splashed',
			says: 'Tipped in from height with the lid off. Quick, and it beats air into the beer along with whatever is drifting about the room. It comes back weeks later as a taste of wet cardboard.'
		},
		{
			value: 'normal',
			label: 'Ordinary care',
			says: 'Siphoned through sanitised tubing with the end reaching the bottom of the bucket, so it fills without splashing. What most brewers do, and enough for most beers.'
		},
		{
			value: 'closed',
			label: 'Closed transfer',
			says: 'The bucket filled with CO₂ first so the beer never meets air at all. Fiddly, and the single biggest difference between a homebrewed IPA that still smells of hops after a fortnight and one that does not.'
		}
	];

	const chosen = $derived(brew.recipe.chill.transferQuality);
</script>

<div class="flex flex-col gap-4">
	<ul class="grid gap-2 sm:grid-cols-3">
		{#each OPTIONS as option (option.value)}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {chosen === option.value
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={chosen === option.value}
					onclick={() => (brew.recipe.chill.transferQuality = option.value)}
				>
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium">{option.label}</span>
						{#if option.value === DEFAULTS.chill.transferQuality && chosen === option.value}
							<span class="text-[0.625rem] tracking-wide text-subtle uppercase">default</span>
						{/if}
					</span>
					<span class="mt-1 block text-xs {chosen === option.value ? 'text-fg' : 'text-subtle'}">
						{option.says}
					</span>
				</button>
			</li>
		{/each}
	</ul>
</div>
