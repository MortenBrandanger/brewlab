<script lang="ts">
	/**
	 * Gas off. Steep the last hops.
	 *
	 * The kettle stands still and steams, and the stand clock counts brew-day
	 * minutes from flame-out. The card's whirlpool hops go in whenever you tip
	 * them, and they steep at whatever temperature the kettle averages from
	 * then until the chiller goes in: hotter takes more bitterness out of them,
	 * which is why a card may ask for the wort to drop first. Stirring a
	 * whirlpool cools it about three times faster, because it keeps bringing
	 * hot wort to the surface.
	 */
	import { srmToCss } from '$lib/brewing/appearance';
	import { simulate } from '$lib/brewing/simulate';
	import { getHop } from '$lib/brewing/ingredients';
	import { day } from '../day.svelte';
	import type { HopDrop } from '../actual';
	import { newKettle, stepKettle } from '../kettleHeat';
	import { KettleScene, type KettleFrame, type Packet } from '../kettleScene';
	import PlayCanvas from '../PlayCanvas.svelte';
	import StepFrame from '../StepFrame.svelte';
	import HoldButton from '../HoldButton.svelte';
	import type { PointerInput } from '../kit';

	/** Brew-day minutes per real second while it stands. */
	const SPEED = 1.5;
	const HURRY = 4;

	const plan = day.plan!;
	const wort = srmToCss(simulate(plan).metrics.srm);
	const additions = plan.hops
		.filter((h) => h.use === 'whirlpool')
		.map((h) => ({ ...h, name: getHop(h.hopId)?.name ?? h.hopId }));
	const longest = Math.max(0, ...additions.map((a) => a.time));

	let kettle = newKettle(
		day.kettle.wortL > 0 ? day.kettle.wortL : plan.batchVolumeL,
		day.kettle.tempC || 100,
		0
	);
	const view = new KettleScene(kettle.tempC);
	// The boil hops are already in: they are flecks in the wort, not packets.
	view.settle(day.log.drops.filter((d) => d.use === 'boil').reduce((s, d) => s + d.grams, 0));

	let stirring = $state(false);
	let hurry = $state(false);
	let reading = $state(Math.round(kettle.tempC));
	let minutes = $state(0);
	let hover = $state(-1);
	let drops = $state<HopDrop[]>([]);
	/** The kettle's temperature at each brew minute of the stand. */
	const temps: number[] = [];
	let carry = 0;

	const dropped = (id: string) => drops.some((d) => d.cardId === id);

	function packets(): Packet[] {
		return additions.map((a) => ({
			id: a.id,
			name: a.name,
			grams: a.grams,
			caption: a.tempC ? `${a.time} min · ${a.tempC} °C` : `${a.time} min`,
			dropped: dropped(a.id),
			due: !dropped(a.id) && (a.tempC === undefined || kettle.tempC <= a.tempC + 1)
		}));
	}

	function frame(calm: boolean): KettleFrame {
		return {
			k: kettle,
			probeC: kettle.tempC,
			wort,
			mode: 'stand',
			packets: packets(),
			timer: { elapsed: minutes, total: longest, caption: 'standing' },
			stirring,
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
			{ cardId: a.id, hopId: a.hopId, grams: a.grams, use: 'whirlpool', at: kettle.minute }
		];
	}

	function tick(dt: number, input: PointerInput, calm: boolean) {
		const brewDt = dt * SPEED * (hurry ? HURRY : 1);
		kettle = stepKettle(kettle, brewDt, stirring);
		carry += brewDt;
		while (carry >= 1) {
			carry -= 1;
			temps.push(kettle.tempC);
		}
		const f = frame(calm);
		const over = input.present ? view.packetAt(input.x, input.y, f) : -1;
		if (over !== hover) hover = over;
		if (input.pressed && over >= 0) drop(over, calm);
		view.update(dt, f);

		const r = Math.round(kettle.tempC);
		if (r !== reading) reading = r;
		if (temps.length !== minutes) minutes = temps.length;
	}

	/** What the whirlpool hops felt: the mean from the first one going in until now. */
	function meanTemp(): number {
		const first = drops.length ? Math.min(...drops.map((d) => d.at)) : 0;
		const span = temps.slice(Math.floor(first));
		return span.length ? span.reduce((a, b) => a + b, 0) / span.length : kettle.tempC;
	}

	function startChiller() {
		day.kettle = { wortL: kettle.wortL, tempC: kettle.tempC, sinceFlameoutMin: kettle.minute };
		day.finish({
			stand: { minutes: kettle.minute, meanTempC: meanTemp() },
			drops: [...day.log.drops, ...drops]
		});
	}

	const waiting = $derived(
		additions.filter((a) => !dropped(a.id) && a.tempC !== undefined && reading > a.tempC + 1)
	);
	/** Minutes the latest-in hop has steeped so far. */
	const steeped = $derived(
		drops.length ? minutes - Math.max(...drops.map((d) => Math.floor(d.at))) : 0
	);
</script>

<StepFrame>
	{#snippet scene()}
		<PlayCanvas
			{tick}
			draw={(ctx, pal, calm) => view.draw(ctx, frame(calm), pal)}
			pan={day.step.pan}
			cursor={hover >= 0 ? 'pointer' : 'default'}
			label="The steel kettle with the gas off, still and steaming. A timer counts the minutes since flame-out; any hop packets left on the bench are for steeping."
		/>
	{/snippet}
	{#snippet controls()}
		<div class="flex flex-wrap items-center gap-2">
			<HoldButton bind:held={stirring}>Hold to stir a whirlpool</HoldButton>
			<HoldButton bind:held={hurry}>Hold to wait faster</HoldButton>
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
	{/snippet}
	{#snippet readout()}
		{minutes} min since the gas went off. The thermometer reads {reading} °C.
		{#if additions.length === 0}
			This card has no hops to steep, so the chiller can go straight in.
		{:else if waiting.length}
			The card steeps the {waiting[0].name} at {waiting[0].tempC} °C. Stir to cool it faster, or tip it
			in now and it steeps hotter, which takes more bitterness out of it.
		{:else if drops.length < additions.length}
			Ready for the {additions.find((a) => !dropped(a.id))?.name}.
		{:else}
			All in, steeping for {steeped} min.
		{/if}
	{/snippet}
	{#snippet card()}
		<ul class="flex flex-col gap-1">
			{#each additions as a (a.id)}
				{@const d = drops.find((x) => x.cardId === a.id)}
				<li class="flex justify-between gap-3 {d ? 'text-muted' : ''}">
					<span>{a.name} {a.grams} g</span>
					<span class="tnum text-end">
						{#if d}
							in at minute {Math.floor(d.at)}
						{:else}
							steep {a.time} min{a.tempC ? ` at ${a.tempC} °C` : ''}
						{/if}
					</span>
				</li>
			{:else}
				<li class="text-muted">No hops to steep on this card.</li>
			{/each}
		</ul>
		<p class="mt-2 text-xs text-subtle">
			Below the boil, hops give smell and only a little bitterness.
		</p>
	{/snippet}
	{#snippet action()}
		<button
			type="button"
			class="btn {additions.length === 0 ||
			(drops.length === additions.length && steeped >= longest)
				? 'btn-primary'
				: 'btn-quiet'} min-h-12 px-5"
			onclick={startChiller}
		>
			Start the chiller
		</button>
	{/snippet}
</StepFrame>
