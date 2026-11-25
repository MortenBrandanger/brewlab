/**
 * The wort in a kettle you are standing at.
 *
 * Like the tun in `mashHeat.ts`, nothing here is rolled: the boil is however
 * hard your hand on the knob made it. Stepped in brew-day minutes:
 *
 * - **The flame has inertia.** The kettle bottom follows the knob half a
 *   minute late, the same lag the mash pot has.
 * - **A boil is a ceiling, not a target.** Wort cannot get hotter than about
 *   100 °C; heat beyond what holds it there goes into steam. Only a boil
 *   with the gas clearly above a simmer is a rolling boil, and only rolling
 *   minutes count on the clock: a wort ticking over at 99 °C is not boiling
 *   off what a boil is for.
 * - **Steam takes water and leaves the sugar.** How much comes off is
 *   calibrated to the kit on the card: a steady boil at about 70% gas boils
 *   off exactly what the card expects over the card's time. Harder boils
 *   more off and concentrates the wort; softer leaves it weaker.
 * - **The hot break.** When wort first comes to the boil, the proteins in it
 *   clump into a foam that climbs fast with a high flame. Past the rim it
 *   boils over, and what goes over is wort — sugar and all. Turning the gas
 *   down settles it; after a few rolling minutes the proteins have dropped
 *   out and the foam is gone for good.
 * - **An open kettle cools slowly.** With the gas off, a full kettle near the
 *   boil loses a few degrees over twenty minutes; stirring it into a
 *   whirlpool roughly triples that, because it keeps bringing hot wort to the
 *   surface.
 */

export const ROOM_C = 20;
export const BOIL_C = 100;
/** A boil counts as rolling at or above this, with the gas above a simmer. */
export const ROLLING_C = 99.5;
/** Gas below this share holds a simmer at best: hot, still, not boiling off. */
export const SIMMER = 0.25;
/** The steady boil the card's evaporation is calibrated against. */
export const STEADY = 0.7;

/** Degrees per minute a full flame adds to one litre of wort. */
const FLAME_C_L_PER_MIN = 55;
const FLAME_LAG_MIN = 0.55;
/** Heat lost to the room per minute, per degree above it. */
const LOSS_OPEN = 0.004;
/** Stirring a whirlpool keeps hot wort at the surface. */
const STIR_LOSS = 3;
/** Rolling minutes until the hot break has dropped out. */
const BREAK_MIN = 4;
/** How fast the foam climbs towards where the flame is pushing it, per minute. */
const FOAM_RATE = 1.5;
/** Litres a minute that go over the rim at the worst of a boil-over. */
const SPILL_L_PER_MIN = 1.4;

export type KettleState = {
	wortL: number;
	tempC: number;
	/** Where the knob is, 0–1. */
	flame: number;
	/** What the kettle bottom is actually delivering, 0–1. Lags the knob. */
	heat: number;
	/** Litres a minute a steady boil takes off, from the card. */
	evapAtSteady: number;
	/** Hot-break foam height as a share of the headroom; above 1 it is over the rim. */
	foam: number;
	/** 0 → 1 as the hot break drops out. */
	breakDone: number;
	rollingMin: number;
	evaporatedL: number;
	boilOverL: number;
	minute: number;
};

/**
 * @param evapAtSteady litres a minute a steady boil takes off; see
 *   `steadyEvaporation` for the card's figure.
 */
export function newKettle(wortL: number, tempC: number, evapAtSteady: number): KettleState {
	return {
		wortL,
		tempC,
		flame: 0,
		heat: 0,
		evapAtSteady,
		foam: 0,
		breakDone: 0,
		rollingMin: 0,
		evaporatedL: 0,
		boilOverL: 0,
		minute: 0
	};
}

/** What the card's kit boils off in a minute of steady boil. */
export function steadyEvaporation(preBoilL: number, batchL: number, boilMin: number): number {
	return Math.max(0, preBoilL - batchL) / Math.max(1, boilMin);
}

/** True when the kettle is at a rolling boil right now. */
export function isRolling(s: KettleState): boolean {
	return s.tempC >= ROLLING_C && s.heat > SIMMER;
}

/** How hard the boil is rolling, 0 at a simmer to 1 at full gas. */
export function vigour(s: KettleState): number {
	if (s.tempC < ROLLING_C) return 0;
	return Math.max(0, Math.min(1, (s.heat - SIMMER) / (1 - SIMMER)));
}

/**
 * Advance the kettle by `dtMin` brew-day minutes.
 * @param stirring a whirlpool going, which only matters off the boil
 */
export function stepKettle(s: KettleState, dtMin: number, stirring = false): KettleState {
	const heat = s.heat + (s.flame - s.heat) * (1 - Math.exp(-dtMin / FLAME_LAG_MIN));
	const litres = Math.max(0.5, s.wortL);
	const gain = (FLAME_C_L_PER_MIN * heat) / litres;
	const loss = LOSS_OPEN * (stirring ? STIR_LOSS : 1) * (s.tempC - ROOM_C);
	const tempC = Math.min(BOIL_C, s.tempC + (gain - loss) * dtMin);

	const next: KettleState = { ...s, heat, tempC, minute: s.minute + dtMin };
	const rolling = isRolling(next);

	// Steam, in proportion to how far past a simmer the gas is.
	let evaporated = 0;
	if (rolling) {
		evaporated = s.evapAtSteady * ((heat - SIMMER) / (STEADY - SIMMER)) * dtMin;
	}

	// The hot break: foam climbs with the flame until the proteins have dropped out.
	const push = Math.max(0, (heat - 0.3) / 0.4) * (1 - s.breakDone);
	const target = next.tempC >= ROLLING_C - 0.5 ? push : 0;
	const foam = target + (s.foam - target) * Math.exp(-FOAM_RATE * dtMin);
	let spilt = 0;
	if (foam > 1) {
		spilt = Math.min(SPILL_L_PER_MIN, SPILL_L_PER_MIN * ((foam - 1) / 0.3)) * dtMin;
	}
	const breakDone = rolling ? Math.min(1, s.breakDone + dtMin / BREAK_MIN) : s.breakDone;

	const wortL = Math.max(0.5, s.wortL - evaporated - spilt);
	return {
		...next,
		wortL,
		foam: Math.min(1.35, foam),
		breakDone,
		rollingMin: s.rollingMin + (rolling ? dtMin : 0),
		evaporatedL: s.evaporatedL + evaporated,
		boilOverL: s.boilOverL + spilt
	};
}
