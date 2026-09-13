<script lang="ts">
	/**
	 * How carefully does it go into the fermenter?
	 *
	 * Cards rather than a segmented control, so the three ways of doing it can be
	 * read against each other before you pick. As a segmented control only the
	 * chosen option's description was visible, which meant the screen could not
	 * be used to decide — it could only confirm a decision already made.
	 *
	 * Nothing else lives here. It previously carried three paragraphs that said
	 * the same thing whichever option was selected: the aeration advice, the
	 * gravity reading and the sealing. The gravity arrives in the panel when the
	 * stage is carried out, which is what the reveal is for.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import type { ChillSetup } from '$lib/brewing/types';

	const OPTIONS: { value: ChillSetup['transferQuality']; label: string; says: string }[] = [
		{
			value: 'careless',
			label: 'Splashed',
			says: 'Tipped in from height with the lid off. Quick, and it beats air into the wort along with whatever is drifting about the room.'
		},
		{
			value: 'normal',
			label: 'Ordinary care',
			says: 'Siphoned through sanitised tubing with the end reaching the bottom of the bucket, so it fills without splashing. What most brewers do.'
		},
		{
			value: 'closed',
			label: 'Closed transfer',
			says: 'The bucket filled with CO₂ first so the beer never meets air at all. Fiddly, and worth the trouble for a hop-forward beer.'
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

	<p class="prose-measure text-xs text-subtle">
		A little air here is harmless — the yeast wants some to build itself before it starts on the
		sugar. It is after fermentation that the same splash turns hop aroma into wet cardboard.
	</p>
</div>
