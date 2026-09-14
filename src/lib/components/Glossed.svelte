<script lang="ts">
	/**
	 * Prose with its trade words made askable.
	 *
	 * The report is written for people, but it cannot avoid the words the
	 * trade uses — attenuation, flocculation, esters, dextrins — and a reader
	 * who has never brewed met forty of them on one page with nothing to click.
	 * `TermWord` had been built for exactly this and wired into nothing. This
	 * scans a sentence for glossary words and hands each one to it, once per
	 * sentence, longest match first so "base malt" is not glossed as "malt".
	 *
	 * Text in, text out: the words are not rewritten, only underlined.
	 */
	import TermWord from './TermWord.svelte';
	import { TERMS } from '$lib/brewing/glossary';

	let {
		text,
		except = []
	}: {
		text: string;
		/** Words not to gloss here — "malt" in the malt picker teaches nobody anything. */
		except?: string[];
	} = $props();

	/**
	 * One regex for all sixty-two words, built once. Plurals are accepted by
	 * an optional trailing s and looked up in the singular.
	 */
	const WORDS = [...TERMS.map((t) => t.word)].sort((a, b) => b.length - a.length);
	const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const PATTERN = new RegExp(`\\b(${WORDS.map(escape).join('|')})(s?)\\b`, 'gi');
	// Built once, read only; nothing reactive observes it.
	const KNOWN = new Set(WORDS.map((w) => w.toLowerCase()));

	type Piece = { text: string; term?: string };

	const skip = $derived(new Set(except.map((w) => w.toLowerCase())));

	const pieces = $derived.by((): Piece[] => {
		const out: Piece[] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const seen = new Set<string>();
		let last = 0;
		for (const m of text.matchAll(PATTERN)) {
			const shown = m[0];
			const key = m[1].toLowerCase();
			const index = m.index ?? 0;
			if (!KNOWN.has(key) || seen.has(key) || skip.has(key)) continue;
			seen.add(key);
			if (index > last) out.push({ text: text.slice(last, index) });
			out.push({ text: shown, term: key });
			last = index + shown.length;
		}
		if (last < text.length) out.push({ text: text.slice(last) });
		return out;
	});
</script>

{#each pieces as piece, i (i)}{#if piece.term}<TermWord
			word={piece.text}
			lookup={piece.term}
		/>{:else}{piece.text}{/if}{/each}
