/**
 * The transfer: the kettle up on the bench, the fermenting bucket on the floor
 * in front of it, and a siphon between them.
 *
 * The far end of the siphon is a racking cane standing in the kettle, its foot
 * above the sludge of spent hops and settled protein. The near end is in your
 * hand: it follows the pointer inside the bucket. Held under the surface, the
 * wort slides in quietly; held above it, the stream falls and splashes, and
 * every splash folds air into the beer — which is the cold-side handling the
 * engine reads as careless. The froth that builds on the surface is the air
 * you put in, drawn.
 */

import { rng } from '$lib/brewing/variance';
import { H, W, alpha, approach, clamp, type Palette, type PointerInput } from './kit';
import { drawFermenter, drawSteelKettle, drawWort, surfaceY, type Box } from './coldSideScene';

const KETTLE: Box = { left: 150, right: 410, top: 232, bottom: 466 };
const KETTLE_L = 34;
const BUCKET: Box = { left: 560, right: 770, top: 352, bottom: H - 8 };
const BUCKET_L = 30;
/** Real seconds for the whole batch to run across at full flow. */
const RUN_S = 10;
/** The sludge left behind in the kettle, as a share of its height. */
const TRUB = 0.035;

type Droplet = { x: number; y: number; vx: number; vy: number; life: number };

/** Where the hose end may go: inside the bucket, clear of its walls. */
function clampOutlet(x: number, y: number) {
	return {
		x: clamp(x, BUCKET.left + 26, BUCKET.right - 26),
		y: clamp(y, BUCKET.top - 30, BUCKET.bottom - 16)
	};
}

export class TransferScene {
	readonly totalL: number;
	movedL = 0;
	splashL = 0;
	running = false;
	/** True this frame when the hose end is above the wort. */
	splashing = false;
	outlet = clampOutlet((BUCKET.left + BUCKET.right) / 2, BUCKET.top - 20);
	private target = { ...this.outlet };
	private t = 0;
	private froth = 0;
	private rand = rng(0x7472616e);
	private droplets: Droplet[] = [];

	constructor(totalL: number) {
		this.totalL = Math.max(1, totalL);
	}

	get done() {
		return this.movedL >= this.totalL - 1e-6;
	}

	/** The surface in the bucket, from what has run in so far. */
	bucketSurface() {
		return surfaceY(BUCKET, this.movedL / BUCKET_L);
	}

	/**
	 * True when the hose end is held above the wort. Lying on the floor of the
	 * bucket counts as under it even before there is any depth: the wort runs
	 * out along the bottom rather than falling, which is why brewers start it
	 * there.
	 */
	held() {
		return this.outlet.y < this.bucketSurface() - 3 && this.outlet.y < BUCKET.bottom - 28;
	}

	/** Put the hose end at the bottom or hold it above the rim: the keyboard's way in. */
	place(where: 'bottom' | 'above') {
		this.target = clampOutlet(
			(BUCKET.left + BUCKET.right) / 2 + 20,
			where === 'bottom' ? BUCKET.bottom - 18 : BUCKET.top - 24
		);
	}

	update(dt: number, input: PointerInput, calm: boolean) {
		this.t += dt;
		// The hose end follows the pointer while it is over the bucket.
		if (
			input.present &&
			input.x > BUCKET.left - 40 &&
			input.x < BUCKET.right + 40 &&
			input.y > BUCKET.top - 120
		) {
			this.target = clampOutlet(input.x, input.y);
		}
		this.outlet.x = calm ? this.target.x : approach(this.outlet.x, this.target.x, 16, dt);
		this.outlet.y = calm ? this.target.y : approach(this.outlet.y, this.target.y, 16, dt);

		const surface = this.bucketSurface();
		this.splashing = this.running && !this.done && this.held();
		if (this.running && !this.done) {
			const litres = Math.min(this.totalL - this.movedL, (this.totalL / RUN_S) * dt);
			this.movedL += litres;
			if (this.splashing) this.splashL += litres;
		}
		this.froth = clamp(this.froth + (this.splashing ? dt * 0.35 : -dt * 0.04), 0, 1);

		if (this.splashing && !calm) {
			for (let i = 0; i < 3; i++) {
				this.droplets.push({
					x: this.outlet.x + (this.rand() - 0.5) * 8,
					y: surface,
					vx: (this.rand() - 0.5) * 160,
					vy: -60 - this.rand() * 120,
					life: 1
				});
			}
		}
		for (const d of this.droplets) {
			d.vy += 700 * dt;
			d.x += d.vx * dt;
			d.y += d.vy * dt;
			d.life -= dt * 2.2;
		}
		this.droplets = this.droplets.filter((d) => d.life > 0 && d.y < surface + 4);
	}

	draw(ctx: CanvasRenderingContext2D, pal: Palette, wort: string, calm: boolean) {
		const kLevel = TRUB + (1 - this.movedL / this.totalL) * (this.totalL / KETTLE_L - TRUB);
		const kSurface = surfaceY(KETTLE, Math.max(TRUB, kLevel));
		const bSurface = this.bucketSurface();
		const cane = { x: KETTLE.right - 50, foot: KETTLE.bottom - 22 };
		const flowing = this.running && !this.done;

		drawSteelKettle(
			ctx,
			pal,
			KETTLE,
			() => {
				drawWort(ctx, pal, KETTLE, kSurface, wort, 0.92);
				// Trub: the sludge the cane stands clear of.
				ctx.fillStyle = pal.woodDark;
				ctx.beginPath();
				ctx.moveTo(KETTLE.left, KETTLE.bottom);
				ctx.lineTo(KETTLE.left, KETTLE.bottom - 12);
				ctx.quadraticCurveTo(
					(KETTLE.left + KETTLE.right) / 2,
					KETTLE.bottom - 2 - 14,
					KETTLE.right,
					KETTLE.bottom - 10
				);
				ctx.lineTo(KETTLE.right, KETTLE.bottom);
				ctx.closePath();
				ctx.fill();
				this.drawCane(ctx, pal, cane, flowing);
			},
			() => this.drawCaneTop(ctx, pal, cane, flowing)
		);

		// The hose, then the bucket over the part of it that is inside.
		const start = { x: cane.x + 26, y: KETTLE.top - 34 };
		const hosePath = () => {
			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.bezierCurveTo(
				start.x + 110,
				start.y - 30,
				this.outlet.x - 30,
				BUCKET.top - 150,
				this.outlet.x,
				this.outlet.y
			);
		};
		drawFermenter(ctx, pal, BUCKET, () => {
			drawWort(ctx, pal, BUCKET, bSurface, wort, 0.9, (x) =>
				calm
					? 0
					: Math.sin(x * 0.06 + this.t * (this.splashing ? 9 : 2)) * (this.splashing ? 2.5 : 0.8)
			);
			this.drawFroth(ctx, pal, bSurface);
			// The stream, when the hose end is held above the surface.
			if (this.splashing) {
				ctx.strokeStyle = alpha(wort, 0.9);
				ctx.lineWidth = 6;
				ctx.beginPath();
				ctx.moveTo(this.outlet.x, this.outlet.y + 4);
				ctx.lineTo(this.outlet.x + (calm ? 0 : Math.sin(this.t * 30) * 1.2), bSurface);
				ctx.stroke();
				ctx.strokeStyle = alpha(pal.lamp, 0.5);
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(this.outlet.x - 2, this.outlet.y + 4);
				ctx.lineTo(this.outlet.x - 2, bSurface);
				ctx.stroke();
			} else if (flowing) {
				// Under the surface: a slow swirl round the hose end.
				ctx.strokeStyle = alpha(pal.lamp, 0.25);
				ctx.lineWidth = 1.5;
				for (let i = 0; i < 3; i++) {
					const r = 14 + ((this.t * 18 + i * 14) % 42);
					ctx.beginPath();
					ctx.ellipse(this.outlet.x, this.outlet.y, r, r * 0.35, 0, 0, Math.PI * 2);
					ctx.stroke();
				}
			}
			// Hose inside the bucket, seen through the plastic.
			this.strokeHose(ctx, pal, hosePath, flowing, wort);
		});
		// Hose outside the bucket, over the top of it.
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, W, BUCKET.top - 4);
		ctx.rect(0, 0, BUCKET.left, H);
		ctx.clip();
		this.strokeHose(ctx, pal, hosePath, flowing, wort);
		ctx.restore();
		// The end in your hand, with a ring to grip.
		if (this.outlet.y < BUCKET.top) {
			ctx.fillStyle = pal.plastic;
			ctx.beginPath();
			ctx.arc(this.outlet.x, this.outlet.y, 6, 0, Math.PI * 2);
			ctx.fill();
		}

		for (const d of this.droplets) {
			ctx.fillStyle = alpha(pal.fg, 0.7 * d.life);
			ctx.beginPath();
			ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private strokeHose(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		path: () => void,
		flowing: boolean,
		wort: string
	) {
		ctx.strokeStyle = alpha(pal.plastic, 0.55);
		ctx.lineWidth = 11;
		path();
		ctx.stroke();
		if (flowing || this.movedL > 0) {
			ctx.strokeStyle = alpha(wort, flowing ? 0.95 : 0.35);
			ctx.lineWidth = 6;
			path();
			ctx.stroke();
		}
		ctx.strokeStyle = alpha(pal.fg, 0.6);
		ctx.lineWidth = 1.5;
		path();
		ctx.stroke();
	}

	/** The rigid racking cane standing in the kettle, its foot above the sludge. */
	private drawCane(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		cane: { x: number; foot: number },
		flowing: boolean
	) {
		ctx.strokeStyle = alpha(pal.plastic, 0.7);
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.moveTo(cane.x, cane.foot);
		ctx.lineTo(cane.x, KETTLE.top - 20);
		ctx.stroke();
		if (flowing) {
			ctx.strokeStyle = alpha(pal.lamp, 0.4);
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		// The tip that keeps it off the sludge.
		ctx.fillStyle = pal.muted;
		ctx.beginPath();
		ctx.roundRect(cane.x - 7, cane.foot - 4, 14, 8, 3);
		ctx.fill();
	}

	private drawCaneTop(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		cane: { x: number; foot: number },
		flowing: boolean
	) {
		const path = () => {
			ctx.beginPath();
			ctx.moveTo(cane.x, KETTLE.top - 20);
			ctx.lineTo(cane.x, KETTLE.top - 40);
			ctx.quadraticCurveTo(cane.x, KETTLE.top - 56, cane.x + 16, KETTLE.top - 52);
			ctx.lineTo(cane.x + 26, KETTLE.top - 34);
		};
		ctx.strokeStyle = alpha(pal.plastic, 0.75);
		ctx.lineWidth = 8;
		path();
		ctx.stroke();
		ctx.strokeStyle = flowing ? alpha(pal.amber, 0.7) : alpha(pal.fg, 0.7);
		ctx.lineWidth = flowing ? 3 : 1.5;
		path();
		ctx.stroke();
	}

	/** Froth on the bucket: small bubbles, as many as the air folded in. */
	private drawFroth(ctx: CanvasRenderingContext2D, pal: Palette, surface: number) {
		if (this.froth < 0.02) return;
		const n = Math.round(this.froth * 70);
		for (let i = 0; i < n; i++) {
			const x = BUCKET.left + 14 + (((i * 61) % 101) / 101) * (BUCKET.right - BUCKET.left - 28);
			const y = surface - 2 - (((i * 37) % 23) / 23) * 9 * this.froth;
			const r = 2 + ((i * 13) % 5) * 0.6;
			ctx.fillStyle = alpha(pal.plastic, 0.85);
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = alpha(pal.fg, 0.8);
			ctx.beginPath();
			ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
