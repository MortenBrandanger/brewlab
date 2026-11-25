/**
 * The chilling bench: the kettle off the heat, a copper immersion coil in the
 * wort, a hose from the cold tap into it and a hose out of it into a bucket.
 *
 * What moves is moved by the chiller model in `chill.ts`:
 *
 * - the stream out of the outlet hose is as thick as the tap is open, and
 *   steams while the water coming out is hot — which it is at first, and
 *   less so as the wort cools, the cue a brewer actually watches;
 * - the coil sways through the wort while you stir, the thing that makes it
 *   cool faster;
 * - steam off the kettle thins out as the wort drops below about 40 °C.
 *
 * The kettle is drawn as a cutaway like the mash tun, with the wort a little
 * translucent so the coil shows inside it.
 */

import {
	BENCH,
	Needle,
	Steam,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	drawBurner,
	drawDial,
	drawTimer,
	lerp,
	type Palette
} from './kit';
import { drawSteelKettle, drawWort, surfaceY, type Box } from './coldSideScene';
import { outletC, type ChillState } from './chill';

const KETTLE: Box = { left: 318, right: 602, top: 210, bottom: 438 };
const CX = (KETTLE.left + KETTLE.right) / 2;
/** Litres the kettle holds to the brim. */
const CAPACITY_L = 34;
const TAP = { x: 92, y: 236 };
const DRAIN = { x: 800, y: BENCH };
const DIAL = { x: 742, y: 138, r: 52 };
const TURNS = 6;

export type ChillFrame = {
	chill: ChillState;
	elapsed: number;
	targetC: number;
	wort: string;
	calm: boolean;
};

export class ChillScene {
	private t = 0;
	private drop = 0;
	private sway = 0;
	private needle: Needle;
	private kettleSteam = new Steam(14, 0x63686c);
	private outSteam = new Steam(8, 0x6f7574);

	constructor(startC: number) {
		this.needle = new Needle(startC);
	}

	update(dt: number, f: ChillFrame) {
		this.t += dt;
		this.kettleSteam.update(dt);
		this.outSteam.update(dt);
		this.drop = f.calm ? 1 : approach(this.drop, 1, 3.5, dt);
		const target = f.calm ? 0 : Math.sin(this.t * 5) * 22 * f.chill.stir;
		this.sway = approach(this.sway, target, 10, dt);
		this.needle.update(f.chill.tempC, dt, f.calm);
	}

	draw(ctx: CanvasRenderingContext2D, pal: Palette, f: ChillFrame) {
		const level = f.chill.wortL / CAPACITY_L;
		const surface = surfaceY(KETTLE, level);
		const lift = (1 - this.drop) * -240;
		const coil = { x: CX + this.sway, bottom: KETTLE.bottom - 18 + lift, top: surface + 14 + lift };

		this.drawTap(ctx, pal, f.chill.flow);
		drawBurner(ctx, pal, CX, 112, 0, this.t, f.calm);
		this.drawDrainBucket(ctx, pal);
		drawSteelKettle(
			ctx,
			pal,
			KETTLE,
			() => {
				this.drawCoil(ctx, pal, coil, 'back');
				drawWort(ctx, pal, KETTLE, surface, f.wort, 0.78, (x) =>
					f.calm ? 0 : Math.sin(x * 0.05 + this.t * 3) * 1.5 * (0.3 + f.chill.stir)
				);
				this.drawCoil(ctx, pal, coil, 'front');
			},
			() => this.drawPipes(ctx, pal, coil)
		);
		this.drawHoses(ctx, pal, coil, f);
		if (!f.calm) {
			const steam = clamp((f.chill.tempC - 35) / 50, 0, 1);
			this.kettleSteam.draw(ctx, pal, KETTLE.left, KETTLE.right, surface - 6, steam, 200);
		}
		drawDial(ctx, pal, DIAL.x, DIAL.y, DIAL.r, this.needle.value, {
			min: 0,
			max: 100,
			target: f.targetC,
			label: '°C'
		});
		drawTimer(ctx, pal, 196, BENCH - 50, 44, f.elapsed, 0, 'minutes');
	}

	/* The coil ------------------------------------------------------------- */

	/**
	 * A helix seen from slightly above. Each turn is split where it passes
	 * behind and in front of the kettle's centre line, so the back halves sit
	 * under the wort and the front halves over it.
	 */
	private drawCoil(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		coil: { x: number; bottom: number; top: number },
		half: 'back' | 'front'
	) {
		const rx = (KETTLE.right - KETTLE.left) / 2 - 34;
		const ry = 11;
		const steps = TURNS * 28;
		const at = (s: number) => {
			const a = (s / steps) * TURNS * Math.PI * 2;
			return {
				x: coil.x + Math.cos(a) * rx,
				y: coil.bottom - (s / steps) * (coil.bottom - coil.top) + Math.sin(a) * ry,
				front: Math.sin(a) > 0
			};
		};
		const strokes: [number, string][] =
			half === 'back'
				? [
						[9, alpha(pal.copperDark, 0.8)],
						[5, alpha(pal.copper, 0.75)]
					]
				: [
						[9, pal.copperDark],
						[6, pal.copper],
						[2, pal.copperLight]
					];
		for (const [width, colour] of strokes) {
			ctx.strokeStyle = colour;
			ctx.lineWidth = width;
			ctx.beginPath();
			let drawing = false;
			for (let s = 0; s <= steps; s++) {
				const p = at(s);
				const mine = half === 'front' ? p.front : !p.front;
				const y = width === 2 ? p.y - 2 : p.y;
				if (mine && !drawing) {
					ctx.moveTo(p.x, y);
					drawing = true;
				} else if (mine) {
					ctx.lineTo(p.x, y);
				} else {
					drawing = false;
				}
			}
			ctx.stroke();
		}
	}

	/** The two straight pipes that rise out of the coil and over the rim. */
	private drawPipes(ctx: CanvasRenderingContext2D, pal: Palette, coil: { x: number; top: number }) {
		const rx = (KETTLE.right - KETTLE.left) / 2 - 34;
		for (const [x0, side] of [
			[coil.x - rx + 8, -1],
			[coil.x + rx - 8, 1]
		] as const) {
			const path = () => {
				ctx.beginPath();
				ctx.moveTo(x0, coil.top + 6);
				ctx.lineTo(x0, KETTLE.top - 44);
				ctx.quadraticCurveTo(x0, KETTLE.top - 70, x0 + side * 26, KETTLE.top - 70);
				ctx.lineTo(x0 + side * 46, KETTLE.top - 70);
			};
			for (const [w, c] of [
				[9, pal.copperDark],
				[6, pal.copper],
				[2, pal.copperLight]
			] as const) {
				ctx.strokeStyle = c;
				ctx.lineWidth = w;
				path();
				ctx.stroke();
			}
		}
	}

	/* Water in and out ------------------------------------------------------- */

	private pipeEnd(coil: { x: number; top: number }, side: -1 | 1) {
		const rx = (KETTLE.right - KETTLE.left) / 2 - 34;
		const x0 = side < 0 ? coil.x - rx + 8 : coil.x + rx - 8;
		return { x: x0 + side * 46, y: KETTLE.top - 70 };
	}

	private drawHoses(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		coil: { x: number; top: number },
		f: ChillFrame
	) {
		const inlet = this.pipeEnd(coil, -1);
		const outlet = this.pipeEnd(coil, 1);
		const hose = (draw: () => void) => {
			ctx.strokeStyle = pal.hopDim;
			ctx.lineWidth = 10;
			draw();
			ctx.stroke();
			ctx.strokeStyle = alpha(pal.hop, 0.5);
			ctx.lineWidth = 3;
			draw();
			ctx.stroke();
		};
		// From the tap on the wall, down and over into the coil.
		hose(() => {
			ctx.beginPath();
			ctx.moveTo(TAP.x + 4, TAP.y + 30);
			ctx.bezierCurveTo(TAP.x + 10, TAP.y + 150, inlet.x - 120, inlet.y + 40, inlet.x, inlet.y);
		});
		// From the coil, out and down over the drain bucket.
		const mouth = { x: DRAIN.x - 10, y: DRAIN.y - 132 };
		hose(() => {
			ctx.beginPath();
			ctx.moveTo(outlet.x, outlet.y);
			ctx.bezierCurveTo(outlet.x + 90, outlet.y - 10, mouth.x + 10, mouth.y - 70, mouth.x, mouth.y);
		});

		const flow = f.chill.flow;
		if (flow < 0.01) return;
		const out = outletC(f.chill);
		// Hot water out looks warmer: the stream picks up the copper.
		const warm = clamp((out - 20) / 60, 0, 1);
		const top = mouth.y + 4;
		const bottom = DRAIN.y - 70;
		const g = ctx.createLinearGradient(0, top, 0, bottom);
		g.addColorStop(0, alpha(warm > 0.4 ? pal.copperLight : pal.water, 0.9));
		g.addColorStop(1, alpha(pal.water, 0.6));
		ctx.strokeStyle = g;
		ctx.lineWidth = 2 + flow * 6;
		ctx.beginPath();
		ctx.moveTo(mouth.x, top);
		ctx.lineTo(mouth.x + (f.calm ? 0 : Math.sin(this.t * 24) * 0.8), bottom);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.5);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(mouth.x - 1.5, top);
		ctx.lineTo(mouth.x - 1.5, bottom);
		ctx.stroke();
		if (!f.calm) this.outSteam.draw(ctx, pal, mouth.x - 26, mouth.x + 26, top + 30, warm, 120);
	}

	private drawTap(ctx: CanvasRenderingContext2D, pal: Palette, flow: number) {
		// A brass-and-steel tap on the tiles, its handle turned as far as the knob.
		ctx.fillStyle = pal.steelDark;
		ctx.beginPath();
		ctx.roundRect(TAP.x - 18, TAP.y - 14, 36, 28, 6);
		ctx.fill();
		ctx.fillStyle = cylinder(ctx, TAP.x - 8, TAP.x + 8, pal.steelLight, pal.steel, pal.steelDark);
		ctx.fillRect(TAP.x - 7, TAP.y, 14, 32);
		ctx.save();
		ctx.translate(TAP.x, TAP.y - 14);
		ctx.rotate(lerp(0, -Math.PI / 2, flow));
		ctx.fillStyle = pal.flame;
		ctx.beginPath();
		ctx.roundRect(-4, -26, 8, 26, 3);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = pal.steelLight;
		ctx.beginPath();
		ctx.arc(TAP.x, TAP.y - 14, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawDrainBucket(ctx: CanvasRenderingContext2D, pal: Palette) {
		const w = 92;
		const h = 74;
		const x = DRAIN.x;
		contactShadow(ctx, pal, x, BENCH, w * 0.55);
		const shape = () => {
			ctx.beginPath();
			ctx.moveTo(x - w / 2, BENCH - h);
			ctx.lineTo(x + w / 2, BENCH - h);
			ctx.lineTo(x + w / 2 - 8, BENCH);
			ctx.lineTo(x - w / 2 + 8, BENCH);
			ctx.closePath();
		};
		shape();
		ctx.fillStyle = cylinder(ctx, x - w / 2, x + w / 2, pal.steelLight, pal.steel, pal.steelDark);
		ctx.fill();
		ctx.fillStyle = alpha(pal.water, 0.85);
		ctx.beginPath();
		ctx.ellipse(x, BENCH - h + 2, w / 2 - 3, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(x, BENCH - h, w / 2, 8, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
}
