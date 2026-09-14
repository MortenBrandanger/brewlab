<script lang="ts">
	/**
	 * Six tasters, one beer, and the gap between them.
	 *
	 * Each card is a taster from panel.ts: a weighting of what the model knows,
	 * a line chosen from what moved them most, hearts from their score. The
	 * portraits are the one part an AI should not draw by hand — see
	 * GRAPHICS.md — so they are image files the owner supplies in
	 * static/panel/, and a monogram stands in until then.
	 */
	import { judgePanel, panelSplit } from '$lib/brewing/panel';
	import { brew } from '$lib/state/brew.svelte';

	const tasters = $derived(judgePanel(brew.result, brew.recipe));
	const split = $derived(panelSplit(tasters));

	/** Portraits that failed to load fall back to the badge, once each. */
	let missing = $state<Record<string, boolean>>({});
</script>

<section>
	<div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h3 class="field-label">The test panel</h3>
		<p class="text-xs text-muted">{split}</p>
	</div>
	<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each tasters as t (t.id)}
			<li class="flex gap-3 rounded-lg bg-surface p-3 ring-1 ring-line">
				{#if !missing[t.id]}
					<img
						src="/panel/{t.id}.png"
						alt=""
						width="56"
						height="56"
						class="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-line-strong"
						onerror={() => (missing = { ...missing, [t.id]: true })}
					/>
				{:else}
					<span
						class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-copper-dim font-display text-lg text-fg ring-1 ring-line-strong"
						aria-hidden="true"
					>
						{t.name.replace(/^The /, '').charAt(0)}
					</span>
				{/if}
				<div class="min-w-0">
					<div class="flex flex-wrap items-baseline gap-x-2">
						<span class="text-sm font-medium">{t.name}</span>
						<span class="text-xs text-copper-text" aria-label="{t.hearts} of 5 hearts">
							{'♥'.repeat(t.hearts)}<span class="text-subtle">{'♥'.repeat(5 - t.hearts)}</span>
						</span>
					</div>
					<p class="prose-measure mt-1 text-sm text-fg">“{t.line}”</p>
					<p class="mt-1 text-xs text-subtle">{t.about}</p>
				</div>
			</li>
		{/each}
	</ul>
</section>
