/**
 * The fermenter: a white plastic bucket of wort, first open on the bench for
 * the yeast to go in, then sealed in an old fridge with a thermostat for the
 * fortnight it takes to become beer.
 *
 * The bucket is drawn translucent, the way food-grade plastic is, so you see
 * the wort level through the wall, the foam the yeast throws up and the brown
 * ring it leaves behind when the foam falls. Everything that moves is moved
 * by a number the engine produced (see `fermenter.ts`):
 *
 * - the foam is as tall as the gravity points that went in the last day, and
 *   the ring on the wall marks the tallest it got;
 * - the airlock bubbles at a rate set by the same activity;
 * - the beer is cloudy with the yeast still in suspension and clears as it
 *   settles;
 * - the hydrometer in the trial jar floats as high as the gravity it reads.
 *
 * The yeast going in is the one thing here that is pure illustration: a
 * packet torn and tipped, its dust settling into a film on the wort.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	drawTag,
	drawTimer,
	fract,
	glow,
	lerp,
	type Palette,
	type PointerInput
} from './kit';

/* -------------------------------------------------------------------------- */
/* The bucket                                                                 */
/* -------------------------------------------------------------------------- */

type BucketLook = {
	cx: number;
	bottom: number;
	/** Width at the rim; it narrows a little to the base. */
	w: number;
	h: number;
	/** Share of the height the wort stands at. */
	level: number;
	wort: string;
	/** 0–1, yeast in suspension. */
	haze: number;
	/** Foam on the wort, in px. */
	krausen: number;
	/** The tidemark the tallest foam left on the wall, in px above the wort. */
	ring: number;
	/** 0 = off, 1 = sealed. */
	lid: number;
	/** 0–1, the bubble's place in its rise through the airlock. -1 for none. */
	bubble: number;
	/** CO₂ rising in the beer, 0–1. */
	fizz: number;
	/** Dry hops floating in the foam. */
	hops: number;
	t: number;
};

const RIM_RY = 20;

function bucketPath(ctx: CanvasRenderingContext2D, b: BucketLook) {
	const top = b.bottom - b.h;
	const half = b.w / 2;
	const foot = half - 14;
	ctx.beginPath();
	ctx.moveTo(b.cx - half, top);
	ctx.lineTo(b.cx - foot, b.bottom - 12);
	ctx.quadraticCurveTo(b.cx - foot, b.bottom, b.cx - foot + 12, b.bottom);
	ctx.lineTo(b.cx + foot - 12, b.bottom);
	ctx.quadraticCurveTo(b.cx + foot, b.bottom, b.cx + foot, b.bottom - 12);
	ctx.lineTo(b.cx + half, top);
	ctx.closePath();
}

/** Where the wort's surface is, in scene y. */
export function wortSurface(b: Pick<BucketLook, 'bottom' | 'h' | 'level'>): number {
	return b.bottom - b.h * b.level;
}

function drawBucket(ctx: CanvasRenderingContext2D, pal: Palette, b: BucketLook) {
	const top = b.bottom - b.h;
	const half = b.w / 2;
	const surface = wortSurface(b);

	contactShadow(ctx, pal, b.cx, b.bottom, half);

	// The far rim, inside, seen over the near one when the lid is off.
	if (b.lid < 0.99) {
		ctx.fillStyle = pal.muted;
		ctx.beginPath();
		ctx.ellipse(b.cx, top, half, RIM_RY, 0, Math.PI, Math.PI * 2);
		ctx.fill();
	}

	// Body: food-grade white plastic.
	bucketPath(ctx, b);
	ctx.fillStyle = cylinder(ctx, b.cx - half, b.cx + half, pal.fg, pal.plastic, pal.muted);
	ctx.fill();

	ctx.save();
	bucketPath(ctx, b);
	ctx.clip();
	// The tidemark: a brown band of dried foam where the krausen stood.
	if (b.ring > 2) {
		const ringTop = surface - b.ring;
		const ring = ctx.createLinearGradient(0, ringTop - 4, 0, surface);
		ring.addColorStop(0, alpha(pal.woodDark, 0.9));
		ring.addColorStop(0.2, alpha(pal.wood, 0.55));
		ring.addColorStop(1, alpha(pal.wood, 0.2));
		ctx.fillStyle = ring;
		ctx.fillRect(b.cx - half, ringTop - 4, b.w, b.ring + 4);
		// The crust line itself, uneven where the foam peaked.
		ctx.strokeStyle = alpha(pal.woodDark, 0.85);
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let x = 0; x <= b.w; x += 10) {
			const y = ringTop - 3 + Math.sin(x * 0.17) * 2 + Math.sin(x * 0.05 + 2) * 2;
			if (x === 0) ctx.moveTo(b.cx - half + x, y);
			else ctx.lineTo(b.cx - half + x, y);
		}
		ctx.stroke();
	}
	// The wort, seen through the plastic.
	const wort = ctx.createLinearGradient(0, surface, 0, b.bottom);
	wort.addColorStop(0, alpha(b.wort, 0.6));
	wort.addColorStop(1, alpha(b.wort, 0.85));
	ctx.fillStyle = wort;
	ctx.fillRect(b.cx - half, surface, b.w, b.bottom - surface);
	// Yeast in suspension: a pale cloud through the beer.
	if (b.haze > 0.01) {
		ctx.fillStyle = alpha(pal.plastic, b.haze * 0.45);
		ctx.fillRect(b.cx - half, surface, b.w, b.bottom - surface);
	}
	// CO₂ coming up through the beer.
	if (b.fizz > 0.02) {
		ctx.fillStyle = alpha(pal.fg, 0.55);
		const n = Math.round(10 + b.fizz * 30);
		for (let i = 0; i < n; i++) {
			const p = fract(b.t * (0.3 + 0.5 * b.fizz) + i * 0.137);
			ctx.globalAlpha = b.fizz * (1 - p);
			ctx.beginPath();
			ctx.arc(
				b.cx - half + 24 + ((i * 61) % (b.w - 48)) + Math.sin(p * 8 + i) * 3,
				b.bottom - 10 - p * (b.bottom - surface - 12),
				1.2 + (i % 3) * 0.6,
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}
	// The foam: a lumpy cream band on top of the wort.
	if (b.krausen > 1) {
		ctx.beginPath();
		ctx.moveTo(b.cx - half, surface + 2);
		for (let x = 0; x <= b.w; x += 8) {
			const bump = Math.sin(x * 0.21 + 1.3) * 3 + Math.sin(x * 0.07) * 4;
			ctx.lineTo(b.cx - half + x, surface - b.krausen + bump * clamp(b.krausen / 20, 0, 1));
		}
		ctx.lineTo(b.cx + half, surface + 2);
		ctx.closePath();
		const foam = ctx.createLinearGradient(0, surface - b.krausen, 0, surface);
		foam.addColorStop(0, pal.plastic);
		foam.addColorStop(0.35, pal.woodLight);
		foam.addColorStop(1, pal.wood);
		ctx.fillStyle = foam;
		ctx.fill();
		ctx.strokeStyle = alpha(pal.woodDark, 0.6);
		ctx.lineWidth = 1.5;
		ctx.stroke();
		// Brown flecks of hop resin and dead yeast in the foam.
		ctx.fillStyle = alpha(pal.woodDark, 0.55);
		for (let i = 0; i < b.krausen * 1.4; i++) {
			const x = b.cx - half + 10 + ((i * 53) % (b.w - 20));
			const y = surface - ((i * 29) % Math.max(2, b.krausen - 3)) - 2;
			ctx.beginPath();
			ctx.arc(x, y, 1.6, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	// Dry hops: green flecks riding the foam.
	if (b.hops > 0) {
		ctx.fillStyle = alpha(pal.hop, 0.85);
		for (let i = 0; i < b.hops * 26; i++) {
			const x = b.cx - half + 18 + ((i * 47) % (b.w - 36));
			const y = surface - b.krausen * 0.5 + Math.sin(b.t * 0.6 + i) * 1.5 + ((i * 13) % 6);
			ctx.beginPath();
			ctx.ellipse(x, y, 3, 2, i, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	// Plastic sheen over everything inside: the wall is in front of the beer.
	ctx.fillStyle = cylinder(
		ctx,
		b.cx - half,
		b.cx + half,
		alpha(pal.fg, 0.42),
		alpha(pal.fg, 0.06),
		alpha(pal.shadow, 0.28)
	);
	ctx.fillRect(b.cx - half, top, b.w, b.h);
	ctx.restore();

	// Litre marks moulded into the side.
	ctx.strokeStyle = alpha(pal.ink, 0.35);
	ctx.fillStyle = alpha(pal.ink, 0.45);
	ctx.lineWidth = 1.5;
	ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	for (let l = 5; l <= 25; l += 5) {
		const y = b.bottom - (b.h * l) / 30;
		const x = b.cx + half * 0.55;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + 12, y);
		ctx.stroke();
		ctx.fillText(String(l), x + 15, y);
	}

	// The near rim.
	ctx.strokeStyle = pal.fg;
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.ellipse(b.cx, top, half, RIM_RY, 0, 0, Math.PI);
	ctx.stroke();
	ctx.strokeStyle = alpha(pal.shadow, 0.3);
	ctx.lineWidth = 1.5;
	bucketPath(ctx, b);
	ctx.stroke();

	// Handle, folded down at the side.
	ctx.strokeStyle = pal.steelDark;
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(b.cx - half + 4, top + 26);
	ctx.quadraticCurveTo(b.cx, top + 90, b.cx + half - 4, top + 26);
	ctx.stroke();
	for (const s of [-1, 1]) {
		ctx.fillStyle = pal.muted;
		ctx.beginPath();
		ctx.arc(b.cx + s * (half - 6), top + 26, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	if (b.lid > 0.01) drawLid(ctx, pal, b, top);
}

function drawLid(ctx: CanvasRenderingContext2D, pal: Palette, b: BucketLook, top: number) {
	const half = b.w / 2 + 6;
	const y = top - (1 - b.lid) * 60;
	ctx.save();
	ctx.globalAlpha = clamp(b.lid * 1.5, 0, 1);
	// Side band, then the face, seen from a little above.
	ctx.fillStyle = pal.muted;
	ctx.beginPath();
	ctx.ellipse(b.cx, y + 6, half, RIM_RY, 0, 0, Math.PI);
	ctx.lineTo(b.cx - half, y);
	ctx.fill();
	const face = ctx.createLinearGradient(b.cx - half, 0, b.cx + half, 0);
	face.addColorStop(0, pal.plastic);
	face.addColorStop(0.35, pal.fg);
	face.addColorStop(1, pal.muted);
	ctx.fillStyle = face;
	ctx.beginPath();
	ctx.ellipse(b.cx, y, half, RIM_RY, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = alpha(pal.shadow, 0.25);
	ctx.lineWidth = 1.5;
	ctx.stroke();

	// The airlock: a grommet, a stem, and a clear chamber with water in it.
	const ax = b.cx;
	const ay = y - 4;
	ctx.fillStyle = pal.ink;
	ctx.beginPath();
	ctx.ellipse(ax, ay + 2, 12, 4, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = alpha(pal.steelLight, 0.55);
	ctx.fillRect(ax - 4, ay - 26, 8, 28);
	const chamber = { x: ax - 16, y: ay - 70, w: 32, h: 46 };
	ctx.fillStyle = alpha(pal.steelLight, 0.3);
	ctx.beginPath();
	ctx.roundRect(chamber.x, chamber.y, chamber.w, chamber.h, 8);
	ctx.fill();
	ctx.fillStyle = alpha(pal.water, 0.75);
	ctx.beginPath();
	ctx.roundRect(chamber.x + 3, chamber.y + chamber.h * 0.45, chamber.w - 6, chamber.h * 0.5, 5);
	ctx.fill();
	if (b.bubble >= 0) {
		const by = lerp(chamber.y + chamber.h - 8, chamber.y + chamber.h * 0.45, b.bubble);
		ctx.strokeStyle = alpha(pal.fg, 0.9 * (1 - b.bubble * 0.6));
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(ax, by, 4 + b.bubble * 3, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.strokeStyle = alpha(pal.fg, 0.7);
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(chamber.x, chamber.y, chamber.w, chamber.h, 8);
	ctx.stroke();
	ctx.fillStyle = alpha(pal.fg, 0.45);
	ctx.fillRect(chamber.x + 5, chamber.y + 6, 4, chamber.h - 14);
	ctx.fillStyle = pal.muted;
	ctx.beginPath();
	ctx.roundRect(chamber.x - 2, chamber.y - 7, chamber.w + 4, 9, 3);
	ctx.fill();
	ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Pitching                                                                   */
/* -------------------------------------------------------------------------- */

const PITCH_BUCKET = { cx: 430, bottom: BENCH, w: 260, h: 290 };
const PACKET = { w: 64, h: 78 };

type Packet = {
	x: number;
	y: number;
	turn: number;
	state: 'full' | 'pouring' | 'empty';
	t: number;
};
type Dust = { x: number; y: number; vy: number; landed: boolean; spread: number };

export type PitchFrame = {
	wort: string;
	/** Share of the bucket height the wort reaches. */
	level: number;
	calm: boolean;
};

/** The packet's lip when it is held tipped over the bucket. */
const POUR_AT = { x: PITCH_BUCKET.cx + 30, y: PITCH_BUCKET.bottom - PITCH_BUCKET.h - 120 };

export class PitchScene {
	private t = 0;
	private packets: Packet[] = [];
	private dust: Dust[] = [];
	private rand = rng(0x79656173);
	private hover = -1;
	/** Set by the scene when a click on the canvas lands on a full packet. */
	onTear?: () => void;

	constructor(count: number) {
		for (let i = 0; i < count; i++) {
			this.packets.push({ x: 680 + i * 78, y: BENCH, turn: -0.08 + i * 0.07, state: 'full', t: 0 });
		}
	}

	get busy(): boolean {
		return this.packets.some((p) => p.state === 'pouring');
	}

	get left(): number {
		return this.packets.filter((p) => p.state === 'full').length;
	}

	/** Tear the next full packet and tip it in. False if nothing to tear or one is pouring. */
	tear(calm: boolean): boolean {
		if (this.busy) return false;
		const p = this.packets.find((q) => q.state === 'full');
		if (!p) return false;
		p.state = 'pouring';
		p.t = 0;
		if (calm) this.finishPour(p, true);
		return true;
	}

	private finishPour(p: Packet, calm: boolean) {
		p.state = 'empty';
		if (calm) {
			const s = this.surfaceY();
			for (let i = 0; i < 90; i++) {
				this.dust.push({
					x: PITCH_BUCKET.cx + (this.rand() - 0.5) * 120,
					y: s + (this.rand() - 0.5) * 12,
					vy: 0,
					landed: true,
					spread: 1
				});
			}
		}
	}

	private surfaceY(): number {
		// The wort surface seen inside the mouth of the bucket.
		return PITCH_BUCKET.bottom - PITCH_BUCKET.h + 14;
	}

	private hit(x: number, y: number): number {
		return this.packets.findIndex(
			(p) =>
				p.state === 'full' &&
				Math.abs(x - p.x) < PACKET.w * 0.7 &&
				y > p.y - PACKET.h - 10 &&
				y < p.y + 6
		);
	}

	cursor(input: PointerInput): string {
		return this.hit(input.x, input.y) >= 0 ? 'pointer' : 'default';
	}

	update(dt: number, f: PitchFrame, input: PointerInput) {
		this.t += dt;
		this.hover = input.present ? this.hit(input.x, input.y) : -1;
		if (input.pressed && this.hover >= 0 && !this.busy) {
			// The clicked one goes first, so the click feels like it picked that packet.
			const [p] = this.packets.splice(this.hover, 1);
			this.packets.unshift(p);
			if (this.tear(f.calm)) this.onTear?.();
		}

		const s = this.surfaceY();
		for (const p of this.packets) {
			if (p.state !== 'pouring') continue;
			p.t += dt;
			// Lift over the bucket, tip, and pour for a second and a half.
			if (p.t > 0.5 && p.t < 2.1) {
				for (let i = 0; i < 6; i++) {
					this.dust.push({
						x: POUR_AT.x - 18 + this.rand() * 10,
						y: POUR_AT.y + 10,
						vy: 40 + this.rand() * 60,
						landed: false,
						spread: 0
					});
				}
			}
			if (p.t > 2.5) {
				this.finishPour(p, false);
				p.x = PITCH_BUCKET.cx + 175 + this.packets.indexOf(p) * 14;
				p.turn = 1.35;
			}
		}
		for (const d of this.dust) {
			if (d.landed) {
				d.spread = Math.min(1, d.spread + dt * 0.25);
				continue;
			}
			d.vy += 500 * dt;
			d.y += d.vy * dt;
			d.x += Math.sin(d.y * 0.08 + d.vy) * 10 * dt;
			if (d.y >= s) {
				d.landed = true;
				d.y = s + (this.rand() - 0.5) * 10;
				d.x += (this.rand() - 0.5) * 110;
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D, f: PitchFrame, pal: Palette) {
		const b: BucketLook = {
			...PITCH_BUCKET,
			level: f.level,
			wort: f.wort,
			haze: 0.25,
			krausen: 0,
			ring: 0,
			lid: 0,
			bubble: -1,
			fizz: 0,
			hops: 0,
			t: this.t
		};
		const top = b.bottom - b.h;
		drawBucket(ctx, pal, b);

		// The wort, seen inside the open mouth, with the yeast settling on it.
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(b.cx, top, b.w / 2 - 4, RIM_RY - 3, 0, 0, Math.PI * 2);
		ctx.clip();
		const inside = ctx.createLinearGradient(0, top - RIM_RY, 0, top + RIM_RY);
		inside.addColorStop(0, alpha(pal.shadow, 0.9));
		inside.addColorStop(1, f.wort);
		ctx.fillStyle = inside;
		ctx.fillRect(b.cx - b.w / 2, top - RIM_RY, b.w, RIM_RY * 2);
		ctx.fillStyle = alpha(pal.lamp, 0.25);
		ctx.beginPath();
		ctx.ellipse(b.cx - 30, top + 6, 60, 5, 0, 0, Math.PI * 2);
		ctx.fill();
		for (const d of this.dust) {
			if (!d.landed) continue;
			ctx.fillStyle = alpha(pal.plastic, 0.75);
			ctx.beginPath();
			ctx.ellipse(d.x, d.y, 2.5 + d.spread * 7, 1.2 + d.spread * 2, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
		// The rim again, over the film.
		ctx.strokeStyle = pal.fg;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.ellipse(b.cx, top, b.w / 2, RIM_RY, 0, 0, Math.PI);
		ctx.stroke();

		// Dust still falling.
		ctx.fillStyle = alpha(pal.plastic, 0.9);
		for (const d of this.dust) {
			if (d.landed) continue;
			ctx.beginPath();
			ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
			ctx.fill();
		}

		for (let i = 0; i < this.packets.length; i++)
			this.drawPacket(ctx, pal, this.packets[i], i === this.hover);
	}

	private drawPacket(ctx: CanvasRenderingContext2D, pal: Palette, p: Packet, hover: boolean) {
		let x = p.x;
		let y = p.y;
		let turn = p.turn;
		let torn = p.state !== 'full';
		if (p.state === 'pouring') {
			const lift = clamp(p.t / 0.5, 0, 1);
			const back = clamp((p.t - 2.1) / 0.4, 0, 1);
			x = lerp(lerp(p.x, POUR_AT.x + 10, lift), PITCH_BUCKET.cx + 175, back);
			y = lerp(lerp(p.y, POUR_AT.y + PACKET.h, lift), BENCH, back);
			turn = lerp(lerp(p.turn, -2.3, lift), 1.35, back);
			torn = p.t > 0.4;
		}
		if (p.state === 'empty') {
			// Flattened on the bench where it was dropped.
			ctx.save();
			ctx.translate(x, BENCH - 5);
			ctx.rotate(0.15);
			ctx.fillStyle = cylinder(ctx, -26, 26, pal.steelLight, pal.steel, pal.steelDark);
			ctx.beginPath();
			ctx.roundRect(-26, -6, 52, 10, 3);
			ctx.fill();
			ctx.restore();
			return;
		}
		if (p.state === 'full') contactShadow(ctx, pal, x, BENCH, PACKET.w * 0.55, 0.8);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(turn);
		ctx.translate(0, -PACKET.h);
		if (hover) {
			ctx.shadowColor = alpha(pal.amber, 0.8);
			ctx.shadowBlur = 16;
		}
		// Foil sachet: a flat pillow with a crimped top, lit from the lamp.
		const foil = ctx.createLinearGradient(-PACKET.w / 2, 0, PACKET.w / 2, PACKET.h);
		foil.addColorStop(0, pal.steelLight);
		foil.addColorStop(0.45, pal.steel);
		foil.addColorStop(0.55, pal.steelLight);
		foil.addColorStop(1, pal.steelDark);
		ctx.fillStyle = foil;
		const top = torn ? 10 : 0;
		ctx.beginPath();
		ctx.moveTo(-PACKET.w / 2, top);
		ctx.lineTo(PACKET.w / 2, top);
		ctx.quadraticCurveTo(PACKET.w / 2 + 4, PACKET.h / 2, PACKET.w / 2, PACKET.h);
		ctx.lineTo(-PACKET.w / 2, PACKET.h);
		ctx.quadraticCurveTo(-PACKET.w / 2 - 4, PACKET.h / 2, -PACKET.w / 2, top);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = pal.amber;
		ctx.fillRect(-PACKET.w / 2, PACKET.h * 0.38, PACKET.w, PACKET.h * 0.3);
		ctx.fillStyle = pal.ink;
		ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('YEAST', 0, PACKET.h * 0.53);
		ctx.strokeStyle = alpha(pal.shadow, 0.35);
		ctx.lineWidth = 1;
		for (let i = 0; i < 4; i++) {
			const yy = (torn ? 12 : 2) + i * 2.5;
			ctx.beginPath();
			ctx.moveTo(-PACKET.w / 2 + 2, yy);
			ctx.lineTo(PACKET.w / 2 - 2, yy);
			ctx.stroke();
		}
		ctx.restore();
	}
}

/* -------------------------------------------------------------------------- */
/* Fermenting                                                                 */
/* -------------------------------------------------------------------------- */

const FRIDGE = { left: 250, right: 640, top: 96, bottom: BENCH - 6 };
const INSIDE = { left: 272, right: 618, top: 116, floor: BENCH - 30 };
const FERM_BUCKET = { cx: 445, bottom: INSIDE.floor, w: 210, h: 220 };
const CONTROLLER = { x: 664, y: 196, w: 92, h: 62 };
const JAR = { x: 742, w: 34, h: 170 };

export type FermentFrame = {
	wort: string;
	level: number;
	/** Gravity points that went in the last day. */
	activity: number;
	/** Yeast in suspension relative to a standard pitch. */
	suspended: number;
	setpointC: number;
	day: number;
	planDays: number;
	/** The last sample's reading, if one has been taken. */
	sample?: number;
	/** Dry-hop pouches on the fridge, and whether each has gone in. */
	pouches: { label: string; dropped: boolean }[];
	coldCrash: boolean;
	calm: boolean;
};

export class FermentScene {
	private t = 0;
	private krausen = 0;
	private ring = 0;
	private bubble = -1;
	private bubbleClock = 0;
	private lidLift = 0;
	private hopsIn = 0;
	private sampleShown = 0;
	private float = 0;
	private falling: { x: number; y: number; vy: number }[] = [];
	private rand = rng(0x6665726d);
	/** Set when a pouch on the fridge is clicked: the index of the pouch. */
	onDrop?: (index: number) => void;
	private hover = -1;

	private pouchAt(i: number) {
		return { x: FRIDGE.left + 70 + i * 74, y: FRIDGE.top };
	}

	private hitPouch(f: FermentFrame, x: number, y: number): number {
		return f.pouches.findIndex((p, i) => {
			const at = this.pouchAt(i);
			return !p.dropped && Math.abs(x - at.x) < 30 && y > at.y - 50 && y < at.y + 4;
		});
	}

	cursor(f: FermentFrame, input: PointerInput): string {
		return this.hitPouch(f, input.x, input.y) >= 0 ? 'pointer' : 'default';
	}

	/** Lift the lid and tip a pouch of hops in. */
	dropHops(calm: boolean) {
		this.lidLift = calm ? 0 : 1;
		this.hopsIn = Math.min(1, this.hopsIn + 0.5);
		if (calm) return;
		for (let i = 0; i < 40; i++) {
			this.falling.push({
				x: FERM_BUCKET.cx - 30 + this.rand() * 60,
				y: FERM_BUCKET.bottom - FERM_BUCKET.h - 50 - this.rand() * 30,
				vy: 30 + this.rand() * 80
			});
		}
	}

	update(dt: number, f: FermentFrame, input: PointerInput) {
		this.t += dt;
		this.hover = input.present ? this.hitPouch(f, input.x, input.y) : -1;
		if (input.pressed && this.hover >= 0) this.onDrop?.(this.hover);

		// Foam answers the day's activity: about 7 px per point a day, capped by the bucket.
		const want = clamp(f.activity * 7, 0, 52);
		this.krausen = f.calm ? want : approach(this.krausen, want, 1.5, dt);
		this.ring = Math.max(this.ring, this.krausen);

		// The airlock: one bubble every so often, more often the harder it works.
		const perSecond = clamp(f.activity * 0.6, 0, 5);
		if (f.calm || perSecond < 0.05) {
			this.bubble = -1;
		} else if (this.bubble >= 0) {
			this.bubble += dt * 2.6;
			if (this.bubble > 1) this.bubble = -1;
		} else {
			this.bubbleClock += dt * perSecond;
			if (this.bubbleClock >= 1) {
				this.bubbleClock = 0;
				this.bubble = 0;
			}
		}

		this.lidLift = f.calm ? 0 : Math.max(0, this.lidLift - dt * 0.7);
		for (const h of this.falling) {
			h.vy += 600 * dt;
			h.y += h.vy * dt;
		}
		const surface = wortSurface({ ...FERM_BUCKET, level: f.level });
		this.falling = this.falling.filter((h) => h.y < surface);

		// The hydrometer settles where the gravity puts it, bobbing a little first.
		if (f.sample !== undefined) {
			this.sampleShown = f.calm ? 1 : Math.min(1, this.sampleShown + dt * 2);
			const target = clamp((f.sample - 0.99) * 2600, 0, 160);
			this.float = f.calm ? target : approach(this.float, target, 3, dt);
		}
	}

	draw(ctx: CanvasRenderingContext2D, f: FermentFrame, pal: Palette) {
		this.drawFridge(ctx, pal, f);
		this.drawController(ctx, pal, f);
		this.drawJar(ctx, pal, f);
		drawTimer(ctx, pal, 860, BENCH - 54, 46, f.day, f.planDays, 'days');
	}

	private drawFridge(ctx: CanvasRenderingContext2D, pal: Palette, f: FermentFrame) {
		const { left: L, right: R, top: T, bottom: B } = FRIDGE;
		contactShadow(ctx, pal, (L + R) / 2, BENCH, (R - L) / 2 + 10);
		// Feet.
		ctx.fillStyle = pal.ink;
		for (const x of [L + 20, R - 34]) ctx.fillRect(x, B, 14, BENCH - B);

		// Cabinet: cream enamel with rounded corners, lit from the lamp.
		ctx.fillStyle = cylinder(ctx, L, R, pal.fg, pal.plastic, pal.muted, 0.5);
		ctx.beginPath();
		ctx.roundRect(L, T, R - L, B - T, 18);
		ctx.fill();

		// Inside: a lit box with a bulb in the top corner.
		const cold = clamp((12 - f.setpointC) / 8, 0, 1);
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(
			INSIDE.left,
			INSIDE.top,
			INSIDE.right - INSIDE.left,
			INSIDE.floor + 10 - INSIDE.top,
			8
		);
		ctx.clip();
		const back = ctx.createLinearGradient(0, INSIDE.top, 0, INSIDE.floor);
		back.addColorStop(0, pal.muted);
		back.addColorStop(1, pal.steelDark);
		ctx.fillStyle = back;
		ctx.fillRect(
			INSIDE.left,
			INSIDE.top,
			INSIDE.right - INSIDE.left,
			INSIDE.floor + 10 - INSIDE.top
		);
		// Side walls in shade, so the box has depth.
		ctx.fillStyle = alpha(pal.shadow, 0.3);
		ctx.beginPath();
		ctx.moveTo(INSIDE.left, INSIDE.top);
		ctx.lineTo(INSIDE.left + 26, INSIDE.top + 22);
		ctx.lineTo(INSIDE.left + 26, INSIDE.floor - 8);
		ctx.lineTo(INSIDE.left, INSIDE.floor + 10);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(INSIDE.right, INSIDE.top);
		ctx.lineTo(INSIDE.right - 26, INSIDE.top + 22);
		ctx.lineTo(INSIDE.right - 26, INSIDE.floor - 8);
		ctx.lineTo(INSIDE.right, INSIDE.floor + 10);
		ctx.fill();
		// Frost creeping in from the corners when it is set cold.
		if (cold > 0.05) {
			glow(ctx, INSIDE.left + 20, INSIDE.top + 20, 120, pal.water, cold * 0.8);
			glow(ctx, INSIDE.right - 20, INSIDE.top + 20, 120, pal.water, cold * 0.8);
		}
		ctx.restore();

		// The fermenter, sealed, on the fridge floor.
		const b: BucketLook = {
			...FERM_BUCKET,
			level: f.level,
			wort: f.wort,
			haze: clamp(f.suspended / 2.2, 0, 0.9),
			krausen: this.krausen,
			ring: this.ring,
			lid: 1 - this.lidLift,
			bubble: this.bubble,
			fizz: clamp(f.activity / 6, 0, 1),
			hops: this.hopsIn,
			t: this.t
		};
		drawBucket(ctx, pal, b);
		ctx.fillStyle = alpha(pal.hop, 0.9);
		for (const h of this.falling) {
			ctx.beginPath();
			ctx.ellipse(h.x, h.y, 3, 2, h.vy, 0, Math.PI * 2);
			ctx.fill();
		}

		// The bulb, and the light it throws on the fermenter.
		ctx.fillStyle = pal.lamp;
		ctx.beginPath();
		ctx.arc(INSIDE.right - 40, INSIDE.top + 14, 7, 0, Math.PI * 2);
		ctx.fill();
		glow(ctx, INSIDE.right - 40, INSIDE.top + 14, 180, cold > 0.5 ? pal.water : pal.lamp, 0.9);

		// Door seal and the open door swung out to the left.
		ctx.strokeStyle = alpha(pal.shadow, 0.45);
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.roundRect(
			INSIDE.left - 4,
			INSIDE.top - 4,
			INSIDE.right - INSIDE.left + 8,
			INSIDE.floor + 18 - INSIDE.top,
			10
		);
		ctx.stroke();
		const door = ctx.createLinearGradient(L - 110, 0, L, 0);
		door.addColorStop(0, pal.muted);
		door.addColorStop(1, pal.plastic);
		ctx.fillStyle = door;
		ctx.beginPath();
		ctx.moveTo(L + 2, T + 6);
		ctx.lineTo(L - 104, T + 34);
		ctx.lineTo(L - 104, B - 26);
		ctx.lineTo(L + 2, B - 4);
		ctx.closePath();
		ctx.fill();
		// Door shelves.
		ctx.strokeStyle = alpha(pal.shadow, 0.3);
		ctx.lineWidth = 3;
		for (const yy of [0.32, 0.62]) {
			ctx.beginPath();
			ctx.moveTo(L - 4, lerp(T + 6, B - 4, yy));
			ctx.lineTo(L - 96, lerp(T + 34, B - 26, yy));
			ctx.stroke();
		}
		if (f.coldCrash)
			drawTag(ctx, pal, L - 52, T + 70, 'Crash at the end', { small: true, highlight: true });

		// Dry-hop pouches lying on top of the fridge.
		f.pouches.forEach((p, i) => {
			if (p.dropped) return;
			const at = this.pouchAt(i);
			ctx.save();
			if (i === this.hover) {
				ctx.shadowColor = alpha(pal.amber, 0.8);
				ctx.shadowBlur = 14;
			}
			const g = ctx.createLinearGradient(at.x - 26, 0, at.x + 26, 0);
			g.addColorStop(0, pal.hopDim);
			g.addColorStop(0.4, pal.hop);
			g.addColorStop(1, pal.hopDim);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.roundRect(at.x - 26, at.y - 40, 52, 40, 6);
			ctx.fill();
			ctx.restore();
			drawTag(ctx, pal, at.x, at.y - 54, p.label, { small: true });
		});
	}

	private drawController(ctx: CanvasRenderingContext2D, pal: Palette, f: FermentFrame) {
		const c = CONTROLLER;
		// The probe cable runs into the fridge.
		ctx.strokeStyle = pal.ink;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(c.x + 10, c.y + c.h);
		ctx.quadraticCurveTo(c.x - 10, c.y + c.h + 60, FRIDGE.right - 4, c.y + c.h + 90);
		ctx.stroke();
		contactShadow(ctx, pal, c.x + c.w / 2 + 4, c.y + c.h + 4, c.w * 0.5, 0.4);
		ctx.fillStyle = cylinder(ctx, c.x, c.x + c.w, pal.steel, pal.steelDark, pal.ink, 0.4);
		ctx.beginPath();
		ctx.roundRect(c.x, c.y, c.w, c.h, 8);
		ctx.fill();
		ctx.fillStyle = pal.ink;
		ctx.beginPath();
		ctx.roundRect(c.x + 8, c.y + 8, c.w - 16, 30, 4);
		ctx.fill();
		const digits = f.setpointC.toFixed(1) + '°';
		ctx.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = pal.hop;
		ctx.fillText(digits, c.x + c.w / 2, c.y + 24);
		glow(ctx, c.x + c.w / 2, c.y + 24, 40, pal.hop, 0.35);
		ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
		ctx.fillStyle = pal.muted;
		ctx.fillText('SET', c.x + c.w / 2, c.y + c.h - 12);
	}

	private drawJar(ctx: CanvasRenderingContext2D, pal: Palette, f: FermentFrame) {
		if (f.sample === undefined || this.sampleShown <= 0) return;
		const a = this.sampleShown;
		const x = JAR.x;
		const bottom = BENCH;
		const top = bottom - JAR.h;
		const fill = top + 26;
		ctx.save();
		ctx.globalAlpha = a;
		contactShadow(ctx, pal, x + JAR.w / 2, bottom, JAR.w);
		// Foot.
		ctx.fillStyle = alpha(pal.steelLight, 0.5);
		ctx.beginPath();
		ctx.ellipse(x + JAR.w / 2, bottom - 3, JAR.w * 0.9, 5, 0, 0, Math.PI * 2);
		ctx.fill();
		// The beer sample.
		ctx.fillStyle = alpha(f.wort, 0.8);
		ctx.fillRect(x + 3, fill, JAR.w - 6, bottom - fill - 6);
		// Hydrometer: weighted bulb under the surface, the stem standing out of it.
		const hx = x + JAR.w / 2;
		const stemTop = fill - 10 - this.float * 0.35;
		ctx.fillStyle = alpha(pal.fg, 0.85);
		ctx.beginPath();
		ctx.ellipse(hx, fill + 70 - this.float * 0.35, 9, 26, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillRect(hx - 3, stemTop, 6, fill + 50 - stemTop);
		ctx.fillStyle = pal.danger;
		ctx.fillRect(hx - 3, fill - 2, 6, 3);
		// Glass.
		ctx.strokeStyle = alpha(pal.fg, 0.75);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(x, top, JAR.w, JAR.h - 4, [2, 2, 6, 6]);
		ctx.stroke();
		ctx.fillStyle = alpha(pal.fg, 0.35);
		ctx.fillRect(x + 5, top + 8, 4, JAR.h - 24);
		ctx.restore();
		if (a >= 1)
			drawTag(ctx, pal, x + JAR.w / 2, top - 18, f.sample.toFixed(3), { highlight: true });
	}
}
