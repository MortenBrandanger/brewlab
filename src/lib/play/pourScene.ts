/**
 * The glass: the first time anybody sees the beer.
 *
 * A pint glass on the bench and one of the bottles you filled. Holding the
 * pour tips the bottle over the glass; the beer runs in and a head builds on
 * it, then settles. What you see is the engine's appearance model and nothing
 * else: the colour is the EBC the grist produced, the haze is the haze model
 * (proteins, yeast that never dropped, a skipped vorlauf, dry hops), the head
 * settles to the height the carbonation and the foam-positive malt support,
 * and the bubble streams are as busy as the CO₂ you primed for.
 *
 * How you pour changes only how the pour looks on the way. The engine does not
 * model pouring technique, so neither does anything the scene lets you claim.
 *
 * The lamp shines through the beer as a lit band on the lamp side, strong in a
 * clear beer and smothered in a hazy one, which is the most legible way a 2D
 * picture can say "clear" without a word.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	fract,
	glow,
	lerp,
	type Palette
} from './kit';

const GLASS = { cx: 420, baseH: 16, height: 286, bottomHalf: 50, topHalf: 74 };
const INNER_BOTTOM = BENCH - GLASS.baseH;
const TOP = BENCH - GLASS.height;
const BOTTLE_REST = { x: 690, y: BENCH };
const POUR_RATE = 0.2;
const STREAMS = 26;

export type PourFrame = {
	pouring: boolean;
	/** The beer's colour at three depths, from the engine's EBC. */
	beer: string;
	beerLight: string;
	beerDeep: string;
	/** Colour in SRM: a dark beer lets almost none of the lamp through. */
	srm: number;
	haze: number;
	/** 0–1 head height the beer supports, from the appearance model. */
	head: number;
	/** 0–1 bubble activity. */
	carbonation: number;
	calm: boolean;
};

export class PourScene {
	private t = 0;
	private tilt = 0;
	/** Shares of the glass's height. */
	liquid = 0;
	foam = 0;
	private streams: { x: number; speed: number; phase: number; size: number }[] = [];

	constructor() {
		const r = rng(0x706f7572);
		for (let i = 0; i < STREAMS; i++) {
			this.streams.push({ x: r(), speed: 0.35 + r() * 0.5, phase: r(), size: 0.8 + r() * 1.2 });
		}
	}

	/** The head a settled glass carries, as a share of the glass. */
	private settledHead(f: PourFrame) {
		return 0.05 + f.head * 0.17;
	}

	get full(): boolean {
		return this.liquid + this.foam >= 0.94;
	}

	update(dt: number, f: PourFrame) {
		this.t += dt;
		const pouring = f.pouring && !this.full;
		if (f.calm) {
			this.tilt = pouring ? 1 : 0;
			if (f.pouring) {
				const head = this.settledHead(f);
				this.foam = head;
				this.liquid = 0.95 - head;
			}
			return;
		}
		this.tilt = approach(this.tilt, pouring ? 1 : 0, 5, dt);
		if (pouring && this.tilt > 0.8) {
			const flow = POUR_RATE * dt;
			// A beer that holds a head throws more foam as it lands.
			this.liquid += flow * (1 - 0.35 * f.head);
			this.foam += flow * (0.35 * f.head + 0.04);
		} else {
			// The head collapses back to what the beer can hold, a little
			// liquid for every centimetre of foam it loses.
			const target = Math.min(this.foam, this.settledHead(f));
			const lost = this.foam - approach(this.foam, target, 0.6, dt);
			this.foam -= lost;
			this.liquid += lost * 0.25;
		}
		const over = this.liquid + this.foam - 1;
		if (over > 0) this.foam = Math.max(0, this.foam - over);
	}

	draw(ctx: CanvasRenderingContext2D, f: PourFrame, pal: Palette) {
		contactShadow(ctx, pal, GLASS.cx, BENCH, GLASS.bottomHalf + 14);
		this.drawGlassBack(ctx, pal);
		this.drawBeer(ctx, f, pal);
		this.drawGlassFront(ctx, pal);
		this.drawBottle(ctx, f, pal);
	}

	/* Glass ---------------------------------------------------------------- */

	private halfAt(y: number) {
		const s = clamp((INNER_BOTTOM - y) / (INNER_BOTTOM - TOP), 0, 1);
		return lerp(GLASS.bottomHalf, GLASS.topHalf, s);
	}

	private innerPath(ctx: CanvasRenderingContext2D) {
		const { cx, bottomHalf, topHalf } = GLASS;
		ctx.beginPath();
		ctx.moveTo(cx - topHalf + 4, TOP);
		ctx.lineTo(cx - bottomHalf + 4, INNER_BOTTOM - 6);
		ctx.quadraticCurveTo(cx - bottomHalf + 4, INNER_BOTTOM, cx - bottomHalf + 12, INNER_BOTTOM);
		ctx.lineTo(cx + bottomHalf - 12, INNER_BOTTOM);
		ctx.quadraticCurveTo(cx + bottomHalf - 4, INNER_BOTTOM, cx + bottomHalf - 4, INNER_BOTTOM - 6);
		ctx.lineTo(cx + topHalf - 4, TOP);
		ctx.closePath();
	}

	private drawGlassBack(ctx: CanvasRenderingContext2D, pal: Palette) {
		this.innerPath(ctx);
		ctx.fillStyle = alpha(pal.fg, 0.05);
		ctx.fill();
		// The back of the rim.
		ctx.strokeStyle = alpha(pal.fg, 0.25);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(GLASS.cx, TOP, GLASS.topHalf, 10, 0, Math.PI, Math.PI * 2);
		ctx.stroke();
	}

	private drawBeer(ctx: CanvasRenderingContext2D, f: PourFrame, pal: Palette) {
		const height = INNER_BOTTOM - TOP;
		const liquidTop = INNER_BOTTOM - this.liquid * height;
		const foamTop = liquidTop - this.foam * height;
		if (this.liquid <= 0.001 && this.foam <= 0.001) return;
		const { cx } = GLASS;

		ctx.save();
		this.innerPath(ctx);
		ctx.clip();

		if (this.liquid > 0.001) {
			const body = ctx.createLinearGradient(0, liquidTop, 0, INNER_BOTTOM);
			body.addColorStop(0, f.beerLight);
			body.addColorStop(0.5, f.beer);
			body.addColorStop(1, f.beerDeep);
			ctx.fillStyle = body;
			ctx.fillRect(cx - GLASS.topHalf, liquidTop, GLASS.topHalf * 2, INNER_BOTTOM - liquidTop);

			// Depth: the chart colour is a thin sample, and a pint of a dark beer
			// is far darker than that. The edges keep the chart colour; the body
			// sinks towards black as the colour climbs.
			const depth = clamp((f.srm - 10) / 22, 0, 0.8);
			if (depth > 0) {
				const dark = ctx.createLinearGradient(cx - GLASS.topHalf, 0, cx + GLASS.topHalf, 0);
				dark.addColorStop(0, alpha(pal.shadow, depth * 0.5));
				dark.addColorStop(0.5, alpha(pal.shadow, depth));
				dark.addColorStop(1, alpha(pal.shadow, depth * 0.6));
				ctx.fillStyle = dark;
				ctx.fillRect(cx - GLASS.topHalf, liquidTop, GLASS.topHalf * 2, INNER_BOTTOM - liquidTop);
			}

			// Lamp light through the beer: a band on the lamp side, strong when
			// the beer is clear, smothered when it is hazy.
			const clear = (1 - clamp(f.haze, 0, 1)) * clamp(1 - f.srm / 32, 0.08, 1);
			const band = ctx.createLinearGradient(cx - GLASS.topHalf, 0, cx + GLASS.topHalf, 0);
			band.addColorStop(0, alpha(pal.lamp, 0));
			band.addColorStop(0.28, alpha(pal.lamp, 0.42 * clear));
			band.addColorStop(0.42, alpha(pal.lamp, 0.12 * clear));
			band.addColorStop(1, alpha(pal.lamp, 0));
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = band;
			ctx.fillRect(cx - GLASS.topHalf, liquidTop, GLASS.topHalf * 2, INNER_BOTTOM - liquidTop);
			ctx.restore();

			// Haze: a milky veil that flattens the depth.
			if (f.haze > 0.02) {
				ctx.fillStyle = alpha(pal.plastic, clamp(f.haze, 0, 1) * 0.32);
				ctx.fillRect(cx - GLASS.topHalf, liquidTop, GLASS.topHalf * 2, INNER_BOTTOM - liquidTop);
			}

			// Bubble streams, as many as the carbonation can feed.
			const live = Math.round(clamp(f.carbonation, 0, 1) * STREAMS);
			ctx.fillStyle = alpha(pal.fg, 0.55 * (1 - f.haze * 0.6));
			for (let i = 0; i < live; i++) {
				const s = this.streams[i];
				for (let k = 0; k < 4; k++) {
					const p = f.calm ? (k + s.phase) / 4 : fract(this.t * s.speed + s.phase + k * 0.25);
					const y = lerp(INNER_BOTTOM - 4, liquidTop + 4, p);
					if (y < liquidTop + 3) continue;
					const half = this.halfAt(y) - 10;
					ctx.beginPath();
					ctx.arc(cx - half + s.x * half * 2, y, s.size * (0.6 + p * 0.6), 0, Math.PI * 2);
					ctx.fill();
				}
			}
			// The meniscus catches the lamp.
			ctx.fillStyle = alpha(pal.lamp, 0.5);
			ctx.fillRect(cx - GLASS.topHalf, liquidTop - 1, GLASS.topHalf * 2, 2);
		}

		if (this.foam > 0.001) {
			const fg = ctx.createLinearGradient(0, foamTop, 0, liquidTop);
			fg.addColorStop(0, pal.fg);
			fg.addColorStop(1, pal.plastic);
			ctx.fillStyle = fg;
			ctx.fillRect(cx - GLASS.topHalf, foamTop + 4, GLASS.topHalf * 2, liquidTop - foamTop - 4);
			// A cauliflower top edge, and pores in the foam.
			const half = this.halfAt(foamTop);
			for (let x = cx - half; x < cx + half + 8; x += 12) {
				ctx.beginPath();
				ctx.arc(x, foamTop + 5 + Math.sin(x * 0.7) * 1.5, 8, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = alpha(pal.muted, 0.35);
			for (let i = 0; i < 30; i++) {
				const px = cx - half + fract(i * 0.618) * half * 2;
				const py = lerp(foamTop + 6, liquidTop - 2, fract(i * 0.371));
				if (py > liquidTop - 2) continue;
				ctx.beginPath();
				ctx.arc(px, py, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	private drawGlassFront(ctx: CanvasRenderingContext2D, pal: Palette) {
		const { cx, bottomHalf, topHalf, baseH } = GLASS;
		// Walls.
		ctx.strokeStyle = alpha(pal.fg, 0.45);
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(cx - topHalf, TOP);
		ctx.lineTo(cx - bottomHalf, BENCH - 4);
		ctx.moveTo(cx + topHalf, TOP);
		ctx.lineTo(cx + bottomHalf, BENCH - 4);
		ctx.stroke();
		// A thick glass base, which bends the light that reaches it.
		const base = ctx.createLinearGradient(cx - bottomHalf, 0, cx + bottomHalf, 0);
		base.addColorStop(0, alpha(pal.fg, 0.12));
		base.addColorStop(0.3, alpha(pal.fg, 0.45));
		base.addColorStop(1, alpha(pal.fg, 0.1));
		ctx.fillStyle = base;
		ctx.beginPath();
		ctx.roundRect(cx - bottomHalf, BENCH - baseH, bottomHalf * 2, baseH, [0, 0, 6, 6]);
		ctx.fill();
		// The front of the rim.
		ctx.strokeStyle = alpha(pal.fg, 0.7);
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.ellipse(cx, TOP, topHalf, 10, 0, 0, Math.PI);
		ctx.stroke();
		// Highlights: a long streak on the lamp side and a short one opposite.
		ctx.strokeStyle = alpha(pal.fg, 0.55);
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(cx - topHalf + 16, TOP + 22);
		ctx.lineTo(cx - bottomHalf + 14, BENCH - 40);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.25);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx + topHalf - 14, TOP + 30);
		ctx.lineTo(cx + topHalf - 18, TOP + 90);
		ctx.stroke();
	}

	/* Bottle --------------------------------------------------------------- */

	private drawBottle(ctx: CanvasRenderingContext2D, f: PourFrame, pal: Palette) {
		const t = this.tilt;
		// Standing on the bench at rest; tipped over the rim, neck down, to pour.
		const restX = BOTTLE_REST.x;
		const restY = BOTTLE_REST.y - 80;
		const pourX = GLASS.cx + 120;
		const pourY = TOP - 70;
		const x = lerp(restX, pourX, t);
		const y = lerp(restY, pourY, t);
		const angle = lerp(0, -2.05, t);
		if (t < 0.05) contactShadow(ctx, pal, restX, BENCH, 26);

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);
		const path = () => {
			ctx.beginPath();
			ctx.moveTo(-19, 80);
			ctx.lineTo(-19, -14);
			ctx.bezierCurveTo(-19, -36, -8, -32, -8, -44);
			ctx.lineTo(-8, -88);
			ctx.lineTo(8, -88);
			ctx.lineTo(8, -44);
			ctx.bezierCurveTo(8, -32, 19, -36, 19, -14);
			ctx.lineTo(19, 80);
			ctx.closePath();
		};
		path();
		ctx.fillStyle = cylinder(
			ctx,
			-19,
			19,
			alpha(pal.copper, 0.9),
			alpha(pal.woodDark, 0.95),
			pal.shadow
		);
		ctx.fill();
		// A paper label with the day's beer on it.
		ctx.fillStyle = pal.plastic;
		ctx.fillRect(-19, 6, 38, 40);
		ctx.fillStyle = alpha(pal.copperDark, 0.9);
		ctx.fillRect(-19, 14, 38, 3);
		ctx.fillRect(-19, 35, 38, 3);
		ctx.strokeStyle = alpha(pal.fg, 0.55);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-11, -8);
		ctx.lineTo(-11, 74);
		ctx.stroke();
		ctx.restore();

		// The stream, from the mouth down to the surface.
		if (f.pouring && !this.full && t > 0.8) {
			const mouthX = x + Math.sin(-angle) * 88 * -1;
			const mouthY = y - Math.cos(angle) * 88;
			const height = INNER_BOTTOM - TOP;
			const surface = INNER_BOTTOM - (this.liquid + this.foam * 0.5) * height;
			const landX = GLASS.cx + GLASS.topHalf - 22;
			ctx.strokeStyle = f.beer;
			ctx.lineWidth = f.calm ? 6 : 6 + Math.sin(this.t * 40) * 0.8;
			ctx.beginPath();
			ctx.moveTo(mouthX, mouthY);
			ctx.quadraticCurveTo(landX + 10, mouthY + 20, landX, surface);
			ctx.stroke();
			glow(ctx, landX, surface, 40, pal.lamp, 0.4);
		}
	}
}
