/**
 * The brew day, played back.
 *
 * Pressing "Mash in" used to change a label and a number. But the mash is an
 * hour in which two enzymes convert starch minute by minute, and the model
 * already computes every one of those minutes — it integrates them to get
 * the sugar spectrum. The same is true of the boil, where bitterness
 * accumulates as the hop resin isomerises, and of the fermentation, which is
 * a fortnight of gravity falling hour by hour. All of that ran, silently, and
 * only the last frame was ever shown.
 *
 * So this exposes the frames. Not an animation drawn to look like brewing: a
 * playback of the simulation the app actually ran, compressed to a few
 * seconds. "34 minutes in, 71% of the starch is sugar" is a fact the model
 * computed on the way to its answer, and watching it happen is how a person
 * comes to believe the answer — a bubbling gif would teach nothing, and this
 * is exactly what the gif cannot do.
 *
 * Pure: the samples are data, and the panel decides how fast to run them.
 */

import type { EngineContext } from './context';
import { computeIbu } from './calculations';
import type { StageId } from '$lib/state/stages';

export type PlaybackSample = {
	/** Position in the process, 0–1. */
	at: number;
	/** Where in the process this is: "34 min", "day 6". */
	when: string;
	/** The one fact worth reading at this moment. */
	primary: string;
	secondary?: string;
	/** How far along the process is, 0–1, for the trace. */
	level: number;
};

export type Playback = {
	/** What is happening, as a present participle: "Mashing". */
	title: string;
	/** How long the real thing takes. */
	duration: string;
	samples: PlaybackSample[];
	/** How long the playback should run, in milliseconds. */
	runMs: number;
};

/**
 * What to play for a stage that has just been carried out, or nothing for a
 * stage that is an act rather than a process.
 */
export function playbackFor(stage: StageId, ctx: EngineContext): Playback | undefined {
	switch (stage) {
		case 'mash':
			return mash(ctx);
		case 'boil':
			return boil(ctx);
		case 'ferment':
			return ferment(ctx);
		default:
			return undefined;
	}
}

/** Starch becoming sugar, one minute at a time. */
function mash(ctx: EngineContext): Playback | undefined {
	const curve = ctx.mash.kinetics.curve;
	if (curve.length < 2) return undefined;
	const last = curve[curve.length - 1];
	const totalAt = (s: typeof last.spectrum) =>
		s.starch + s.dextrins + s.maltotriose + s.maltose + s.glucose;
	const total = totalAt(last.spectrum);
	const samples: PlaybackSample[] = curve.map((p, i) => {
		const sugar = total > 0 ? 1 - p.spectrum.starch / total : 0;
		const fermentable =
			total > 0 ? (p.spectrum.glucose + p.spectrum.maltose + p.spectrum.maltotriose) / total : 0;
		return {
			at: curve.length > 1 ? i / (curve.length - 1) : 1,
			when: `${p.minute} min · ${Math.round(p.tempC)} °C`,
			primary: `${Math.round(sugar * 100)}% of the starch is sugar`,
			secondary: `${Math.round(fermentable * 100)}% of it the yeast can eat`,
			level: sugar
		};
	});
	return { title: 'Mashing', duration: `${last.minute} minutes`, samples, runMs: 2600 };
}

/** Bitterness arriving as the resin isomerises, and water leaving as steam. */
function boil(ctx: EngineContext): Playback | undefined {
	const { recipe } = ctx;
	const minutes = Math.max(0, Math.round(recipe.boilTimeMin));
	if (minutes === 0) return undefined;
	/*
	 * Only the kettle hops. A whirlpool charge goes in after the flame is out,
	 * so during the boil it has contributed nothing yet — the first version of
	 * this opened at "4 IBU" for a beer whose only early bitterness was a
	 * whirlpool addition that had not happened.
	 */
	const boilHops = recipe.hops.filter((h) => h.use === 'boil');
	const finalIbu = computeIbu({ ...recipe, hops: boilHops }, ctx.gravity.boilGravity).total;
	const preBoil = Math.max(recipe.batchVolumeL, recipe.preBoilVolumeL);
	const samples: PlaybackSample[] = [];
	for (let e = 0; e <= minutes; e++) {
		/*
		 * A hop scheduled at T minutes remaining goes in at boilTime − T and has
		 * been boiling for e − (boilTime − T) at elapsed e. Its bitterness so far
		 * is the bitterness of a hop boiled that long.
		 */
		const exposed = boilHops.map((h) => ({
			...h,
			time: Math.max(0, Math.min(h.time, e - (minutes - h.time)))
		}));
		const ibu = computeIbu({ ...recipe, hops: exposed }, ctx.gravity.boilGravity).total;
		const volume = preBoil - (preBoil - recipe.batchVolumeL) * (e / minutes);
		samples.push({
			at: e / minutes,
			when: `${e} min`,
			primary: `${Math.round(ibu)} IBU`,
			secondary: `${volume.toFixed(1)} L in the kettle`,
			level: finalIbu > 0 ? ibu / finalIbu : e / minutes
		});
	}
	return { title: 'Boiling', duration: `${minutes} minutes`, samples, runMs: 2600 };
}

/** Gravity falling, hour by hour, as the yeast eats. */
function ferment(ctx: EngineContext): Playback | undefined {
	const curve = ctx.attenuation.kinetics.curve;
	if (curve.length < 2) return undefined;
	const start = curve[0].points;
	const end = curve[curve.length - 1].points;
	const drop = Math.max(1e-6, start - end);
	const lastDay = curve[curve.length - 1].day;
	const samples: PlaybackSample[] = curve.map((p, i) => ({
		at: curve.length > 1 ? i / (curve.length - 1) : 1,
		when: `day ${Math.floor(p.day)}${p.tempC ? ` · ${Math.round(p.tempC)} °C` : ''}`,
		primary: `${(1 + p.points / 1000).toFixed(3)}`,
		secondary: `${p.abv.toFixed(1)}% alcohol so far`,
		level: Math.max(0, Math.min(1, (start - p.points) / drop))
	}));
	return {
		title: 'Fermenting',
		duration: `${Math.round(lastDay)} days`,
		samples,
		runMs: 3200
	};
}
