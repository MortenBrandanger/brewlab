/**
 * Cooling a kettle of hot wort with an immersion chiller.
 *
 * A copper coil sits in the wort and cold tap water runs through it. Heat
 * moves from the wort into the water at a rate set by how much water is
 * flowing and how much wort there is to cool, so this is Newton's law of
 * cooling towards the tap: the wort drops fast while it is hot and slows as
 * it gets near the tap's own temperature. That slowing tail is the whole
 * reason pitching temperature takes patience.
 *
 * - **Flow** is how far the tap is open, 0–1. Shut, the kettle only loses heat
 *   to the room, slowly.
 * - **Stirring** — moving the coil through the wort — breaks up the layer of
 *   cooled wort that clings to the copper, which is worth about half again.
 * - **The outlet** runs hot at first, nearly at wort temperature when the
 *   tap is barely open, and comes out cooler as the wort cools and the flow
 *   rises. Brewers watch it: when the water out is cold, the chiller has
 *   done what it can.
 *
 * Calibrated so a fully open tap takes 20 litres from 95 °C to 20 °C in
 * about twenty-five minutes, which is what a 10-metre copper coil on mains
 * water does. Pure and deterministic.
 */

/** Mains water temperature. */
export const TAP_C = 12;
const ROOM_C = 20;
/** Litres per minute of cooling rate at full flow, per litre of wort. */
const COIL_RATE = 1.87;
/** How much a moving coil adds. */
const STIR_GAIN = 0.6;
/** An open kettle on its own, per minute per degree above the room. */
const LOSS = 0.004;

export type ChillState = {
	tempC: number;
	wortL: number;
	/** How far the cold tap is open, 0–1. */
	flow: number;
	/** 0–1: how hard the coil is being moved. */
	stir: number;
	/** Brew-day minutes since the chiller went in. */
	minute: number;
};

export function newChill(tempC: number, wortL: number): ChillState {
	return { tempC, wortL: Math.max(1, wortL), flow: 0, stir: 0, minute: 0 };
}

/** Cooling rate per minute, as a fraction of the gap to the tap. */
export function chillRate(s: ChillState): number {
	return ((COIL_RATE * s.flow) / s.wortL) * (1 + STIR_GAIN * s.stir);
}

/** Advance by `dtMin` brew-day minutes. Exact for constant flow, so any step size works. */
export function stepChill(s: ChillState, dtMin: number): ChillState {
	// Two pulls at once, towards the tap and towards the room, add up to one
	// pull towards a point between them; solved exactly rather than stepped.
	const k = chillRate(s);
	const rate = k + LOSS;
	const settle = (k * TAP_C + LOSS * ROOM_C) / rate;
	const t = settle + (s.tempC - settle) * Math.exp(-rate * dtMin);
	return { ...s, tempC: t, minute: s.minute + dtMin };
}

/** What the water coming out of the coil's outlet feels like. */
export function outletC(s: ChillState): number {
	if (s.flow < 0.01) return s.tempC;
	return TAP_C + (s.tempC - TAP_C) * (0.85 - 0.35 * s.flow);
}
