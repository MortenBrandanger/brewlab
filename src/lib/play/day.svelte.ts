import type { Recipe } from '$lib/brewing/types';
import { buildExample } from '$lib/brewing/recipes';
import { simulate } from '$lib/brewing/simulate';
import { strikeTempC } from '$lib/brewing/calculations';
import { GRAIN_ABSORPTION_L_PER_KG } from '$lib/brewing/simulate';
import { applyLog, cardPackets, emptyLog, primingGrams, type DayLog, type HopDrop } from './actual';
import { addGrain, newTun, type TunState } from './mashHeat';
import { MashScene } from './mashScene';
import { PLAY_STEPS, playStepIndex, type PlayStep, type PlayStepId } from './steps';

/**
 * The hands-on brew day in progress.
 *
 * `plan` is the recipe card and never changes once picked. `log` is what the
 * scenes have measured so far, and `actual` is the card overwritten with it —
 * the beer you are really making, which is what the engine judges. The tun is
 * kept here rather than in a scene because three screens stand at it: you heat
 * the water, tip the grain in, and hold the rest, and the heat carries across.
 */
class PlayDay {
	plan = $state<Recipe | undefined>(undefined);
	planId = $state<string | undefined>(undefined);
	log = $state<DayLog>(emptyLog());
	at = $state(0);
	/** The mash tun, carried across the three mash screens. Not reactive on purpose. */
	tun: TunState = newTun(15, 15);
	/** The tun as drawn, kept for the same reason: the grain you stirred in stays stirred in. */
	mashScene = new MashScene(15);
	/**
	 * The wort in the kettle, carried from the run-off through the boil, the
	 * hot stand and the chiller: how much there is, how hot it is, and how long
	 * since the gas went off. Not reactive; the scenes read and write it.
	 */
	kettle = { wortL: 0, tempC: 70, sinceFlameoutMin: 0 };

	actual = $derived(
		this.plan ? applyLog($state.snapshot(this.plan), $state.snapshot(this.log)) : undefined
	);
	result = $derived(this.actual ? simulate(this.actual) : undefined);

	get step(): PlayStep {
		return PLAY_STEPS[this.at];
	}

	get grainKg(): number {
		return this.plan?.fermentables.reduce((s, f) => s + f.weightKg, 0) ?? 0;
	}

	/** Strike water: the card's thickness times the grain. */
	get mashWaterL(): number {
		return this.plan ? this.plan.mash.thicknessLPerKg * this.grainKg : 15;
	}

	/** The first conversion rest on the card. What the mash is aimed at. */
	get mashTargetC(): number {
		const rest = this.plan?.mash.steps.find((s) => s.tempC >= 58 && s.tempC <= 74);
		return rest?.tempC ?? 66;
	}

	/** How hot the water must be for the grain to land it on the target. */
	get strikeTargetC(): number {
		return strikeTempC(this.mashTargetC, this.plan?.mash.thicknessLPerKg ?? 3);
	}

	/** Water left to rinse with: the card's pre-boil volume plus what the grain soaks up. */
	get spargeWaterL(): number {
		if (!this.plan) return 0;
		const total = this.plan.preBoilVolumeL + this.grainKg * GRAIN_ABSORPTION_L_PER_KG;
		return Math.max(0, total - this.mashWaterL);
	}

	pick(id: string) {
		const recipe = buildExample(id);
		if (!recipe) return;
		this.plan = recipe;
		this.planId = id;
		this.log = emptyLog();
		// Tap water, in a pot on the gas.
		this.tun = newTun(this.mashWaterL, 14);
		this.mashScene = new MashScene(14);
		this.at = 1;
	}

	/** Record a step as done and walk on to the next one. */
	finish(patch: Partial<DayLog> = {}) {
		const id = this.step.id;
		this.log = {
			...this.log,
			...patch,
			done: this.log.done.includes(id) ? this.log.done : [...this.log.done, id]
		};
		this.at = Math.min(PLAY_STEPS.length - 1, this.at + 1);
	}

	/**
	 * Development only: pick a card and walk to a step with everything before
	 * it done exactly as the card says, so a bench can be looked at without
	 * brewing up to it every time.
	 */
	skipTo(cardId: string, stepId: PlayStepId) {
		this.pick(cardId);
		const plan = this.plan;
		if (!plan) return;
		const target = playStepIndex(stepId);
		const boilHops = plan.hops.filter((h) => h.use === 'boil');
		const whirl = plan.hops.filter((h) => h.use === 'whirlpool');
		const dry = plan.hops.filter((h) => h.use === 'dryHop');
		while (this.at < target) {
			const id = this.step.id;
			if (id === 'strike') {
				this.tun = newTun(this.mashWaterL, this.strikeTargetC);
				this.finish({ strikeC: this.strikeTargetC });
			} else if (id === 'dough-in') {
				this.tun = { ...addGrain(this.tun, this.grainKg), unmixed: 0, lid: true };
				this.finish({ mashWaterL: this.tun.waterL });
			} else if (id === 'rest') {
				const minutes = plan.mash.steps.flatMap((m) => Array<number>(m.minutes).fill(m.tempC));
				this.tun = { ...this.tun, tempC: minutes.at(-1) ?? this.tun.tempC };
				this.finish({ mashMinutes: minutes });
			} else if (id === 'vorlauf') {
				this.finish({ vorlaufJugs: 2 });
			} else if (id === 'sparge') {
				this.kettle = { wortL: plan.preBoilVolumeL, tempC: 70, sinceFlameoutMin: 0 };
				this.finish({ collectedL: plan.preBoilVolumeL });
			} else if (id === 'boil') {
				const drops: HopDrop[] = boilHops.map((h) => ({
					cardId: h.id,
					hopId: h.hopId,
					grams: h.grams,
					use: 'boil',
					at: plan.boilTimeMin - h.time
				}));
				this.kettle = { wortL: plan.batchVolumeL, tempC: 100, sinceFlameoutMin: 0 };
				this.finish({
					boil: {
						rollingMinutes: plan.boilTimeMin,
						evaporatedL: plan.preBoilVolumeL - plan.batchVolumeL,
						boilOverL: 0
					},
					drops
				});
			} else if (id === 'flameout') {
				const stand = Math.max(0, ...whirl.map((h) => h.time));
				const tempC = whirl[0]?.tempC ?? 95;
				this.kettle = { ...this.kettle, tempC, sinceFlameoutMin: stand };
				this.finish({
					drops: [
						...this.log.drops,
						...whirl.map((h) => ({
							cardId: h.id,
							hopId: h.hopId,
							grams: h.grams,
							use: 'whirlpool' as const,
							at: stand - h.time
						}))
					],
					stand: { minutes: stand, meanTempC: tempC }
				});
			} else if (id === 'sanitise') {
				this.finish({ sanitised: { done: 5, total: 5 } });
			} else if (id === 'chill') {
				this.kettle = { ...this.kettle, tempC: plan.chill.pitchTempC };
				this.finish({ chill: { minutes: plan.chill.minutes, pitchTempC: plan.chill.pitchTempC } });
			} else if (id === 'transfer') {
				this.finish({ splash: 0 });
			} else if (id === 'pitch') {
				this.finish({ packets: cardPackets(plan) });
			} else if (id === 'ferment') {
				const days = plan.fermentation.steps.flatMap((f) => Array<number>(f.days).fill(f.tempC));
				this.finish({
					fermentDays: days,
					coldCrash: plan.fermentation.coldCrash,
					drops: [
						...this.log.drops,
						...dry.map((h) => ({
							cardId: h.id,
							hopId: h.hopId,
							grams: h.grams,
							use: 'dryHop' as const,
							at: h.day ?? 5
						}))
					]
				});
			} else if (id === 'bottle') {
				this.finish({ primingG: primingGrams(plan) });
			} else {
				this.finish();
			}
		}
	}

	/** Start over with a fresh card. */
	reset() {
		this.plan = undefined;
		this.planId = undefined;
		this.log = emptyLog();
		this.at = 0;
	}
}

export const day = new PlayDay();
