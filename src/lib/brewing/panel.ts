/**
 * Six people taste the beer, and they do not agree.
 *
 * A score is one opinion pretending to be none. A panel is several opinions
 * that say whose they are — and when the hopster loves a beer the
 * traditionalist cannot finish, the brewer has learned more than "59" could
 * tell them. Each taster here is a *weighting* of what the model already
 * knows: the same sensory vector, the same faults, the same style match,
 * read through a different set of cares. Nothing is invented for them.
 * Their lines are chosen from what moved them most, so the enthusiast says
 * "super drinkable" only about a beer the model finds drinkable, and the
 * critic names the fault the fault model found.
 *
 * Deterministic, offline, and every heart traceable to a number.
 */

import type { SimulationResult, Recipe, SensoryVector } from './types';
import { clamp } from './calculations';

export type Taster = {
	id: string;
	name: string;
	/** Who they are, in a line, for the card. */
	about: string;
	/** 0–5. */
	hearts: number;
	/** What they said, in their own voice. */
	line: string;
};

type Judge = (r: SimulationResult, recipe: Recipe) => { score: number; line: string };

const hearts = (score: number) => clamp(Math.round(score / 20), 0, 5);

const severe = (r: SimulationResult) => r.findings.some((f) => f.severity === 'severe');
const warned = (r: SimulationResult) =>
	r.findings.filter((f) => f.severity === 'severe' || f.severity === 'warning');
const worst = (r: SimulationResult) =>
	r.findings.find((f) => f.severity === 'severe') ??
	r.findings.find((f) => f.severity === 'warning');

/* -------------------------------------------------------------------------- */

/** Wants the beer to be what it says it is, made the way it has always been made. */
const traditionalist: Judge = (r, recipe) => {
	const s = r.sensory;
	const match = r.targetStyle?.match ?? r.styles[0]?.match ?? 50;
	// A style match earns respect; a modern hop bomb loses it even inside its
	// own style, because the traditionalist's idea of beer stops around 1990.
	const modern = Math.max(0, s.hopAroma - 4) * 7 + (r.appearance.haze > 0.45 ? 12 : 0);
	const score = clamp(
		15 + match * 0.55 + s.malt * 2.5 - modern - warned(r).length * 8 - (severe(r) ? 25 : 0),
		0,
		100
	);
	const style =
		(r.targetStyle
			? recipe.targetStyleId && r.styles.find((x) => x.styleId === recipe.targetStyleId)?.name
			: r.styles[0]?.name) ?? 'anything I recognise';
	// What moved him most comes first, so the line never praises a beer the
	// hearts have marked down: a fruit-stall IPA is a fruit stall before it is
	// a proper anything.
	const line = severe(r)
		? 'No. Whatever this was meant to be, it is not that.'
		: s.hopAroma > 6
			? 'Smells like a fruit stall. Where is the beer?'
			: r.appearance.haze > 0.45
				? 'Cloudy. In my day that meant you had done something wrong.'
				: match >= 85
					? `That is a proper ${style.toLowerCase()}. They still make them, then.`
					: match >= 60
						? `Close to a ${style.toLowerCase()}, and I would not send it back.`
						: 'Nothing wrong with it, and nothing I could put a name to.';
	return { score, line };
};

/** Likes beer. Forgives a lot, but not a fault you can taste. */
const enthusiast: Judge = (r) => {
	const s = r.sensory;
	const score = clamp(
		r.scores.enjoyment.value * 0.8 + s.crispness * 1.5 + 10 - (severe(r) ? 30 : 0),
		0,
		100
	);
	const line = severe(r)
		? 'Oh. Oh no. I wanted to like it.'
		: score >= 75
			? 'Super drinkable! Pour me another before you explain it.'
			: s.crispness >= 6
				? 'Crisp! That is a Friday-afternoon beer.'
				: s.sweetness >= 6
					? 'A bit of a dessert, but I am not complaining.'
					: score >= 50
						? 'Yeah, I would have that again.'
						: 'It is fine. Fine is fine.';
	return { score, line };
};

/** Tastes for what is wrong, and names it. Rarely impressed. */
const critic: Judge = (r) => {
	const w = worst(r);
	const cautions = r.findings.filter((f) => f.severity === 'caution').length;
	const score = clamp(r.scores.technical.value - cautions * 4 - 5, 0, 100);
	const line = w
		? `${w.title}. I stopped there.`
		: cautions > 0
			? `Clean enough, but ${r.findings.find((f) => f.severity === 'caution')!.title.toLowerCase()}.`
			: r.scores.technical.value >= 90
				? 'I looked for the fault and could not find it. That is rarer than it sounds.'
				: 'Competent. I can taste the recipe more than the brewer.';
	return { score, line };
};

/** Malt, body, warmth, and the patience of centuries. */
const monk: Judge = (r) => {
	const s = r.sensory;
	const score = clamp(
		15 +
			s.malt * 4 +
			s.body * 3 +
			s.caramel * 1.5 +
			s.fruitEsters * 1.2 +
			s.phenols * 1.5 +
			Math.min(s.alcoholWarmth, 6) * 2 -
			Math.max(0, s.bitterness - 6) * 4 -
			(severe(r) ? 25 : 0),
		0,
		100
	);
	const line = severe(r)
		? 'Something has gone wrong in the cellar. We have all been there.'
		: s.body < 3
			? 'Thin. A beer should have something to hold on to.'
			: s.phenols >= 4 && s.fruitEsters >= 4
				? 'Ah — spice and fruit together. The yeast has done its work.'
				: s.malt >= 5 && s.body >= 5
					? 'There is bread in this. Good. Beer is bread that has learned patience.'
					: s.alcoholWarmth >= 6
						? 'Strong, and it carries its strength. Sip it.'
						: 'Well made. It could stand to be more generous.';
	return { score, line };
};

/** Aroma first, aroma last. Suspicious of caramel. */
const hopster: Judge = (r) => {
	const s = r.sensory;
	const score = clamp(
		10 +
			s.hopAroma * 5 +
			s.hopFlavour * 3 +
			(s.bitterness >= 4 && s.bitterness <= 8 ? 10 : 0) -
			s.caramel * 3 -
			(severe(r) ? 25 : 0),
		0,
		100
	);
	const line = severe(r)
		? 'Nope. You can not hop your way out of that.'
		: s.hopAroma >= 7
			? 'Now that smells like something. What is in the dry hop?'
			: s.hopAroma >= 4
				? 'Decent hop character. Could take another late charge.'
				: s.caramel >= 5
					? 'Caramel over hops. Why would you do that to them.'
					: 'Where are the hops? This is a malt beverage.';
	return { score, line };
};

/** Bored by clean. Lights up at funk, smoke, sourness, and anything odd. */
const wildCard: Judge = (r, recipe) => {
	const s = r.sensory;
	const smoked = recipe.fermentables.some(
		(f) => f.fermentableId.includes('smoked') && f.weightKg > 0
	);
	const odd =
		s.acidity * 4 +
		s.phenols * 2.5 +
		s.fruitEsters * 1.2 +
		(smoked ? 25 : 0) +
		(r.appearance.haze > 0.5 ? 8 : 0);
	const score = clamp(
		20 + odd - (s.hopAroma + s.malt + s.bitterness < 8 && odd < 15 ? 15 : 0),
		0,
		100
	);
	const line = smoked
		? 'Smoke! Finally, a beer that has been somewhere.'
		: s.acidity >= 4
			? 'Sour. Yes. More people should be brave.'
			: s.phenols >= 4
				? 'Clove and pepper — this one has a personality.'
				: s.fruitEsters >= 6
					? 'Fruity enough to be interesting. Push it further next time.'
					: severe(r)
						? 'Well, it is not boring.'
						: 'Clean. Correct. Asleep.';
	return { score, line };
};

const PANEL: { id: string; name: string; about: string; judge: Judge }[] = [
	{
		id: 'traditionalist',
		name: 'The Traditionalist',
		about: 'Wants the beer to be what it says it is.',
		judge: traditionalist
	},
	{
		id: 'enthusiast',
		name: 'The Enthusiast',
		about: 'Likes beer. Forgives a lot, but not a fault you can taste.',
		judge: enthusiast
	},
	{
		id: 'critic',
		name: 'The Critic',
		about: 'Tastes for what is wrong, and names it.',
		judge: critic
	},
	{ id: 'monk', name: 'The Monk', about: 'Malt, body, warmth, and patience.', judge: monk },
	{
		id: 'hopster',
		name: 'The Hopster',
		about: 'Aroma first, aroma last. Suspicious of caramel.',
		judge: hopster
	},
	{
		id: 'wild-card',
		name: 'The Wild Card',
		about: 'Bored by clean. Lights up at funk, smoke and sourness.',
		judge: wildCard
	}
];

export function judgePanel(result: SimulationResult, recipe: Recipe): Taster[] {
	return PANEL.map((p) => {
		const { score, line } = p.judge(result, recipe);
		return { id: p.id, name: p.name, about: p.about, hearts: hearts(score), line };
	});
}

/** The one thing the panel agreed on, if anything — for a headline. */
export function panelSplit(tasters: Taster[]): string {
	const hi = [...tasters].sort((a, b) => b.hearts - a.hearts);
	const top = hi[0];
	const bottom = hi[hi.length - 1];
	// "Loved it" is for four hearts and up; two hearts is politeness.
	if (top.hearts <= 2) return 'Nobody on the panel wanted a second glass.';
	if (top.hearts - bottom.hearts <= 1) {
		return top.hearts >= 4
			? 'The panel agrees: they would all have another.'
			: 'The panel is lukewarm, and united in it.';
	}
	return top.hearts >= 4
		? `${top.name} loved it; ${bottom.name} did not. That gap is the beer.`
		: `${top.name} liked it more than ${bottom.name} did. That gap is the beer.`;
}
