<script lang="ts">
	/**
	 * Hold the rest.
	 *
	 * The clock runs in brew-day minutes and the tun's temperature is written
	 * down once a minute; that history is the mash the engine integrates, so a
	 * tun left open to cool through the hour is judged as exactly that. A
	 * recipe with a second rest asks you to bring it up with the gas when the
	 * card says so. The glowing motes are the mash kinetics run on the minutes
	 * so far: amber for sugar the yeast will eat, pale for what it will not.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate, gristDiastaticPower } from '$lib/brewing/simulate';
	import { computeMashProfile } from '$lib/brewing/calculations';
	import { day } from '../day.svelte';
	import { mashStepsFromMinutes } from '../actual';
	import { probeC, stepTun, stir } from '../mashHeat';
	import { inPot } from '../mashScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import GasKnob from '../GasKnob.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second. An hour's rest takes about half a minute. */
	const SPEED = 2.2;
	const HURRY = 4;

	const plan = day.plan!;
	const schedule = plan.mash.steps.filter((s) => s.minutes > 0);
	const totalMin = schedule.reduce((s, x) => s + x.minutes, 0);
	const wort = srmToCss(simulate(plan).metrics.srm);
	const power = gristDiastaticPower(plan.fermentables);
	const thickness = day.tun.waterL / Math.max(0.1, day.grainKg);
	const mash = day.mashScene;

	let flame = $state(day.tun.flame);
	let lid = $state(day.tun.lid);
	let hurry = $state(false);
	let stirring = $state(false);
	let elapsed = $state(0);
	let reading = $state(probeC(day.tun));
	const minutes: number[] = [];
	let carry = 0;
	let spectrum = { fermentable: 0, dextrins: 0 };

	/** Which rest on the card the clock is in. */
	const current = $derived.by(() => {
		let t = 0;
		for (const s of schedule) {
			t += s.minutes;
			if (elapsed < t) return s;
		}
		return schedule.at(-1)!;
	});
	const done = $derived(elapsed >= totalMin);

	function frame(calm: boolean) {
		return {
			tun: day.tun,
			probeC: probeC(day.tun),
			grainTotalKg: day.grainKg,
			targetC: current.tempC,
			pouring: false,
			autoStir: stirring && !lid,
			fermentable: spectrum.fermentable,
			dextrins: spectrum.dextrins,
			timer: { elapsed, total: totalMin },
			wort,
			calm
		};
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		if (done) {
			mash.update(dt, frame(calm), input);
			return;
		}
		const brewDt = dt * SPEED * (hurry ? HURRY : 1);
		let s = stepTun({ ...day.tun, flame, lid }, brewDt);
		const dragged = !lid && input.down && inPot(input.x, input.y);
		const effort =
			stirring && !lid ? 0.85 : dragged ? Math.min(1, Math.hypot(input.vx, input.vy) / 700) : 0;
		if (effort > 0) s = stir(s, effort, brewDt * 3);
		day.tun = s;

		// One reading a brew minute: the tun's true temperature, which is what the enzymes feel.
		carry += brewDt;
		while (carry >= 1 && minutes.length < totalMin) {
			carry -= 1;
			minutes.push(s.tempC);
			const kinetics = computeMashProfile(
				{ steps: mashStepsFromMinutes(minutes, 1), thicknessLPerKg: thickness },
				{ diastaticPowerLintner: power }
			).kinetics.spectrum;
			spectrum = {
				fermentable: kinetics.glucose + kinetics.maltose + kinetics.maltotriose,
				dextrins: kinetics.dextrins
			};
		}
		elapsed = minutes.length;
		mash.update(dt, frame(calm), input);
		const r = Math.round(probeC(s) * 10) / 10;
		if (r !== reading) reading = r;
	}

	// Arriving here from a shortcut, the grain is already in: draw it lying there.
	mash.settle(frame(true));

	const gap = $derived(reading - current.tempC);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => mash.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			label="The mash resting in the copper pot. A kitchen timer counts the minutes; glowing specks in the mash are starch turning into sugar."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn btn-ghost min-h-12 px-5"
				aria-pressed={lid}
				onclick={() => (lid = !lid)}
			>
				{lid ? 'Take the lid off' : 'Put the lid on'}
			</button>
			<HoldButton bind:held={stirring} disabled={lid}>Hold to stir</HoldButton>
			<HoldButton bind:held={hurry} disabled={done}>Hold to wait faster</HoldButton>
		</div>
		<GasKnob bind:value={flame} />
	{/snippet}
	{#snippet readout()}
		{elapsed} of {totalMin} minutes. The thermometer reads {reading.toFixed(1)} °C
		{#if Math.abs(gap) < 1}
			— right where the card wants it.
		{:else if gap < 0}
			— {(-gap).toFixed(1)} °C under this rest.{current.tempC >= 74
				? ' Turn the gas up for the mash-out.'
				: ''}
		{:else}
			— {gap.toFixed(1)} °C over this rest.
		{/if}
		{#if done}
			The rest is over.
		{/if}
	{/snippet}
	{#snippet card()}
		<ol class="flex flex-col gap-1">
			{#each schedule as s (s.id)}
				<li
					class="flex justify-between gap-3 {s === current && !done ? 'text-amber' : 'text-muted'}"
				>
					<span>{s.tempC >= 75 ? 'Mash-out' : 'Rest'}</span>
					<span class="tnum">{s.tempC} °C · {s.minutes} min</span>
				</li>
			{/each}
		</ol>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {done ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			disabled={elapsed < 10}
			onclick={() => day.finish({ mashMinutes: [...minutes] })}
		>
			{done ? 'Open the tap' : 'Stop the rest here'}
		</button>
	{/snippet}
</StepFrame>
