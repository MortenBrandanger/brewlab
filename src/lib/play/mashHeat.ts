/**
 * The heat in a mash tun you are standing at.
 *
 * The question screens roll where the mash lands, because there you only say
 * what you are aiming for. In the hands-on scene nothing is rolled: you light
 * the flame, you tip the grain in, you stir, and the temperature is wherever
 * that put it. The miss is yours.
 *
 * So this is a small heat balance, stepped in brew-day minutes:
 *
 * - **The flame has inertia.** The bottom of the pot keeps giving heat after
 *   the gas is turned down, so the water coasts upwards for a moment. That
 *   coast is the whole skill of heating strike water, and the reason brewers
 *   cut the flame early.
 * - **Grain is cold and has weight.** Tipping it in pulls the temperature down
 *   by exactly what `strikeTempC` in `calculations.ts` expects: grain holds
 *   0.41 as much heat as the same weight of water. The two are the same
 *   equation read in opposite directions, and a test holds them together.
 * - **Unstirred, the thermometer lies.** Fresh grain leaves hot and cold
 *   pockets; the probe reads whichever one it is sitting in until the mash has
 *   been stirred through.
 * - **An open pot loses heat, a lidded one barely does.** About a quarter of a
 *   degree a minute open at mash temperature, about two degrees over the hour
 *   with the lid on.
 *
 * Pure and deterministic like the engine it feeds: same hands, same mash.
 */

/** Heat capacity of grain relative to water. The figure `strikeTempC` uses. */
export const GRAIN_HEAT = 0.41;
export const ROOM_C = 20;

/** Degrees per minute a full flame adds to one litre-equivalent of water. */
const FLAME_C_L_PER_MIN = 43;
/** How long the pot bottom takes to follow the knob, in minutes. */
const FLAME_LAG_MIN = 0.55;
/** Heat lost to the room per minute, per degree above it. */
const LOSS_OPEN = 0.006;
const LOSS_LIDDED = 0.0008;
/** How far off a probe in an unstirred mash can read, in °C. */
const POCKET_C = 3.2;

export type TunState = {
	waterL: number;
	/** The true, fully mixed temperature. */
	tempC: number;
	grainInKg: number;
	/** Where the knob is, 0–1. */
	flame: number;
	/** What the pot bottom is actually delivering, 0–1. Lags the knob. */
	heat: number;
	lid: boolean;
	/** 1 = fresh grain just tipped in, 0 = stirred through. */
	unmixed: number;
	/** Brew-day minutes since the scene began. */
	minute: number;
};

export function newTun(waterL: number, startC: number): TunState {
	return {
		waterL,
		tempC: startC,
		grainInKg: 0,
		flame: 0,
		heat: 0,
		lid: false,
		unmixed: 0,
		minute: 0
	};
}

/** The tun's contents as litres of water that would hold the same heat. */
export function thermalMass(s: TunState): number {
	return s.waterL + s.grainInKg * GRAIN_HEAT;
}

/** Advance the heat balance by `dtMin` brew-day minutes. */
export function stepTun(s: TunState, dtMin: number): TunState {
	const heat = s.heat + (s.flame - s.heat) * (1 - Math.exp(-dtMin / FLAME_LAG_MIN));
	const gain = (FLAME_C_L_PER_MIN * heat) / thermalMass(s);
	const loss = (s.lid ? LOSS_LIDDED : LOSS_OPEN) * (s.tempC - ROOM_C);
	return {
		...s,
		heat,
		tempC: Math.min(100, s.tempC + (gain - loss) * dtMin),
		minute: s.minute + dtMin
	};
}

/** Tip `kg` of room-temperature grain in. The mash cools and needs stirring. */
export function addGrain(s: TunState, kg: number): TunState {
	if (kg <= 0) return s;
	const before = thermalMass(s);
	const added = kg * GRAIN_HEAT;
	return {
		...s,
		grainInKg: s.grainInKg + kg,
		tempC: (before * s.tempC + added * ROOM_C) / (before + added),
		unmixed: Math.min(1, s.unmixed + kg * 0.45)
	};
}

/** Stir for `dtMin` minutes at `effort` 0–1. Evens the pockets out. */
export function stir(s: TunState, effort: number, dtMin: number): TunState {
	return { ...s, unmixed: s.unmixed * Math.exp(-effort * dtMin * 1.6) };
}

/**
 * What the thermometer says. In a stirred mash that is the temperature; in an
 * unstirred one the probe wanders between pockets, slowly enough to be read
 * and believed, which is exactly the trap.
 */
export function probeC(s: TunState): number {
	const wander = Math.sin(s.minute * 2.1) * 0.6 + Math.sin(s.minute * 0.83 + 1.3) * 0.4;
	return s.tempC + wander * POCKET_C * s.unmixed;
}

/** Where the mash would settle if all `grainKg` went in right now. */
export function afterGrainC(s: TunState, grainKg: number): number {
	const remaining = Math.max(0, grainKg - s.grainInKg);
	return addGrain(s, remaining).tempC;
}

/**
 * Pour `litres` of water at `tempC` into the tun: boiling from the kettle to
 * lift a cold mash, or cold from the tap to bring a hot one down. Either way
 * the mash gets thinner, which is the price of the correction.
 */
export function addWater(s: TunState, litres: number, tempC: number): TunState {
	if (litres <= 0) return s;
	const before = thermalMass(s);
	return {
		...s,
		waterL: s.waterL + litres,
		tempC: (before * s.tempC + litres * tempC) / (before + litres),
		unmixed: s.grainInKg > 0 ? Math.min(1, s.unmixed + litres * 0.08) : s.unmixed
	};
}
