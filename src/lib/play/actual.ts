/**
 * What you actually did, as a recipe the engine can judge.
 *
 * The hands-on brew day starts from a recipe card and lets you carry it out
 * with your hands. Nothing on the card is what ends up in the glass: the card
 * says 66 °C and the tun held 64.8 for twenty minutes and then drifted; the
 * card says sixty minutes of boil and you killed the flame at fifty-two; the
 * card says the Cascade goes in with ten minutes left and you dropped it at
 * fourteen. Each scene records what happened, and these functions turn that
 * record into the same `Recipe` the rest of the app reads — so the report,
 * the tasting panel and "what did I do?" all judge the beer you made rather
 * than the beer you meant to.
 *
 * Every conversion here is a plain physical reading of the record, not a
 * scoring rule. Pure and deterministic like the engine it feeds.
 */

import type {
	FermentationStep,
	HopAddition,
	MashStep,
	MashStepKind,
	Recipe
} from '$lib/brewing/types';

const round1 = (v: number) => Math.round(v * 10) / 10;

/* -------------------------------------------------------------------------- */
/* Mash                                                                       */
/* -------------------------------------------------------------------------- */

function kindFor(tempC: number): MashStepKind {
	if (tempC < 46) return 'acid';
	if (tempC < 58) return 'protein';
	if (tempC < 66.5) return 'beta';
	if (tempC < 75) return 'alpha';
	return 'mashout';
}

/**
 * The rest as it ran, one temperature per brew minute, as mash steps.
 *
 * The kinetics integrate minute by minute anyway, so the honest thing is to
 * hand them the tun's own history. Runs of minutes are grouped into steps of
 * at most five minutes so the step list stays readable on the report; within
 * five minutes a tun moves a fraction of a degree, which the enzymes cannot
 * tell from a constant.
 */
export function mashStepsFromMinutes(temps: number[], chunk = 5): MashStep[] {
	const steps: MashStep[] = [];
	for (let i = 0; i < temps.length; i += chunk) {
		const slice = temps.slice(i, i + chunk);
		const tempC = round1(slice.reduce((a, b) => a + b, 0) / slice.length);
		steps.push({ id: `rest-${i}`, kind: kindFor(tempC), tempC, minutes: slice.length });
	}
	return steps;
}

/* -------------------------------------------------------------------------- */
/* Volumes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What reaches the fermenter, from what you collected and what the boil did.
 *
 * A boil-over is the one loss that takes sugar with it: it is wort, not steam.
 * So it is applied as a share of the grain, which keeps the gravity where the
 * mash put it and only makes less beer. Steam takes water and leaves the sugar,
 * which is what concentrates the wort.
 */
export function volumesAfterBoil(
	recipe: Recipe,
	collectedL: number,
	evaporatedL: number,
	boilOverL = 0
): Recipe {
	const kept = Math.max(0.5, collectedL - boilOverL);
	const share = kept / Math.max(0.5, collectedL);
	return {
		...recipe,
		preBoilVolumeL: round1(kept),
		batchVolumeL: round1(Math.max(0.5, kept - evaporatedL)),
		fermentables:
			share < 0.999
				? recipe.fermentables.map((f) => ({ ...f, weightKg: f.weightKg * share }))
				: recipe.fermentables
	};
}

/* -------------------------------------------------------------------------- */
/* Hops                                                                       */
/* -------------------------------------------------------------------------- */

export type HopDrop = {
	/** Which addition on the card this was. */
	cardId: string;
	hopId: string;
	grams: number;
	use: 'boil' | 'whirlpool' | 'dryHop';
	/** Boil: rolling minutes already gone when it went in. Whirlpool: minutes after flame-out. Dry hop: fermentation day. */
	at: number;
};

/**
 * Hop additions as they happened.
 *
 * A boil hop's time is how long it actually boiled: from when it went in to
 * when you killed the flame. A whirlpool hop steeps from when it went in to
 * when the chiller started, at the temperature the kettle averaged over that
 * stand. A dry hop sits from the day it went in until packaging. Additions on
 * the card that never went in are simply not in the beer.
 */
export function hopsFromDrops(
	drops: HopDrop[],
	boilMinutes: number,
	stand: { minutes: number; meanTempC: number },
	fermentDays: number
): HopAddition[] {
	return drops.map((d, i) => {
		if (d.use === 'boil') {
			return {
				id: `hop-${i}`,
				hopId: d.hopId,
				grams: d.grams,
				use: 'boil',
				time: Math.max(0, Math.round(boilMinutes - d.at))
			};
		}
		if (d.use === 'whirlpool') {
			return {
				id: `hop-${i}`,
				hopId: d.hopId,
				grams: d.grams,
				use: 'whirlpool',
				time: Math.max(1, Math.round(stand.minutes - d.at)),
				tempC: Math.round(stand.meanTempC)
			};
		}
		return {
			id: `hop-${i}`,
			hopId: d.hopId,
			grams: d.grams,
			use: 'dryHop',
			day: Math.round(d.at),
			time: Math.max(1, Math.round(fermentDays - d.at))
		};
	});
}

/* -------------------------------------------------------------------------- */
/* Fermentation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The fermenter's temperature, one reading per day, as fermentation steps.
 * Consecutive days within half a degree are one step.
 */
export function fermentStepsFromDays(temps: number[]): FermentationStep[] {
	const steps: FermentationStep[] = [];
	for (const t of temps) {
		const last = steps.at(-1);
		if (last && Math.abs(last.tempC - t) < 0.5) {
			last.tempC = round1((last.tempC * last.days + t) / (last.days + 1));
			last.days += 1;
		} else {
			steps.push({
				id: `day-${steps.length}`,
				label: `From day ${sumDays(steps)}`,
				tempC: round1(t),
				days: 1
			});
		}
	}
	return steps;
}

function sumDays(steps: FermentationStep[]): number {
	return steps.reduce((s, x) => s + x.days, 0);
}

/* -------------------------------------------------------------------------- */
/* Pitch and package                                                          */
/* -------------------------------------------------------------------------- */

/** Packets the card asks for: two for a recipe that wants an over-pitch. */
export function cardPackets(recipe: Recipe): number {
	return recipe.fermentation.pitchRate === 'over' ? 2 : 1;
}

/** What tipping in `packets` means against what the card asked for. */
export function pitchRateFor(recipe: Recipe, packets: number): Recipe['fermentation']['pitchRate'] {
	const wanted = cardPackets(recipe);
	if (packets < wanted) return 'under';
	if (packets > wanted) return 'over';
	return recipe.fermentation.pitchRate;
}

/**
 * CO₂ already dissolved in beer that finished fermenting at `tempC`, in
 * volumes. The standard relationship, with temperature in Fahrenheit; the same
 * one the carbonation question uses.
 */
export function residualCo2(tempC: number): number {
	const f = tempC * 1.8 + 32;
	return Math.max(0, 3.0378 - 0.050062 * f + 0.00026555 * f * f);
}

/** Grams of dextrose the card's carbonation takes for this batch. */
export function primingGrams(recipe: Recipe): number {
	const finish = recipe.fermentation.steps.at(-1)?.tempC ?? 20;
	return Math.max(
		0,
		(recipe.conditioning.co2Volumes - residualCo2(finish)) * 4 * recipe.batchVolumeL
	);
}

/** Volumes of CO₂ a dose of `grams` dextrose gives this batch. Inverse of the above. */
export function co2FromPriming(recipe: Recipe, grams: number): number {
	const finish = recipe.fermentation.steps.at(-1)?.tempC ?? 20;
	return round1(residualCo2(finish) + grams / (4 * Math.max(0.5, recipe.batchVolumeL)));
}

/* -------------------------------------------------------------------------- */
/* The whole day                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Everything the scenes recorded, in brewing terms. A field is absent until the
 * step that measures it has been done, and an absent field leaves the card's
 * value standing — so a beer half brewed by hand is judged on what you did so
 * far and on the card for the rest.
 */
export type DayLog = {
	/** The strike water when you tipped the grain in. */
	strikeC?: number;
	/** Litres in the tun after any splash of hot or cold water. */
	mashWaterL?: number;
	/** The tun's temperature, one reading per brew minute of the rest. */
	mashMinutes: number[];
	/** Jugs of cloudy runnings poured back over the grain. */
	vorlaufJugs?: number;
	/** Litres in the kettle when you stopped rinsing. */
	collectedL?: number;
	boil?: { rollingMinutes: number; evaporatedL: number; boilOverL: number };
	/** The hot stand after flame-out, before the chiller went in. */
	stand?: { minutes: number; meanTempC: number };
	drops: HopDrop[];
	/** Pieces of cold-side kit sprayed, of how many there were. */
	sanitised?: { done: number; total: number };
	chill?: { minutes: number; pitchTempC: number };
	/** Share of the siphoning done with the hose splashing, 0–1. */
	splash?: number;
	packets?: number;
	/** The fermenter's temperature, one reading per day. */
	fermentDays: number[];
	coldCrash?: boolean;
	primingG?: number;
	/** Steps done, in order. */
	done: string[];
};

export function emptyLog(): DayLog {
	return { mashMinutes: [], drops: [], fermentDays: [], done: [] };
}

/** Jugs poured back before the runnings count as clear. */
export const CLEAR_AFTER_JUGS = 2;
/** Above this share of splashing, the transfer counts as careless. */
export const CARELESS_SPLASH = 0.3;

/** The card, overwritten with what you actually did. */
export function applyLog(plan: Recipe, log: DayLog): Recipe {
	let r: Recipe = structuredClone(plan);
	const did = (id: string) => log.done.includes(id);
	const grainKg = r.fermentables.reduce((s, f) => s + f.weightKg, 0);

	if (log.mashWaterL !== undefined && grainKg > 0) {
		r.mash.thicknessLPerKg = round1(log.mashWaterL / grainKg);
	}
	if (log.mashMinutes.length) {
		// Whatever the card had after the rest (a mash-out you never got to) is
		// not in the beer either: the rest is the whole mash.
		r.mash.steps = mashStepsFromMinutes(log.mashMinutes);
		r.mash.landedTempC = undefined;
		r.mash.toppedUpL = undefined;
	}
	if (log.vorlaufJugs !== undefined) r.mash.vorlauf = log.vorlaufJugs >= CLEAR_AFTER_JUGS;

	if (log.collectedL !== undefined) {
		const plannedOff = plan.preBoilVolumeL - plan.batchVolumeL;
		const b = log.boil;
		r = volumesAfterBoil(r, log.collectedL, b ? b.evaporatedL : plannedOff, b?.boilOverL ?? 0);
	}
	if (log.boil) r.boilTimeMin = Math.round(log.boil.rollingMinutes);

	const boilDone = did('boil');
	const fermentDone = did('ferment');
	if (boilDone) {
		const minutes = log.boil?.rollingMinutes ?? plan.boilTimeMin;
		const stand = log.stand ?? { minutes: 0, meanTempC: 95 };
		const fermentDays =
			log.fermentDays.length || r.fermentation.steps.reduce((s, x) => s + x.days, 0);
		const hot = log.drops.filter((d) => d.use !== 'dryHop');
		const dry = fermentDone ? log.drops.filter((d) => d.use === 'dryHop') : [];
		const planDry = fermentDone ? [] : plan.hops.filter((h) => h.use === 'dryHop');
		r.hops = [...hopsFromDrops([...hot, ...dry], minutes, stand, fermentDays), ...planDry];
	}

	if (log.sanitised) {
		r.chill.sanitation = log.sanitised.done >= log.sanitised.total ? 'no-rinse' : 'rinse';
	}
	if (log.chill) {
		r.chill.minutes = Math.round(log.chill.minutes);
		r.chill.pitchTempC = round1(log.chill.pitchTempC);
	}
	if (log.splash !== undefined) {
		r.chill.transferQuality = log.splash > CARELESS_SPLASH ? 'careless' : 'normal';
	}
	if (log.packets !== undefined) r.fermentation.pitchRate = pitchRateFor(plan, log.packets);
	if (log.fermentDays.length) r.fermentation.steps = fermentStepsFromDays(log.fermentDays);
	if (log.coldCrash !== undefined) r.fermentation.coldCrash = log.coldCrash;
	if (log.primingG !== undefined) {
		r.conditioning.packaging = 'bottles';
		r.conditioning.co2Volumes = co2FromPriming(r, log.primingG);
	}
	return r;
}
