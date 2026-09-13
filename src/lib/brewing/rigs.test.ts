import { describe, expect, it } from 'vitest';
import { RIGS, collectVolumeL, rigFor } from './rigs';
import { DEFAULTS } from './recipes';

describe('rigs', () => {
	it('reads a recipe back as the rig that produced it', () => {
		for (const rig of RIGS) expect(rigFor(rig.efficiencyPct).id).toBe(rig.id);
	});

	it('puts a recipe from somewhere else on the nearest rig', () => {
		expect(rigFor(70).id).toBe('batch-sparge');
		expect(rigFor(95).id).toBe('recirculating');
		expect(rigFor(20).id).toBe('biab');
	});

	/*
	 * The default recipe is what a first-time visitor brews, and it predates the
	 * rigs. If the standard kit no longer implies the volume the default ships
	 * with, the first thing a reader sees is the screen correcting itself.
	 */
	it('agrees with the volume the default recipe already shipped with', () => {
		const rig = rigFor(DEFAULTS.efficiencyPct);
		expect(rig.id).toBe('batch-sparge');
		expect(collectVolumeL(rig, DEFAULTS.batchVolumeL, DEFAULTS.boilTimeMin)).toBe(
			DEFAULTS.preBoilVolumeL
		);
	});

	it('collects more for a longer boil and for a bigger batch', () => {
		const rig = rigFor(72);
		expect(collectVolumeL(rig, 20, 90)).toBeGreaterThan(collectVolumeL(rig, 20, 60));
		expect(collectVolumeL(rig, 40, 60)).toBeGreaterThan(collectVolumeL(rig, 20, 60));
	});

	it('always leaves the boil something to evaporate', () => {
		for (const rig of RIGS) {
			for (const batch of [5, 20, 40]) {
				for (const boil of [0, 60, 180]) {
					expect(collectVolumeL(rig, batch, boil)).toBeGreaterThan(batch);
				}
			}
		}
	});
});
