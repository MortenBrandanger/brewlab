<script lang="ts">
	/**
	 * What are you brewing on?
	 *
	 * This screen used to be two sliders: "stop collecting at __ L" and
	 * "brewhouse efficiency __%". Neither was a decision. Efficiency is not a
	 * dial you set, it is what your kit and your patience turn out to be worth,
	 * and nobody picks a collection volume out of the air — you collect enough
	 * to boil down to the batch you wanted.
	 *
	 * The real decision at the tun is how thoroughly you rinse the grain, and
	 * that is the kit in front of you. So the screen asks that, in the words of
	 * what you physically do, and both numbers fall out of the answer.
	 */
	import LearningNote from '../LearningNote.svelte';
	import { RIGS, collectVolumeL, rigFor } from '$lib/brewing/rigs';
	import type { Rig } from '$lib/brewing/rigs';
	import { GRAIN_ABSORPTION_L_PER_KG } from '$lib/brewing/simulate';
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';

	const rig = $derived(rigFor(brew.recipe.efficiencyPct));

	function choose(next: Rig) {
		brew.recipe.efficiencyPct = next.efficiencyPct;
		brew.recipe.preBoilVolumeL = collectVolumeL(
			next,
			brew.recipe.batchVolumeL,
			brew.recipe.boilTimeMin
		);
	}

	const grainKg = $derived(brew.context?.gravity.grist.grainKg ?? 0);
	const mashWaterL = $derived(grainKg * brew.recipe.mash.thicknessLPerKg);
	const absorbedL = $derived(grainKg * GRAIN_ABSORPTION_L_PER_KG);
	const collectL = $derived(brew.recipe.preBoilVolumeL);
	const spargeL = $derived(Math.max(0, collectL - (mashWaterL - absorbedL)));
	/*
	 * Not all of the difference between the kettle and the fermenter went up
	 * as steam: a couple of litres stay behind with the hop debris and the
	 * break material. Calling the whole gap "boiled away" was a small lie.
	 */
	const leftBehindL = $derived(
		Math.min(rig.kettleLossL, Math.max(0, collectL - brew.recipe.batchVolumeL))
	);
	const boilOffL = $derived(Math.max(0, collectL - brew.recipe.batchVolumeL - leftBehindL));
	const preBoilGravity = $derived(brew.context?.gravity.preBoilGravity ?? 1);
	const effective = $derived(Math.round((brew.context?.gravity.effectiveEfficiency ?? 0) * 100));
</script>

<div class="flex flex-col gap-5">
	<ul class="grid gap-2 sm:grid-cols-2">
		{#each RIGS as option (option.id)}
			{@const selected = option.id === rig.id}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1
						{selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => choose(option)}
				>
					<span class="block text-sm font-medium">
						{option.name}
						{#if selected && brew.recipe.efficiencyPct === DEFAULTS.efficiencyPct}
							<span class="ms-1.5 text-[0.625rem] tracking-wide text-fg/70 uppercase">default</span>
						{/if}
					</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
						{option.what}
					</span>
					<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
						Washes out about <span class="tnum">{option.efficiencyPct}%</span> of the grain's sugar
						· collect
						<span class="tnum"
							>{collectVolumeL(option, brew.recipe.batchVolumeL, brew.recipe.boilTimeMin).toFixed(
								1
							)} L</span
						>
					</span>
				</button>
			</li>
		{/each}
	</ul>

	<section class="rounded-lg bg-surface p-4 ring-1 ring-line">
		<h3 class="field-label mb-3">Where the water goes</h3>
		{#if grainKg === 0}
			<p class="prose-measure text-sm text-muted">
				Nothing is mashed yet, so there is nothing to run off. Add a malt on the grain stage and
				this fills in.
			</p>
		{:else}
			{@const total = collectL + absorbedL}
			<div class="flex h-8 overflow-hidden rounded-md ring-1 ring-line-strong" aria-hidden="true">
				<div
					class="flex items-center justify-center bg-copper-dim text-xs font-medium text-fg"
					style="width:{(brew.recipe.batchVolumeL / total) * 100}%"
				>
					beer
				</div>
				<div
					class="flex items-center justify-center bg-ui-active text-xs text-muted"
					style="width:{((boilOffL + leftBehindL) / total) * 100}%"
				>
					boil-off
				</div>
				<div
					class="flex items-center justify-center bg-ui text-xs text-muted"
					style="width:{(absorbedL / total) * 100}%"
				>
					grain
				</div>
			</div>
			<dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
				<div>
					<dt class="text-xs text-subtle">Mash water</dt>
					<dd class="tnum text-sm font-medium">{mashWaterL.toFixed(1)} L</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Rinsed through the grain</dt>
					<dd class="tnum text-sm font-medium">{spargeL.toFixed(1)} L</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Held by the grain</dt>
					<dd class="tnum text-sm font-medium">{absorbedL.toFixed(1)} L</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Boiled away</dt>
					<dd class="tnum text-sm font-medium">{boilOffL.toFixed(1)} L</dd>
				</div>
				<div>
					<dt class="text-xs text-subtle">Left with the hop debris</dt>
					<dd class="tnum text-sm font-medium">{leftBehindL.toFixed(1)} L</dd>
				</div>
			</dl>
		{/if}
	</section>

	<!-- What you can actually read here. The gravity after the boil is measured
	     off a hydrometer in the chilled wort, two stages from now. -->
	<div>
		<p class="prose-measure text-sm text-muted">
			You stop at <span class="tnum font-medium text-fg">{collectL.toFixed(1)} L</span> in the
			kettle, and a sample off the tap reads
			<span class="tnum font-medium text-fg">{preBoilGravity.toFixed(3)}</span>. The boil will
			concentrate it further as water evaporates.
			{#if grainKg > 0 && effective !== brew.recipe.efficiencyPct}
				This grist rinses a little
				{effective > brew.recipe.efficiencyPct ? 'better' : 'worse'} than the kit's usual
				<span class="tnum text-fg">{brew.recipe.efficiencyPct}%</span> — call it
				<span class="tnum text-fg">{effective}%</span>.
				{#each brew.context?.gravity.efficiencyNotes ?? [] as note (note)}
					{note}
				{/each}
			{/if}
		</p>
		<LearningNote
			why="How much of the grain's sugar you wash out is called brewhouse efficiency, and it is the one number every recipe assumes about you. Measure yours once on a normal beer and treat it as a starting point."
			deepDive="It is not a fixed property of your equipment either. It falls as the grain bill grows, because a deeper bed holds more sugary wort that the sparge only dilutes. It falls when the mash is cut short, because starch never converted. It falls when the grist is short of enzyme-carrying base malt. The same rig will give you 75% on a bitter and 65% on a barley wine, and that is normal rather than a fault."
			title="Why the number moves"
		/>
	</div>
</div>
