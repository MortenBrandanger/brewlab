<script lang="ts">
	/**
	 * A trade word you can ask about, in place.
	 *
	 * The app's own rule is that every trade word is introduced where it first
	 * appears. In practice a stage cannot afford to gloss "wort", "grist",
	 * "sparge", "pitch" and "attenuation" in its own prose without drowning the
	 * controls, and a reader who meets one on stage seven has long since lost the
	 * gloss from stage three. So the word carries its own definition.
	 *
	 * Click, not hover: a tooltip does not exist on a phone, and this is the only
	 * explanation of the word on most screens.
	 */
	import { termFor } from '$lib/brewing/glossary';

	let {
		word,
		lookup,
		children
	}: {
		/** The word as written in the sentence; also the lookup key unless `lookup` is given. */
		word: string;
		/** For a plural or an inflection: 'runnings' shown, 'running' looked up. */
		lookup?: string;
		children?: import('svelte').Snippet;
	} = $props();

	const term = $derived(termFor(lookup ?? word));
</script>

{#if term}
	<details class="group inline">
		<summary
			class="inline cursor-pointer list-none underline decoration-copper-dim decoration-dotted underline-offset-2 hover:decoration-copper"
		>
			{#if children}{@render children()}{:else}{word}{/if}<span class="sr-only">
				— what does this mean?</span
			>
		</summary>
		<span class="mt-1.5 mb-1 block rounded-lg bg-surface p-2.5 ring-1 ring-line">
			<span class="block text-xs font-medium text-fg">{term.word}</span>
			<span class="prose-measure mt-0.5 block text-xs text-muted">{term.plain}</span>
			{#if term.soWhat}
				<span class="prose-measure mt-1 block text-xs text-subtle">{term.soWhat}</span>
			{/if}
		</span>
	</details>
{:else if children}{@render children()}{:else}{word}{/if}
