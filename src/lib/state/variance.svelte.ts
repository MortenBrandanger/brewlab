/**
 * The repeatability report, computed in a worker and kept as state.
 *
 * `request(recipe)` hands the recipe to the worker and remembers which
 * request is newest; a reply to an older one is dropped, so a slider dragged
 * quickly does not paint six stale reports in a row. Where workers do not
 * exist — the test runner, the server render — the analysis runs inline,
 * which is slower but identical.
 */
import { analyseVariance, type VarianceReport } from '$lib/brewing/variance';
import type { Recipe } from '$lib/brewing/types';

class VarianceStore {
	report = $state<VarianceReport | undefined>(undefined);
	/** True from the first request until the first report lands. */
	pending = $state(false);
	private worker: Worker | undefined;
	private seq = 0;

	private ensureWorker(): Worker | undefined {
		if (this.worker) return this.worker;
		if (typeof Worker === 'undefined') return undefined;
		try {
			// Vite bundles this into its own chunk; the URL form is what makes that work.
			this.worker = new Worker(new URL('../brewing/variance.worker.ts', import.meta.url), {
				type: 'module'
			});
			this.worker.onmessage = (e: MessageEvent<{ id: number; report: VarianceReport }>) => {
				if (e.data.id !== this.seq) return;
				this.report = e.data.report;
				this.pending = false;
			};
			return this.worker;
		} catch {
			return undefined;
		}
	}

	request(recipe: Recipe, runs = 240) {
		this.seq += 1;
		const worker = this.ensureWorker();
		if (!worker) {
			this.report = analyseVariance(recipe, runs);
			this.pending = false;
			return;
		}
		if (!this.report) this.pending = true;
		// structuredClone strips Svelte's proxies; a proxy cannot cross to a worker.
		worker.postMessage({ id: this.seq, recipe: structuredClone($state.snapshot(recipe)), runs });
	}
}

export const variance = new VarianceStore();
