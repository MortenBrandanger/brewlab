<script lang="ts">
	import { prefs } from '$lib/state/prefs.svelte';

	/**
	 * Layer two and three of the learning system: a short "why" that sits beside
	 * the control, and an optional deep dive folded away behind a disclosure.
	 */
	let {
		why,
		deepDive = '',
		title = 'Why this matters'
	}: { why: string; deepDive?: string; title?: string } = $props();
</script>

{#if prefs.showWhy}
	<div class="mt-2 border-s-2 border-copper-dim ps-3">
		<p class="prose-measure text-xs text-muted">{why}</p>
		{#if deepDive}
			<details class="group mt-1.5">
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
					{title}
				</summary>
				<p class="prose-measure mt-1.5 text-xs text-subtle">{deepDive}</p>
			</details>
		{/if}
	</div>
{/if}
