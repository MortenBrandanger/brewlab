<script lang="ts">
	import { getHop } from '$lib/brewing/ingredients';
	import { hopAdditionSummary } from '$lib/brewing/sensory';
	import type { HopAddition } from '$lib/brewing/types';

	let {
		hops,
		boilTimeMin,
		ibuByAddition
	}: { hops: HopAddition[]; boilTimeMin: number; ibuByAddition: Map<string, number> } = $props();

	const BOIL_END = 56;
	const WHIRLPOOL_END = 72;
	const ROW_HEIGHT = 21;

	/** Left offset as a percentage of the whole brew-day-to-package timeline. */
	function positionOf(addition: HopAddition): number {
		if (addition.use === 'boil') {
			const elapsed = Math.max(0, boilTimeMin - Math.min(addition.time, boilTimeMin));
			return (elapsed / Math.max(1, boilTimeMin)) * BOIL_END;
		}
		if (addition.use === 'whirlpool') {
			return BOIL_END + 2 + (Math.min(addition.time, 45) / 45) * (WHIRLPOOL_END - BOIL_END - 4);
		}
		const day = Math.min(addition.day ?? 5, 21);
		return WHIRLPOOL_END + 2 + (day / 21) * (100 - WHIRLPOOL_END - 4);
	}

	const placed = $derived(
		hops
			.map((addition) => ({ addition, hop: getHop(addition.hopId), left: positionOf(addition) }))
			.filter((item) => item.hop)
			.sort((a, b) => a.left - b.left)
	);

	/** Stagger labels so neighbouring additions do not overlap. */
	const rows = $derived(
		placed.map((item, index) => {
			let row = 0;
			for (let i = 0; i < index; i += 1) {
				if (Math.abs(placed[i].left - item.left) < 14) row += 1;
			}
			return { ...item, row: row % 3 };
		})
	);

	const stackHeight = $derived(Math.max(1, ...rows.map((r) => r.row + 1)) * ROW_HEIGHT + 10);

	/** Keep labels inside the panel at both ends. */
	function anchor(left: number): string {
		if (left < 9) return 'translateX(0)';
		if (left > 91) return 'translateX(-100%)';
		return 'translateX(-50%)';
	}
</script>

<div class="overflow-hidden rounded-lg bg-surface p-4 ring-1 ring-line">
	<div class="relative" style="height:{stackHeight + 34}px">
		{#each rows as item (item.addition.id)}
			{@const ibu = ibuByAddition.get(item.addition.id) ?? 0}
			<span
				class="absolute w-px bg-line-strong"
				style="left:{item.left}%; bottom:34px; height:{item.row * ROW_HEIGHT + 6}px"
				aria-hidden="true"
			></span>
			<span
				class="absolute rounded-sm px-1.5 py-0.5 text-[0.6875rem] leading-tight font-medium whitespace-nowrap text-fg
					{item.addition.use === 'boil'
					? 'bg-copper-dim'
					: item.addition.use === 'whirlpool'
						? 'bg-ui-active'
						: 'bg-hop-dim'}"
				style="left:{item.left}%; bottom:{40 + item.row * ROW_HEIGHT}px; transform:{anchor(
					item.left
				)}"
			>
				{item.hop!.name}
				<span class="tnum opacity-75">{item.addition.grams} g</span>
				{#if ibu >= 0.5}<span class="tnum opacity-75">· {Math.round(ibu)} IBU</span>{/if}
			</span>
			<span
				class="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-surface
					{item.addition.use === 'boil'
					? 'bg-copper'
					: item.addition.use === 'whirlpool'
						? 'bg-amber'
						: 'bg-hop'}"
				style="left:{item.left}%; bottom:28px"
				aria-hidden="true"
			></span>
		{/each}

		<!-- The track -->
		<div class="absolute inset-x-0 bottom-8 h-1.5" aria-hidden="true">
			<div
				class="absolute inset-y-0 rounded-s-full bg-copper-dim"
				style="left:0; width:{BOIL_END}%"
			></div>
			<div
				class="absolute inset-y-0 bg-ui-active"
				style="left:{BOIL_END}%; width:{WHIRLPOOL_END - BOIL_END}%"
			></div>
			<div
				class="absolute inset-y-0 rounded-e-full bg-hop-dim"
				style="left:{WHIRLPOOL_END}%; width:{100 - WHIRLPOOL_END}%"
			></div>
		</div>

		<div class="absolute inset-x-0 bottom-0 flex text-[0.625rem] text-subtle" aria-hidden="true">
			<span style="width:{BOIL_END}%">Boil · {boilTimeMin} min → flameout</span>
			<span style="width:{WHIRLPOOL_END - BOIL_END}%">Whirlpool</span>
			<span class="text-end" style="width:{100 - WHIRLPOOL_END}%">Dry hop</span>
		</div>
	</div>

	{#if placed.length === 0}
		<p class="mt-2 text-xs text-subtle">
			No hops yet. Add a bittering charge to give the malt something to push against.
		</p>
	{/if}

	<ul class="sr-only">
		{#each placed as item (item.addition.id)}
			<li>{item.hop!.name}, {item.addition.grams} grams, {hopAdditionSummary(item.addition)}.</li>
		{/each}
	</ul>
</div>
