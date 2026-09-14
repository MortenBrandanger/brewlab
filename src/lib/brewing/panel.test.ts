import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './recipes';
import { simulate } from './simulate';
import { judgePanel } from './panel';

const by = (name: string) => EXAMPLES.find((e) => e.name === name)!.build();
const panel = (name: string) => {
	const r = by(name);
	return Object.fromEntries(judgePanel(simulate(r), r).map((t) => [t.id, t]));
};

describe('the panel', () => {
	it('gives six opinions with hearts on the scale', () => {
		for (const ex of EXAMPLES) {
			const r = ex.build();
			const p = judgePanel(simulate(r), r);
			expect(p).toHaveLength(6);
			for (const t of p) {
				expect(t.hearts).toBeGreaterThanOrEqual(0);
				expect(t.hearts).toBeLessThanOrEqual(5);
				expect(t.line.length).toBeGreaterThan(8);
			}
		}
	});

	it('the hopster and the traditionalist part ways over a west coast IPA', () => {
		const p = panel('West coast IPA');
		expect(p.hopster.hearts).toBeGreaterThan(p.traditionalist.hearts);
	});

	it('the monk warms to a dubbel and the wild card to a rauchbier', () => {
		expect(panel('Abbey dubbel').monk.hearts).toBeGreaterThanOrEqual(4);
		const rauch = panel('Rauchbier');
		expect(rauch['wild-card'].line).toMatch(/Smoke/);
	});

	it('nobody loves a beer with a severe fault', () => {
		const p = panel('Something went wrong here');
		for (const t of Object.values(p)) expect(t.hearts).toBeLessThanOrEqual(2);
	});

	it('is deterministic', () => {
		expect(panel('House pale ale')).toEqual(panel('House pale ale'));
	});
});
