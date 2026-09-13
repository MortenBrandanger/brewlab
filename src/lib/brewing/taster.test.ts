import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './recipes';
import { simulate } from './simulate';
import { emptyRecipe } from './recipes';

const notes = EXAMPLES.map((ex) => ({ name: ex.name, result: simulate(ex.build()) }));

describe('the taster', () => {
	it('writes a complete note for every example', () => {
		for (const { name, result } of notes) {
			const note = result.tasting;
			expect(note.passages, name).toHaveLength(5);
			for (const p of note.passages) {
				expect(p.text.length, `${name} / ${p.phase}`).toBeGreaterThan(20);
				expect(p.text, `${name} / ${p.phase}`).not.toMatch(/undefined|NaN|\s{2}|\s\./);
				expect(p.text.endsWith('.'), `${name} / ${p.phase}`).toBe(true);
			}
			expect(note.closing.length, name).toBeGreaterThan(20);
		}
	});

	/*
	 * Smoke reaches the sensory model on the phenol axis, the same axis a
	 * Belgian yeast uses, and the first version of this file had only yeast
	 * words on file — so a rauchbier came out smelling of bread crust. The
	 * taster is the only part of the app that would ever have noticed.
	 */
	it('smells the smoke in a rauchbier', () => {
		const rauch = notes.find((n) => n.name === 'Rauchbier')!;
		const text = rauch.result.tasting.passages.map((p) => p.text).join(' ');
		expect(text).toMatch(/smoke/i);
	});

	/*
	 * A beer can score well on technical marks and still have butterscotch on
	 * the nose. When the score and the nose disagree, the nose wins: the taster
	 * must never call a beer faultless in the same breath as describing a fault.
	 */
	it('never calls a beer faultless when it has just named a fault', () => {
		for (const { name, result } of notes) {
			const smelledAFault = result.tasting.passages.some((p) => /cannot un-smell/.test(p.text));
			if (!smelledAFault) continue;
			expect(result.tasting.closing, name).not.toMatch(/nothing wrong with it/);
		}
	});

	/*
	 * The taster and the fault list are two views of the same risks. They used
	 * to carry separate thresholds, and a milk stout came out with butterscotch
	 * in the tasting note and "no significant faults were found" above it.
	 */
	it('agrees with the fault list about whether anything is wrong', () => {
		for (const { name, result } of notes) {
			const smelledAFault = result.tasting.passages.some((p) => /cannot un-smell/.test(p.text));
			const reportedAFault = result.findings.some((f) => f.severity !== 'info');
			if (smelledAFault)
				expect(reportedAFault, `${name} smelled a fault nobody reported`).toBe(true);
		}
	});

	it('names the late hops rather than the bittering charge', () => {
		const wc = notes.find((n) => n.name === 'West coast IPA')!;
		const nose = wc.result.tasting.passages.find((p) => p.phase === 'The nose')!.text;
		expect(nose).toMatch(/Citra|Simcoe|Centennial/);
	});

	/** An empty kettle must still produce prose rather than a crash or a blank. */
	it('survives a recipe with nothing in it', () => {
		const note = simulate(emptyRecipe()).tasting;
		expect(note.passages).toHaveLength(5);
		expect(note.closing.length).toBeGreaterThan(20);
	});
});
