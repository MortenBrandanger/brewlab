/**
 * The mash tun, drawn as a thing you are standing in front of.
 *
 * A copper pot on a gas ring, drawn as a cutaway — the front of the pot taken
 * away, the way an illustrated manual shows the inside of a machine — so you
 * can see what your hands are doing to the mash: the grain going in as a raft
 * and sinking as you stir, the hot and cold pockets, and during the rest the
 * starch turning into sugar. Everything that moves is moved by a number the
 * heat balance or the mash kinetics produced:
 *
 * - the flames are as tall as the heat the pot bottom is delivering, so they
 *   lag the knob exactly as the water does;
 * - fresh grain floats as a raft and only sinks in as `unmixed` falls, which
 *   is the same quantity that makes the thermometer wander;
 * - the pockets show as warm and cool swirls while `unmixed` is high;
 * - steam thickens with the temperature and stops when the lid goes on;
 * - during the rest, each glowing mote is a share of the starch the model has
 *   converted: amber for sugar the yeast can eat, pale for sugar it cannot.
 *
 * The thermometer on the rim is the reading you act on. It swings on a spring
 * and reads the probe, not the truth, so an unstirred mash lies to you here
 * exactly as it does in a real kitchen.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	H,
	Needle,
	Steam,
	W,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	drawBurner,
	drawDial,
	drawTimer,
	fract,
	glow,
	lerp,
	type Palette,
	type PointerInput
} from './kit';
import type { TunState } from './mashHeat';

export const POT = { left: 318, right: 622, top: 176, bottom: 440, wall: 11 };
const CX = (POT.left + POT.right) / 2;
const RIM_RY = 20;
const SURFACE_EMPTY = 300;
const SURFACE_FULL = 262;
const COLS = 48;
const MAX_GRAINS = 340;
const MOTES = 130;
const BUCKET_REST = { x: 150, y: BENCH };
const DIAL = { x: 700, y: 150, r: 54 };

export type MashFrame = {
	tun: TunState;
	/** The thermometer: the probe, which lies until the mash is stirred. */
	probeC: number;
	grainTotalKg: number;
	/** The card's target, as the red pointer on the dial. */
	targetC?: number;
	pouring: boolean;
	/** Stirring with the Stir button rather than the pointer. */
	autoStir: boolean;
	/** Water going in from the kettle (hot) or the jug (cold). */
	splash?: 'hot' | 'cold';
	/** Shares of the starch, from the mash kinetics. Zero before the rest. */
	fermentable: number;
	dextrins: number;
	/** The rest's clock, when the timer is on the bench. */
	timer?: { elapsed: number; total: number };
	/** The colour the wort will be, from the recipe. */
	wort: string;
	calm: boolean;
};

type Grain = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	wet: boolean;
	soak: number;
	stubborn: number;
	depth: number;
	size: number;
	tone: number;
	turn: number;
	/** Where in the raft it drifts to: grain spreads across the surface. */
	home: number;
};

/** True when a scene point is in the pot, where a paddle can stir. */
export function inPot(x: number, y: number): boolean {
	return x > POT.left + 6 && x < POT.right - 6 && y > POT.top - 30 && y < POT.bottom;
}

/** The figure of eight a brewer's paddle makes, for the Stir button. */
function autoPaddle(t: number) {
	const w = 3.1;
	return {
		x: CX + Math.sin(t * w) * 112,
		y: 362 + Math.sin(t * w * 2) * 40,
		vx: Math.cos(t * w) * 112 * w,
		vy: Math.cos(t * w * 2) * 40 * w * 2
	};
}

export class MashScene {
	private t = 0;
	private wave = new Float32Array(COLS);
	private waveV = new Float32Array(COLS);
	private grains: Grain[] = [];
	private spin = 0;
	private tilt = 0;
	private lid = 0;
	private rand = rng(0x6d617368);
	private motes: { x: number; y: number; phase: number }[] = [];
	private steam = new Steam(16, 0x7374);
	private needle: Needle;
	/** The paddle as drawn this frame, from the pointer or the Stir button. */
	paddle = { active: false, x: CX, y: 360, vx: 0, vy: 0 };
	private splashT = 0;

	constructor(startC: number) {
		this.needle = new Needle(startC);
		for (let i = 0; i < MOTES; i++) {
			this.motes.push({ x: this.rand(), y: this.rand(), phase: this.rand() * Math.PI * 2 });
		}
	}

	/** Grain already in the tun when a screen opens is drawn where it lies, not poured again. */
	settle(f: MashFrame) {
		if (this.grains.length) return;
		this.update(0, f, {
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			down: false,
			pressed: false,
			released: false,
			present: false
		});
		const surface = this.surface(f);
		for (const g of this.grains) {
			g.wet = true;
			g.soak = 1 - f.tun.unmixed > g.stubborn * 0.92 ? 1 : 0;
			g.x = POT.left + 14 + this.rand() * (POT.right - POT.left - 28);
			g.y = lerp(
				surface + 4 + g.depth * 14,
				surface + 24 + g.depth * (POT.bottom - surface - 36),
				g.soak
			);
		}
		this.lid = f.tun.lid ? 1 : 0;
	}

	private surface(f: MashFrame): number {
		const full = clamp(f.tun.grainInKg / Math.max(0.1, f.grainTotalKg), 0, 1);
		// Extra water lifts the level a little: about 4 px a litre in this pot.
		return lerp(SURFACE_EMPTY, SURFACE_FULL, full) - (f.tun.waterL - 15) * 2.2;
	}

	private col(x: number): number {
		return clamp(Math.round(((x - POT.left) / (POT.right - POT.left)) * (COLS - 1)), 0, COLS - 1);
	}

	/** The bucket's lip when tipped over the pot. Grain leaves from here. */
	private bucketPose() {
		const t = this.tilt;
		return {
			x: lerp(BUCKET_REST.x, POT.left - 40, t),
			y: lerp(BUCKET_REST.y, POT.top - 18, t),
			angle: t * 1.2
		};
	}

	update(dt: number, f: MashFrame, input: PointerInput) {
		this.t += dt;
		this.steam.update(dt);
		const ease = f.calm ? 1 : 1 - Math.exp(-dt * 6);
		this.tilt += ((f.pouring ? 1 : 0) - this.tilt) * ease;
		this.lid += ((f.tun.lid ? 1 : 0) - this.lid) * ease;
		this.needle.update(f.probeC, dt, f.calm);
		this.splashT = f.splash ? this.splashT + dt : 0;
		const surface = this.surface(f);

		// The paddle: the pointer when it is pressed in the pot, the button otherwise.
		if (f.autoStir) {
			this.paddle = { active: true, ...autoPaddle(this.t) };
		} else if (input.down && inPot(input.x, input.y) && !f.tun.lid) {
			this.paddle = {
				active: true,
				x: clamp(input.x, POT.left + 30, POT.right - 30),
				y: clamp(input.y, surface + 30, POT.bottom - 34),
				vx: input.vx,
				vy: input.vy
			};
		} else {
			this.paddle.active = false;
		}

		// One drawn grain per share of the grist that has gone in.
		const want = Math.round(
			clamp(f.tun.grainInKg / Math.max(0.1, f.grainTotalKg), 0, 1) * MAX_GRAINS
		);
		const lip = this.bucketPose();
		while (this.grains.length < want) {
			this.grains.push({
				x: lip.x + 40 + this.rand() * 14,
				y: lip.y + 30 + this.rand() * 10,
				vx: 40 + this.rand() * 90,
				vy: -20 + this.rand() * 50,
				wet: f.calm,
				soak: 0,
				stubborn: this.rand(),
				depth: this.rand(),
				size: 3 + this.rand() * 2.4,
				tone: this.rand(),
				turn: this.rand() * Math.PI,
				home: POT.left + 16 + this.rand() * (POT.right - POT.left - 32)
			});
			const g = this.grains[this.grains.length - 1];
			if (f.calm) {
				g.x = POT.left + 14 + this.rand() * (POT.right - POT.left - 28);
				g.y = surface + 6;
			}
		}

		const p = this.paddle;
		if (p.active) {
			this.spin = clamp(this.spin + (p.vx / 420) * dt * 3, -1.6, 1.6);
			this.waveV[this.col(p.x)] += (Math.abs(p.vx) * 0.012 + p.vy * 0.02) * dt * 60;
		}
		if (f.splash && !f.calm)
			this.waveV[this.col(f.splash === 'hot' ? POT.right - 40 : POT.left + 40)] += 40 * dt * 6;
		this.spin *= Math.exp(-dt * 0.9);

		if (!f.calm) {
			for (let i = 0; i < COLS; i++) {
				const l = this.wave[Math.max(0, i - 1)];
				const r = this.wave[Math.min(COLS - 1, i + 1)];
				this.waveV[i] += (-34 * this.wave[i] + 260 * (l + r - 2 * this.wave[i])) * dt;
				this.waveV[i] *= Math.exp(-dt * 2.4);
			}
			for (let i = 0; i < COLS; i++)
				this.wave[i] = clamp(this.wave[i] + this.waveV[i] * dt, -12, 12);
			// A rolling simmer when the gas is up keeps the surface alive.
			const simmer = clamp((f.tun.tempC - 70) / 30, 0, 1) * f.tun.heat;
			if (simmer > 0) this.waveV[Math.floor(fract(this.t * 7.3) * COLS)] += simmer * 6;
		} else {
			this.wave.fill(0);
		}

		const mixed = 1 - f.tun.unmixed;
		const midY = (surface + POT.bottom) / 2;
		for (const g of this.grains) {
			if (!g.wet) {
				g.vy += 900 * dt;
				g.x += g.vx * dt;
				g.y += g.vy * dt;
				if (g.y >= surface && g.x > POT.left && g.x < POT.right) {
					g.wet = true;
					this.waveV[this.col(g.x)] += 22;
					g.vx *= 0.25;
				}
				if (g.y > BENCH) g.wet = true;
				continue;
			}
			const target = mixed > g.stubborn * 0.92 ? 1 : 0;
			if (target > g.soak) g.soak = f.calm ? 1 : Math.min(1, g.soak + dt * 1.8);
			const raftY = surface + 4 + g.depth * 14;
			const sunkY = surface + 24 + g.depth * (POT.bottom - surface - 36);
			g.y += (lerp(raftY, sunkY, g.soak) - g.y) * Math.min(1, dt * 3.2);
			g.x += g.vx * dt;
			g.vx *= Math.exp(-dt * 3);
			if (g.soak < 1) g.x += (g.home - g.x) * Math.min(1, dt * 0.9) * (1 - g.soak);
			g.x += this.spin * ((g.y - midY) / (POT.bottom - midY)) * 150 * dt;
			if (p.active) {
				const d = Math.hypot(g.x - p.x, g.y - p.y);
				if (d < 80) g.x += p.vx * 0.45 * (1 - d / 80) * dt;
			}
			g.x = clamp(g.x, POT.left + 9, POT.right - 9);
			g.turn += this.spin * dt * 2;
		}
	}

	draw(ctx: CanvasRenderingContext2D, f: MashFrame, pal: Palette) {
		const surface = this.surface(f);
		const share = clamp(f.tun.grainInKg / Math.max(0.1, f.grainTotalKg), 0, 1);
		const heat = clamp(f.tun.heat, 0, 1);

		drawBurner(ctx, pal, CX, 118, heat, this.t, f.calm);
		contactShadow(ctx, pal, CX, BENCH - 30, 170, 0.6);
		this.drawHandles(ctx, pal);
		this.drawInside(ctx, pal, f, surface, share, heat);
		this.drawWalls(ctx, pal, heat);
		if (this.paddle.active) this.drawPaddle(ctx, pal, surface);
		this.drawGrainsInAir(ctx, pal);
		if (!f.calm) {
			const steam = clamp((f.tun.tempC - 50) / 30, 0, 1) * (1 - this.lid);
			this.steam.draw(ctx, pal, POT.left, POT.right, surface - 10, steam);
		}
		this.drawLidOn(ctx, pal);
		this.drawThermometer(ctx, pal, f);
		if (f.splash) this.drawSplash(ctx, pal, f.splash, surface);
		this.drawBucket(ctx, pal, 1 - share);
		if (f.timer)
			drawTimer(ctx, pal, 840, BENCH - 52, 46, f.timer.elapsed, f.timer.total, 'minutes');
	}

	/* Pot ------------------------------------------------------------------ */

	private interiorPath(ctx: CanvasRenderingContext2D) {
		const { left: L, right: R, top: T, bottom: B } = POT;
		ctx.beginPath();
		ctx.moveTo(L, T);
		ctx.lineTo(L, B - 18);
		ctx.quadraticCurveTo(L, B, L + 18, B);
		ctx.lineTo(R - 18, B);
		ctx.quadraticCurveTo(R, B, R, B - 18);
		ctx.lineTo(R, T);
		ctx.closePath();
	}

	private drawInside(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		f: MashFrame,
		surface: number,
		share: number,
		heat: number
	) {
		const { left: L, right: R, top: T, bottom: B } = POT;
		ctx.save();
		this.interiorPath(ctx);
		ctx.clip();

		// The back wall of the pot, seen from inside: dark copper, lit at the top.
		const back = ctx.createLinearGradient(0, T, 0, B);
		back.addColorStop(0, pal.copperDark);
		back.addColorStop(1, pal.shadow);
		ctx.fillStyle = back;
		ctx.fillRect(L, T - RIM_RY, R - L, B - T + RIM_RY);
		ctx.fillStyle = cylinder(
			ctx,
			L,
			R,
			alpha(pal.copperLight, 0.18),
			alpha(pal.copper, 0),
			alpha(pal.shadow, 0.5)
		);
		ctx.fillRect(L, T, R - L, B - T);

		// The liquid body.
		const top = (i: number) => surface + this.wave[i];
		const body = () => {
			ctx.beginPath();
			ctx.moveTo(L, B);
			for (let i = 0; i < COLS; i++) ctx.lineTo(L + (i / (COLS - 1)) * (R - L), top(i));
			ctx.lineTo(R, B);
			ctx.closePath();
		};
		body();
		const water = ctx.createLinearGradient(0, surface, 0, B);
		water.addColorStop(0, pal.water);
		water.addColorStop(1, alpha(pal.water, 0.65));
		ctx.fillStyle = water;
		ctx.fill();
		// The grain stains the water to wort, clouded until it is stirred.
		const stained = share * (1 - 0.45 * f.tun.unmixed);
		if (stained > 0) {
			ctx.globalAlpha = stained * 0.92;
			const wort = ctx.createLinearGradient(0, surface, 0, B);
			wort.addColorStop(0, f.wort);
			wort.addColorStop(1, alpha(pal.shadow, 0.9));
			ctx.fillStyle = wort;
			body();
			ctx.fill();
			ctx.globalAlpha = 1;
		}

		// Hot and cold pockets: warm and cool swirls while the mash is unmixed.
		if (f.tun.unmixed > 0.05 && share > 0) {
			for (let i = 0; i < 6; i++) {
				const x = L + 40 + ((i * 97 + this.spin * 30) % (R - L - 80));
				const y = surface + 50 + ((i * 53) % Math.max(10, B - surface - 90));
				const warm = i % 2 === 0;
				glow(ctx, x, y, 60, warm ? pal.copper : pal.water, f.tun.unmixed * 0.7);
			}
		}

		// Bubbles off the hot bottom while the flame is on.
		if (!f.calm && heat > 0.03) {
			ctx.fillStyle = alpha(pal.fg, 0.5);
			for (let i = 0; i < 22; i++) {
				const p = fract(this.t * (0.25 + 0.6 * heat) + i * 0.317);
				ctx.globalAlpha = heat * 0.55 * (1 - p);
				ctx.beginPath();
				ctx.arc(
					L + 18 + ((i * 53) % (R - L - 36)) + Math.sin(p * 9 + i) * 3,
					B - 8 - p * (B - surface - 14),
					1.4 + (i % 3) * 0.8,
					0,
					Math.PI * 2
				);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		this.drawGrainsWet(ctx, pal);
		this.drawMotes(ctx, f, pal, surface);

		// The surface, seen a little from above: a lit band where the lamp catches it.
		ctx.beginPath();
		for (let i = 0; i < COLS; i++) {
			const x = L + (i / (COLS - 1)) * (R - L);
			if (i === 0) ctx.moveTo(x, top(i));
			else ctx.lineTo(x, top(i));
		}
		ctx.strokeStyle = alpha(pal.lamp, 0.45);
		ctx.lineWidth = 2.5;
		ctx.stroke();
		ctx.restore();

		// Heat glow at the pot bottom, from the flame under it.
		if (heat > 0.02) glow(ctx, CX, B, 190, pal.copper, heat * 0.55);
	}

	private drawWalls(ctx: CanvasRenderingContext2D, pal: Palette, heat: number) {
		const { left: L, right: R, top: T, bottom: B, wall: w } = POT;
		// The cut faces of the copper, the brightest thing on the pot.
		const outline = () => {
			ctx.beginPath();
			ctx.moveTo(L - w, T);
			ctx.lineTo(L - w, B - 18);
			ctx.quadraticCurveTo(L - w, B + w, L + 18, B + w);
			ctx.lineTo(R - 18, B + w);
			ctx.quadraticCurveTo(R + w, B + w, R + w, B - 18);
			ctx.lineTo(R + w, T);
			ctx.lineTo(R, T);
			ctx.lineTo(R, B - 18);
			ctx.quadraticCurveTo(R, B, R - 18, B);
			ctx.lineTo(L + 18, B);
			ctx.quadraticCurveTo(L, B, L, B - 18);
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
		if (heat > 0.02) {
			ctx.save();
			outline();
			ctx.clip();
			const hot = ctx.createLinearGradient(0, B - 30, 0, B + w);
			hot.addColorStop(0, alpha(pal.amber, 0));
			hot.addColorStop(1, alpha(pal.amber, heat * 0.8));
			ctx.fillStyle = hot;
			ctx.fillRect(L - w, B - 30, R - L + 2 * w, 30 + w);
			ctx.restore();
		}
		ctx.strokeStyle = alpha(pal.shadow, 0.7);
		ctx.lineWidth = 1.5;
		outline();
		ctx.stroke();

		// Rim: the back of the opening, then the front, so the pot has a mouth.
		ctx.lineWidth = 7;
		ctx.strokeStyle = pal.copperDark;
		ctx.beginPath();
		ctx.ellipse(CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = pal.copperLight;
		ctx.beginPath();
		ctx.ellipse(CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, 0, Math.PI);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.5);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(CX, T, (R - L) / 2 + w / 2, RIM_RY, 0, Math.PI * 0.62, Math.PI * 0.82);
		ctx.stroke();
	}

	private drawHandles(ctx: CanvasRenderingContext2D, pal: Palette) {
		for (const side of [-1, 1]) {
			const x = side < 0 ? POT.left - POT.wall : POT.right + POT.wall;
			ctx.strokeStyle = pal.copperDark;
			ctx.lineWidth = 12;
			ctx.beginPath();
			ctx.arc(
				x,
				POT.top + 62,
				24,
				side < 0 ? Math.PI / 2 : -Math.PI / 2,
				side < 0 ? -Math.PI / 2 : Math.PI / 2
			);
			ctx.stroke();
			ctx.strokeStyle = pal.copperLight;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(
				x,
				POT.top + 62,
				24,
				side < 0 ? Math.PI * 0.9 : -Math.PI * 0.4,
				side < 0 ? Math.PI * 1.35 : Math.PI * 0.05
			);
			ctx.stroke();
		}
	}

	/* Contents ------------------------------------------------------------- */

	private drawGrain(ctx: CanvasRenderingContext2D, pal: Palette, g: Grain, a: number) {
		ctx.globalAlpha = a;
		ctx.fillStyle = g.tone > 0.5 ? pal.amber : pal.woodLight;
		ctx.beginPath();
		ctx.ellipse(g.x, g.y, g.size, g.size * 0.52, g.turn, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = alpha(pal.fg, 0.55);
		ctx.beginPath();
		ctx.ellipse(
			g.x - g.size * 0.25,
			g.y - g.size * 0.15,
			g.size * 0.35,
			g.size * 0.16,
			g.turn,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	private drawGrainsWet(ctx: CanvasRenderingContext2D, pal: Palette) {
		for (const g of this.grains) if (g.wet) this.drawGrain(ctx, pal, g, 0.5 + 0.45 * (1 - g.soak));
		ctx.globalAlpha = 1;
	}

	private drawGrainsInAir(ctx: CanvasRenderingContext2D, pal: Palette) {
		for (const g of this.grains) if (!g.wet) this.drawGrain(ctx, pal, g, 1);
		ctx.globalAlpha = 1;
	}

	private drawMotes(ctx: CanvasRenderingContext2D, f: MashFrame, pal: Palette, surface: number) {
		const eaten = Math.round(f.fermentable * MOTES);
		const left = Math.round(f.dextrins * MOTES);
		if (eaten + left === 0) return;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < Math.min(MOTES, eaten + left); i++) {
			const m = this.motes[i];
			const sweet = i < eaten;
			const drift = f.calm ? 0 : 1;
			const x =
				POT.left +
				16 +
				m.x * (POT.right - POT.left - 32) +
				Math.sin(this.t * 0.7 + m.phase) * 9 * drift;
			const y =
				surface +
				22 +
				m.y * (POT.bottom - surface - 36) +
				Math.cos(this.t * 0.5 + m.phase * 1.3) * 7 * drift;
			const r = sweet ? 2.6 : 2.1;
			const c = sweet ? pal.amber : pal.fg;
			const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
			g.addColorStop(0, alpha(c, 0.85));
			g.addColorStop(0.3, alpha(c, 0.3));
			g.addColorStop(1, alpha(c, 0));
			ctx.fillStyle = g;
			ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
		}
		ctx.restore();
	}

	/* Tools ---------------------------------------------------------------- */

	private drawPaddle(ctx: CanvasRenderingContext2D, pal: Palette, surface: number) {
		const p = this.paddle;
		const lean = clamp(p.vx / 900, -0.35, 0.35);
		const topX = p.x - lean * 260 + 40;
		const topY = 40;
		// Handle, in front of the rim.
		ctx.strokeStyle = pal.woodDark;
		ctx.lineWidth = 14;
		ctx.beginPath();
		ctx.moveTo(topX, topY);
		ctx.lineTo(p.x, p.y - 34);
		ctx.stroke();
		ctx.strokeStyle = pal.woodLight;
		ctx.lineWidth = 8;
		ctx.stroke();
		// The blade, under the surface: drawn dimmer, through the wort.
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(Math.atan2(p.x - topX, topY - p.y) + Math.PI);
		const blade = ctx.createLinearGradient(-20, 0, 20, 0);
		blade.addColorStop(0, pal.woodDark);
		blade.addColorStop(0.4, pal.woodLight);
		blade.addColorStop(1, pal.wood);
		ctx.fillStyle = blade;
		ctx.globalAlpha = p.y > surface ? 0.8 : 1;
		ctx.beginPath();
		ctx.roundRect(-20, -34, 40, 64, 12);
		ctx.fill();
		ctx.restore();
	}

	private drawThermometer(ctx: CanvasRenderingContext2D, pal: Palette, f: MashFrame) {
		// The stem dips into the mash past the rim; the dial stands above it.
		ctx.strokeStyle = pal.steel;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(DIAL.x - 16, DIAL.y + DIAL.r - 6);
		ctx.lineTo(POT.right - 46, 380);
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		// The clip over the rim.
		ctx.fillStyle = pal.steelDark;
		ctx.beginPath();
		ctx.roundRect(POT.right - 14, POT.top - 14, 30, 22, 4);
		ctx.fill();
		const min = f.tun.grainInKg > 0 ? 40 : 0;
		drawDial(ctx, pal, DIAL.x, DIAL.y, DIAL.r, this.needle.value, {
			min,
			max: 100,
			target: f.targetC,
			label: '°C'
		});
	}

	private drawSplash(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		kind: 'hot' | 'cold',
		surface: number
	) {
		const x = kind === 'hot' ? POT.right - 40 : POT.left + 40;
		const spoutY = POT.top - 70;
		// The kettle or jug, held over the pot.
		ctx.save();
		ctx.translate(x + (kind === 'hot' ? 40 : -40), spoutY - 20);
		ctx.rotate(kind === 'hot' ? -0.6 : 0.6);
		ctx.fillStyle = cylinder(
			ctx,
			-34,
			34,
			kind === 'hot' ? pal.steelLight : alpha(pal.water, 0.6),
			kind === 'hot' ? pal.steel : alpha(pal.water, 0.4),
			kind === 'hot' ? pal.steelDark : alpha(pal.water, 0.3)
		);
		ctx.beginPath();
		ctx.roundRect(-34, -40, 68, 80, 14);
		ctx.fill();
		ctx.restore();
		const stream = ctx.createLinearGradient(0, spoutY, 0, surface);
		stream.addColorStop(0, alpha(pal.water, 0.9));
		stream.addColorStop(1, alpha(pal.water, 0.5));
		ctx.strokeStyle = stream;
		ctx.lineWidth = 5 + Math.sin(this.splashT * 30) * 1;
		ctx.beginPath();
		ctx.moveTo(x, spoutY);
		ctx.quadraticCurveTo(x + (kind === 'hot' ? -8 : 8), (spoutY + surface) / 2, x, surface);
		ctx.stroke();
		if (kind === 'hot') this.steam.draw(ctx, pal, x - 20, x + 20, spoutY, 0.8, 90);
	}

	private drawLidOn(ctx: CanvasRenderingContext2D, pal: Palette) {
		if (this.lid < 0.02) return;
		ctx.save();
		ctx.globalAlpha = this.lid;
		ctx.translate(CX, lerp(POT.top - 80, POT.top - 4, this.lid));
		ctx.scale(1, 0.32);
		this.lidShape(ctx, pal, (POT.right - POT.left) / 2 + POT.wall + 8);
		ctx.restore();
	}

	/** A domed copper lid with a knob, as a disc seen face on. */
	private lidShape(ctx: CanvasRenderingContext2D, pal: Palette, r: number) {
		const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
		g.addColorStop(0, pal.copperLight);
		g.addColorStop(0.7, pal.copper);
		g.addColorStop(1, pal.copperDark);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = alpha(pal.shadow, 0.6);
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = pal.woodDark;
		ctx.beginPath();
		ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawBucket(ctx: CanvasRenderingContext2D, pal: Palette, remaining: number) {
		const pose = this.bucketPose();
		const w = 118;
		const h = 112;
		if (this.tilt < 0.02) contactShadow(ctx, pal, pose.x, BENCH, w * 0.55);
		ctx.save();
		// Pivot at the base when resting, at the lip when tipped.
		ctx.translate(pose.x, pose.y);
		ctx.rotate(pose.angle);
		ctx.translate(0, -(1 - this.tilt) * h);
		const shape = () => {
			ctx.beginPath();
			ctx.moveTo(-w / 2, 0);
			ctx.lineTo(w / 2, 0);
			ctx.lineTo(w / 2 - 10, h);
			ctx.lineTo(-w / 2 + 10, h);
			ctx.closePath();
		};
		shape();
		ctx.fillStyle = cylinder(ctx, -w / 2, w / 2, pal.fg, pal.plastic, pal.muted);
		ctx.fill();
		// What is left in it, seen over the rim.
		if (remaining > 0.01) {
			ctx.fillStyle = pal.woodLight;
			ctx.beginPath();
			ctx.ellipse(0, 6 + (1 - remaining) * (h - 20), w / 2 - 6, 9, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = alpha(pal.amber, 0.7);
			for (let i = 0; i < 14; i++) {
				ctx.beginPath();
				ctx.ellipse(
					-w / 2 + 14 + ((i * 37) % (w - 28)),
					4 + (1 - remaining) * (h - 20) + ((i * 7) % 6),
					3,
					1.6,
					i,
					0,
					Math.PI * 2
				);
				ctx.fill();
			}
		}
		ctx.strokeStyle = alpha(pal.shadow, 0.5);
		ctx.lineWidth = 2;
		shape();
		ctx.stroke();
		// Rim and handle.
		ctx.fillStyle = pal.fg;
		ctx.fillRect(-w / 2 - 3, -3, w + 6, 7);
		ctx.strokeStyle = pal.steelDark;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(0, 4, w / 2 - 4, Math.PI, 0);
		ctx.stroke();
		ctx.restore();
	}
}

export { H as SCENE_H, W as SCENE_W, approach };
