<script lang="ts">
	import { SCORE_DESCRIPTIONS, SCORE_LABELS, SCORE_WEIGHTS } from '$lib/brewing/scoring';
	import type { ScoreKey, Scores } from '$lib/brewing/types';

	let { scores }: { scores: Scores } = $props();

	const keys: ScoreKey[] = ['technical', 'coherence', 'enjoyment'];
</script>

<div class="flex flex-col gap-4">
	<p class="prose-measure text-xs text-muted">
		Every score starts from a baseline and is moved by the contributions below. Nothing here is
		hidden: if a number changed, one of these lines is why.
	</p>

	{#each keys as key (key)}
		{@const score = scores[key]}
		<section class="rounded-lg bg-surface p-3 ring-1 ring-line">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h4 class="font-display text-sm font-semibold">{SCORE_LABELS[key]}</h4>
				<span class="tnum text-sm">
					<span class="font-medium">{score.value}</span><span class="text-subtle"
						>/100 · weight {Math.round(SCORE_WEIGHTS[key] * 100)}%</span
					>
				</span>
			</div>
			<p class="prose-measure mt-1 text-xs text-subtle">{SCORE_DESCRIPTIONS[key]}</p>

			<div class="mt-3 grid gap-4 sm:grid-cols-2">
				<div>
					<h5 class="field-label mb-1.5 text-hop">Helped</h5>
					{#if score.positives.length}
						<ul class="flex flex-col gap-1.5">
							{#each score.positives as item (item.label)}
								<li>
									<div class="flex items-baseline justify-between gap-3">
										<span class="text-xs font-medium">{item.label}</span>
										<span class="tnum shrink-0 text-xs text-hop">+{item.delta.toFixed(1)}</span>
									</div>
									<p class="prose-measure text-[0.6875rem] leading-relaxed text-subtle">
										{item.detail}
									</p>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-xs text-subtle">Nothing added points here.</p>
					{/if}
				</div>
				<div>
					<h5 class="field-label mb-1.5 text-warn">Cost points</h5>
					{#if score.negatives.length}
						<ul class="flex flex-col gap-1.5">
							{#each score.negatives as item (item.label)}
								<li>
									<div class="flex items-baseline justify-between gap-3">
										<span class="text-xs font-medium">{item.label}</span>
										<span class="tnum shrink-0 text-xs text-warn">{item.delta.toFixed(1)}</span>
									</div>
									<p class="prose-measure text-[0.6875rem] leading-relaxed text-subtle">
										{item.detail}
									</p>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-xs text-subtle">Nothing took points away.</p>
					{/if}
				</div>
			</div>
		</section>
	{/each}

	<p class="prose-measure text-xs text-subtle">
		The overall figure is technical × {SCORE_WEIGHTS.technical}, coherence × {SCORE_WEIGHTS.coherence}
		and enjoyment ×
		{SCORE_WEIGHTS.enjoyment}. Scores are shown as whole numbers because they are easier to compare
		that way, not because the model is precise to the point.
	</p>
</div>
