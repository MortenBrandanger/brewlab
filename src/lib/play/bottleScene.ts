/**
 * The bottling bench: a kitchen scale, a bowl of priming sugar, and a row of
 * brown bottles waiting under the bottling bucket.
 *
 * The one decision here is the dose. You spoon dextrose into the bowl on the
 * scale and the display reads the grams, which is all a brewer has to go on.
 * The flourish afterwards — the bucket filling each bottle in turn and the
 * caps going on — is not a decision, so it plays by itself once the dose is
 * stirred in.
 *
 * The bottles are lit like everything else on the bench: one lamp above, so
 * each has a specular streak on its lamp-side shoulder and a contact shadow
 * where it stands. Sugar grains are seeded, so the same dose always falls the
 * same way.
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
	lerp,
	type Palette
} from './kit';

const SCALE = { x: 300, w: 170, h: 40 };
const BOWL = { rx: 62, depth: 34 };
const BOWL_TOP = BENCH - SCALE.h - 8 - BOWL.depth;
const BAG = { x: 120, w: 96, h: 124 };
const CRATE = { left: 488, right: 620, top: BENCH - 168 };
const BUCKET = { left: 500, right: 608, top: CRATE.top - 150 };
const BOTTLES = 6;
const BOTTLE = { first: 668, gap: 50, bodyW: 38, bodyH: 96, neckW: 15, neckH: 46 };

export type BottleFrame = {
	grams: number;
	spooning: boolean;
	removing: boolean;
	/** 0–1 progress of filling and capping, once the dose is stirred in. */
	fill: number;
	/** The beer's colour, from the engine. */
	beer: string;
	calm: boolean;
};

type Grain = { x: number; y: number; vx: number; vy: number; landed: boolean };

export class BottleScene {
	private t = 0;
	private rand = rng(0x626f7474);
	private grains: Grain[] = [];
	private spoon = 0;
	private dip = 0;
	private spawn = 0;

	update(dt: number, f: BottleFrame) {
		this.t += dt;
		const active = f.spooning || f.removing;
		this.spoon = f.calm ? (active ? 1 : 0) : approach(this.spoon, active ? 1 : 0, 8, dt);
		this.dip = f.calm ? (f.removing ? 1 : 0) : approach(this.dip, f.removing ? 1 : 0, 6, dt);

		if (f.spooning && !f.calm) {
			this.spawn += dt * 90;
			while (this.spawn >= 1) {
				this.spawn -= 1;
				const tip = this.spoonTip();
				this.grains.push({
					x: tip.x + (this.rand() - 0.5) * 10,
					y: tip.y,
					vx: (this.rand() - 0.5) * 30,
					vy: this.rand() * 40,
					landed: false
				});
			}
		}
		const floor = this.moundTop(f.grams);
		for (const g of this.grains) {
			if (g.landed) continue;
			g.vy += 900 * dt;
			g.x += g.vx * dt;
			g.y += g.vy * dt;
			if (g.y >= floor) g.landed = true;
		}
		this.grains = this.grains.filter((g) => !g.landed);
	}

	/** The surface of the sugar heap: rises with the square root of the dose. */
	private moundTop(grams: number) {
		return BENCH - SCALE.h - 14 - Math.min(BOWL.depth + 6, Math.sqrt(Math.max(0, grams)) * 2.6);
	}

	private spoonTip() {
		return {
			x: SCALE.x + 6,
			y: lerp(BOWL_TOP - 60, BOWL_TOP + 8, this.dip)
		};
	}

	draw(ctx: CanvasRenderingContext2D, f: BottleFrame, pal: Palette) {
		this.drawBag(ctx, pal);
		this.drawScale(ctx, pal, f.grams);
		this.drawCrateAndBucket(ctx, pal, f);
		for (let i = 0; i < BOTTLES; i++) this.drawBottle(ctx, pal, f, i);
		this.drawFillLine(ctx, pal, f);
		for (const g of this.grains) {
			ctx.fillStyle = pal.fg;
			ctx.fillRect(g.x, g.y, 2, 2);
		}
		if (this.spoon > 0.02) this.drawSpoon(ctx, pal);
	}

	/* Sugar ---------------------------------------------------------------- */

	private drawBag(ctx: CanvasRenderingContext2D, pal: Palette) {
		const { x, w, h } = BAG;
		contactShadow(ctx, pal, x, BENCH, w * 0.55);
		ctx.fillStyle = cylinder(ctx, x - w / 2, x + w / 2, pal.plastic, pal.woodLight, pal.wood, 0);
		ctx.beginPath();
		ctx.moveTo(x - w / 2, BENCH);
		ctx.lineTo(x - w / 2 + 4, BENCH - h);
		// The rolled-down top of a paper sack.
		ctx.lineTo(x + w / 2 - 4, BENCH - h);
		ctx.lineTo(x + w / 2, BENCH);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = pal.woodDark;
		ctx.fillRect(x - w / 2 + 4, BENCH - h, w - 8, 10);
		ctx.fillStyle = pal.fg;
		ctx.beginPath();
		ctx.ellipse(x, BENCH - h + 2, w / 2 - 10, 7, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		drawTag(ctx, pal, x, BENCH - h * 0.5, 'Dextrose', { small: true });
	}

	private drawScale(ctx: CanvasRenderingContext2D, pal: Palette, grams: number) {
		const { x, w, h } = SCALE;
		const top = BENCH - h;
		contactShadow(ctx, pal, x, BENCH, w * 0.55);
		const body = ctx.createLinearGradient(0, top, 0, BENCH);
		body.addColorStop(0, pal.steelLight);
		body.addColorStop(0.4, pal.steel);
		body.addColorStop(1, pal.steelDark);
		ctx.fillStyle = body;
		ctx.beginPath();
		ctx.roundRect(x - w / 2, top, w, h, 8);
		ctx.fill();
		// The display: amber digits on black, the one number you go by.
		ctx.fillStyle = pal.ink;
		ctx.beginPath();
		ctx.roundRect(x - 46, top + 10, 92, 24, 4);
		ctx.fill();
		ctx.fillStyle = pal.amber;
		ctx.font = '600 17px ui-monospace, SFMono-Regular, Menlo, monospace';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.fillText(`${Math.round(grams)} g`, x + 40, top + 23);
		// Platform and bowl.
		ctx.fillStyle = pal.steelLight;
		ctx.beginPath();
		ctx.ellipse(x, top - 3, w / 2 - 14, 7, 0, 0, Math.PI * 2);
		ctx.fill();

		const rimY = BOWL_TOP;
		const bowl = ctx.createLinearGradient(x - BOWL.rx, 0, x + BOWL.rx, 0);
		// A steel bowl, so the white sugar reads against it.
		bowl.addColorStop(0, pal.steelDark);
		bowl.addColorStop(0.3, pal.steelLight);
		bowl.addColorStop(1, pal.steelDark);
		ctx.fillStyle = bowl;
		ctx.beginPath();
		ctx.moveTo(x - BOWL.rx, rimY);
		ctx.bezierCurveTo(
			x - BOWL.rx,
			rimY + BOWL.depth + 6,
			x + BOWL.rx,
			rimY + BOWL.depth + 6,
			x + BOWL.rx,
			rimY
		);
		ctx.closePath();
		ctx.fill();
		// The sugar heap, seen over the rim.
		if (grams > 0.5) {
			const mound = this.moundTop(grams);
			ctx.fillStyle = pal.fg;
			ctx.beginPath();
			ctx.ellipse(x, Math.min(rimY, mound + 6), BOWL.rx - 8, 8, 0, 0, Math.PI * 2);
			ctx.fill();
			if (mound < rimY) {
				ctx.beginPath();
				ctx.moveTo(x - 40, rimY);
				ctx.quadraticCurveTo(x, mound - 6, x + 40, rimY);
				ctx.fill();
			}
		}
		ctx.strokeStyle = pal.steelLight;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.ellipse(x, rimY, BOWL.rx, 8, 0, 0, Math.PI);
		ctx.stroke();
	}

	private drawSpoon(ctx: CanvasRenderingContext2D, pal: Palette) {
		const tip = this.spoonTip();
		ctx.save();
		ctx.globalAlpha = this.spoon;
		ctx.strokeStyle = pal.steel;
		ctx.lineWidth = 6;
		ctx.beginPath();
		ctx.moveTo(tip.x + 110, tip.y - 70);
		ctx.lineTo(tip.x + 14, tip.y - 4);
		ctx.stroke();
		ctx.translate(tip.x, tip.y);
		ctx.rotate(-0.6 + this.dip * 0.6);
		ctx.fillStyle = pal.steelLight;
		ctx.beginPath();
		ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = pal.fg;
		ctx.beginPath();
		ctx.ellipse(0, -2, 13, 5, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/* Bottling ------------------------------------------------------------- */

	private drawCrateAndBucket(ctx: CanvasRenderingContext2D, pal: Palette, f: BottleFrame) {
		const { left: L, right: R, top: T } = CRATE;
		contactShadow(ctx, pal, (L + R) / 2, BENCH, (R - L) * 0.55);
		const wood = ctx.createLinearGradient(0, T, 0, BENCH);
		wood.addColorStop(0, pal.woodLight);
		wood.addColorStop(1, pal.woodDark);
		ctx.fillStyle = wood;
		ctx.fillRect(L, T, R - L, BENCH - T);
		ctx.strokeStyle = alpha(pal.shadow, 0.55);
		ctx.lineWidth = 2;
		for (let y = T + 42; y < BENCH; y += 42) {
			ctx.beginPath();
			ctx.moveTo(L, y);
			ctx.lineTo(R, y);
			ctx.stroke();
		}
		ctx.strokeRect(L, T, R - L, BENCH - T);

		// The bottling bucket, its level falling as the bottles fill.
		const { left: bl, right: br, top: bt } = BUCKET;
		contactShadow(ctx, pal, (bl + br) / 2, T, (br - bl) * 0.55, 0.8);
		ctx.fillStyle = cylinder(ctx, bl, br, pal.fg, pal.plastic, pal.muted);
		ctx.beginPath();
		ctx.moveTo(bl, bt);
		ctx.lineTo(br, bt);
		ctx.lineTo(br - 8, T);
		ctx.lineTo(bl + 8, T);
		ctx.closePath();
		ctx.fill();
		const level = lerp(bt + 26, T - 10, clamp(f.fill, 0, 1));
		ctx.fillStyle = alpha(f.beer, 0.45);
		ctx.fillRect(bl + 6, level, br - bl - 12, T - level - 2);
		ctx.fillStyle = pal.fg;
		ctx.fillRect(bl - 3, bt - 3, br - bl + 6, 7);
		// Tap.
		ctx.fillStyle = pal.steelDark;
		ctx.fillRect(br - 6, T - 22, 18, 10);
	}

	private bottleX(i: number) {
		return BOTTLE.first + i * BOTTLE.gap;
	}

	private bottlePath(ctx: CanvasRenderingContext2D, cx: number) {
		const { bodyW, bodyH, neckW, neckH } = BOTTLE;
		const shoulder = BENCH - bodyH;
		ctx.beginPath();
		ctx.moveTo(cx - bodyW / 2, BENCH - 3);
		ctx.lineTo(cx - bodyW / 2, shoulder);
		ctx.bezierCurveTo(
			cx - bodyW / 2,
			shoulder - 22,
			cx - neckW / 2,
			shoulder - 18,
			cx - neckW / 2,
			shoulder - 30
		);
		ctx.lineTo(cx - neckW / 2, shoulder - neckH);
		ctx.lineTo(cx + neckW / 2, shoulder - neckH);
		ctx.lineTo(cx + neckW / 2, shoulder - 30);
		ctx.bezierCurveTo(
			cx + neckW / 2,
			shoulder - 18,
			cx + bodyW / 2,
			shoulder - 22,
			cx + bodyW / 2,
			shoulder
		);
		ctx.lineTo(cx + bodyW / 2, BENCH - 3);
		ctx.quadraticCurveTo(cx + bodyW / 2, BENCH, cx + bodyW / 2 - 4, BENCH);
		ctx.lineTo(cx - bodyW / 2 + 4, BENCH);
		ctx.quadraticCurveTo(cx - bodyW / 2, BENCH, cx - bodyW / 2, BENCH - 3);
		ctx.closePath();
	}

	/** Local progress for one bottle: the liquid runs in, then the cap goes on. */
	private progress(f: BottleFrame, i: number) {
		const local = clamp(f.fill * BOTTLES - i, 0, 1);
		return { liquid: clamp(local / 0.7, 0, 1), cap: clamp((local - 0.7) / 0.3, 0, 1) };
	}

	private drawBottle(ctx: CanvasRenderingContext2D, pal: Palette, f: BottleFrame, i: number) {
		const cx = this.bottleX(i);
		const { bodyW, bodyH, neckH } = BOTTLE;
		const { liquid, cap } = this.progress(f, i);
		contactShadow(ctx, pal, cx, BENCH, bodyW * 0.6);

		// Brown glass: dark, with the beer showing as a deeper band where it fills.
		this.bottlePath(ctx, cx);
		ctx.fillStyle = cylinder(
			ctx,
			cx - bodyW / 2,
			cx + bodyW / 2,
			alpha(pal.copper, 0.85),
			alpha(pal.woodDark, 0.92),
			alpha(pal.shadow, 0.95)
		);
		ctx.fill();
		if (liquid > 0) {
			ctx.save();
			this.bottlePath(ctx, cx);
			ctx.clip();
			const fullY = BENCH - bodyH - neckH + 18;
			const y = lerp(BENCH, fullY, liquid);
			ctx.fillStyle = alpha(f.beer, 0.35);
			ctx.fillRect(cx - bodyW / 2, y, bodyW, BENCH - y);
			ctx.fillStyle = alpha(pal.shadow, 0.35);
			ctx.fillRect(cx - bodyW / 2, y, bodyW, BENCH - y);
			ctx.fillStyle = alpha(pal.amber, 0.5);
			ctx.fillRect(cx - bodyW / 2 + 3, y, bodyW - 6, 2);
			ctx.restore();
		}
		// The specular streak on the lamp side, shoulder and body.
		ctx.strokeStyle = alpha(pal.fg, 0.55);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx - bodyW / 2 + 9, BENCH - 12);
		ctx.lineTo(cx - bodyW / 2 + 9, BENCH - bodyH + 4);
		ctx.stroke();
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(cx - 4, BENCH - bodyH - 34);
		ctx.lineTo(cx - 4, BENCH - bodyH - neckH + 4);
		ctx.stroke();

		// The crown cap, dropping on from above.
		const capTop = BENCH - bodyH - neckH;
		if (cap > 0 || f.fill >= 1) {
			const c = f.fill >= 1 ? 1 : cap;
			const y = lerp(capTop - 60, capTop - 6, c);
			ctx.save();
			ctx.globalAlpha = clamp(c * 2, 0, 1);
			ctx.fillStyle = cylinder(ctx, cx - 11, cx + 11, pal.amber, pal.copper, pal.copperDark);
			ctx.beginPath();
			ctx.roundRect(cx - 11, y, 22, 9, 2);
			ctx.fill();
			ctx.restore();
		}
	}

	/** The bottling wand's tube, from the bucket tap into whichever bottle is filling. */
	private drawFillLine(ctx: CanvasRenderingContext2D, pal: Palette, f: BottleFrame) {
		if (f.fill <= 0 || f.fill >= 1) return;
		const i = Math.min(BOTTLES - 1, Math.floor(f.fill * BOTTLES));
		const { liquid } = this.progress(f, i);
		if (liquid >= 1) return;
		const cx = this.bottleX(i);
		const tapX = BUCKET.right + 10;
		const tapY = CRATE.top - 14;
		const mouth = BENCH - BOTTLE.bodyH - BOTTLE.neckH;
		ctx.strokeStyle = alpha(pal.plastic, 0.85);
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(tapX, tapY);
		ctx.bezierCurveTo(tapX + 20, tapY + 30, cx, mouth - 50, cx, mouth - 4);
		ctx.lineTo(cx, BENCH - 30);
		ctx.stroke();
		ctx.strokeStyle = alpha(f.beer, 0.7);
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}
