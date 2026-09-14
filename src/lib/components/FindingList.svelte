<script lang="ts">
	import Glossed from './Glossed.svelte';
	import type { Finding, Severity } from '$lib/brewing/types';
	import { STAGES, stageForFields, type StageId } from '$lib/state/stages';

	let { findings, ongoto }: { findings: Finding[]; ongoto?: (stage: StageId) => void } = $props();

	const SEVERITY_LABEL: Record<Severity, string> = {
		severe: 'Severe',
		warning: 'Warning',
		caution: 'Worth checking',
		info: 'Good practice'
	};
</script>

<ul class="flex flex-col gap-2">
	{#each findings as finding (finding.code)}
		{@const stage = stageForFields(finding.fields)}
		<li
			class="rounded-lg border-s-4 bg-surface p-3 ring-1 ring-line
				{finding.severity === 'severe'
				? 'border-s-danger'
				: finding.severity === 'warning'
					? 'border-s-warn'
					: finding.severity === 'caution'
						? 'border-s-amber'
						: 'border-s-hop'}"
		>
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<span
					class="chip"
					class:text-danger-text={finding.severity === 'severe'}
					class:text-warn={finding.severity === 'warning'}
					class:text-amber={finding.severity === 'caution'}
					class:text-hop={finding.severity === 'info'}
				>
					{SEVERITY_LABEL[finding.severity]}
				</span>
				<h4 class="font-display text-sm font-semibold">{finding.title}</h4>
			</div>
			<p class="prose-measure mt-1.5 text-xs text-muted"><Glossed text={finding.explanation} /></p>
			{#if stage && ongoto}
				<button
					type="button"
					class="btn btn-quiet mt-1.5 h-8 !px-2 text-xs"
					onclick={() => ongoto(stage)}
				>
					Go to {STAGES.find((s) => s.id === stage)?.name}
					<svg viewBox="0 0 16 16" class="h-3 w-3" aria-hidden="true">
						<path
							d="M6 3.5 L11 8 L6 12.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			{/if}
		</li>
	{/each}
</ul>
