/**
 * The sanitising bench: everything the cold wort will touch, laid out, and a
 * spray bottle of no-rinse sanitiser in your hand.
 *
 * You point the bottle and squeeze. The mist has to actually land on a piece
 * of kit for it to count — about a second of spray each — and what has been
 * done glistens wet afterwards, so the bench itself tells you what you have
 * missed. Anything left dry has only been rinsed, which is how the engine
 * reads it: the cold side is sanitised only if all of it is.
 */

import { rng } from '$lib/brewing/variance';
import {
	BENCH,
	alpha,
	approach,
	clamp,
	contactShadow,
	cylinder,
	lerp,
	type Palette,
	type PointerInput
} from './kit';
import { drawFermenter, drawSheen, sparkle, type Box } from './coldSideScene';

export type KitItem = {
	id: string;
	name: string;
	/** Where the mist has to land, in scene coordinates. */
	hit: Box;
	/** Where the bottle aims when the item's button is used instead of the pointer. */
	aim: { x: number; y: number };
};

export const KIT: KitItem[] = [
	{
		id: 'fermenter',
		name: 'fermenter',
		hit: { left: 110, right: 280, top: 270, bottom: BENCH },
		aim: { x: 195, y: 340 }
	},
	{
		id: 'lid',
		name: 'lid',
		hit: { left: 300, right: 470, top: BENCH - 40, bottom: BENCH },
		aim: { x: 385, y: BENCH - 16 }
	},
	{
		id: 'airlock',
		name: 'airlock',
		hit: { left: 490, right: 560, top: BENCH - 120, bottom: BENCH },
		aim: { x: 525, y: BENCH - 70 }
	},
	{
		id: 'siphon',
		name: 'siphon and hose',
		hit: { left: 585, right: 720, top: BENCH - 190, bottom: BENCH },
		aim: { x: 650, y: BENCH - 60 }
	},
	{
		id: 'spoon',
		name: 'spoon',
		hit: { left: 745, right: 850, top: BENCH - 230, bottom: BENCH },
		aim: { x: 790, y: BENCH - 80 }
	}
];

/** Brew-day seconds of mist that cover one piece of kit. */
const COVER_S = 0.9;
const MIST = 160;
const REST = { x: 905, y: BENCH };

type Drop = { x: number; y: number; vx: number; vy: number; life: number };

export class SanitiseScene {
	coverage = KIT.map(() => 0);
	private t = 0;
	private rand = rng(0x73616e69);
	private drops: Drop[] = [];
	private bottle = { x: REST.x, y: REST.y - 60 };
	private spraying = false;
	private squeeze = 0;
	/** The item a button asked for, sprayed automatically until it is done. */
	auto: number | undefined = undefined;

	get done(): number {
		return this.coverage.filter((c) => c >= 1).length;
	}

	isDone(i: number) {
		return this.coverage[i] >= 1;
	}

	/** Where the mist is aimed: the pointer, or the item a button asked for. */
	private aim(input: PointerInput) {
		if (this.auto !== undefined) return KIT[this.auto].aim;
		if (input.present) return { x: input.x, y: input.y };
		return undefined;
	}

	update(dt: number, input: PointerInput, calm: boolean) {
		this.t += dt;
		if (this.auto !== undefined && this.isDone(this.auto)) this.auto = undefined;
		const aim = this.aim(input);
		// The bottle hovers up and to the right of where it points.
		const want = aim ? { x: aim.x + 60, y: aim.y - 46 } : { x: REST.x, y: REST.y - 60 };
		this.bottle.x = calm ? want.x : approach(this.bottle.x, want.x, 14, dt);
		this.bottle.y = calm ? want.y : approach(this.bottle.y, want.y, 14, dt);
		const near = aim
			? Math.hypot(this.bottle.x - aim.x - 60, this.bottle.y - aim.y + 46) < 30
			: false;
		this.spraying = !!aim && near && (this.auto !== undefined || input.down);
		this.squeeze = approach(this.squeeze, this.spraying ? 1 : 0, 20, dt);

		if (this.spraying && aim) {
			KIT.forEach((item, i) => {
				const h = item.hit;
				if (
					aim.x > h.left - 14 &&
					aim.x < h.right + 14 &&
					aim.y > h.top - 14 &&
					aim.y < h.bottom + 6
				) {
					this.coverage[i] = Math.min(1, this.coverage[i] + dt / COVER_S);
				}
			});
			if (!calm) {
				const nozzle = this.nozzle();
				for (let k = 0; k < 6 && this.drops.length < MIST; k++) {
					const dx = aim.x - nozzle.x;
					const dy = aim.y - nozzle.y;
					const spread = (this.rand() - 0.5) * 0.6;
					const speed = 2.2 + this.rand() * 1.2;
					const c = Math.cos(spread);
					const s = Math.sin(spread);
					this.drops.push({
						x: nozzle.x,
						y: nozzle.y,
						vx: (dx * c - dy * s) * speed,
						vy: (dx * s + dy * c) * speed,
						life: 1
					});
				}
			}
		}
		for (const d of this.drops) {
			d.x += d.vx * dt;
			d.y += d.vy * dt;
			d.vx *= Math.exp(-dt * 4);
			d.vy = d.vy * Math.exp(-dt * 4) + 60 * dt;
			d.life -= dt * 1.6;
		}
		this.drops = this.drops.filter((d) => d.life > 0);
	}

	private nozzle() {
		// The nozzle tip, after the bottle's tilt.
		return { x: this.bottle.x - 46, y: this.bottle.y - 4 };
	}

	draw(ctx: CanvasRenderingContext2D, pal: Palette, sanitiser: string) {
		const sheen = (i: number) => clamp(this.coverage[i], 0, 1);

		// Fermenter.
		drawFermenter(ctx, pal, { left: 120, right: 270, top: 284, bottom: BENCH }, undefined, {
			sheen: sheen(0)
		});
		this.drawLid(ctx, pal, sheen(1));
		this.drawAirlock(ctx, pal, sheen(2));
		this.drawSiphon(ctx, pal, sheen(3));
		this.drawSpoon(ctx, pal, sheen(4));

		// Glints over finished pieces.
		KIT.forEach((item, i) => {
			if (!this.isDone(i)) return;
			const h = item.hit;
			for (let k = 0; k < 3; k++) {
				const p = (this.t * 0.6 + k * 0.37 + i * 0.21) % 1;
				const x = lerp(h.left + 10, h.right - 10, ((k * 53 + i * 31) % 97) / 97);
				const y = lerp(h.top + 10, h.bottom - 10, ((k * 29 + i * 17) % 89) / 89);
				sparkle(ctx, pal, x, y, 7 * Math.sin(p * Math.PI), 0.8 * Math.sin(p * Math.PI));
			}
		});

		// Mist.
		for (const d of this.drops) {
			const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 9);
			g.addColorStop(0, alpha(pal.fg, 0.35 * d.life));
			g.addColorStop(1, alpha(pal.fg, 0));
			ctx.fillStyle = g;
			ctx.fillRect(d.x - 9, d.y - 9, 18, 18);
		}
		this.drawBottle(ctx, pal, sanitiser);
	}

	/* Kit ------------------------------------------------------------------ */

	private drawLid(ctx: CanvasRenderingContext2D, pal: Palette, sheen: number) {
		const cx = 385;
		const y = BENCH - 12;
		contactShadow(ctx, pal, cx, BENCH, 84);
		ctx.fillStyle = cylinder(ctx, cx - 82, cx + 82, pal.fg, pal.plastic, pal.muted);
		ctx.beginPath();
		ctx.roundRect(cx - 82, y - 4, 164, 14, 5);
		ctx.fill();
		ctx.fillStyle = pal.fg;
		ctx.beginPath();
		ctx.ellipse(cx, y - 4, 82, 13, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = alpha(pal.shadow, 0.2);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(cx, y - 4, 64, 9, 0, 0, Math.PI * 2);
		ctx.stroke();
		// The grommet the airlock goes into.
		ctx.fillStyle = pal.woodDark;
		ctx.beginPath();
		ctx.ellipse(cx + 18, y - 5, 9, 3.5, 0, 0, Math.PI * 2);
		ctx.fill();
		if (sheen > 0) {
			ctx.save();
			ctx.beginPath();
			ctx.ellipse(cx, y - 4, 82, 13, 0, 0, Math.PI * 2);
			ctx.clip();
			drawSheen(ctx, pal, { left: cx - 82, right: cx + 82, top: y - 18, bottom: y + 10 }, sheen);
			ctx.restore();
		}
	}

	private drawAirlock(ctx: CanvasRenderingContext2D, pal: Palette, sheen: number) {
		const cx = 525;
		contactShadow(ctx, pal, cx, BENCH, 24);
		// Rubber bung.
		ctx.fillStyle = pal.woodDark;
		ctx.beginPath();
		ctx.moveTo(cx - 16, BENCH);
		ctx.lineTo(cx + 16, BENCH);
		ctx.lineTo(cx + 11, BENCH - 26);
		ctx.lineTo(cx - 11, BENCH - 26);
		ctx.closePath();
		ctx.fill();
		// The S-shaped clear tube with a little water in its bends.
		const path = () => {
			ctx.beginPath();
			ctx.moveTo(cx, BENCH - 26);
			ctx.lineTo(cx, BENCH - 50);
			ctx.bezierCurveTo(cx, BENCH - 74, cx - 24, BENCH - 74, cx - 24, BENCH - 56);
			ctx.bezierCurveTo(cx - 24, BENCH - 40, cx + 24, BENCH - 40, cx + 24, BENCH - 70);
			ctx.lineTo(cx + 24, BENCH - 108);
		};
		ctx.strokeStyle = alpha(pal.plastic, 0.6);
		ctx.lineWidth = 9;
		path();
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.85);
		ctx.lineWidth = 1.5;
		path();
		ctx.stroke();
		ctx.fillStyle = alpha(pal.water, 0.7);
		ctx.beginPath();
		ctx.ellipse(cx - 12, BENCH - 47, 10, 4, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = pal.plastic;
		ctx.beginPath();
		ctx.roundRect(cx + 17, BENCH - 116, 14, 9, 3);
		ctx.fill();
		if (sheen > 0) {
			ctx.fillStyle = alpha(pal.fg, 0.8 * sheen);
			for (const [dx, dy] of [
				[-2, -36],
				[20, -82],
				[-20, -60],
				[8, -14]
			]) {
				ctx.beginPath();
				ctx.ellipse(cx + dx, BENCH + dy, 1.8, 2.6, 0, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	private drawSiphon(ctx: CanvasRenderingContext2D, pal: Palette, sheen: number) {
		const cx = 650;
		contactShadow(ctx, pal, cx, BENCH, 62);
		// A coil of clear hose lying on the bench...
		for (let i = 0; i < 4; i++) {
			ctx.strokeStyle = alpha(pal.plastic, 0.55);
			ctx.lineWidth = 7;
			ctx.beginPath();
			ctx.ellipse(cx - 6 + i * 4, BENCH - 14, 56 - i * 4, 12 - i, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.strokeStyle = alpha(pal.fg, 0.7);
			ctx.lineWidth = 1.2;
			ctx.stroke();
		}
		// ...and the rigid racking cane standing up out of it.
		const cane = () => {
			ctx.beginPath();
			ctx.moveTo(cx + 30, BENCH - 16);
			ctx.lineTo(cx + 30, BENCH - 160);
			ctx.quadraticCurveTo(cx + 30, BENCH - 186, cx + 6, BENCH - 186);
			ctx.quadraticCurveTo(cx - 16, BENCH - 186, cx - 16, BENCH - 164);
			ctx.lineTo(cx - 16, BENCH - 130);
		};
		ctx.strokeStyle = alpha(pal.plastic, 0.75);
		ctx.lineWidth = 8;
		cane();
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.9);
		ctx.lineWidth = 1.5;
		cane();
		ctx.stroke();
		if (sheen > 0) {
			ctx.fillStyle = alpha(pal.fg, 0.85 * sheen);
			for (let i = 0; i < 6; i++) {
				ctx.beginPath();
				ctx.ellipse(cx + 30, BENCH - 30 - i * 22, 2, 3, 0, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	private drawSpoon(ctx: CanvasRenderingContext2D, pal: Palette, sheen: number) {
		// Leaning against the tiles: handle up, bowl on the bench.
		const foot = { x: 780, y: BENCH - 6 };
		const top = { x: 830, y: BENCH - 226 };
		contactShadow(ctx, pal, foot.x, BENCH, 30);
		ctx.strokeStyle = pal.plastic;
		ctx.lineWidth = 9;
		ctx.beginPath();
		ctx.moveTo(foot.x + 4, foot.y - 30);
		ctx.lineTo(top.x, top.y);
		ctx.stroke();
		ctx.strokeStyle = alpha(pal.fg, 0.8);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(foot.x + 2, foot.y - 30);
		ctx.lineTo(top.x - 2, top.y);
		ctx.stroke();
		ctx.save();
		ctx.translate(foot.x, foot.y - 16);
		ctx.rotate(0.22);
		ctx.fillStyle = cylinder(ctx, -15, 15, pal.fg, pal.plastic, pal.muted);
		ctx.beginPath();
		ctx.ellipse(0, 0, 15, 22, 0, 0, Math.PI * 2);
		ctx.fill();
		if (sheen > 0) {
			ctx.fillStyle = alpha(pal.fg, 0.7 * sheen);
			ctx.beginPath();
			ctx.ellipse(-5, -6, 4, 9, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
		if (sheen > 0) {
			ctx.fillStyle = alpha(pal.fg, 0.85 * sheen);
			for (let i = 1; i < 6; i++) {
				const p = i / 6;
				ctx.beginPath();
				ctx.ellipse(
					lerp(foot.x + 4, top.x, p) + 3,
					lerp(foot.y - 30, top.y, p),
					1.8,
					2.6,
					0,
					0,
					Math.PI * 2
				);
				ctx.fill();
			}
		}
	}

	/* The bottle ------------------------------------------------------------ */

	private drawBottle(ctx: CanvasRenderingContext2D, pal: Palette, sanitiser: string) {
		const { x, y } = this.bottle;
		const resting = Math.abs(x - REST.x) < 4 && Math.abs(y - (REST.y - 60)) < 4;
		if (resting) contactShadow(ctx, pal, x, BENCH, 34);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(resting ? 0 : -0.35);
		// Body: translucent plastic with the sanitiser showing through.
		const body = () => {
			ctx.beginPath();
			ctx.roundRect(-26, -10, 52, 70, 10);
		};
		body();
		ctx.fillStyle = alpha(pal.plastic, 0.35);
		ctx.fill();
		ctx.save();
		body();
		ctx.clip();
		ctx.fillStyle = cylinder(
			ctx,
			-26,
			26,
			alpha(sanitiser, 0.9),
			alpha(sanitiser, 0.7),
			alpha(sanitiser, 0.45)
		);
		ctx.fillRect(-26, 12, 52, 50);
		ctx.restore();
		ctx.strokeStyle = alpha(pal.fg, 0.6);
		ctx.lineWidth = 1.5;
		body();
		ctx.stroke();
		// A label.
		ctx.fillStyle = pal.plastic;
		ctx.fillRect(-20, 20, 40, 20);
		ctx.fillStyle = pal.ink;
		ctx.font = '700 8px ui-sans-serif, system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('NO-RINSE', 0, 33);
		// Trigger head and nozzle, pointing down to the left.
		ctx.fillStyle = pal.ink;
		ctx.beginPath();
		ctx.roundRect(-16, -32, 32, 24, 6);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-16, -30);
		ctx.lineTo(-42, -24);
		ctx.lineTo(-42, -16);
		ctx.lineTo(-16, -14);
		ctx.closePath();
		ctx.fill();
		// Trigger, pulled in as you squeeze.
		ctx.fillStyle = pal.steelDark;
		ctx.beginPath();
		ctx.roundRect(-26 + this.squeeze * 6, -12, 8, 22, 4);
		ctx.fill();
		ctx.restore();
	}
}
