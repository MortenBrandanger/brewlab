/**
 * The fermenter as it stands today, from the engine.
 *
 * The ferment screen lets days pass and writes down the fermenter's
 * temperature each day. Everything the scene shows — how hard the airlock
 * bubbles, how tall the foam stands, how cloudy the beer is, what the
 * hydrometer reads, whether a sample smells of butter — is the engine's own
 * fermentation run on exactly those days. It goes through `computeAttenuation`
 * rather than calling the kinetics directly, so the spectrum is bent by the
 * grist the same way the report bends it: the gravity the hydrometer reads on
 * the last day is the final gravity the report will print.
 */

import { computeAttenuation } from '$lib/brewing/calculations';
import type { EngineContext } from '$lib/brewing/context';
import { FAULT_THRESHOLD } from '$lib/brewing/faults';
import type { PitchRate } from '$lib/brewing/types';

export type FermenterToday = {
	day: number;
	/** What a hydrometer in a sample would read, e.g. 1.014. */
	gravity: number;
	/** Gravity points that went in the last day: how hard it is working. */
	activity: number;
	/** Yeast in suspension, relative to a standard pitch. Cloudiness. */
	suspended: number;
	/**
	 * Whether a sample smells of butter: the kinetics' diacetyl, read the way
	 * the sensory model reads it (a lager drinker notices it sooner), against
	 * the same threshold the faults use.
	 */
	buttery: boolean;
	abv: number;
};

/** The fermentation run on the days so far, one temperature per day. */
export function fermenterToday(
	ctx: EngineContext,
	pitchRate: PitchRate,
	days: number[]
): FermenterToday {
	const steps = days.map((tempC) => ({ tempC, days: 1 }));
	const run = computeAttenuation(
		ctx.gravity.og,
		ctx.yeast,
		ctx.gravity.grist,
		ctx.mash,
		pitchRate,
		steps.length ? steps : [{ tempC: ctx.yeast.tempIdealC, days: 0 }],
		false
	);
	const curve = run.kinetics.curve;
	const today = curve.at(-1)!;
	const yesterday = curve.at(-2) ?? today;
	const lager = ctx.yeast.kind === 'lager' ? 1.6 : 1;
	return {
		day: days.length,
		gravity: Math.round((1 + today.points / 1000) * 1000) / 1000,
		activity: Math.max(0, yesterday.points - today.points),
		suspended: today.suspended,
		buttery: today.diacetyl * lager > FAULT_THRESHOLD.diacetyl,
		abv: today.abv
	};
}

/** Words for how the airlock looks, from the points that went in the last day. */
export function airlockWords(activity: number): string {
	if (activity > 4) return 'The airlock is bubbling hard';
	if (activity > 1) return 'The airlock is bubbling steadily';
	if (activity > 0.2) return 'An occasional bubble in the airlock';
	return 'The airlock is still';
}
