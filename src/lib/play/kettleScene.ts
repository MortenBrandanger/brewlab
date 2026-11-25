/**
 * The boil kettle, drawn as a thing you are standing in front of.
 *
 * A brushed-steel kettle on the same gas ring as the mash, drawn as the same
 * kind of cutaway so you can see into the wort. Everything that moves is
 * moved by a number from `kettleHeat.ts`:
 *
 * - the flames are as tall as the heat the kettle bottom is delivering;
 * - the surface churns with the boil's vigour, and only rolls once the boil
 *   is a rolling one — a simmer barely moves;
 * - the hot-break foam is as tall as the model's `foam`, and past the rim it
 *   runs down the outside and hisses on the burner, which is what a boil-over
 *   looks like from the stove;
 * - the level falls as steam takes the water off;
 * - each hop packet on the bench is one addition from the card. Tipped in,
 *   its pellets fly into the kettle and break up into green flecks that the
 *   boil carries round, and the empty bag stays on the bench.
 *
 * After the flame goes out the same scene stands still and steams: the
 * whirlpool hops go in, and stirring sets the wort spinning into a cone.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	Needle,
	Steam,
	alpha,
	clamp,
	contactShadow,
	drawBurner,
	drawDial,
	drawTag,
	drawTimer,
	fract,
	glow,
	lerp,
	type Palette
} from './kit';
import { vigour, type KettleState } from './kettleHeat';

export const KETTLE = { left: 330, right: 610, top: 140, bottom: 426, wall: 9 };
const CX = (KETTLE.left + KETTLE.right) / 2;
const RIM_RY = 18;
/** Pixels of height per litre in this kettle. */
const PX_PER_L = 7.6;
const COLS = 48;
const DIAL = { x: 676, y: 118, r: 46 };
const PACKET = { w: 54, h: 74 };

export type Packet = {
	id: string;
	/** The hop's name, on the bag. */
	name: string;
	grams: number;
	/** The card's timing, on the tag in front of it: "60 min", "steep 20 min". */
	caption: string;
	dropped: boolean;
	/** True when the clock says this one is due now. */
	due: boolean;
};

export type KettleFrame = {
	k: KettleState;
	/** The thermometer reading, which lags on its spring. */
	probeC: number;
	/** The colour of the wort, from the recipe. */
	wort: string;
	mode: 'boil' | 'stand';
	packets: Packet[];
	timer: { elapsed: number; total: number; caption: string };
	/** A whirlpool going, after flame-out. */
	stirring: boolean;
	/** Index of the packet under the pointer, or -1. */
	hover: number;
	calm: boolean;
};

type Fleck = { x: number; y: number; phase: number; size: number; dark: boolean };
type Flying = { x: number; y: number; vx: number; vy: number; life: number };
type Drop = { x: number; y: number; vy: number; side: number };

/** Where packet `i` of `n` stands on the bench. Left of the kettle first, then right. */
export function packetSlot(i: number, n: number): { x: number; y: number } {
	const left = [80, 160, 245];
	const right = [690, 762];
	const slots = n <= 5 ? [...left, ...right] : [60, 120, 180, 245, 680, 735, 790];
	const x =
		slots[Math.min(i, slots.length - 1)] + (i >= slots.length ? (i - slots.length + 1) * 12 : 0);
	return { x, y: BENCH };
}

export class KettleScene {
	private t = 0;
	private wave = new Float32Array(COLS);
	private waveV = new Float32Array(COLS);
	private rand = rng(0x6b657474);
	private steam = new Steam(18, 0x626f696c);
	private needle: Needle;
	private flecks: Fleck[] = [];
	private flying: Flying[] = [];
	private drips: Drop[] = [];
	private spin = 0;
	/** Seconds since the foam last went over the rim, for the run-down streaks. */
	private overT = 0;
	/** How much has ever run down the outside: the stain stays. */
	private stain = 0;

	constructor(startC: number) {
		this.needle = new Needle(startC);
	}

	/** Hops already in when a screen opens, drawn as flecks rather than poured again. */
	settle(grams: number) {
		this.addFlecks(grams, true);
	}

	private surface(f: KettleFrame): number {
		return KETTLE.bottom - f.k.wortL * PX_PER_L;
	}

	private col(x: number): number {
		return clamp(
			Math.round(((x - KETTLE.left) / (KETTLE.right - KETTLE.left)) * (COLS - 1)),
			0,
			COLS - 1
		);
	}

	private addFlecks(grams: number, settled: boolean) {
		const n = Math.min(60, Math.round(grams * 1.2));
		for (let i = 0; i < n; i++) {
			this.flecks.push({
				x: this.rand(),
				y: settled ? this.rand() : 0,
				phase: this.rand() * Math.PI * 2,
				size: 1.4 + this.rand() * 1.8,
				dark: this.rand() > 0.6
			});
		}
	}

	/** The packet under a scene point, or -1. */
	packetAt(x: number, y: number, f: KettleFrame): number {
		for (let i = 0; i < f.packets.length; i++) {
			if (f.packets[i].dropped) continue;
			const s = packetSlot(i, f.packets.length);
			if (Math.abs(x - s.x) < PACKET.w / 2 + 6 && y > s.y - PACKET.h - 12 && y < s.y + 34) return i;
		}
		return -1;
	}

	/** Tip packet `i` in: its pellets arc into the kettle. */
	drop(i: number, f: KettleFrame) {
		const s = packetSlot(i, f.packets.length);
		const surface = this.surface(f);
		const grams = f.packets[i].grams;
		if (f.calm) {
			this.addFlecks(grams, true);
			return;
		}
		const target = lerp(KETTLE.left + 50, KETTLE.right - 50, 0.5 + (s.x < CX ? -0.15 : 0.15));
		for (let n = 0; n < Math.min(40, grams); n++) {
			const time = 0.55 + this.rand() * 0.15;
			const sx = s.x + (this.rand() - 0.5) * 16;
			const sy = s.y - PACKET.h - 6;
			const tx = target + (this.rand() - 0.5) * 80;
			this.flying.push({
				x: sx,
				y: sy,
				vx: (tx - sx) / time,
				vy: (surface - sy) / time - 0.5 * 900 * time,
				life: time
			});
		}
		this.addFlecks(grams, false);
	}

	update(dt: number, f: KettleFrame) {
		this.t += dt;
		this.steam.update(dt);
		this.needle.update(f.probeC, dt, f.calm);
		const v = vigour(f.k);

		// The surface: springs, kicked by the boil and by anything landing in it.
		if (!f.calm) {
			for (let i = 0; i < COLS; i++) {
				const l = this.wave[Math.max(0, i - 1)];
				const r = this.wave[Math.min(COLS - 1, i + 1)];
				this.waveV[i] += (-34 * this.wave[i] + 260 * (l + r - 2 * this.wave[i])) * dt;
				this.waveV[i] *= Math.exp(-dt * 2.2);
			}
			// A rolling boil heaves up in the middle, where the flame is.
			const kicks = Math.round(v * 6) + (f.k.tempC > 96 ? 1 : 0);
			for (let n = 0; n < kicks; n++) {
				const c = Math.floor(COLS * (0.2 + 0.6 * fract(this.t * 7.13 + n * 0.37)));
				this.waveV[c] += (4 + v * 18) * (0.5 + fract(this.t * 3.7 + n));
			}
			for (let i = 0; i < COLS; i++)
				this.wave[i] = clamp(this.wave[i] + this.waveV[i] * dt, -10, 10);
		} else {
			this.wave.fill(0);
		}

		// Pellets in flight.
		for (const p of this.flying) {
			p.vy += 900 * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			if (p.life <= 0) this.waveV[this.col(p.x)] += 10;
		}
		this.flying = this.flying.filter((p) => p.life > 0);

		// Flecks sink into the wort, then ride the boil's roll or the whirlpool's spin.
		this.spin = f.stirring ? Math.min(1, this.spin + dt * 0.8) : this.spin * Math.exp(-dt * 0.25);
		for (const k of this.flecks) {
			if (k.y < 1) k.y = f.calm ? 1 : Math.min(1, k.y + dt * 0.7);
			const roll = v * 0.12 + (f.k.tempC > 96 ? 0.02 : 0);
			k.phase += dt * (roll * 6 + this.spin * 2.6);
		}

		// The boil-over: wort runs down the outside and spits on the burner.
		if (f.k.foam > 1) {
			this.overT = 0;
			this.stain = Math.min(1, this.stain + dt * 0.4);
			if (!f.calm && fract(this.t * 9) < dt * 9) {
				const side = this.rand() > 0.5 ? 1 : -1;
				this.drips.push({
					x: side > 0 ? KETTLE.right + KETTLE.wall + 2 : KETTLE.left - KETTLE.wall - 2,
					y: KETTLE.top + 4,
					vy: 30,
					side
				});
			}
		} else {
			this.overT += dt;
		}
		for (const d of this.drips) {
			d.vy += 500 * dt;
			d.y += d.vy * dt;
		}
		this.drips = this.drips.filter((d) => d.y < BENCH - 30);
	}

	draw(ctx: CanvasRenderingContext2D, f: KettleFrame, pal: Palette) {
		const surface = this.surface(f);
		const heat = clamp(f.k.heat, 0, 1);

		drawBurner(ctx, pal, CX, 118, heat, this.t, f.calm);
		// Spat wort hissing on the burner.
		if (this.overT < 1.2 && heat > 0.05)
			glow(ctx, CX, BENCH - 36, 120, pal.amber, (1.2 - this.overT) * 0.6);
		contactShadow(ctx, pal, CX, BENCH - 30, 160, 0.6);
		this.drawHandles(ctx, pal);
		this.drawInside(ctx, pal, f, surface, heat);
		this.drawWalls(ctx, pal, heat);
		this.drawRunDown(ctx, pal, f);
		this.drawFoamOver(ctx, pal, f);
		this.drawFlying(ctx, pal);
		if (!f.calm) {
			// Off the boil it still steams hard; at a rolling boil it pours off.
			const hot = clamp((f.k.tempC - 60) / 35, 0, 1);
			const steam = hot * (f.mode === 'stand' ? 2.2 : 0.9 + 1.6 * vigour(f.k));
			this.steam.draw(
				ctx,
				pal,
				KETTLE.left,
				KETTLE.right,
				Math.min(surface, KETTLE.top + 10) - 6,
				steam,
				260
			);
		}
		this.drawThermometer(ctx, pal);
		for (let i = 0; i < f.packets.length; i++) this.drawPacket(ctx, pal, f, i);
		drawTimer(ctx, pal, 856, BENCH - 52, 46, f.timer.elapsed, f.timer.total, f.timer.caption);
	}

	/* Kettle --------------------------------------------------------------- */

	private interiorPath(ctx: CanvasRenderingContext2D) {
		const { left: L, right: R, top: T, bottom: B } = KETTLE;
		ctx.beginPath();
		ctx.moveTo(L, T);
		ctx.lineTo(L, B - 14);
		ctx.quadraticCurveTo(L, B, L + 14, B);
		ctx.lineTo(R - 14, B);
		ctx.quadraticCurveTo(R, B, R, B - 14);
		ctx.lineTo(R, T);
		ctx.closePath();
	}

	private drawInside(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		f: KettleFrame,
		surface: number,
		heat: number
	) {
		const { left: L, right: R, top: T, bottom: B } = KETTLE;
		const v = vigour(f.k);
		ctx.save();
		this.interiorPath(ctx);
		ctx.clip();

		// Back wall: dark brushed steel, lit at the top.
		const back = ctx.createLinearGradient(0, T, 0, B);
		back.addColorStop(0, pal.steelDark);
		back.addColorStop(1, pal.shadow);
		ctx.fillStyle = back;
		ctx.fillRect(L, T - RIM_RY, R - L, B - T + RIM_RY);
		// Brushing: faint vertical streaks.
		ctx.strokeStyle = alpha(pal.steelLight, 0.05);
		ctx.lineWidth = 1;
		for (let x = L + 4; x < R; x += 7) {
			ctx.beginPath();
			ctx.moveTo(x, T);
			ctx.lineTo(x + 2, B);
			ctx.stroke();
		}

		// The whirlpool pulls the middle of the surface down into a cone.
		const cone = this.spin * 26;
		const top = (i: number) => {
			const u = i / (COLS - 1);
			return surface + this.wave[i] + cone * Math.exp(-((u - 0.5) ** 2) / 0.02);
		};
		const body = () => {
			ctx.beginPath();
			ctx.moveTo(L, B);
			for (let i = 0; i < COLS; i++) ctx.lineTo(L + (i / (COLS - 1)) * (R - L), top(i));
			ctx.lineTo(R, B);
			ctx.closePath();
		};
		body();
		const wort = ctx.createLinearGradient(0, surface, 0, B);
		wort.addColorStop(0, f.wort);
		wort.addColorStop(1, alpha(pal.shadow, 0.92));
		ctx.fillStyle = wort;
		ctx.fill();
		// Lamp light through the top of the wort.
		ctx.save();
		body();
		ctx.clip();
		ctx.globalCompositeOperation = 'lighter';
		const lit = ctx.createLinearGradient(0, surface, 0, surface + 70);
		lit.addColorStop(0, alpha(pal.lamp, 0.18));
		lit.addColorStop(1, alpha(pal.lamp, 0));
		ctx.fillStyle = lit;
		ctx.fillRect(L, surface - 12, R - L, 90);
		ctx.restore();

		// Hop flecks, carried round the roll of the boil.
		for (const k of this.flecks) {
			const u = k.x;
			const depth = k.y;
			const x = L + 18 + fract(u + Math.sin(k.phase) * 0.18) * (R - L - 36);
			const yMid = lerp(surface + 14, B - 16, 0.25 + 0.6 * fract(u * 3.7));
			const y = lerp(surface + 4, yMid + Math.cos(k.phase) * 40, depth);
			ctx.fillStyle = k.dark ? pal.hopDim : pal.hop;
			ctx.globalAlpha = 0.85;
			ctx.beginPath();
			ctx.ellipse(x, clamp(y, surface + 3, B - 6), k.size * 1.3, k.size, k.phase, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// Bubbles: a few off the hot bottom while heating, a column of them at a rolling boil.
		if (!f.calm && heat > 0.03) {
			const n = 14 + Math.round(v * 40);
			for (let i = 0; i < n; i++) {
				const speed = 0.3 + 0.8 * heat + v * 0.9;
				const p = fract(this.t * speed + i * 0.317);
				const spread = v > 0 ? 0.6 : 1;
				const x =
					CX + (fract(i * 0.6180339) - 0.5) * (R - L - 40) * spread + Math.sin(p * 9 + i) * 4;
				const y = B - 8 - p * (B - surface - 10);
				const r = (1.3 + (i % 3) * 0.9) * (1 + v * p);
				ctx.strokeStyle = alpha(pal.fg, 0.5 * heat * (1 - p * 0.5));
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// The surface: a lit line, broken by bursting bubbles in a rolling boil.
		ctx.beginPath();
		for (let i = 0; i < COLS; i++) {
			const x = L + (i / (COLS - 1)) * (R - L);
			if (i === 0) ctx.moveTo(x, top(i));
			else ctx.lineTo(x, top(i));
		}
		ctx.strokeStyle = alpha(pal.lamp, 0.5);
		ctx.lineWidth = 2.5;
		ctx.stroke();
		if (!f.calm && v > 0) {
			for (let i = 0; i < 10; i++) {
				const p = fract(this.t * (1.5 + v * 2) + i * 0.37);
				const c = Math.floor(
					COLS *
						(0.15 + 0.7 * fract(i * 0.618 + Math.floor(this.t * (1.5 + v * 2) + i * 0.37) * 0.31))
				);
				const x = L + (c / (COLS - 1)) * (R - L);
				ctx.strokeStyle = alpha(pal.fg, (1 - p) * 0.6 * v);
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.ellipse(x, top(c) - 2, 3 + p * 10 * v, 1 + p * 3, 0, Math.PI, Math.PI * 2);
				ctx.stroke();
			}
		}

		this.drawFoam(ctx, pal, f, top);
		ctx.restore();

		// Heat glow at the kettle bottom.
		if (heat > 0.02) glow(ctx, CX, B, 180, pal.copper, heat * 0.5);
	}

	/** The hot break: a creamy foam that climbs towards the rim with the flame. */
	private drawFoam(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		f: KettleFrame,
		top: (i: number) => number
	) {
		const foam = clamp(f.k.foam, 0, 1.1);
		if (foam < 0.03) return;
		const { left: L, right: R, top: T } = KETTLE;
		const surface = this.surface(f);
		const height = foam * (surface - T + 6);
		const crest = (i: number) => {
			const u = i / (COLS - 1);
			const lump = Math.sin(u * 23 + this.t * 2.1) * 3 + Math.sin(u * 41 - this.t * 1.3) * 2;
			return top(i) - height + lump * Math.min(1, foam * 2);
		};
		ctx.beginPath();
		for (let i = 0; i < COLS; i++) {
			const x = L + (i / (COLS - 1)) * (R - L);
			if (i === 0) ctx.moveTo(x, crest(i));
			else ctx.lineTo(x, crest(i));
		}
		for (let i = COLS - 1; i >= 0; i--) ctx.lineTo(L + (i / (COLS - 1)) * (R - L), top(i) + 4);
		ctx.closePath();
		const g = ctx.createLinearGradient(0, surface - height, 0, surface);
		g.addColorStop(0, pal.plastic);
		g.addColorStop(1, alpha(pal.woodLight, 0.9));
		ctx.fillStyle = g;
		ctx.fill();
		// Soft highlights: the tops of the biggest bubbles in the foam.
		for (let i = 0; i < 26; i++) {
			const u = fract(i * 0.6180339);
			const c = Math.floor(u * (COLS - 1));
			const x = L + u * (R - L);
			const y = lerp(crest(c) + 6, top(c) - 4, fract(i * 0.37));
			const r = 2.5 + (i % 4) * 1.6;
			ctx.fillStyle = alpha(pal.fg, 0.55);
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = alpha(pal.shadow, 0.12);
			ctx.beginPath();
			ctx.arc(x + r * 0.4, y + r * 0.5, r * 0.8, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/** Past the rim: the foam crowns the mouth and drapes over both sides. */
	private drawFoamOver(ctx: CanvasRenderingContext2D, pal: Palette, f: KettleFrame) {
		const over = clamp((f.k.foam - 0.97) / 0.3, 0, 1);
		if (over <= 0) return;
		const { left: L, right: R, top: T, wall: w } = KETTLE;
		const rise = 6 + over * 22;
		const blob = (x: number, y: number, r: number) => {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		};
		ctx.fillStyle = pal.plastic;
		// The crown across the mouth.
		for (let i = 0; i < 22; i++) {
			const u = i / 21;
			const wob = Math.sin(u * 17 + this.t * 3) * 3;
			blob(
				lerp(L - w, R + w, u),
				T - rise * Math.sin(Math.PI * (0.15 + 0.7 * u)) + wob,
				9 + (i % 3) * 3
			);
		}
		// Drapes down the outside of each wall.
		for (const side of [-1, 1]) {
			const x = side < 0 ? L - w - 3 : R + w + 3;
			for (let j = 0; j < 5; j++) {
				const len = over * (14 + j * 9) * (0.6 + 0.4 * Math.sin(j * 2.3 + side));
				blob(x + side * (j % 2) * 3, T + len, 6 - j * 0.6);
			}
		}
		// Highlights on the crown.
		ctx.fillStyle = alpha(pal.fg, 0.6);
		for (let i = 0; i < 12; i++) {
			const u = fract(i * 0.6180339);
			blob(lerp(L, R, u), T - rise * Math.sin(Math.PI * (0.15 + 0.7 * u)) - 4, 2.5 + (i % 3));
		}
	}

	private wallsPath(ctx: CanvasRenderingContext2D) {
		const { left: L, right: R, top: T, bottom: B, wall: w } = KETTLE;
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
	}

	private drawWalls(ctx: CanvasRenderingContext2D, pal: Palette, heat: number) {
		const { left: L, right: R, top: T, bottom: B, wall: w } = KETTLE;
		this.wallsPath(ctx);
		const metal = ctx.createLinearGradient(0, T, 0, B + w);
		metal.addColorStop(0, pal.steelLight);
		metal.addColorStop(0.55, pal.steel);
		metal.addColorStop(1, pal.steelDark);
		ctx.fillStyle = metal;
		ctx.fill();
		if (heat > 0.02) {
			ctx.save();
			this.wallsPath(ctx);
			ctx.clip();
			const hot = ctx.createLinearGradient(0, B - 24, 0, B + w);
			hot.addColorStop(0, alpha(pal.flame, 0));
			hot.addColorStop(1, alpha(pal.flame, heat * 0.5));
			ctx.fillStyle = hot;
			ctx.fillRect(L - w, B - 24, R - L + 2 * w, 24 + w);
			ctx.restore();
		}
		ctx.strokeStyle = alpha(pal.shadow, 0.7);
		ctx.lineWidth = 1.5;
		this.wallsPath(ctx);
		ctx.stroke();

		// A ball valve near the bottom, for the run to the fermenter later.
		ctx.fillStyle = pal.steel;
		ctx.beginPath();
		ctx.roundRect(R + w, B - 46, 26, 16, 4);
		ctx.fill();
		ctx.fillStyle = pal.danger;
		ctx.beginPath();
		ctx.roundRect(R + w + 8, B - 62, 34, 8, 3);
		ctx.fill();

		// Rim: the back of the mouth darker, the front catching the lamp.
		const rx = (R - L) / 2 + w / 2;
		ctx.lineWidth = 6;
		ctx.strokeStyle = pal.steelDark;
		ctx.beginPath();
		ctx.ellipse(CX, T, rx, RIM_RY, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.beginPath();
		ctx.ellipse(CX, T, rx, RIM_RY, 0, 0, Math.PI);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.7);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(CX, T, rx, RIM_RY, 0, Math.PI * 0.6, Math.PI * 0.85);
		ctx.stroke();
	}

	private drawHandles(ctx: CanvasRenderingContext2D, pal: Palette) {
		for (const side of [-1, 1]) {
			const x = side < 0 ? KETTLE.left - KETTLE.wall : KETTLE.right + KETTLE.wall;
			ctx.strokeStyle = pal.steelDark;
			ctx.lineWidth = 10;
			ctx.beginPath();
			ctx.moveTo(x, KETTLE.top + 34);
			ctx.lineTo(x + side * 26, KETTLE.top + 40);
			ctx.lineTo(x + side * 26, KETTLE.top + 70);
			ctx.lineTo(x, KETTLE.top + 76);
			ctx.stroke();
			ctx.strokeStyle = pal.steelLight;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x + side * 26, KETTLE.top + 42);
			ctx.lineTo(x + side * 26, KETTLE.top + 60);
			ctx.stroke();
		}
	}

	/** Wort that went over: wet streaks down the outside, and the drips still falling. */
	private drawRunDown(ctx: CanvasRenderingContext2D, pal: Palette, f: KettleFrame) {
		if (this.stain <= 0) return;
		const { left: L, right: R, top: T, bottom: B, wall: w } = KETTLE;
		const wet = this.overT < 3 ? 1 : Math.max(0.35, 1 - (this.overT - 3) * 0.1);
		ctx.strokeStyle = alpha(f.wort, 0.7 * this.stain * wet);
		ctx.lineCap = 'round';
		for (let i = 0; i < 8; i++) {
			const side = i % 2 === 0 ? -1 : 1;
			const x = (side < 0 ? L - w : R + w) + side * (1 + (i % 3));
			const len = (0.3 + fract(i * 0.618) * 0.7) * (B - T) * this.stain;
			ctx.lineWidth = 3 + (i % 3);
			ctx.beginPath();
			ctx.moveTo(x, T + 2);
			ctx.lineTo(x, T + len);
			ctx.stroke();
		}
		ctx.fillStyle = alpha(f.wort, 0.9);
		for (const d of this.drips) {
			ctx.beginPath();
			ctx.ellipse(d.x, d.y, 2.5, 4, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawFlying(ctx: CanvasRenderingContext2D, pal: Palette) {
		for (const p of this.flying) {
			ctx.fillStyle = pal.hop;
			ctx.beginPath();
			ctx.ellipse(p.x, p.y, 3, 2.2, p.vx * 0.01, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawThermometer(ctx: CanvasRenderingContext2D, pal: Palette) {
		ctx.strokeStyle = pal.steel;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(DIAL.x - 14, DIAL.y + DIAL.r - 6);
		ctx.lineTo(KETTLE.right - 40, 380);
		ctx.stroke();
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = pal.steelDark;
		ctx.beginPath();
		ctx.roundRect(KETTLE.right - 12, KETTLE.top - 13, 28, 20, 4);
		ctx.fill();
		drawDial(ctx, pal, DIAL.x, DIAL.y, DIAL.r, this.needle.value, {
			min: 40,
			max: 100,
			label: '°C'
		});
	}

	/* Hops ----------------------------------------------------------------- */

	private drawPacket(ctx: CanvasRenderingContext2D, pal: Palette, f: KettleFrame, i: number) {
		const p = f.packets[i];
		const s = packetSlot(i, f.packets.length);
		const { w, h } = PACKET;
		const lift = f.hover === i && !p.dropped ? 6 : 0;
		const y0 = s.y - h - lift;

		if (p.dropped) {
			// The empty bag, slumped on the bench.
			contactShadow(ctx, pal, s.x, s.y, w * 0.5, 0.6);
			ctx.fillStyle = alpha(pal.steel, 0.8);
			ctx.beginPath();
			ctx.moveTo(s.x - w / 2, s.y);
			ctx.quadraticCurveTo(s.x - w / 2 + 4, s.y - 18, s.x - 6, s.y - 20);
			ctx.lineTo(s.x + w / 2 - 2, s.y - 12);
			ctx.lineTo(s.x + w / 2, s.y);
			ctx.closePath();
			ctx.fill();
			drawTag(ctx, pal, s.x, BENCH + 14, `${p.name} · in`, { small: true });
			return;
		}

		if (p.due) glow(ctx, s.x, y0 + h / 2, 70, pal.amber, 0.45 + 0.15 * Math.sin(this.t * 4));
		contactShadow(ctx, pal, s.x, s.y, w * 0.55, lift ? 0.5 : 0.8);
		// A foil bag: a cylinder-shaded body with a crimped top.
		const foil = ctx.createLinearGradient(s.x - w / 2, 0, s.x + w / 2, 0);
		foil.addColorStop(0, pal.steelDark);
		foil.addColorStop(0.3, pal.steelLight);
		foil.addColorStop(0.45, pal.steel);
		foil.addColorStop(1, pal.steelDark);
		ctx.fillStyle = foil;
		ctx.beginPath();
		ctx.moveTo(s.x - w / 2 + 2, y0 + 10);
		ctx.lineTo(s.x + w / 2 - 2, y0 + 10);
		ctx.lineTo(s.x + w / 2, y0 + h);
		ctx.lineTo(s.x - w / 2, y0 + h);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = pal.steelDark;
		ctx.fillRect(s.x - w / 2 + 2, y0, w - 4, 10);
		ctx.fillStyle = alpha(pal.steelLight, 0.5);
		for (let x = s.x - w / 2 + 5; x < s.x + w / 2 - 4; x += 4) ctx.fillRect(x, y0 + 1, 1.5, 8);
		// The label: a green sticker with the hop and the weight.
		ctx.fillStyle = pal.hopDim;
		ctx.beginPath();
		ctx.roundRect(s.x - w / 2 + 6, y0 + 22, w - 12, 36, 4);
		ctx.fill();
		ctx.fillStyle = pal.fg;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const name = p.name.length > 9 ? p.name.slice(0, 8) + '…' : p.name;
		ctx.font = `600 10px ui-sans-serif, system-ui, sans-serif`;
		ctx.fillText(name, s.x, y0 + 33);
		ctx.font = `500 11px ui-sans-serif, system-ui, sans-serif`;
		ctx.fillText(`${p.grams} g`, s.x, y0 + 48);
		drawTag(ctx, pal, s.x, BENCH + 14, p.caption, { small: true, highlight: p.due });
	}
}
