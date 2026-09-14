/**
 * The variance analysis, off the main thread.
 *
 * Two hundred and forty simulations take about 190 ms on a desktop and the
 * best part of a second on a phone, and the report asked for them on the
 * main thread every time a control moved — which is the definition of a
 * page that stutters. A worker runs the same pure function on another
 * thread and posts the report back; the panel shows the last one until the
 * next arrives. Nothing about the analysis changes: it is the same
 * deterministic code, imported here rather than there.
 */
import { analyseVariance } from './variance';
import type { Recipe } from './types';

export type VarianceRequest = { id: number; recipe: Recipe; runs?: number };

self.onmessage = (event: MessageEvent<VarianceRequest>) => {
	const { id, recipe, runs } = event.data;
	const report = analyseVariance(recipe, runs);
	self.postMessage({ id, report });
};
