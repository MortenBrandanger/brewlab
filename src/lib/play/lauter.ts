/**
 * The run-off: liquid leaving the grain, first back over it, then to the kettle.
 *
 * Two small pieces of physics, both stated in litres and seconds on the bench:
 *
 * - **The bed filters itself.** The first runnings carry flour and bits of
 *   husk the grain bed has not caught yet. Each jug poured gently back over
 *   the top settles the bed a little more, and it filters better. The clarity
 *   of what comes out of the tap is a function of how much has been poured
 *   back, and after `CLEAR_AFTER_JUGS` it counts as clear — the same
 *   threshold `applyLog` uses to decide whether a vorlauf happened.
 * - **The tun drains by its head.** Liquid standing over the grain runs out
 *   faster the more of it there is, and the last litre trickles. So the
 *   kettle lags the rinse water: you stop pouring and it keeps coming, which
 *   is the whole judgement of when to stop.
 *
 * Volumes balance exactly: the first runnings are the mash water less what
 * the grain soaks up, and the rinse water all comes out again, so pouring the
 * card's rinse and draining to the end collects the card's pre-boil volume.
 */

import { GRAIN_ABSORPTION_L_PER_KG } from '$lib/brewing/simulate';
import { CLEAR_AFTER_JUGS } from './actual';

/** Litres one jug holds. */
export const JUG_L = 1.2;
/** Fastest the tap runs with a full head over the grain, litres a second on the bench. */
const MAX_FLOW_LPS = 1.6;
/** Litres of head at which the flow is half its maximum. */
const HALF_HEAD_L = 2.5;

/**
 * How cloudy the runnings are after `jugsBack` jugs have been poured back,
 * 0 clear to 1 the first murky litre. Falls off fast: one jug is still plainly
 * cloudy, two is clear, which is what a home brewer sees.
 */
export function runningsCloud(jugsBack: number): number {
	const n = Math.max(0, jugsBack);
	return Math.exp(-0.8 * n * n);
}

/** True once enough has been poured back for the runnings to count as clear. */
export function runsClear(jugsBack: number): boolean {
	return jugsBack >= CLEAR_AFTER_JUGS - 1e-6;
}

/** What drains out of the mash before any rinse water: mash water less what the grain keeps. */
export function firstRunningsL(mashWaterL: number, grainKg: number): number {
	return Math.max(0, mashWaterL - grainKg * GRAIN_ABSORPTION_L_PER_KG);
}

/** How fast the tap runs with `headL` litres standing in the tun, litres a second. */
export function tapFlow(headL: number): number {
	const h = Math.max(0, headL);
	return (MAX_FLOW_LPS * h) / (h + HALF_HEAD_L);
}

export type Runoff = {
	/** Liquid in the tun that can still drain, litres. */
	headL: number;
	/** In the kettle, litres. */
	collectedL: number;
	/** Hot rinse water still in the pot, litres. */
	potL: number;
	/** Rinse water poured so far, litres. */
	spargedL: number;
};

export function newRunoff(mashWaterL: number, grainKg: number, potL: number): Runoff {
	return { headL: firstRunningsL(mashWaterL, grainKg), collectedL: 0, potL, spargedL: 0 };
}

/**
 * Advance the run-off by `dt` seconds with rinse water going in at `pourLps`
 * litres a second. The tap is open throughout: closing it is the end of the step.
 */
export function stepRunoff(s: Runoff, dt: number, pourLps: number): Runoff {
	const poured = Math.min(s.potL, Math.max(0, pourLps) * dt);
	const head = s.headL + poured;
	const out = Math.min(head, tapFlow(head) * dt);
	return {
		headL: head - out,
		collectedL: s.collectedL + out,
		potL: s.potL - poured,
		spargedL: s.spargedL + poured
	};
}
