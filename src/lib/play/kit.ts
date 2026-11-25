/**
 * The workshop every hands-on scene stands in, and the brushes they paint with.
 *
 * The brew day happens along one long bench in a home brewery at dusk. Each
 * step is a different stretch of that bench — the mash tun, the kettle, the
 * fermenter in its corner — and moving to the next step slides the wall
 * behind you along, so the day reads as walking down the bench rather than
 * turning the page of a form.
 *
 * The look is flat illustration with painted light, the rung of the ladder in
 * `GRAPHICS.md` that says "canvas 2D": shapes are filled with gradients
 * rather than single colours, a soft contact shadow sits under everything that
 * touches the bench, hot things glow additively, and the background is drawn
 * once, slightly blurred, so the foreground reads as being in focus. One key
 * light, the lamp above the bench; the window is only dusk seen through glass
 * and lights nothing.
 *
 * Colours come from the `--color-scene-*` tokens and the app's accents. A
 * canvas cannot read a class, so `readPalette` resolves the custom properties
 * once and hands the strings to the scenes. Canvas accepts OKLCH strings for
 * painting; it is only reading one back as a string that fails.
 *
 * Nothing here is random. The wood grain, the jars on the shelf and the steam
 * all come from the engine's seeded PRNG, because a scene that looked different
 * on every reload would be the one place where the same input did not give the
 * same picture.
 */

import { asset } from '$app/paths';
import { rng } from '$lib/brewing/variance';

/** Logical drawing size of every scene. The canvas scales this to its box. */
export const W = 960;
export const H = 600;
/** Where the bench top is, in scene coordinates. Everything stands on it. */
export const BENCH = 478;
/** How wide the painted wall is. A pan of 0–1 slides across this. */
const WALL_W = 2600;

export type Palette = {
	wall: string;
	wallLow: string;
	tile: string;
	dusk: string;
	duskLow: string;
	wood: string;
	woodLight: string;
	woodDark: string;
	steelLight: string;
	steel: string;
	steelDark: string;
	plastic: string;
	water: string;
	lamp: string;
	flame: string;
	shadow: string;
	copperLight: string;
	copper: string;
	copperDark: string;
	amber: string;
	hop: string;
	hopDim: string;
	danger: string;
	ink: string;
	fg: string;
	muted: string;
	surface: string;
};

const TOKENS: Record<keyof Palette, string> = {
	wall: 'scene-wall',
	wallLow: 'scene-wall-low',
	tile: 'scene-tile',
	dusk: 'scene-dusk',
	duskLow: 'scene-dusk-low',
	wood: 'scene-wood',
	woodLight: 'scene-wood-light',
	woodDark: 'scene-wood-dark',
	steelLight: 'scene-steel-light',
	steel: 'scene-steel',
	steelDark: 'scene-steel-dark',
	plastic: 'scene-plastic',
	water: 'scene-water',
	lamp: 'scene-lamp',
	flame: 'scene-flame',
	shadow: 'scene-shadow',
	copperLight: 'copper-text',
	copper: 'copper',
	copperDark: 'copper-dim',
	amber: 'amber',
	hop: 'hop',
	hopDim: 'hop-dim',
	danger: 'danger',
	ink: 'ink',
	fg: 'fg',
	muted: 'muted',
	surface: 'surface'
};

export function readPalette(el: Element = document.documentElement): Palette {
	const css = getComputedStyle(el);
	const out = {} as Palette;
	for (const [key, token] of Object.entries(TOKENS) as [keyof Palette, string][]) {
		out[key] = css.getPropertyValue(`--color-${token}`).trim() || 'gray';
	}
	return out;
}

/** The same colour with an alpha, for gradient stops. Works on oklch() and rgb(). */
export function alpha(colour: string, a: number): string {
	const v = Math.max(0, Math.min(1, a));
	if (colour.startsWith('oklch(') || colour.startsWith('rgb(')) {
		return colour.replace(/\s*\/\s*[\d.]+\s*\)$/, ')').replace(/\)$/, ` / ${v})`);
	}
	return colour;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const fract = (v: number) => v - Math.floor(v);
/** Exponential approach, frame-rate independent: `rate` is per second. */
export const approach = (from: number, to: number, rate: number, dt: number) =>
	from + (to - from) * (1 - Math.exp(-rate * dt));

/* -------------------------------------------------------------------------- */
/* Pointer                                                                    */
/* -------------------------------------------------------------------------- */

export type PointerInput = {
	/** Scene coordinates. */
	x: number;
	y: number;
	/** Scene pixels per second. */
	vx: number;
	vy: number;
	down: boolean;
	/** True on the one frame the press began. */
	pressed: boolean;
	/** True on the one frame the press ended. */
	released: boolean;
	/** False until the pointer has been over the canvas at all. */
	present: boolean;
};

/* -------------------------------------------------------------------------- */
/* Light                                                                      */
/* -------------------------------------------------------------------------- */

/** A soft additive glow. Hot metal, flame, the lamp. */
export function glow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	colour: string,
	strength = 1
) {
	if (strength <= 0.001 || r <= 0) return;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, alpha(colour, 0.5 * strength));
	g.addColorStop(0.35, alpha(colour, 0.18 * strength));
	g.addColorStop(1, alpha(colour, 0));
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** The dark, soft ellipse where something meets the bench. Sells the contact. */
export function contactShadow(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	cx: number,
	y: number,
	halfW: number,
	strength = 1
) {
	ctx.save();
	ctx.translate(cx, y);
	ctx.scale(1, 0.16);
	const g = ctx.createRadialGradient(0, 0, 0, 0, 0, halfW * 1.15);
	g.addColorStop(0, alpha(pal.shadow, 0.75 * strength));
	g.addColorStop(0.6, alpha(pal.shadow, 0.35 * strength));
	g.addColorStop(1, alpha(pal.shadow, 0));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(0, 0, halfW * 1.15, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/**
 * The shading of a round vessel seen side on: dark at both edges, lit a third
 * of the way in from the lamp side, with a narrow specular streak. This one
 * gradient is most of what makes a rectangle read as a cylinder.
 */
export function cylinder(
	ctx: CanvasRenderingContext2D,
	x0: number,
	x1: number,
	light: string,
	mid: string,
	dark: string,
	shine = 1
): CanvasGradient {
	const g = ctx.createLinearGradient(x0, 0, x1, 0);
	g.addColorStop(0, dark);
	g.addColorStop(0.12, mid);
	g.addColorStop(0.3, light);
	g.addColorStop(0.36, shine > 0 ? light : mid);
	g.addColorStop(0.42, mid);
	g.addColorStop(0.8, mid);
	g.addColorStop(0.94, dark);
	g.addColorStop(1, dark);
	return g;
}

/** A vertical body of liquid: lighter where the lamp catches the top. */
export function liquidFill(
	ctx: CanvasRenderingContext2D,
	top: number,
	bottom: number,
	colour: string,
	deep: string
): CanvasGradient {
	const g = ctx.createLinearGradient(0, top, 0, bottom);
	g.addColorStop(0, colour);
	g.addColorStop(1, deep);
	return g;
}

/* -------------------------------------------------------------------------- */
/* Steam                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Steam as a field of soft puffs that rise, widen and fade. Deterministic:
 * every puff's path is a function of its own seed and the clock.
 */
export class Steam {
	private seeds: { x: number; phase: number; speed: number; size: number }[] = [];
	private t = 0;
	constructor(count: number, seed: number) {
		const r = rng(seed);
		for (let i = 0; i < count; i++) {
			this.seeds.push({ x: r(), phase: r(), speed: 0.12 + r() * 0.1, size: 0.7 + r() * 0.6 });
		}
	}
	update(dt: number) {
		this.t += dt;
	}
	/**
	 * @param left,right the mouth it rises from
	 * @param y where it leaves the surface
	 * @param strength 0–1, how much is coming off
	 * @param rise how far up it travels before it is gone
	 */
	draw(
		ctx: CanvasRenderingContext2D,
		pal: Palette,
		left: number,
		right: number,
		y: number,
		strength: number,
		rise = 220
	) {
		if (strength < 0.02) return;
		ctx.save();
		for (const s of this.seeds) {
			const p = fract(this.t * s.speed + s.phase);
			const sway = Math.sin(this.t * 0.8 + s.phase * 12) * 18 * p;
			const x = lerp(left + 10, right - 10, s.x) + sway + p * 24;
			const yy = y - p * rise;
			const r = (14 + p * 46) * s.size;
			const a = Math.min(0.5, strength * Math.sin(p * Math.PI) * 0.3);
			const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
			g.addColorStop(0, alpha(pal.fg, a));
			g.addColorStop(1, alpha(pal.fg, 0));
			ctx.fillStyle = g;
			ctx.fillRect(x - r, yy - r, r * 2, r * 2);
		}
		ctx.restore();
	}
}

/* -------------------------------------------------------------------------- */
/* Instruments                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A dial thermometer, the kind clipped to the side of a pot. You read the
 * needle, the way a brewer does; the scene keeps the needle on a little spring
 * so it swings and settles rather than snapping, which is what a real bimetal
 * dial does too.
 */
export function drawDial(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	cx: number,
	cy: number,
	r: number,
	reading: number,
	opts: { min?: number; max?: number; target?: number; label?: string; unit?: string } = {}
) {
	const min = opts.min ?? 0;
	const max = opts.max ?? 100;
	const a0 = Math.PI * 0.75;
	const a1 = Math.PI * 2.25;
	const angle = (v: number) => lerp(a0, a1, clamp((v - min) / (max - min), 0, 1));

	contactShadow(ctx, pal, cx + 4, cy + r + 6, r * 0.8, 0.5);
	// Bezel: a steel ring lit from above.
	const bezel = ctx.createLinearGradient(0, cy - r, 0, cy + r);
	bezel.addColorStop(0, pal.steelLight);
	bezel.addColorStop(0.5, pal.steel);
	bezel.addColorStop(1, pal.steelDark);
	ctx.fillStyle = bezel;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
	// Face.
	const face = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
	face.addColorStop(0, pal.fg);
	face.addColorStop(1, pal.muted);
	ctx.fillStyle = face;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
	ctx.fill();

	// Ticks every 5, numbers every 20.
	ctx.strokeStyle = pal.ink;
	ctx.fillStyle = pal.ink;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `600 ${Math.round(r * 0.2)}px ui-sans-serif, system-ui, sans-serif`;
	const span = max - min;
	const minor = span > 60 ? 5 : span > 20 ? 1 : 0.5;
	const major = span > 60 ? 20 : span > 20 ? 10 : 2;
	for (let v = min; v <= max + 1e-6; v += minor) {
		const a = angle(v);
		const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
		ctx.lineWidth = isMajor ? 2 : 1;
		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
		ctx.lineTo(
			cx + Math.cos(a) * r * (isMajor ? 0.64 : 0.7),
			cy + Math.sin(a) * r * (isMajor ? 0.64 : 0.7)
		);
		ctx.stroke();
		if (isMajor) {
			ctx.fillText(String(Math.round(v)), cx + Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48);
		}
	}

	// The card's target, as the red pointer a brewer sets on the bezel.
	if (opts.target !== undefined) {
		const a = angle(opts.target);
		ctx.fillStyle = pal.danger;
		ctx.beginPath();
		ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
		ctx.lineTo(cx + Math.cos(a + 0.09) * r * 1.02, cy + Math.sin(a + 0.09) * r * 1.02);
		ctx.lineTo(cx + Math.cos(a - 0.09) * r * 1.02, cy + Math.sin(a - 0.09) * r * 1.02);
		ctx.closePath();
		ctx.fill();
	}

	if (opts.label) {
		ctx.fillStyle = pal.ink;
		ctx.font = `500 ${Math.round(r * 0.15)}px ui-sans-serif, system-ui, sans-serif`;
		ctx.fillText(opts.label, cx, cy + r * 0.5);
	}

	// Needle.
	const a = angle(reading);
	ctx.strokeStyle = pal.danger;
	ctx.lineWidth = Math.max(2, r * 0.05);
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(cx - Math.cos(a) * r * 0.14, cy - Math.sin(a) * r * 0.14);
	ctx.lineTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
	ctx.stroke();
	ctx.fillStyle = pal.ink;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
	ctx.fill();

	// Glass: one soft reflection, top left, from the lamp.
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
	ctx.clip();
	const shine = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.2, cy + r * 0.2);
	shine.addColorStop(0, alpha(pal.fg, 0.5));
	shine.addColorStop(0.45, alpha(pal.fg, 0));
	ctx.fillStyle = shine;
	ctx.beginPath();
	ctx.ellipse(cx - r * 0.25, cy - r * 0.35, r * 0.7, r * 0.42, -0.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/** A needle on a spring, so instruments swing and settle. */
export class Needle {
	value: number;
	private v = 0;
	constructor(start: number) {
		this.value = start;
	}
	update(target: number, dt: number, calm: boolean) {
		if (calm) {
			this.value = target;
			this.v = 0;
			return this.value;
		}
		const k = 60;
		const damp = 11;
		this.v += ((target - this.value) * k - this.v * damp) * dt;
		this.value += this.v * dt;
		return this.value;
	}
}

/**
 * A kitchen timer face: a ring that empties as the time runs, with the
 * minutes in the middle. Brew-day minutes, not real ones.
 */
export function drawTimer(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	cx: number,
	cy: number,
	r: number,
	elapsed: number,
	total: number,
	caption: string
) {
	contactShadow(ctx, pal, cx, cy + r + 4, r * 0.9, 0.6);
	const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
	body.addColorStop(0, pal.plastic);
	body.addColorStop(1, pal.muted);
	ctx.fillStyle = body;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = pal.ink;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
	ctx.fill();
	const share = total > 0 ? clamp(elapsed / total, 0, 1) : 0;
	ctx.strokeStyle = alpha(pal.fg, 0.12);
	ctx.lineWidth = r * 0.12;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = share >= 1 ? pal.hop : pal.amber;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share);
	ctx.stroke();
	ctx.fillStyle = pal.fg;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `600 ${Math.round(r * 0.42)}px ui-sans-serif, system-ui, sans-serif`;
	ctx.fillText(String(Math.floor(elapsed)), cx, cy - r * 0.05);
	ctx.font = `500 ${Math.round(r * 0.17)}px ui-sans-serif, system-ui, sans-serif`;
	ctx.fillStyle = pal.muted;
	ctx.fillText(caption, cx, cy + r * 0.34);
}

/** A gas ring on the bench and its flame, which is as tall as the heat delivered. */
export function drawBurner(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	cx: number,
	halfW: number,
	heat: number,
	t: number,
	calm: boolean
) {
	const top = BENCH - 30;
	contactShadow(ctx, pal, cx, BENCH, halfW + 20);
	// The stand: a black iron ring on three legs.
	ctx.fillStyle = pal.ink;
	for (const dx of [-halfW, 0, halfW]) {
		ctx.beginPath();
		ctx.roundRect(cx + dx - 5, top + 6, 10, 26, 3);
		ctx.fill();
	}
	const body = ctx.createLinearGradient(0, top, 0, top + 14);
	body.addColorStop(0, pal.steelDark);
	body.addColorStop(1, pal.ink);
	ctx.fillStyle = body;
	ctx.beginPath();
	ctx.roundRect(cx - halfW - 14, top, (halfW + 14) * 2, 14, 6);
	ctx.fill();

	if (heat < 0.02) return;
	// Flame: a row of blue cones with pale cores, and an orange lick at the top
	// when it is turned right up. The glow lights the pot bottom above.
	glow(ctx, cx, top - 6, halfW * 1.4, pal.flame, heat * 0.9);
	glow(ctx, cx, top - 10, halfW * 0.9, pal.copper, heat * 0.5);
	const n = Math.max(6, Math.round(halfW / 16));
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < n; i++) {
		const x = cx - halfW + (i + 0.5) * ((halfW * 2) / n);
		const flick = calm ? 1 : 0.8 + 0.2 * Math.sin(t * 13 + i * 2.3) * Math.sin(t * 7.1 + i);
		const h = (8 + 30 * heat) * flick;
		const w = 6 + 4 * heat;
		const g = ctx.createLinearGradient(0, top, 0, top - h);
		g.addColorStop(0, alpha(pal.flame, 0.95));
		g.addColorStop(0.6, alpha(pal.flame, 0.5));
		g.addColorStop(1, alpha(heat > 0.7 ? pal.amber : pal.flame, 0));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(x - w, top);
		ctx.quadraticCurveTo(x - w * 0.8, top - h * 0.55, x, top - h);
		ctx.quadraticCurveTo(x + w * 0.8, top - h * 0.55, x + w, top);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = alpha(pal.fg, 0.5);
		ctx.beginPath();
		ctx.ellipse(x, top - h * 0.18, w * 0.35, h * 0.2, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}

/** A paper tag with a word on it, the way things on a brew bench get labelled. */
export function drawTag(
	ctx: CanvasRenderingContext2D,
	pal: Palette,
	x: number,
	y: number,
	text: string,
	opts: { highlight?: boolean; small?: boolean } = {}
) {
	const size = opts.small ? 12 : 14;
	ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
	const w = ctx.measureText(text).width + 16;
	const h = size + 10;
	ctx.save();
	ctx.translate(x, y);
	ctx.fillStyle = alpha(pal.shadow, 0.4);
	ctx.beginPath();
	ctx.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, 4);
	ctx.fill();
	ctx.fillStyle = opts.highlight ? pal.amber : pal.plastic;
	ctx.beginPath();
	ctx.roundRect(-w / 2, -h / 2, w, h, 4);
	ctx.fill();
	ctx.fillStyle = pal.ink;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, 0, 1);
	ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* The workshop                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The wall behind the bench, painted once into an offscreen canvas and slid
 * along by the pan. Drawing it every frame would be most of the frame's cost
 * for something that never moves on its own.
 */
export class Workshop {
	private wall?: HTMLCanvasElement;
	private wallW = WALL_W;
	private bench?: HTMLCanvasElement;
	private palKey = '';

	private ensure(pal: Palette, scale: number) {
		const pieces = paintedPieces();
		const key = `${pal.wall}|${pal.wood}|${scale}|${pieces.length}`;
		if (this.wall && this.palKey === key) return;
		this.palKey = key;
		if (pieces.length >= 2) {
			const painted = joinPieces(pieces, pal, scale);
			this.wall = painted.c;
			this.wallW = painted.w;
		} else {
			this.wall = paintWall(pal, scale);
			this.wallW = WALL_W;
		}
		this.bench = paintBench(pal, scale);
	}

	/**
	 * @param pan 0–1 along the wall
	 * @param scale device pixels per scene pixel, so the cached wall is sharp
	 */
	drawBack(ctx: CanvasRenderingContext2D, pal: Palette, pan: number, scale: number) {
		this.ensure(pal, scale);
		const x = -pan * (this.wallW - W);
		ctx.drawImage(this.wall!, x, 0, this.wallW, H);
	}

	/** The bench top and the cupboards under it, at the same pan as the wall. */
	drawBench(ctx: CanvasRenderingContext2D, pal: Palette, pan: number, scale: number) {
		this.ensure(pal, scale);
		// The bench is nearer than the wall, so it slides a little faster.
		const x = -pan * (WALL_W - W) * 1.15;
		ctx.drawImage(this.bench!, x, 0, WALL_W * 1.2, H);
	}

	/** Lamp light over everything and a vignette at the edges. Drawn last. */
	drawLight(ctx: CanvasRenderingContext2D, pal: Palette) {
		ctx.save();
		ctx.globalCompositeOperation = 'soft-light';
		const lamp = ctx.createRadialGradient(W * 0.5, -40, 20, W * 0.5, H * 0.35, W * 0.75);
		lamp.addColorStop(0, alpha(pal.lamp, 0.55));
		lamp.addColorStop(1, alpha(pal.lamp, 0));
		ctx.fillStyle = lamp;
		ctx.fillRect(0, 0, W, H);
		ctx.restore();

		const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, W * 0.72);
		v.addColorStop(0, alpha(pal.shadow, 0));
		v.addColorStop(1, alpha(pal.shadow, 0.6));
		ctx.fillStyle = v;
		ctx.fillRect(0, 0, W, H);
	}
}

/*
 * The painted wall.
 *
 * The code-drawn wall below is the fallback; when the painted pieces in
 * `static/play/` have loaded, they replace it. They were ordered with one
 * style brief and each later piece was shown the first, so they read as one
 * wall; where two meet they are cross-faded over a strip of plain plaster the
 * briefs asked for at both edges. See `scripts/sprites.mjs`.
 */
const PIECES = ['wall', 'wall-2', 'wall-3'];
/** How far neighbouring pieces overlap, in scene pixels, for the cross-fade. */
const SEAM = 150;
let loaded: (HTMLImageElement | undefined)[] | undefined;

/** The pieces loaded so far, in order, stopping at the first one missing. */
function paintedPieces(): HTMLImageElement[] {
	if (typeof Image === 'undefined') return [];
	if (!loaded) {
		loaded = PIECES.map(() => undefined);
		PIECES.forEach((id, i) => {
			const img = new Image();
			img.onload = () => (loaded![i] = img);
			img.src = asset(`/play/${id}.jpg`);
		});
	}
	const out: HTMLImageElement[] = [];
	for (const img of loaded) {
		if (!img) break;
		out.push(img);
	}
	return out;
}

function joinPieces(pieces: HTMLImageElement[], pal: Palette, scale: number) {
	const pw = (H * pieces[0].naturalWidth) / pieces[0].naturalHeight;
	const w = pieces.length * pw - (pieces.length - 1) * SEAM;
	const { c, ctx } = offscreen(w, H, scale);
	pieces.forEach((img, i) => {
		const x = i * (pw - SEAM);
		if (i === 0) {
			ctx.save();
			ctx.filter = 'blur(1px)';
			ctx.drawImage(img, x, 0, pw, H);
			ctx.restore();
			return;
		}
		// Fade the new piece in across the seam rather than butting it up.
		const { c: piece, ctx: p } = offscreen(pw, H, scale);
		p.filter = 'blur(1px)';
		p.drawImage(img, 0, 0, pw, H);
		p.filter = 'none';
		p.globalCompositeOperation = 'destination-in';
		const fade = p.createLinearGradient(0, 0, SEAM, 0);
		fade.addColorStop(0, 'rgb(0 0 0 / 0)');
		fade.addColorStop(1, 'rgb(0 0 0 / 1)');
		p.fillStyle = fade;
		p.fillRect(0, 0, pw, H);
		ctx.drawImage(piece, x, 0, pw, H);
	});
	// Knock the wall back a touch so the bench in front of it reads as in focus.
	ctx.fillStyle = alpha(pal.shadow, 0.3);
	ctx.fillRect(0, 0, w, H);
	const foot = ctx.createLinearGradient(0, BENCH - 120, 0, BENCH);
	foot.addColorStop(0, alpha(pal.shadow, 0));
	foot.addColorStop(1, alpha(pal.shadow, 0.45));
	ctx.fillStyle = foot;
	ctx.fillRect(0, BENCH - 120, w, 120);
	return { c, w };
}

function offscreen(w: number, h: number, scale: number) {
	const c = document.createElement('canvas');
	c.width = Math.ceil(w * scale);
	c.height = Math.ceil(h * scale);
	const ctx = c.getContext('2d')!;
	ctx.scale(scale, scale);
	return { c, ctx };
}

function paintWall(pal: Palette, scale: number): HTMLCanvasElement {
	const { c, ctx } = offscreen(WALL_W, H, scale);
	const r = rng(0x77616c6c);

	// Plaster: lit from the lamps above, falling off towards the bench.
	const plaster = ctx.createLinearGradient(0, 0, 0, BENCH);
	plaster.addColorStop(0, pal.wallLow);
	plaster.addColorStop(0.35, pal.wall);
	plaster.addColorStop(1, pal.wallLow);
	ctx.fillStyle = plaster;
	ctx.fillRect(0, 0, WALL_W, H);

	// Tiled splashback behind the bench.
	const tileTop = BENCH - 150;
	ctx.fillStyle = pal.tile;
	ctx.globalAlpha = 0.55;
	ctx.fillRect(0, tileTop, WALL_W, BENCH - tileTop);
	ctx.globalAlpha = 1;
	ctx.strokeStyle = alpha(pal.shadow, 0.35);
	ctx.lineWidth = 1.5;
	for (let row = 0; row * 30 < BENCH - tileTop; row++) {
		const y = tileTop + row * 30;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(WALL_W, y);
		ctx.stroke();
		for (let x = (row % 2) * 30; x < WALL_W; x += 60) {
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y + 30);
			ctx.stroke();
		}
	}
	const tileShade = ctx.createLinearGradient(0, tileTop, 0, BENCH);
	tileShade.addColorStop(0, alpha(pal.shadow, 0));
	tileShade.addColorStop(1, alpha(pal.shadow, 0.45));
	ctx.fillStyle = tileShade;
	ctx.fillRect(0, tileTop, WALL_W, BENCH - tileTop);

	// Background furniture goes into its own layer, blurred, so the
	// foreground reads as in focus.
	const { c: far, ctx: f } = offscreen(WALL_W, H, scale);

	// Two windows onto the evening.
	for (const wx of [150, 1650]) {
		const win = { x: wx, y: 50, w: 250, h: 220 };
		const sky = f.createLinearGradient(0, win.y, 0, win.y + win.h);
		sky.addColorStop(0, pal.dusk);
		sky.addColorStop(1, pal.duskLow);
		f.fillStyle = pal.woodDark;
		f.fillRect(win.x - 14, win.y - 14, win.w + 28, win.h + 34);
		f.fillStyle = sky;
		f.fillRect(win.x, win.y, win.w, win.h);
		// Rooftops against the sky.
		f.fillStyle = alpha(pal.shadow, 0.85);
		f.beginPath();
		f.moveTo(win.x, win.y + win.h);
		let x = win.x;
		while (x < win.x + win.w) {
			const bw = 30 + r() * 50;
			const bh = 30 + r() * 70;
			f.lineTo(x, win.y + win.h - bh);
			f.lineTo(x + bw, win.y + win.h - bh);
			x += bw;
		}
		f.lineTo(win.x + win.w, win.y + win.h);
		f.closePath();
		f.fill();
		// A few lit windows across the street.
		f.fillStyle = alpha(pal.lamp, 0.8);
		for (let i = 0; i < 7; i++) {
			f.fillRect(win.x + 12 + r() * (win.w - 30), win.y + win.h - 12 - r() * 50, 5, 7);
		}
		f.fillStyle = pal.woodDark;
		f.fillRect(win.x + win.w / 2 - 4, win.y, 8, win.h);
		f.fillRect(win.x, win.y + win.h / 2 - 4, win.w, 8);
		f.fillStyle = pal.wood;
		f.fillRect(win.x - 22, win.y + win.h + 16, win.w + 44, 10);
	}

	// Shelves with jars and sacks.
	for (const sx of [560, 2080]) {
		f.fillStyle = pal.woodDark;
		for (const sy of [118, 228]) {
			f.fillRect(sx, sy, 520, 10);
			let x = sx + 10;
			while (x < sx + 500) {
				const kind = r();
				if (kind < 0.55) {
					const jw = 26 + r() * 22;
					const jh = 40 + r() * 36;
					const fill = [pal.amber, pal.copper, pal.hop, pal.woodLight, pal.copperDark][
						Math.floor(r() * 5)
					];
					f.fillStyle = alpha(pal.steelLight, 0.18);
					f.beginPath();
					f.roundRect(x, sy - jh, jw, jh, 5);
					f.fill();
					f.fillStyle = alpha(fill, 0.75);
					f.beginPath();
					f.roundRect(x + 3, sy - jh * (0.3 + r() * 0.55), jw - 6, jh * 0.85, 3);
					f.fill();
					f.fillStyle = pal.steelDark;
					f.fillRect(x - 1, sy - jh - 6, jw + 2, 7);
					x += jw + 8 + r() * 10;
				} else {
					const bw = 60 + r() * 30;
					const bh = 60 + r() * 30;
					f.fillStyle = pal.woodLight;
					f.beginPath();
					f.moveTo(x, sy);
					f.quadraticCurveTo(x - 4, sy - bh * 0.6, x + bw * 0.2, sy - bh);
					f.lineTo(x + bw * 0.8, sy - bh);
					f.quadraticCurveTo(x + bw + 4, sy - bh * 0.6, x + bw, sy);
					f.closePath();
					f.fill();
					f.fillStyle = alpha(pal.shadow, 0.25);
					f.fillRect(x + bw * 0.25, sy - bh * 0.55, bw * 0.5, bh * 0.22);
					x += bw + 12;
				}
			}
		}
	}

	// A pegboard of tools.
	{
		const px = 1200;
		f.fillStyle = alpha(pal.woodLight, 0.4);
		f.fillRect(px, 60, 360, 240);
		f.fillStyle = alpha(pal.shadow, 0.5);
		for (let y = 75; y < 300; y += 22)
			for (let x = px + 15; x < px + 360; x += 22) f.fillRect(x, y, 3, 3);
		f.strokeStyle = pal.steel;
		f.lineWidth = 6;
		f.lineCap = 'round';
		// Hose coil.
		for (let i = 0; i < 4; i++) {
			f.beginPath();
			f.ellipse(px + 80, 170, 46 - i * 5, 56 - i * 6, 0, 0, Math.PI * 2);
			f.strokeStyle = alpha(pal.plastic, 0.75);
			f.stroke();
		}
		// Paddle, ladle, a whisk.
		f.strokeStyle = pal.woodLight;
		f.lineWidth = 8;
		f.beginPath();
		f.moveTo(px + 180, 80);
		f.lineTo(px + 180, 250);
		f.stroke();
		f.fillStyle = pal.woodLight;
		f.beginPath();
		f.roundRect(px + 165, 230, 30, 60, 8);
		f.fill();
		f.strokeStyle = pal.steel;
		f.lineWidth = 5;
		f.beginPath();
		f.moveTo(px + 250, 80);
		f.lineTo(px + 250, 230);
		f.stroke();
		f.fillStyle = pal.steel;
		f.beginPath();
		f.arc(px + 250, 245, 22, 0, Math.PI);
		f.fill();
		f.beginPath();
		f.ellipse(px + 315, 190, 18, 50, 0, 0, Math.PI * 2);
		f.lineWidth = 2;
		f.stroke();
	}

	// A chalkboard of the day's brew.
	{
		const bx = 2380;
		f.fillStyle = pal.woodDark;
		f.fillRect(bx - 10, 70, 200, 170);
		f.fillStyle = alpha(pal.shadow, 0.9);
		f.fillRect(bx, 80, 180, 150);
		f.strokeStyle = alpha(pal.fg, 0.45);
		f.lineWidth = 2;
		for (let i = 0; i < 5; i++) {
			f.beginPath();
			f.moveTo(bx + 18, 110 + i * 24);
			f.lineTo(bx + 60 + r() * 100, 110 + i * 24);
			f.stroke();
		}
	}

	// Pendant lamps, every 640 px: the one source of light.
	for (let lx = 480; lx < WALL_W; lx += 640) {
		const cone = f.createRadialGradient(lx, 60, 10, lx, 220, 380);
		cone.addColorStop(0, alpha(pal.lamp, 0.22));
		cone.addColorStop(1, alpha(pal.lamp, 0));
		f.fillStyle = cone;
		f.fillRect(lx - 400, 0, 800, BENCH);
	}

	ctx.save();
	ctx.filter = 'blur(1.6px)';
	ctx.drawImage(far, 0, 0, WALL_W, H);
	ctx.restore();

	// The lamps themselves are sharp: they hang in front of the wall.
	for (let lx = 480; lx < WALL_W; lx += 640) {
		ctx.strokeStyle = pal.ink;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(lx, 0);
		ctx.lineTo(lx, 26);
		ctx.stroke();
		const shade = ctx.createLinearGradient(lx - 40, 0, lx + 40, 0);
		shade.addColorStop(0, pal.copperDark);
		shade.addColorStop(0.35, pal.copperLight);
		shade.addColorStop(1, pal.copperDark);
		ctx.fillStyle = shade;
		ctx.beginPath();
		ctx.moveTo(lx - 12, 26);
		ctx.lineTo(lx + 12, 26);
		ctx.lineTo(lx + 44, 62);
		ctx.lineTo(lx - 44, 62);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = pal.lamp;
		ctx.beginPath();
		ctx.ellipse(lx, 63, 30, 6, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	// Glow is additive, drawn after the blur so the bulbs stay bright.
	ctx.globalCompositeOperation = 'lighter';
	for (let lx = 480; lx < WALL_W; lx += 640) {
		const g = ctx.createRadialGradient(lx, 66, 0, lx, 66, 120);
		g.addColorStop(0, alpha(pal.lamp, 0.5));
		g.addColorStop(1, alpha(pal.lamp, 0));
		ctx.fillStyle = g;
		ctx.fillRect(lx - 120, 0, 240, 200);
	}
	ctx.globalCompositeOperation = 'source-over';
	return c;
}

function paintBench(pal: Palette, scale: number): HTMLCanvasElement {
	const bw = WALL_W * 1.2;
	const { c, ctx } = offscreen(bw, H, scale);
	const r = rng(0x62656e63);

	// Shadow the bench throws on the tiles behind it.
	const back = ctx.createLinearGradient(0, BENCH - 30, 0, BENCH);
	back.addColorStop(0, alpha(pal.shadow, 0));
	back.addColorStop(1, alpha(pal.shadow, 0.5));
	ctx.fillStyle = back;
	ctx.fillRect(0, BENCH - 30, bw, 30);

	// Worktop: a thick slab of oiled wood seen slightly from above.
	const top = ctx.createLinearGradient(0, BENCH, 0, BENCH + 26);
	top.addColorStop(0, pal.woodLight);
	top.addColorStop(1, pal.wood);
	ctx.fillStyle = top;
	ctx.fillRect(0, BENCH, bw, 26);
	// Grain lines.
	ctx.strokeStyle = alpha(pal.woodDark, 0.35);
	ctx.lineWidth = 1;
	for (let i = 0; i < 9; i++) {
		const y = BENCH + 3 + i * 2.6;
		ctx.beginPath();
		ctx.moveTo(0, y);
		for (let x = 0; x <= bw; x += 80)
			ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 1.2 + (r() - 0.5) * 0.6);
		ctx.stroke();
	}
	// Front edge, catching the lamp.
	ctx.fillStyle = pal.wood;
	ctx.fillRect(0, BENCH + 26, bw, 16);
	ctx.fillStyle = alpha(pal.lamp, 0.25);
	ctx.fillRect(0, BENCH + 26, bw, 2);
	ctx.fillStyle = pal.woodDark;
	ctx.fillRect(0, BENCH + 40, bw, 3);

	// Cupboards under the bench, in shadow.
	const under = ctx.createLinearGradient(0, BENCH + 43, 0, H);
	under.addColorStop(0, pal.woodDark);
	under.addColorStop(1, pal.shadow);
	ctx.fillStyle = under;
	ctx.fillRect(0, BENCH + 43, bw, H - BENCH - 43);
	ctx.strokeStyle = alpha(pal.shadow, 0.6);
	ctx.lineWidth = 3;
	for (let x = 20; x < bw; x += 240) {
		ctx.strokeRect(x, BENCH + 56, 220, H);
		ctx.fillStyle = pal.steel;
		ctx.fillRect(x + 100, BENCH + 72, 20, 4);
	}
	return c;
}
