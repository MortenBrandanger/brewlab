<script lang="ts">
	/**
	 * "Why does this matter?", asked where the question is.
	 *
	 * This used to be a disclosure at the foot of the page, below the controls
	 * and below the action — the one piece of explanation on the screen that was
	 * nowhere near the thing it explained. It is the same affordance a figure
	 * already uses: a small question mark you press, opening in place.
	 *
	 * Read-more belongs in context, always, and there is one way of asking for it
	 * in this app rather than three.
	 */
	import { STAGE_BY_ID, type StageId } from '$lib/state/stages';

	let { stage }: { stage: StageId } = $props();

	const meta = $derived(STAGE_BY_ID.get(stage));
</script>

{#if meta?.what}
	<details class="group inline">
		<summary
			class="ms-1 inline-grid h-4 w-4 translate-y-0.5 cursor-pointer list-none place-items-center rounded-full align-baseline text-[0.625rem] font-bold text-copper-text ring-1 ring-copper-dim hover:bg-copper-dim/30"
		>
			?<span class="sr-only">Why {meta.name.toLowerCase()} matters</span>
		</summary>

		<div
			class="absolute inset-x-0 z-20 mt-2 rounded-lg bg-surface-2 p-3 shadow-lg ring-1 ring-line-strong"
		>
			<p class="text-xs font-medium text-fg">Why {meta.name.toLowerCase()} matters</p>
			<p class="prose-measure mt-1 text-xs text-muted">{meta.what}</p>
			{#if meta.deepDive}
				<p class="prose-measure mt-2 text-xs text-subtle">{meta.deepDive}</p>
			{/if}
		</div>
	</details>
{/if}
