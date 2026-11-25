<script lang="ts">
	/**
	 * Boil it, and add the hops on time.
	 *
	 * The clock counts rolling minutes only, the way the model counts them: a
	 * wort ticking over at a simmer is not boiling off what a boil is for. Each
	 * hop packet on the bench is an addition from the card; whenever you tip
	 * one in is when it went in, and the report works out its bitterness from
	 * how long it actually boiled. A packet never tipped in is not in the beer.
	 *
	 * The hot break is the one moment the knob matters most: full gas as the
	 * wort first boils sends the foam over the rim, and what goes over is wort.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { getHop } from '$lib/brewing/ingredients';
	import { day } from '../day.svelte';
	import type { HopDrop } from '../actual';
	import { isRolling, newKettle, stepKettle, steadyEvaporation, ROLLING_C } from '../kettleHeat';
	import { KettleScene, type KettleFrame, type Packet } from '../kettleScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import GasKnob from '../GasKnob.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second while it comes up to the boil, and once boiling. */
	const HEAT_SPEED = 1.5;
	const BOIL_SPEED = 2.5;
	/** While the hot break foams: slow enough to see it coming and reach the knob. */
	const BREAK_SPEED = 0.3;
	const HURRY = 4;

	const plan = day.plan!;
	const boilMin = plan.boilTimeMin;
	const wort = srmToCss(simulate(plan).metrics.srm);
	const additions = plan.hops
		.filter((h) => h.use === 'boil')
		.toSorted((a, b) => b.time - a.time)
		.map((h) => ({ ...h, name: getHop(h.hopId)?.name ?? h.hopId }));

	const startL = day.kettle.wortL > 0 ? day.kettle.wortL : plan.preBoilVolumeL;
	let kettle = newKettle(
		startL,
		day.kettle.tempC || 70,
		steadyEvaporation(plan.preBoilVolumeL, plan.batchVolumeL, boilMin)
	);
	const view = new KettleScene(kettle.tempC);

	let flame = $state(kettle.flame);
	let hurry = $state(false);
	let reading = $state(Math.round(kettle.tempC));
	let rolling = $state(0);
	let boiling = $state(false);
	let foam = $state(0);
	let spilt = $state(0);
	let hover = $state(-1);
	let drops = $state<HopDrop[]>([]);

	const dropped = (id: string) => drops.some((d) => d.cardId === id);
	/** Rolling minutes at which an addition is due: the card counts down from the end. */
	const dueAt = (time: number) => Math.max(0, boilMin - time);

	function packets(): Packet[] {
		return additions.map((a) => ({
			id: a.id,
			name: a.name,
			grams: a.grams,
			caption: `${a.time} min`,
			dropped: dropped(a.id),
			due: !dropped(a.id) && rolling >= dueAt(a.time) - 0.5 && (boiling || rolling > 0)
		}));
	}

	function frame(calm: boolean): KettleFrame {
		return {
			k: kettle,
			probeC: kettle.tempC,
			wort,
			mode: 'boil',
			packets: packets(),
			timer: { elapsed: rolling, total: boilMin, caption: 'boiling' },
			stirring: false,
			hover,
			calm
		};
	}

	function drop(i: number, calm = false) {
		const a = additions[i];
		if (!a || dropped(a.id)) return;
		view.drop(i, frame(calm));
		drops = [
			...drops,
			{ cardId: a.id, hopId: a.hopId, grams: a.grams, use: 'boil', at: kettle.rollingMin }
		];
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		// The hot break is the moment the knob matters, so the clock slows right down for it.
		const breaking = kettle.tempC >= 97 && kettle.breakDone < 1;
		const speed = breaking
			? BREAK_SPEED
			: (kettle.tempC >= ROLLING_C - 1 ? BOIL_SPEED : HEAT_SPEED) * (hurry ? HURRY : 1);
		kettle = stepKettle({ ...kettle, flame }, dt * speed);
		const f = frame(calm);
		const over = input.present ? view.packetAt(input.x, input.y, f) : -1;
		if (over !== hover) hover = over;
		if (input.pressed && over >= 0) drop(over, calm);
		view.update(dt, f);

		const r = Math.round(kettle.tempC);
		if (r !== reading) reading = r;
		const m = Math.floor(kettle.rollingMin);
		if (m !== rolling) rolling = m;
		const b = isRolling(kettle);
		if (b !== boiling) boiling = b;
		const fo = Math.round(kettle.foam * 20) / 20;
		if (fo !== foam) foam = fo;
		const s = Math.round(kettle.boilOverL * 10) / 10;
		if (s !== spilt) spilt = s;
	}

	/** The next addition not yet in, and how long until it is due. */
	const next = $derived(additions.find((a) => !dropped(a.id)));

	function gasOff() {
		day.kettle = { wortL: kettle.wortL, tempC: kettle.tempC, sinceFlameoutMin: 0 };
		day.finish({
			boil: {
				rollingMinutes: kettle.rollingMin,
				evaporatedL: kettle.evaporatedL,
				boilOverL: kettle.boilOverL
			},
			drops: [...day.log.drops, ...drops]
		});
	}
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => view.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			cursor={hover >= 0 ? 'pointer' : 'default'}
			label="A steel kettle of wort on the gas ring, with a thermometer on the rim and a boil timer on the bench. The hop packets from the recipe stand beside it; click one to tip it in."
		/>
	{/snippet}
	{#snippet controls()}
		<GasKnob bind:value={flame} />
		<HoldButton bind:held={hurry}>Hold to wait faster</HoldButton>
		{#if additions.length}
			<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Hops">
				{#each additions as a, i (a.id)}
					<button
						type="button"
						class="btn btn-ghost min-h-12 px-4"
						disabled={dropped(a.id)}
						onclick={() => drop(i)}
					>
						{dropped(a.id) ? `${a.name} is in` : `Tip in the ${a.name}`}
					</button>
				{/each}
			</div>
		{/if}
	{/snippet}
	{#snippet readout()}
		{#if !boiling && rolling === 0}
			The thermometer reads {reading} °C.
			{#if reading < 96}Not boiling yet.{:else}Nearly there. Watch for the foam.{/if}
		{:else if !boiling}
			Minute {rolling} of {boilMin}, but it has dropped to a simmer — the clock stops until it is
			rolling again.
		{:else}
			Minute {rolling} of {boilMin}, at a rolling boil.
		{/if}
		{#if foam > 1}
			It is boiling over. Turn the gas down.
		{:else if foam > 0.7}
			The foam is climbing fast. Turn the gas down before it goes over.
		{/if}
		{#if spilt > 0 && foam <= 1}
			About {spilt.toFixed(1)} L went over the side.
		{/if}
		{#if next}
			{@const wait = dueAt(next.time) - rolling}
			{#if !boiling && rolling === 0}
				The {next.name} goes in {next.time >= boilMin
					? 'as soon as it boils'
					: `with ${next.time} min left`}.
			{:else if wait <= 0}
				The {next.name} is due now.
			{:else}
				The {next.name} goes in in {wait} min.
			{/if}
		{:else if additions.length}
			All the hops are in.
		{/if}
	{/snippet}
	{#snippet card()}
		<p class="text-muted">Boil for {boilMin} min.</p>
		<ul class="mt-2 flex flex-col gap-1">
			{#each additions as a (a.id)}
				{@const d = drops.find((x) => x.cardId === a.id)}
				<li class="flex justify-between gap-3 {d ? 'text-muted' : ''}">
					<span>{a.name} {a.grams} g</span>
					<span class="tnum text-end">
						{#if d}
							in at minute {Math.floor(d.at)}
						{:else}
							with {a.time} min left
						{/if}
					</span>
				</li>
			{:else}
				<li class="text-muted">No hops in the boil on this card.</li>
			{/each}
		</ul>
		<p class="mt-2 text-xs text-subtle">
			Long in the boil means bitterness; the last few minutes keep the smell.
		</p>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {rolling >= boilMin ? 'btn-primary' : 'btn-quiet'} min-h-12 px-5"
			disabled={rolling < 1}
			onclick={gasOff}
		>
			{rolling >= boilMin ? 'Gas off' : 'Turn the gas off early'}
		</button>
	{/snippet}
</StepFrame>
