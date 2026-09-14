import { describe, expect, it } from 'vitest';
import { EXAMPLES, emptyRecipe, ferm } from './recipes';
import { buildContext, simulate } from './simulate';
import { FAULT_THRESHOLD } from './faults';

function base() {
	const r = emptyRecipe();
	r.fermentables = [ferm('pale-ale', 5)];
	r.fermentation.yeastId = 'american-ale';
	return r;
}

describe('sanitation', () => {
	it('is the sensible default and changes nothing for the catalogue', () => {
		for (const ex of EXAMPLES) {
			const r = ex.build();
			const withDefault = simulate({ ...r, chill: { ...r.chill, sanitation: 'no-rinse' } });
			const without = simulate(r);
			expect(withDefault.scores.overall).toBe(without.scores.overall);
		}
	});

	it('a rinse alone makes contamination a real risk', () => {
		const r = base();
		const clean = buildContext({ ...r, chill: { ...r.chill, sanitation: 'no-rinse' } })!;
		const rinsed = buildContext({ ...r, chill: { ...r.chill, sanitation: 'rinse' } })!;
		expect(rinsed.risks.infection).toBeGreaterThan(clean.risks.infection + 3);
		expect(
			simulate({ ...r, chill: { ...r.chill, sanitation: 'rinse' } }).findings.some(
				(f) => f.code === 'INFECTION_RISK'
			)
		).toBe(false);
		// Alone it is a risk, not a fault; with a slow chill on top it becomes one.
		const slowAndRinsed = simulate({
			...r,
			chill: { ...r.chill, sanitation: 'rinse', minutes: 240 }
		});
		expect(slowAndRinsed.findings.some((f) => f.code === 'INFECTION_RISK')).toBe(true);
	});

	it('bleach kills the bugs and leaves a medicinal note', () => {
		const r = base();
		const bleached = simulate({ ...r, chill: { ...r.chill, sanitation: 'bleach' } });
		expect(
			buildContext({ ...r, chill: { ...r.chill, sanitation: 'bleach' } })!.risks.infection
		).toBeLessThan(1);
		expect(bleached.findings.some((f) => f.code === 'CHLOROPHENOL')).toBe(true);
		expect(bleached.tasting.passages.some((p) => /medicinal/.test(p.text))).toBe(true);
		expect(FAULT_THRESHOLD.chlorophenol).toBeLessThan(4.2);
	});
});
