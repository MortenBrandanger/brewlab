export type StageId =
	'water' | 'grain' | 'mash' | 'sparge' | 'boil' | 'chill' | 'ferment' | 'condition' | 'taste';

export type StageMeta = {
	id: StageId;
	name: string;
	/**
	 * What you actually do, with your hands, in a real kitchen or shed. This
	 * leads every stage: a reader who cannot picture the physical act has no way
	 * to make sense of any control on the page.
	 */
	reality: string;
	/**
	 * Why that act matters — the part that changes the beer. Secondary to the
	 * physical description, never a replacement for it. The last stage has no
	 * such explanation: the report is the explanation.
	 */
	what?: string;
	/**
	 * The layer under `what`: numbers, named compounds, rules of thumb. It shares
	 * the same disclosure, because a stage gets exactly one place where its
	 * "why" lives. Anything explaining a single control belongs next to that
	 * control instead.
	 */
	deepDive?: string;
	/**
	 * What this stage sets in the finished beer. Deliberately a consequence and
	 * never a list of the controls below it, which say their own names.
	 */
	decide?: string;
	/** Accent used for the stage's controls and scene. */
	accent: 'copper' | 'amber' | 'hop';
	/** The brewing action that ends this stage and starts the next. */
	action: string;
	/** Shown on the stage once it has been done. */
	done: string;
	/**
	 * What becomes knowable once this stage is done. Used only by the Taste
	 * stage's still-to-do list, where it is the one explanation on offer. It is
	 * deliberately not shown beside the action button: the header already says
	 * what the stage sets, and the two were the same claim in two vocabularies.
	 */
	reveals?: string;
	/** Blocks the action until this decision has been made. */
	requires?: 'water' | 'fermentables' | 'conversion' | 'hops' | 'yeast';
	/** A second thing the action waits for, checked after `requires`. */
	alsoRequires?: 'landing';
};

/**
 * The nine stages, in order.
 *
 * Each one ends with a deliberate action rather than a Next button, because
 * brewing is a sequence of irreversible-feeling moments and the simulator reads
 * better when it behaves that way. Revisiting an earlier stage is always
 * allowed: progress only ever moves forward, and every number recalculates the
 * instant a control moves.
 */
export const STAGES: StageMeta[] = [
	{
		id: 'water',
		name: 'Water',
		reality:
			'You fill a pot with your brewing water. If your tap water is not right for the beer you are making, you cut it with bottled or filtered water. Then you stir in a few grams of brewing salts, maybe a splash of acid, and put it on to heat.',
		what: 'The minerals in the water decide how bitterness and malt come across, and together with the grain they set the acidity of the mash. Mash pH matters more than any single ion: between 5.2 and 5.6 the enzymes work well, the husks keep their tannins to themselves, and the beer tastes bright rather than dull. Get it wrong and the beer tastes drying however good the recipe is. You cannot know it yet — it comes from the water and the grain together.',
		accent: 'hop',
		action: 'Fill and heat the water',
		done: 'Water treated and heating.',
		requires: 'water'
	},
	{
		id: 'grain',
		name: 'Grain',
		reality:
			'You weigh out four or five kilos of malt and run it through a mill, which cracks the husks open without grinding them to flour. Ten minutes with a hand crank, or the shop does it when you buy it.',
		what: 'Malt is barley that has been sprouted and then kilned to stop it, which leaves starch plus the enzymes that can convert it. Base malt is kilned gently and keeps those enzymes; speciality and roasted malts are kilned harder, so they bring colour and flavour but no enzymes of their own and lean on the base malt to convert them.',
		deepDive:
			'Crystal malt is stewed while still wet, so its starch converts inside the husk into sugars that yeast largely cannot ferment. That is why it sweetens as well as colours, and why a recipe with 25% crystal tastes sticky no matter how much you hop it. Roasted malts are kilned dry and hot, which builds coffee and chocolate notes plus real bitterness — a dry stout gets a noticeable share of its perceived bitterness from roasted barley rather than from hops. Sugar sits at the other end: fully fermentable, so it raises alcohol while thinning the body.',
		decide: 'the backbone of the beer: its colour, its body and most of its flavour',
		accent: 'amber',
		action: 'Mill the grain',
		done: 'Grain milled and weighed.',
		reveals: 'colour, the mash pH, and the gravity this grain could reach',
		requires: 'fermentables'
	},
	{
		id: 'mash',
		name: 'Mash',
		reality:
			'You tip the crushed grain into the hot water — in a mash tun, which is just an insulated vessel with a tap — stir the lumps out, put the lid on and walk away for an hour. It looks and smells like hot porridge.',
		what: 'The enzymes break the malt into sugar, and the sweet liquid that results is called wort — that is what the yeast will live on. The temperature you hold decides how much of that sugar the yeast can actually eat, and so how dry or how full the beer finishes. The enzyme map on the stage is where you set it.',
		deepDive:
			'At 62 °C beta-amylase dominates and the wort is highly fermentable, so the beer finishes low and tastes thin and crisp. At 70 °C beta is gone within minutes and alpha leaves unfermentable dextrins behind, so the beer finishes high and tastes full and sweet. A step mash gets both: a rest near 63 °C for fermentability, then one near 71 °C to finish the conversion. The mash-out at 76 °C stops enzyme activity entirely and thins the wort so it runs off the grain bed more freely.',
		decide: 'how dry or how full the finished beer will be',
		accent: 'copper',
		action: 'Close the lid',
		done: 'Lid on. The grain is resting.',
		reveals: 'how fermentable the wort is, and how full the beer will feel',
		requires: 'conversion',
		alsoRequires: 'landing'
	},
	{
		id: 'sparge',
		name: 'Sparge',
		reality:
			'You open the tap at the bottom of the tun and let the sweet liquid run into the kettle, trickling more hot water over the top of the grain as it drains. That rinsing is what sparging means. Half an hour of watching a hose, and the spent grain goes on the compost.',
		what: 'Something like a third of your sugar is still clinging to the grain when the mash ends. How much of it you rinse out sets the gravity — but rinse too hard and you start pulling tannin out of the husks along with it.',
		deepDive:
			'The rule of thumb is to stop collecting when the runnings — the liquid coming off the tap — drop below about 1.010, and to keep sparge water under 76 °C. Both limits exist for the same reason: as sugar concentration falls and temperature rises, husk tannins become much more soluble. They do not taste bitter so much as drying and astringent, like over-brewed tea, and no amount of conditioning removes them.',
		decide: 'how strong the beer ends up',
		accent: 'copper',
		action: 'Run off and sparge',
		done: 'Wort collected in the kettle.',
		reveals: 'the original gravity'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		reality:
			'You bring the kettle to a rolling boil and set a timer. Hops go in at the times you planned — a handful at the start, more towards the end. There is a lot of steam, so open a window.',
		what: 'Boiling sterilises the wort, drives off raw grain notes, concentrates the sugar, and turns hop resin into bitterness — which is the reason hops go in here at all. Bitterness needs heat and time; aroma is destroyed by both, and that single trade-off explains every hop schedule ever written. It is still not beer: no yeast, no alcohol.',
		deepDive:
			'Alpha acids are not bitter until they isomerise, which needs near-boiling temperature and roughly an hour to approach completion. The Tinseth model used here also accounts for wort gravity: a dense wort extracts less, which is why a big beer needs disproportionately more hops. Aroma oils do the opposite — they boil off in minutes, so anything added in the last ten minutes, in the whirlpool, or after fermentation is there for smell and flavour rather than bitterness. Dry hops contribute no measured IBU at all, though they do add a perceived bite through polyphenols, and past roughly 8 g/L they stop adding aroma and start adding grass.',
		decide: 'how bitter it is, and how much of the hops you will smell',
		accent: 'hop',
		action: 'Boil the wort',
		done: 'Boil finished. The hops are in.',
		requires: 'hops',
		reveals: 'bitterness, and the finished colour'
	},
	{
		id: 'chill',
		name: 'Chill',
		reality:
			'You drop a coiled copper pipe into the kettle and run cold tap water through it, or stand the whole pot in a sink of ice. Twenty minutes later it is cool enough to put your hand in, and you siphon it into a clean bucket.',
		what: 'Warm wort is sugar water with nothing defending it. Cooling fast closes the window for anything else to take hold, and it forms a sharp cold break: proteins clump together and fall out instead of hazing the beer. The temperature you pitch at then sets the flavour the yeast will make for the entire batch.',
		deepDive:
			'None of these are certainties. A slow chill does not guarantee an infection, and plenty of brewers have made excellent beer with a no-chill method by keeping everything sealed. What a slow chill does is widen the distribution: more chances for something to go wrong, and a longer time producing DMS in a pilsner-malt wort. Treat these bars as probability, not prophecy.',
		decide: 'how much risk the beer carries into fermentation',
		accent: 'amber',
		action: 'Chill and transfer',
		done: 'Chilled and in the fermenter.',
		reveals: 'what the cold side put at risk'
	},
	{
		id: 'ferment',
		name: 'Ferment',
		reality:
			'You sprinkle the yeast on top, seal the lid with an airlock, and put the bucket somewhere the temperature does not swing. Within a day it is bubbling. Then you leave it alone for one to three weeks.',
		what: 'The yeast turns sugar into alcohol and carbon dioxide, which is the step that makes it beer. On the way it also makes the fruity and spicy compounds that give the beer much of its character — strain, temperature and pitch rate together set those, how far the beer attenuates, and whether it tastes hot.',
		deepDive:
			'Esters are fruity — banana, pear, apple — and they climb with temperature, gravity and underpitching, because they are made during the growth phase. Phenols are spicy and clove-like, and only some strains make them at all. Fusel alcohols are the failure mode: warm fermentation on a strong wort produces higher alcohols that taste solvent and do not age out. The usual defence is to pitch plenty of healthy yeast at the cool end of the range and let the temperature rise a few degrees once fermentation is established, which keeps the growth phase cool and the finish warm enough to clean up.',
		decide: 'how much of its own character the yeast puts into the beer',
		accent: 'hop',
		action: 'Pitch the yeast',
		done: 'Fermentation finished.',
		requires: 'yeast',
		reveals: 'final gravity, alcohol, and everything the yeast made'
	},
	{
		id: 'condition',
		name: 'Condition',
		reality:
			'You siphon the beer into bottles with a measured dose of sugar and cap them, or into a keg and force CO₂ in. Then they go somewhere cool and you wait.',
		what: 'Two clocks run at once. One is maturation: alcohol softens, roast and caramel knit together, sulfur blows off. The other is decay: hop aroma fades and oxygen does its slow work. Which clock matters depends entirely on the beer.',
		deepDive:
			'An imperial stout at 10% is genuinely better after six months, because it has a lot to gain and very little volatile aroma to lose. An IPA is at its best within a few weeks of packaging and is noticeably duller after three months. A lager needs weeks at low temperature simply to become itself. The one thing that helps every beer is storing it cold: it slows every reaction on both clocks, and the ones you want are the ones you were going to wait for anyway.',
		decide: 'how the beer actually arrives in the glass',
		accent: 'copper',
		action: 'Package it',
		done: 'Bottled and conditioning.',
		reveals: 'how it will actually taste in the glass'
	},
	{
		id: 'taste',
		name: 'Taste',
		reality: 'You open one, pour it into a glass, and find out.',
		accent: 'amber',
		action: 'Pour a glass',
		done: 'Poured.',
		reveals: 'the full judgement'
	}
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function stageIndex(id: StageId): number {
	return STAGES.findIndex((s) => s.id === id);
}

/**
 * What is knowable about the beer after each stage.
 *
 * Before the mash there is no wort, so there is no gravity; before fermentation
 * there is no alcohol. Showing those numbers on the water stage is the fastest
 * way to make a simulator feel like a spreadsheet.
 */
export type Reveal =
	| 'water'
	| 'colour'
	| 'potential'
	| 'gravity'
	| 'bitterness'
	| 'risk'
	| 'alcohol'
	| 'flavour'
	| 'judgement';

const REVEALED_AFTER: Record<Reveal, StageId> = {
	water: 'water',
	colour: 'grain',
	potential: 'grain',
	/*
	 * A brewer reads the original gravity off a hydrometer floating in the
	 * chilled wort, not at the tun. Revealing it at the sparge handed over the
	 * most satisfying measurement of the brew day before the wort that produces
	 * it existed — the sparge still shows its own pre-boil reading, which is a
	 * real measurement taken there.
	 */
	gravity: 'chill',
	bitterness: 'boil',
	risk: 'chill',
	alcohol: 'ferment',
	flavour: 'condition',
	judgement: 'taste'
};

export function revealedAt(reveal: Reveal): number {
	return stageIndex(REVEALED_AFTER[reveal]);
}

/** Maps the recipe fields a finding names onto the stage that owns them. */
const FIELD_STAGE: [string, StageId][] = [
	['water', 'water'],
	['fermentables', 'grain'],
	['mash', 'mash'],
	['preBoilVolumeL', 'sparge'],
	['batchVolumeL', 'water'],
	['efficiencyPct', 'sparge'],
	// More specific first: the table matches on prefix and returns the first hit,
	// and dry hops are edited on the fermentation stage, not in the kettle.
	['hops.dryHop', 'ferment'],
	['hops', 'boil'],
	['boilTimeMin', 'boil'],
	['chill', 'chill'],
	['fermentation', 'ferment'],
	['conditioning', 'condition']
];

export function stageForFields(fields: string[]): StageId | undefined {
	for (const field of fields) {
		const match = FIELD_STAGE.find(([prefix]) => field.startsWith(prefix));
		if (match) return match[1];
	}
	return undefined;
}
