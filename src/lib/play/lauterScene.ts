/**
 * The run-off bench: the mash tun lifted onto a crate, a tap at its foot, and
 * whatever is under the tap — a jug for the vorlauf, then the boil kettle.
 *
 * Drawn in the same cutaway as the mash tun, so the grain bed is visible as a
 * packed layer with wort standing over it. Everything that moves is moved by
 * the run-off model in `lauter.ts`:
 *
 * - what leaves the tap is as cloudy as `runningsCloud` says, and you can see
 *   it: a milky stream with flecks of husk in it, turning to clear amber as
 *   the bed settles;
 * - the stream is as thick as the tap is running, so it thins to a trickle as
 *   the head over the grain drains away;
 * - the kettle fills to exactly the litres collected, against a mark at the
 *   card's pre-boil volume;
 * - later runnings come out paler, because rinse water has less sugar left to
 *   wash out; the kettle shows the mix.
 *
 * Deterministic like every scene: the husk flecks and the grain bed come from
 * the engine's seeded PRNG.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	Steam,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	drawTag,
	fract,
	glow,
	lerp,
	type Palette
} from './kit';

const TUN = { left: 236, right: 456, top: 150, bottom: 330, wall: 10 };
const TUN_CX = (TUN.left + TUN.right) / 2;
const RIM_RY = 16;
/** Where the stream leaves the tap. */
const SPOUT = { x: 508, y: 334 };
const JUG = { cx: SPOUT.x, w: 66, h: 88 };
const KETTLE = { w: 250, top: 352, bottom: BENCH - 8, wall: 8 };
/** Litres the kettle holds to the brim, for drawing the level. */
const KETTLE_CAP_L = 36;
const POT_REST = { x: 120, y: BENCH };
const POT_POUR = { x: 206, y: 120 };

export type LauterFrame = {
	mode: 'vorlauf' | 'sparge';
	/** The colour of the wort, from the recipe. */
	wort: string;
	grainKg: number;
	/** Liquid standing in the tun that can still drain, litres. */
	headL: number;
	/** What is leaving the tap right now: litres a second, and how cloudy, 0–1. */
	flowLps: number;
	cloud: number;
	/** Vorlauf: the jug and what is in it. */
	jug?: { litres: number; cloud: number; pouring: boolean };
	/** Sparge: the rinse pot, the kettle and the card's mark. */
	sparge?: {
		potL: number;
		potCapL: number;
		pouring: boolean;
		kettleL: number;
		markL: number;
		/** 0 = first runnings, 1 = nothing but rinse water: later runnings are paler. */
		thin: number;
	};
	calm: boolean;
};

type Fleck = { x: number; phase: number; speed: number; size: number };

export class LauterScene {
	private t = 0;
	private rand = rng(0x6c617574);
	private bed: { x: number; y: number; r: number; tone: number; turn: number }[] = [];
	private flecks: Fleck[] = [];
	private steam = new Steam(12, 0x73706172);
	private jugLift = 0;
	private potLift = 0;
	/** Where the kettle stands: aside during the vorlauf, under the tap for the sparge. */
	private kettleX: number;
	private ripple = 0;

	constructor(mode: 'vorlauf' | 'sparge') {
		for (let i = 0; i < 420; i++) {
			this.bed.push({
				x: this.rand(),
				y: this.rand(),
				r: 2.2 + this.rand() * 2.2,
				tone: this.rand(),
				turn: this.rand() * Math.PI
			});
		}
		for (let i = 0; i < 26; i++) {
			this.flecks.push({
				x: this.rand(),
				phase: this.rand(),
				speed: 0.6 + this.rand() * 0.8,
				size: 1 + this.rand() * 1.6
			});
		}
		// Aside for the vorlauf; under the tap for the sparge, where the runnings go.
		this.kettleX = this.kettleLeft(mode);
	}

	private kettleLeft(mode: 'vorlauf' | 'sparge') {
		return mode === 'sparge' ? SPOUT.x - 40 : 690;
	}

	private bedTop(f: LauterFrame) {
		return TUN.bottom - clamp(f.grainKg * 19, 50, 130);
	}

	private liquidTop(f: LauterFrame) {
		return this.bedTop(f) - clamp(f.headL * 3.2, 0, this.bedTop(f) - TUN.top - 14);
	}

	update(dt: number, f: LauterFrame) {
		this.t += dt;
		this.steam.update(dt);
		const rate = 5;
		const snap = (from: number, to: number) => (f.calm ? to : approach(from, to, rate, dt));
		this.jugLift = snap(this.jugLift, f.jug?.pouring ? 1 : 0);
		this.potLift = snap(this.potLift, f.sparge?.pouring ? 1 : 0);
		this.kettleX = f.calm
			? this.kettleLeft(f.mode)
			: approach(this.kettleX, this.kettleLeft(f.mode), 2.2, dt);
		this.ripple = f.calm ? 0 : this.ripple + dt;
	}

	draw(ctx: CanvasRenderingContext2D, f: LauterFrame, pal: Palette) {
		this.drawKettle(ctx, pal, f);
		this.drawCrate(ctx, pal);
		this.drawTun(ctx, pal, f);
		this.drawTap(ctx, pal, f.flowLps > 0.02);
		if (f.sparge) this.drawPot(ctx, pal, f);
		if (f.jug) this.drawJug(ctx, pal, f);
		this.drawRunnings(ctx, pal, f);
	}

	/* Tun ------------------------------------------------------------------ */

	private drawCrate(ctx: CanvasRenderingContext2D, pal: Palette) {
		const top = TUN.bottom + TUN.wall;
		const left = TUN.left - 10;
		const right = TUN.right + 10;
		contactShadow(ctx, pal, (left + right) / 2, BENCH, (right - left) / 2);
		const planks = 4;
		const ph = (BENCH - top) / planks;
		for (let i = 0; i < planks; i++) {
			const y = top + i * ph;
			const g = ctx.createLinearGradient(0, y, 0, y + ph);
			g.addColorStop(0, pal.woodLight);
			g.addColorStop(1, pal.wood);
			ctx.fillStyle = g;
			ctx.fillRect(left, y + 1, right - left, ph - 2);
			ctx.fillStyle = alpha(pal.shadow, 0.35);
			ctx.fillRect(left, y + ph - 3, right - left, 2);
		}
		// Corner posts.
		ctx.fillStyle = pal.woodDark;
		ctx.fillRect(left, top, 12, BENCH - top);
		ctx.fillRect(right - 12, top, 12, BENCH - top);
		// The shadow of the tun on its top plank.
		const sh = ctx.createLinearGradient(0, top, 0, top + 18);
		sh.addColorStop(0, alpha(pal.shadow, 0.55));
		sh.addColorStop(1, alpha(pal.shadow, 0));
		ctx.fillStyle = sh;
		ctx.fillRect(left, top, right - left, 18);
	}

	private interior(ctx: CanvasRenderingContext2D) {
		const { left: L, right: R, top: T, bottom: B } = TUN;
		ctx.beginPath();
		ctx.moveTo(L, T);
		ctx.lineTo(L, B - 14);
		ctx.quadraticCurveTo(L, B, L + 14, B);
		ctx.lineTo(R - 14, B);
		ctx.quadraticCurveTo(R, B, R, B - 14);
		ctx.lineTo(R, T);
		ctx.closePath();
	}

	private drawTun(ctx: CanvasRenderingContext2D, pal: Palette, f: LauterFrame) {
		const { left: L, right: R, top: T, bottom: B, wall: w } = TUN;
		const bedTop = this.bedTop(f);
		const liquid = this.liquidTop(f);

		ctx.save();
		this.interior(ctx);
		ctx.clip();
		const back = ctx.createLinearGradient(0, T, 0, B);
		back.addColorStop(0, pal.copperDark);
		back.addColorStop(1, pal.shadow);
		ctx.fillStyle = back;
		ctx.fillRect(L, T, R - L, B - T);

		// Wort standing over and through the grain.
		const wort = ctx.createLinearGradient(0, liquid, 0, B);
		wort.addColorStop(0, f.wort);
		wort.addColorStop(1, alpha(pal.shadow, 0.95));
		ctx.fillStyle = wort;
		ctx.fillRect(L, liquid, R - L, B - liquid);
		// The flour still loose above the bed, while the runnings are cloudy.
		if (f.cloud > 0.05) {
			ctx.fillStyle = alpha(pal.plastic, f.cloud * 0.35);
			ctx.fillRect(L, liquid, R - L, bedTop - liquid + 10);
		}

		// The grain bed: packed husks, darker with depth.
		for (const g of this.bed) {
			const y = lerp(bedTop + 4, B - 4, g.y);
			const depth = (y - bedTop) / (B - bedTop);
			ctx.fillStyle = g.tone > 0.5 ? pal.woodLight : pal.amber;
			ctx.globalAlpha = 0.85 - depth * 0.45;
			ctx.beginPath();
			ctx.ellipse(lerp(L + 6, R - 6, g.x), y, g.r, g.r * 0.5, g.turn, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		const bedShade = ctx.createLinearGradient(0, bedTop, 0, B);
		bedShade.addColorStop(0, alpha(pal.shadow, 0));
		bedShade.addColorStop(1, alpha(pal.shadow, 0.55));
		ctx.fillStyle = bedShade;
		ctx.fillRect(L, bedTop, R - L, B - bedTop);

		// The surface, catching the lamp, with rings where water lands on it.
		if (liquid < bedTop - 1) {
			ctx.strokeStyle = alpha(pal.lamp, 0.45);
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(L, liquid);
			ctx.lineTo(R, liquid);
			ctx.stroke();
		}
		ctx.restore();

		// Copper walls and rim, as on the mash tun.
		const outline = () => {
			ctx.beginPath();
			ctx.moveTo(L - w, T);
			ctx.lineTo(L - w, B - 14);
			ctx.quadraticCurveTo(L - w, B + w, L + 14, B + w);
			ctx.lineTo(R - 14, B + w);
			ctx.quadraticCurveTo(R + w, B + w, R + w, B - 14);
			ctx.lineTo(R + w, T);
			ctx.lineTo(R, T);
			ctx.lineTo(R, B - 14);
			ctx.quadraticCurveTo(R, B, R - 14, B);
			ctx.lineTo(L + 14, B);
			ctx.quadraticCurveTo(L, B, L, B - 14);
			ctx.lineTo(L, T);
			ctx.closePath();
		};
		outline();
		const metal = ctx.createLinearGradient(0, T, 0, B + w);
		metal.addColorStop(0, pal.copperLight);
		metal.addColorStop(0.5, pal.copper);
		metal.addColorStop(1, pal.copperDark);
		ctx.fillStyle = metal;
		ctx.fill();
		ctx.strokeStyle = alpha(pal.shadow, 0.7);
		ctx.lineWidth = 1.5;
		ctx.stroke();

		ctx.lineWidth = 6;
		ctx.strokeStyle = pal.copperDark;
		ctx.beginPath();
		ctx.ellipse(TUN_CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = pal.copperLight;
		ctx.beginPath();
		ctx.ellipse(TUN_CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, 0, Math.PI);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.5);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(TUN_CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, Math.PI * 0.62, Math.PI * 0.82);
		ctx.stroke();
	}

	private drawTap(ctx: CanvasRenderingContext2D, pal: Palette, open: boolean) {
		const y = TUN.bottom - 18;
		const x0 = TUN.right + TUN.wall;
		// Pipe out of the wall, a valve body, a spout turned down.
		const pipe = ctx.createLinearGradient(0, y - 7, 0, y + 7);
		pipe.addColorStop(0, pal.steelLight);
		pipe.addColorStop(1, pal.steelDark);
		ctx.fillStyle = pipe;
		ctx.fillRect(x0 - 2, y - 7, SPOUT.x - x0 + 8, 14);
		ctx.beginPath();
		ctx.roundRect(SPOUT.x - 8, y - 4, 16, SPOUT.y - y + 4, [0, 0, 5, 5]);
		ctx.fill();
		const valve = ctx.createLinearGradient(0, y - 14, 0, y + 14);
		valve.addColorStop(0, pal.amber);
		valve.addColorStop(1, pal.copperDark);
		ctx.fillStyle = valve;
		ctx.beginPath();
		ctx.roundRect(x0 + 10, y - 13, 24, 26, 6);
		ctx.fill();
		// The lever: along the pipe when open, across it when shut.
		ctx.save();
		ctx.translate(x0 + 22, y - 13);
		ctx.rotate(open ? 0 : -Math.PI / 2);
		ctx.fillStyle = pal.danger;
		ctx.beginPath();
		ctx.roundRect(-3, -4, 40, 8, 4);
		ctx.fill();
		ctx.restore();
	}

	/* Vessels under the tap ------------------------------------------------ */

	private jugPose() {
		const t = this.jugLift;
		return {
			x: lerp(JUG.cx, TUN_CX + 96, t),
			y: lerp(BENCH, TUN.top - 6, t),
			angle: -t * 1.2
		};
	}

	private drawJug(ctx: CanvasRenderingContext2D, pal: Palette, f: LauterFrame) {
		const jug = f.jug!;
		const pose = this.jugPose();
		const share = clamp(jug.litres / 1.2, 0, 1);
		if (this.jugLift < 0.05) contactShadow(ctx, pal, pose.x, BENCH, JUG.w * 0.55);

		// The pour back: a gentle stream from the lip onto the bed.
		if (this.jugLift > 0.8 && jug.litres > 0.01) {
			// The lip is the jug's top corner on the pouring side, turned with the jug.
			const c = Math.cos(pose.angle);
			const sn = Math.sin(pose.angle);
			const lx = -JUG.w / 2;
			const ly = -JUG.h;
			const lipX = pose.x + lx * c - ly * sn;
			const lipY = pose.y + lx * sn + ly * c;
			this.stream(ctx, pal, lipX, lipY, lipX - 6, this.liquidTop(f), 5, f.wort, jug.cloud);
		}

		ctx.save();
		ctx.translate(pose.x, pose.y);
		ctx.rotate(pose.angle);
		const { w, h } = JUG;
		const body = () => {
			ctx.beginPath();
			ctx.moveTo(-w / 2, -h);
			ctx.lineTo(w / 2, -h);
			ctx.lineTo(w / 2 - 5, 0);
			ctx.lineTo(-w / 2 + 5, 0);
			ctx.closePath();
		};
		// Glass jug: what is in it shows through.
		ctx.save();
		body();
		ctx.clip();
		ctx.fillStyle = alpha(pal.steelLight, 0.12);
		ctx.fillRect(-w / 2, -h, w, h);
		if (share > 0.01) {
			// Level stays level when tipped: draw in world-up terms.
			ctx.rotate(-pose.angle);
			const level = -h * share * 0.92;
			ctx.fillStyle = f.wort;
			ctx.fillRect(-w, level, w * 2, h * 2);
			if (jug.cloud > 0.03) {
				ctx.fillStyle = alpha(pal.plastic, jug.cloud * 0.55);
				ctx.fillRect(-w, level, w * 2, h * 2);
				ctx.fillStyle = alpha(pal.woodDark, 0.8);
				for (let i = 0; i < Math.round(jug.cloud * 14); i++) {
					const fl = this.flecks[i];
					ctx.fillRect(
						-w / 2 + 8 + fl.x * (w - 16),
						level + 6 + fract(fl.phase + this.t * 0.05) * (-level - 10),
						fl.size * 1.4,
						fl.size
					);
				}
			}
			ctx.strokeStyle = alpha(pal.lamp, 0.5);
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(-w, level);
			ctx.lineTo(w, level);
			ctx.stroke();
		}
		ctx.restore();
		ctx.strokeStyle = alpha(pal.fg, 0.55);
		ctx.lineWidth = 2.5;
		body();
		ctx.stroke();
		// Handle and a highlight down the glass.
		ctx.beginPath();
		ctx.arc(w / 2 + 4, -h * 0.55, 16, -Math.PI / 2, Math.PI / 2);
		ctx.lineWidth = 5;
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.35);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-w / 2 + 9, -h + 8);
		ctx.lineTo(-w / 2 + 12, -10);
		ctx.stroke();
		ctx.restore();
	}

	private kettleLevel(litres: number) {
		const { top, bottom } = KETTLE;
		return bottom - clamp(litres / KETTLE_CAP_L, 0, 1) * (bottom - top - 6);
	}

	private drawKettle(ctx: CanvasRenderingContext2D, pal: Palette, f: LauterFrame) {
		const L = this.kettleX;
		const R = L + KETTLE.w;
		const { top: T, bottom: B, wall: w } = KETTLE;
		const cx = (L + R) / 2;
		const s = f.sparge;
		contactShadow(ctx, pal, cx, BENCH, KETTLE.w / 2 + 8);
		// Short feet.
		ctx.fillStyle = pal.steelDark;
		for (const x of [L + 20, R - 30]) ctx.fillRect(x, B, 10, BENCH - B);

		ctx.save();
		ctx.beginPath();
		ctx.roundRect(L, T, R - L, B - T, [0, 0, 12, 12]);
		ctx.clip();
		const back = ctx.createLinearGradient(0, T, 0, B);
		back.addColorStop(0, pal.steelDark);
		back.addColorStop(1, pal.shadow);
		ctx.fillStyle = back;
		ctx.fillRect(L, T, R - L, B - T);

		if (s && s.kettleL > 0.01) {
			const level = this.kettleLevel(s.kettleL);
			const body = ctx.createLinearGradient(0, level, 0, B);
			body.addColorStop(0, f.wort);
			body.addColorStop(1, alpha(pal.shadow, 0.9));
			ctx.fillStyle = body;
			ctx.fillRect(L, level, R - L, B - level);
			// Rings spreading where the stream lands.
			if (f.flowLps > 0.02 && !f.calm) {
				ctx.strokeStyle = alpha(pal.lamp, 0.35);
				ctx.lineWidth = 1.5;
				for (let i = 0; i < 3; i++) {
					const p = fract(this.ripple * 1.4 + i / 3);
					ctx.globalAlpha = 1 - p;
					ctx.beginPath();
					ctx.ellipse(SPOUT.x, level, 6 + p * 40, 2 + p * 6, 0, 0, Math.PI * 2);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			}
			ctx.strokeStyle = alpha(pal.lamp, 0.45);
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(L, level);
			ctx.lineTo(R, level);
			ctx.stroke();
		}

		// The fill mark, scratched inside the back wall.
		if (s) {
			const y = this.kettleLevel(s.markL);
			ctx.strokeStyle = alpha(pal.fg, 0.75);
			ctx.lineWidth = 2;
			ctx.setLineDash([8, 6]);
			ctx.beginPath();
			ctx.moveTo(L + 6, y);
			ctx.lineTo(R - 6, y);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		ctx.restore();

		// Steel walls, cut, and the rim.
		ctx.fillStyle = cylinder(ctx, L - w, R + w, pal.steelLight, pal.steel, pal.steelDark);
		ctx.fillRect(L - w, T, w, B - T);
		ctx.fillRect(R, T, w, B - T);
		ctx.beginPath();
		ctx.roundRect(L - w, B - 4, R - L + 2 * w, w + 4, [0, 0, 12, 12]);
		ctx.fill();
		ctx.lineWidth = 6;
		ctx.strokeStyle = pal.steelDark;
		ctx.beginPath();
		ctx.ellipse(cx, T, (R - L) / 2 + w / 2, 14, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.beginPath();
		ctx.ellipse(cx, T, (R - L) / 2 + w / 2, 14, 0, 0, Math.PI);
		ctx.stroke();
		// Handles.
		ctx.strokeStyle = pal.steel;
		ctx.lineWidth = 7;
		for (const side of [-1, 1]) {
			const x = side < 0 ? L - w : R + w;
			ctx.beginPath();
			ctx.arc(
				x,
				T + 30,
				16,
				side < 0 ? Math.PI / 2 : -Math.PI / 2,
				side < 0 ? -Math.PI / 2 : Math.PI / 2,
				side < 0
			);
			ctx.stroke();
		}
		if (s)
			drawTag(ctx, pal, R + 40, this.kettleLevel(s.markL), `${s.markL.toFixed(0)} L`, {
				small: true
			});
	}

	/* Rinse water ---------------------------------------------------------- */

	private potPose() {
		const t = this.potLift;
		return {
			x: lerp(POT_REST.x, POT_POUR.x, t),
			y: lerp(POT_REST.y, POT_POUR.y, t),
			angle: t * 1.05
		};
	}

	private drawPot(ctx: CanvasRenderingContext2D, pal: Palette, f: LauterFrame) {
		const s = f.sparge!;
		const pose = this.potPose();
		const w = 128;
		const h = 104;
		const share = clamp(s.potL / Math.max(0.1, s.potCapL), 0, 1);
		if (this.potLift < 0.05) contactShadow(ctx, pal, pose.x, BENCH, w * 0.55);

		// The rinse stream, gentle, onto the grain bed. Steam off it: it is 76 °C.
		if (this.potLift > 0.8 && s.potL > 0.01) {
			// The pouring lip is the pot's top corner on the tun side, turned with the pot.
			const c = Math.cos(pose.angle);
			const sn = Math.sin(pose.angle);
			const lipX = pose.x + (w / 2) * c + h * sn;
			const lipY = pose.y + (w / 2) * sn - h * c;
			this.stream(ctx, pal, lipX, lipY, lipX + 14, this.liquidTop(f), 7, pal.water, 0);
			if (!f.calm) this.steam.draw(ctx, pal, lipX - 30, lipX + 50, this.liquidTop(f), 0.8, 160);
		}
		// Steam off the pot itself, hot or not.
		if (!f.calm && share > 0.02)
			this.steam.draw(ctx, pal, pose.x - w / 2, pose.x + w / 2, pose.y - h, 0.45, 140);

		ctx.save();
		ctx.translate(pose.x, pose.y);
		ctx.rotate(pose.angle);
		// Hot water seen over the rim.
		if (share > 0.02) {
			ctx.fillStyle = alpha(pal.water, 0.9);
			ctx.beginPath();
			ctx.ellipse(0, -h + 8 + (1 - share) * (h - 24), w / 2 - 6, 8, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = cylinder(ctx, -w / 2, w / 2, pal.steelLight, pal.steel, pal.steelDark);
		ctx.beginPath();
		ctx.roundRect(-w / 2, -h, w, h, [0, 0, 10, 10]);
		ctx.fill();
		ctx.strokeStyle = alpha(pal.shadow, 0.5);
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.ellipse(0, -h, w / 2, 9, 0, 0, Math.PI);
		ctx.stroke();
		// Side handles.
		ctx.strokeStyle = pal.steelDark;
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(-w / 2 - 14, -h + 22);
		ctx.lineTo(-w / 2, -h + 22);
		ctx.moveTo(w / 2, -h + 22);
		ctx.lineTo(w / 2 + 14, -h + 22);
		ctx.stroke();
		ctx.restore();
		glow(ctx, pose.x, pose.y - h / 2, 90, pal.lamp, 0.12);
	}

	/* Streams -------------------------------------------------------------- */

	/** What leaves the tap, into the jug or the kettle. */
	private drawRunnings(ctx: CanvasRenderingContext2D, pal: Palette, f: LauterFrame) {
		if (f.flowLps < 0.02) return;
		const landing = f.jug
			? this.jugLift < 0.1
				? BENCH - Math.max(6, (clamp(f.jug.litres / 1.2, 0, 1) * JUG.h - 2) * 0.92)
				: BENCH
			: f.sparge
				? this.kettleLevel(f.sparge.kettleL)
				: BENCH;
		const colour = f.sparge ? alpha(f.wort, 1 - f.sparge.thin * 0.55) : f.wort;
		const width = 2 + f.flowLps * 5;
		this.stream(ctx, pal, SPOUT.x, SPOUT.y, SPOUT.x + 2, landing, width, colour, f.cloud);
	}

	/**
	 * A falling stream: a slight curve, the liquid's colour, a lit edge on the
	 * lamp side and a wobble along its length. Cloudy liquid gets milky and
	 * carries flecks of husk.
	 */
	private stream(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		width: number,
		colour: string,
		cloud: number
	) {
		if (y1 <= y0) return;
		const wobble = Math.sin(this.t * 24) * 0.8;
		const path = () => {
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.2 + wobble, (y0 + y1) / 2, x1, y1);
		};
		ctx.save();
		ctx.lineCap = 'round';
		path();
		ctx.strokeStyle = colour;
		ctx.lineWidth = width;
		ctx.stroke();
		if (cloud > 0.03) {
			ctx.strokeStyle = alpha(pal.plastic, cloud * 0.6);
			ctx.stroke();
		}
		ctx.translate(-width * 0.25, 0);
		path();
		ctx.strokeStyle = alpha(pal.lamp, 0.55);
		ctx.lineWidth = Math.max(1, width * 0.22);
		ctx.stroke();
		ctx.restore();
		if (cloud > 0.05) {
			ctx.fillStyle = alpha(pal.woodDark, 0.9);
			const n = Math.round(cloud * this.flecks.length);
			for (let i = 0; i < n; i++) {
				const fl = this.flecks[i];
				const p = fract(fl.phase + this.t * fl.speed);
				const x = lerp(x0, x1, p) + (fl.x - 0.5) * width;
				ctx.fillRect(x, lerp(y0, y1, p), fl.size, fl.size * 1.5);
			}
		}
		// A little splash where it lands.
		glow(ctx, x1, y1, width * 4, pal.lamp, 0.25);
	}
}
