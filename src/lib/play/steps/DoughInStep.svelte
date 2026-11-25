<script lang="ts">
	/**
	 * Tip the grain in and stir.
	 *
	 * The grain pulls the water down by exactly what the strike formula says,
	 * and then the thermometer lies until the mash is stirred through: the
	 * probe reads whichever pocket it sits in. If it settles somewhere you did
	 * not want, a splash from the kettle or the cold tap moves it, at the cost
	 * of a thinner mash — which the report then judges, because it happened.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { day } from '../day.svelte';
	import { addGrain, addWater, probeC, stepTun, stir } from '../mashHeat';
	import { inPot } from '../mashScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import GasKnob from '../GasKnob.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second: stirring a mash in takes a few minutes. */
	const SPEED = 0.6;
	/** Kilograms of grain a second while the bucket is tipped. */
	const POUR_KG_S = 1.4;
	/** Litres a second from the kettle or the jug. */
	const SPLASH_L_S = 0.35;

	let flame = $state(day.tun.flame);
	let pouring = $state(false);
	let stirring = $state(false);
	let hot = $state(false);
	let cold = $state(false);
	let reading = $state(probeC(day.tun));
	let inKg = $state(day.tun.grainInKg);
	let unmixed = $state(day.tun.unmixed);
	let addedL = $state(0);
	let dragging = $state(false);

	const total = day.grainKg;
	const target = day.mashTargetC;
	const wort = srmToCss(simulate(day.plan!).metrics.srm);
	const mash = day.mashScene;
	const allIn = $derived(inKg >= total - 1e-6);

	function frame(calm: boolean) {
		return {
			tun: day.tun,
			probeC: probeC(day.tun),
			grainTotalKg: total,
			targetC: target,
			pouring: pouring && !allIn,
			autoStir: stirring,
			splash: hot ? ('hot' as const) : cold ? ('cold' as const) : undefined,
			fermentable: 0,
			dextrins: 0,
			wort,
			calm
		};
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		let s = stepTun({ ...day.tun, flame }, dt * SPEED);
		if (pouring && s.grainInKg < total)
			s = addGrain(s, Math.min(total - s.grainInKg, POUR_KG_S * dt));
		if (allIn && hot) {
			s = addWater(s, SPLASH_L_S * dt, 98);
			addedL += SPLASH_L_S * dt;
		}
		if (allIn && cold) {
			s = addWater(s, SPLASH_L_S * dt, 14);
			addedL += SPLASH_L_S * dt;
		}
		// Effort is how fast the paddle moves: a lazy circle barely mixes.
		const dragged = input.down && inPot(input.x, input.y);
		dragging = dragged;
		const effort = stirring
			? 0.85
			: dragged
				? Math.min(1, Math.hypot(input.vx, input.vy) / 700)
				: 0;
		if (effort > 0 && s.grainInKg > 0) s = stir(s, effort, dt * SPEED * 3);
		day.tun = s;
		mash.update(dt, frame(calm), input);

		const r = Math.round(probeC(s) * 10) / 10;
		if (r !== reading) reading = r;
		if (Math.abs(s.grainInKg - inKg) > 0.01 || (s.grainInKg >= total && inKg < total))
			inKg = s.grainInKg;
		if (Math.abs(s.unmixed - unmixed) > 0.01) unmixed = s.unmixed;
	}

	const gap = $derived(reading - target);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => mash.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			cursor={dragging ? 'grabbing' : 'grab'}
			label="The copper pot of hot water, the bucket of crushed malt beside it and a paddle. Drag in the pot to stir."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			<HoldButton bind:held={pouring} disabled={allIn}>
				{allIn ? 'All the grain is in' : 'Hold to pour the grain'}
			</HoldButton>
			<HoldButton bind:held={stirring} disabled={inKg <= 0}>Hold to stir</HoldButton>
			{#if allIn}
				<HoldButton bind:held={hot}>Boiling water</HoldButton>
				<HoldButton bind:held={cold}>Cold water</HoldButton>
			{/if}
		</div>
		<GasKnob bind:value={flame} />
	{/snippet}
	{#snippet readout()}
		The thermometer reads {reading.toFixed(1)} °C.
		{#if inKg <= 0}
			The grain is still in the bucket.
		{:else if unmixed > 0.2}
			There are dry clumps. Keep stirring or the reading means nothing yet.
		{:else if Math.abs(gap) < 0.6}
			Stirred through, and on the card's {target} °C.
		{:else if gap < 0}
			Stirred through, {(-gap).toFixed(1)} °C under the card. Boiling water lifts it, or leave it and
			the beer finishes drier.
		{:else}
			Stirred through, {gap.toFixed(1)} °C over the card. Cold water brings it down, or leave it and the
			beer keeps more body.
		{/if}
		{#if addedL > 0.05}
			You have added {addedL.toFixed(1)} L.
		{/if}
	{/snippet}
	{#snippet card()}
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
			<dt class="text-muted">Grain</dt>
			<dd class="tnum">{total.toFixed(2)} kg</dd>
			<dt class="text-muted">Mash at</dt>
			<dd class="tnum">{target} °C</dd>
		</dl>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary min-h-12 px-5"
			disabled={!allIn}
			onclick={() => {
				day.tun = { ...day.tun, lid: true };
				day.finish({ mashWaterL: day.tun.waterL });
			}}
		>
			Lid on, start the rest
		</button>
	{/snippet}
</StepFrame>
