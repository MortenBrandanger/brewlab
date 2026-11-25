<script lang="ts">
	/**
	 * Keep it at the right temperature until it is done.
	 *
	 * Days pass, and the fridge's thermostat setting is written down once a
	 * day; those days are the fermentation the engine runs. The airlock, the
	 * foam and the cloudiness come from that run as it stands today, and a
	 * sample reads its gravity. Knowing when it is done is the skill: the
	 * gravity has to stop falling, and a sample that still smells of butter
	 * needs a few more days with the yeast awake to clean it up.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { getHop } from '$lib/brewing/ingredients';
	import { day } from '../day.svelte';
	import { applyLog, type HopDrop } from '../actual';
	import { buildContext, simulate } from '$lib/brewing/simulate';
	import { airlockWords, fermenterToday, type FermenterToday } from '../fermenter';
	import { FermentScene } from '../fermenterScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Real seconds per fermentation day. */
	const SECONDS_PER_DAY = 1.2;
	const HURRY = 4;
	const MAX_DAYS = 60;
	const MIN_DAYS = 3;

	const plan = day.plan!;
	// Snapshots: the store's `actual` clones a reactive proxy, which throws.
	const actual = applyLog($state.snapshot(plan), $state.snapshot(day.log));
	const ctx = buildContext(actual)!;
	const pitchRate = actual.fermentation.pitchRate;
	const wort = srmToCss(simulate(actual).metrics.srm);
	const level = Math.min(0.9, actual.batchVolumeL / 30);
	const planDays = plan.fermentation.steps.reduce((s, x) => s + x.days, 0);
	const dryOnCard = plan.hops.filter((h) => h.use === 'dryHop');

	let setpoint = $state(plan.fermentation.steps[0]?.tempC ?? 19);
	let coldCrash = $state(plan.fermentation.coldCrash);
	let hurry = $state(false);
	let days = $state<number[]>([]);
	let today = $state<FermenterToday>(fermenterToday(ctx, pitchRate, []));
	let samples = $state<{ day: number; gravity: number; buttery: boolean }[]>([]);
	let dropped = $state<HopDrop[]>([]);
	let cursor = $state('default');
	let clock = 0;
	let calmNow = false;

	const bench = new FermentScene();
	bench.onDrop = (i) => drop(i);

	const pouches = $derived(
		dryOnCard.map((h) => ({
			label: `${getHop(h.hopId)?.name ?? 'Hops'} ${h.grams} g · day ${h.day ?? 5}`,
			dropped: dropped.some((d) => d.cardId === h.id)
		}))
	);
	const lastSample = $derived(samples.at(-1));
	const done = $derived(days.length >= MAX_DAYS);

	function drop(i: number) {
		const h = dryOnCard[i];
		if (!h || dropped.some((d) => d.cardId === h.id)) return;
		dropped = [
			...dropped,
			{ cardId: h.id, hopId: h.hopId, grams: h.grams, use: 'dryHop', at: days.length }
		];
		bench.dropHops(calmNow);
	}

	function sample() {
		samples = [...samples, { day: days.length, gravity: today.gravity, buttery: today.buttery }];
	}

	function frame(calm: boolean) {
		return {
			wort,
			level,
			activity: today.activity,
			suspended: today.suspended,
			setpointC: setpoint,
			day: days.length,
			planDays,
			sample: lastSample?.gravity,
			pouches,
			coldCrash,
			calm
		};
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		calmNow = calm;
		if (!done) {
			clock += dt * (hurry ? HURRY : 1);
			if (clock >= SECONDS_PER_DAY) {
				clock = 0;
				days = [...days, setpoint];
				today = fermenterToday(ctx, pitchRate, days);
			}
		}
		const f = frame(calm);
		bench.update(dt, f, input);
		const c = bench.cursor(f, input);
		if (c !== cursor) cursor = c;
	}

	/** Two samples at least two days apart that read the same: the sugar is done. */
	const steady = $derived.by(() => {
		const last = samples.at(-1);
		if (!last) return false;
		return samples.some(
			(s) => last.day - s.day >= 2 && Math.abs(s.gravity - last.gravity) < 0.0011
		);
	});
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(c, pal, calm) => bench.draw(c, frame(calm), pal)}
			pan={day.step.pan}
			{cursor}
			label="The sealed fermenter inside an old fridge with its door open and a thermostat on the side. An airlock on the lid bubbles while the yeast works; foam stands on the beer."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex items-center gap-2" role="group" aria-label="Thermostat">
			<button
				type="button"
				class="btn btn-ghost h-12 w-12 text-lg"
				aria-label="One degree colder"
				disabled={setpoint <= 4}
				onclick={() => (setpoint = Math.max(4, setpoint - 1))}>−</button
			>
			<div class="min-w-20 text-center text-sm">
				<div class="field-label">Thermostat</div>
				<div class="tnum text-fg" aria-live="polite">{setpoint.toFixed(0)} °C</div>
			</div>
			<button
				type="button"
				class="btn btn-ghost h-12 w-12 text-lg"
				aria-label="One degree warmer"
				disabled={setpoint >= 30}
				onclick={() => (setpoint = Math.min(30, setpoint + 1))}>+</button
			>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class="btn btn-ghost min-h-12 px-5" onclick={sample}>
				Take a sample
			</button>
			<HoldButton bind:held={hurry} disabled={done}>Hold to wait faster</HoldButton>
			{#each dryOnCard as h, i (h.id)}
				{#if !pouches[i].dropped}
					<button type="button" class="btn btn-ghost min-h-12 px-5" onclick={() => drop(i)}>
						Drop in the {getHop(h.hopId)?.name ?? 'hops'}
					</button>
				{/if}
			{/each}
			<label class="flex min-h-12 items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={coldCrash} />
				Cold crash before bottling
			</label>
		</div>
	{/snippet}
	{#snippet readout()}
		Day {days.length}. {airlockWords(today.activity)}.
		{#if lastSample}
			Your sample on day {lastSample.day} read {lastSample.gravity.toFixed(3)}{lastSample.buttery
				? ' and smelled of butter'
				: ''}.
			{#if lastSample.buttery}
				That buttery smell goes if the yeast gets a few more warm days.
			{:else if steady}
				It has not moved in two days: the sugar is done.
			{:else}
				It is done when two samples a couple of days apart read the same.
			{/if}
		{:else}
			Take a sample to read the gravity.
		{/if}
	{/snippet}
	{#snippet card()}
		<ol class="flex flex-col gap-1">
			{#each plan.fermentation.steps as s (s.id)}
				<li class="flex justify-between gap-3 text-muted">
					<span>{s.label}</span>
					<span class="tnum">{s.tempC} °C · {s.days} days</span>
				</li>
			{/each}
			{#each dryOnCard as h (h.id)}
				<li class="flex justify-between gap-3 text-muted">
					<span>Dry hop {getHop(h.hopId)?.name}</span>
					<span class="tnum">{h.grams} g · day {h.day ?? 5}</span>
				</li>
			{/each}
			<li class="flex justify-between gap-3 text-muted">
				<span>Cold crash</span>
				<span>{plan.fermentation.coldCrash ? 'Yes' : 'No'}</span>
			</li>
		</ol>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {days.length >= planDays ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			disabled={days.length < MIN_DAYS}
			onclick={() =>
				day.finish({
					fermentDays: [...days],
					coldCrash,
					drops: [...day.log.drops, ...dropped]
				})}
		>
			It is done, bottle it
		</button>
	{/snippet}
</StepFrame>
