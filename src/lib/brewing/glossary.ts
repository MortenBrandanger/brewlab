/**
 * Plain-language glossary for every number and trade word the app shows.
 *
 * Three people who had never brewed read the app and reported the same two
 * failures: every figure appeared without a scale, so they had no way to know
 * whether 34 IBU was a lot, and every trade word appeared without a definition,
 * so they could not tell what a control was for. One of them summed it up as
 * "moving a slider I don't understand to change a number I don't understand".
 *
 * So the writing here follows rules that are stricter than ordinary docs:
 *
 * - Assume the reader does not know beer is made from barley.
 * - Never use a trade word inside a definition without glossing it in the same
 *   sentence. That is why several entries repeat "enzymes (natural chemicals in
 *   the malt)" rather than cross-referencing.
 * - Anchor every scale to beers a normal person has drunk, not to style ranges.
 * - Where a novice reliably guesses wrong, say the right thing plainly. Noble
 *   hops are not premium, 78% attenuation is not a grade, "hot" is not about
 *   serving temperature, and "bone dry" is not an insult.
 * - Anything that is a FAULT must read as a fault. "Butterscotch" and "cooked
 *   corn" sound pleasant written down. A tester called the diacetyl label "the
 *   single most dangerous thing on the page" for exactly that reason.
 */

export type ScaleAnchor = {
	/** The value on the figure's own scale. */
	at: number;
	/** What a beer sitting at this value is, in words a non-brewer knows. */
	label: string;
};

export type Figure = {
	id: string;
	/** The short form as it appears in the UI, e.g. "OG", "IBU", "EBC". */
	short: string;
	/** The full name in plain words, e.g. "original gravity". */
	name: string;
	/** One sentence: what this measures, for someone who has never brewed. Never uses another trade word without glossing it. */
	plain: string;
	/** Which way is "more", stated so a reader knows what moving it does. Max ~12 words. */
	direction: string;
	/** Real beers along the scale, low to high, 3-5 of them, every one a beer a normal person has drunk or heard of. */
	anchors: ScaleAnchor[];
	/** The usable span of the scale, for drawing a track: [min, max]. */
	range: [number, number];
	/** Optional: the band most beers sit in, for shading. */
	typical?: [number, number];
};

export type Term = {
	id: string;
	/** The word as it appears in the UI. */
	word: string;
	/** One or two sentences. Plain English. A reader who has never brewed must understand it with no other lookup. Never define a term using another glossary term without also saying what that one means in the same breath. */
	plain: string;
	/** Optional: what it means for the reader's decision, if there is one. */
	soWhat?: string;
};

/* -------------------------------------------------------------------------- */
/* Figures                                                                    */
/*                                                                            */
/* Ranges are the app's own usable spans, and `typical` bands are taken from   */
/* the style table in styles.ts so the shading agrees with what the engine     */
/* actually produces. Anchors are chosen for recognition, not for coverage:    */
/* a reader who has drunk a supermarket lager and a Guinness can place almost  */
/* any beer between them.                                                     */
/* -------------------------------------------------------------------------- */

export const FIGURES: Figure[] = [
	/**
	 * Gravity gets more than one sentence, on purpose.
	 *
	 * Three readers independently named this as the number that made them give
	 * up, and it appears four different ways in the app: as 1.052, as "OG", as
	 * "52 gravity points", and inside the BU:GU ratio. One short sentence cannot
	 * carry all four without leaving the reader exactly where they started.
	 */
	{
		id: 'og',
		short: 'OG',
		name: 'original gravity',
		plain:
			'How much sugar is dissolved in the liquid before the yeast goes in, measured by weight: plain water reads 1.000, and sugar makes the liquid heavier, so 1.052 means it weighs 5.2% more than the same amount of water. Brewers drop the 1.0 and call that "52 points". All of that sugar is what the yeast turns into alcohol, so this is the first number that decides how strong the beer will be.',
		direction: 'Higher means more sugar, so a stronger beer.',
		anchors: [
			{ at: 1.038, label: 'a Guinness Draught, or any easy session beer' },
			{ at: 1.046, label: 'a supermarket lager such as Heineken or Carlsberg' },
			{ at: 1.06, label: 'a typical American IPA' },
			{ at: 1.08, label: 'a Belgian tripel, as strong as a glass of wine' },
			{ at: 1.1, label: 'an imperial stout, the kind sold in small bottles' }
		],
		range: [1.02, 1.12],
		typical: [1.04, 1.075]
	},
	{
		id: 'fg',
		short: 'FG',
		name: 'final gravity',
		plain:
			'The same weight measurement taken after fermentation, showing how much sugar the yeast left behind: it starts at the original gravity and falls, and what is still there is what you taste as sweetness and thickness.',
		direction: 'Lower means the yeast ate more, so a drier beer.',
		anchors: [
			{ at: 1.004, label: 'a saison: no sweetness left at all' },
			{ at: 1.01, label: 'a standard lager: clean, with nothing lingering' },
			{ at: 1.014, label: 'a pale ale: a little malt sweetness under the hops' },
			{ at: 1.022, label: 'a milk stout: openly sweet' },
			{ at: 1.03, label: 'an imperial stout: thick, close to syrup' }
		],
		range: [1.0, 1.035],
		typical: [1.008, 1.018]
	},
	{
		id: 'ibu',
		short: 'IBU',
		name: 'bitterness units',
		plain:
			'A count of the bitter-tasting compounds the boil pulled out of the hops, per litre of beer; it measures bitterness on the tongue only, and says nothing about how strongly the beer smells of hops.',
		direction: 'Higher means more bitter. Aroma is a separate thing.',
		anchors: [
			{ at: 10, label: 'a wheat beer like Erdinger: no bitterness to speak of' },
			{ at: 18, label: 'a supermarket lager: a faint dry edge at the finish' },
			{ at: 35, label: 'a Guinness or a British bitter: clearly there, still gentle' },
			{ at: 55, label: 'an American IPA: bitterness is the point' },
			{ at: 90, label: 'a double IPA: about as bitter as beer is ever made' }
		],
		range: [0, 100],
		typical: [15, 60]
	},
	{
		id: 'bu-gu',
		short: 'BU:GU',
		name: 'bitterness to sugar balance',
		plain:
			'Bitterness divided by sugar: the IBU figure divided by the gravity points, which are the digits after the 1.0 in a reading like 1.052, so it says whether the hops or the malt is in front rather than how much of either there is.',
		direction: 'Higher means bitterness leads; lower means malt leads.',
		anchors: [
			{ at: 0.25, label: 'a wheat beer: soft and malty, almost no bite' },
			{ at: 0.45, label: 'a Märzen or a Scottish ale: malt clearly in front' },
			{ at: 0.65, label: 'a British bitter: even-handed, leaning bitter' },
			{ at: 0.9, label: 'an American IPA: hops in front, malt behind them' },
			{ at: 1.3, label: 'a dry stout: bitterness leads and the finish is sharp' }
		],
		range: [0, 2],
		typical: [0.4, 1.0]
	},
	{
		id: 'ebc',
		short: 'EBC',
		name: 'colour',
		plain:
			'How dark the beer is, measured by shining a light through it, running from pale straw at the bottom of the scale to opaque black at the top; the app also shows SRM, which is the American scale for the same thing and runs at roughly half the EBC number.',
		direction: 'Higher means darker. Colour is not strength.',
		anchors: [
			{ at: 6, label: 'a pale lager: straw yellow, you can read through it' },
			{ at: 16, label: 'a pale ale: deep gold' },
			{ at: 30, label: 'an amber ale: copper, still see-through' },
			{ at: 60, label: 'a brown ale or porter: dark brown, red at the edges' },
			{ at: 90, label: 'a stout: black, with a tan head' }
		],
		range: [2, 140],
		typical: [4, 80]
	},
	{
		id: 'abv',
		short: 'ABV',
		name: 'alcohol by volume',
		plain:
			'The share of the beer that is pure alcohol, as a percentage: a 5% beer is one twentieth alcohol, against roughly 13% for wine and 40% for whisky.',
		direction: 'Higher means more alcohol per glass.',
		anchors: [
			{ at: 4.2, label: 'a Guinness Draught, or a British session bitter' },
			{ at: 5.0, label: 'a supermarket lager: the everyday strength' },
			{ at: 6.5, label: 'a typical IPA: one is enough on a weeknight' },
			{ at: 9.0, label: 'a Belgian tripel: as strong as wine, and drinks like beer' },
			{ at: 11.0, label: 'an imperial stout: a small glass, shared' }
		],
		range: [0, 13],
		typical: [3.5, 9]
	},
	{
		id: 'attenuation',
		short: 'ADF',
		name: 'apparent attenuation',
		plain:
			'The share of the sugar in the liquid that the yeast actually ate, as a percentage; it is not a score or a quality rating, so 78% simply means about three quarters of the sugar became alcohol and gas and the rest stayed behind as sweetness and thickness.',
		direction: 'Higher means the yeast ate more, so a drier beer.',
		anchors: [
			{ at: 60, label: 'a milk stout: a lot of sugar left, thick and sweet' },
			{ at: 70, label: 'an English bitter: some sweetness kept on purpose' },
			{ at: 78, label: 'a pale ale or a lager: where most beer lands' },
			{ at: 85, label: 'a Belgian tripel: dry, and still 9% alcohol' },
			{ at: 92, label: 'a saison: nothing sweet left, which is the style, not a fault' }
		],
		range: [45, 95],
		typical: [68, 85]
	},
	/**
	 * pH, efficiency and alpha acid have no beers on their scale: nobody has
	 * drunk a beer they could name the mash pH of. The anchors below describe
	 * the recognisable thing at each value instead, which is what the labels are
	 * for, rather than pretending to a beer-name anchor the reader cannot check.
	 */
	{
		id: 'mash-ph',
		short: 'pH',
		name: 'mash acidity',
		plain:
			'How acidic the hot mix of crushed grain and water is, on a scale where 7 is neutral and lower is more acidic; a beer mash sits just on the acidic side, near 5.4, which is roughly as acidic as black coffee.',
		direction: 'Lower is more acidic, higher more alkaline. Both ends dull the beer.',
		anchors: [
			{ at: 5.0, label: 'a beer that tastes thin and oddly sharp' },
			{ at: 5.4, label: 'where nearly every good beer sits' },
			{ at: 5.6, label: 'still fine: fuller and softer' },
			{ at: 5.9, label: 'a beer that tastes dull and drying, like stewed tea' }
		],
		range: [4.8, 6.2],
		typical: [5.2, 5.6]
	},
	{
		id: 'co2-volumes',
		short: 'vol',
		name: 'carbonation',
		plain:
			'How much carbon dioxide gas is dissolved in the beer, which is what makes it fizzy; one volume means the beer holds its own volume again in gas, so 2.4 volumes is a glass of beer holding nearly two and a half glasses of gas.',
		direction: 'Higher means more fizz, a sharper edge, a lighter feel.',
		anchors: [
			{ at: 1.2, label: 'a cask ale from a hand pump: almost still, just a prickle' },
			{ at: 2.4, label: 'a supermarket lager: the fizz most people expect' },
			{ at: 2.9, label: 'a German wheat beer: lively, with a tall head' },
			{ at: 3.4, label: 'a Belgian saison: spritzy, closer to sparkling wine' }
		],
		range: [0.8, 4.0],
		typical: [2.0, 2.8]
	},
	{
		id: 'efficiency',
		short: 'eff.',
		name: 'brewhouse efficiency',
		plain:
			'The share of the sugar sitting inside the grain that actually ends up in your pot, as a percentage; the rest stays in the soggy grain and goes on the compost, so this describes your equipment and your brew day rather than the beer.',
		direction: 'Higher means more sugar from the same grain.',
		anchors: [
			{ at: 55, label: 'a rough brew day: much of the sugar never left the grain' },
			{ at: 65, label: 'a simple home setup working normally' },
			{ at: 75, label: 'a well-run home brew day: the usual result' },
			{ at: 85, label: 'a commercial brewery with a proper mill and drainage' }
		],
		range: [40, 92],
		typical: [65, 80]
	},
	{
		id: 'alpha-acid',
		short: 'AA',
		name: 'alpha acid',
		plain:
			'The share of a hop, by weight, that is the resin bitterness is made from, as a percentage; a 12% hop gives roughly twice the bitterness per gram as a 6% one, which is why recipes call for very different weights of different hops.',
		direction: 'Higher means more bitterness per gram, not more aroma.',
		anchors: [
			{ at: 3.5, label: 'Saaz, the soft Czech pilsner hop: a pilsner needs a big handful' },
			{ at: 5.5, label: 'Cascade, the grapefruit hop behind American pale ale' },
			{ at: 10, label: 'Centennial: about double the punch per gram' },
			{ at: 15, label: 'Columbus: a little goes a long way' }
		],
		range: [2, 20],
		typical: [3, 16]
	}
];

/* -------------------------------------------------------------------------- */
/* Terms                                                                      */
/*                                                                            */
/* Ordered by where they appear on a brew day rather than alphabetically, so   */
/* reading the list straight through tells the story of a batch. Lookup is by  */
/* word through TERM_BY_WORD, so the order costs nothing at runtime.           */
/* -------------------------------------------------------------------------- */

export const TERMS: Term[] = [
	/* --- The four ingredients ------------------------------------------------ */
	{
		id: 'malt',
		word: 'malt',
		plain:
			'Barley grain that has been soaked until it begins to sprout and then dried in a kiln to stop it. Sprouting turns the hard, useless starch inside into something that can be released as sugar, and how hard it is dried sets its colour and flavour, from pale biscuit through caramel to black coffee.'
	},
	{
		id: 'hop',
		word: 'hop',
		plain:
			'The green cone-shaped flower of a climbing plant, dried and used like a spice. It supplies the bitterness that balances the sweetness of the grain, and most of the smell of a beer: citrus, pine, flowers or herbs depending on the variety.'
	},
	{
		id: 'yeast',
		word: 'yeast',
		plain:
			'A single-celled fungus, the same family as the yeast in bread. It eats the sugar and turns it into alcohol and carbon dioxide gas, and while it works it also makes most of the fruity and spicy smells in the finished beer.',
		soWhat:
			'Yeast is an ingredient with a flavour of its own, not just a machine that makes alcohol.'
	},
	{
		id: 'grist',
		word: 'grist',
		plain:
			'The mix of crushed grains a recipe uses, and how much of each. It is the grain shopping list, weighed out and put through a mill.',
		soWhat:
			'The grist sets the colour, the thickness and most of the flavour before anything else happens.'
	},
	{
		id: 'base-malt',
		word: 'base malt',
		plain:
			'The pale malt that makes up most of a recipe, usually 70% or more of the grain. It is dried gently, so it keeps the enzymes, the natural chemicals in the grain that turn its starch into sugar.',
		soWhat:
			'Almost all the sugar in a beer comes from base malt. Too little of it and the rest of the grain never converts.'
	},
	{
		id: 'speciality-malt',
		word: 'speciality malt',
		plain:
			'Malt kilned hotter or longer to give colour and flavour: caramel, toast, chocolate, coffee. The heat destroys the enzymes, the natural chemicals that convert starch into sugar, so it leans on the pale malt alongside it.',
		soWhat:
			'Used in small amounts, typically 5 to 15% of the grain. More than that and the beer tastes sticky or burnt.'
	},
	{
		id: 'crystal-malt',
		word: 'crystal malt',
		plain:
			'Malt that was cooked while still wet, so sugar formed inside the husk, and then dried. Those sugars are mostly ones yeast cannot eat, so crystal malt adds caramel flavour, colour and a sweetness that survives fermentation.',
		soWhat:
			'Above roughly 10% of the grain it starts to taste sticky, and no amount of hops hides it.'
	},
	{
		id: 'roasted-malt',
		word: 'roasted malt',
		plain:
			'Grain roasted dark and dry, like coffee beans. It gives black colour and coffee, chocolate and burnt flavours, and a real bitterness of its own that has nothing to do with hops.',
		soWhat:
			'A dry stout gets a good part of its bitter edge from roasted grain, so it needs fewer hops than it tastes like it does.'
	},
	{
		id: 'adjunct',
		word: 'adjunct',
		plain:
			'Anything fermentable in the recipe that is not malted barley: oats, wheat flakes, maize, rice, plain sugar. The word sounds like a cheat but is not one.',
		soWhat:
			'Oats make a stout silky, wheat builds foam, and plain sugar makes a strong Belgian beer dry instead of syrupy.'
	},
	{
		id: 'floor-malted',
		word: 'floor-malted',
		plain:
			'Malt sprouted in a thin layer on a floor and turned by hand with a rake, rather than tumbled in a machine. It is slower and costs more.',
		soWhat:
			'Brewers say it tastes rounder and nuttier, which is why a malt like Maris Otter gives more flavour than its pale colour suggests.'
	},
	{
		id: 'diastatic-power',
		word: 'diastatic power',
		plain:
			'How much enzyme a malt carries, meaning how much starch it can turn into sugar: its own, and some of the grain around it. Pale malts have plenty. Dark and caramel malts have none, because the kiln destroyed it.',
		soWhat:
			'A recipe needs enough high-power pale malt, usually over half the grain, or some starch never becomes sugar and the beer comes out weak.'
	},
	{
		id: 'noble-hop',
		word: 'noble hop',
		plain:
			'A small group of old European hop varieties, mostly German and Czech, with a soft floral and herbal smell. "Noble" is a family name, like calling a grape a Riesling. It does not mean premium, better or more expensive.',
		soWhat:
			'They are deliberately low in the resin that makes bitterness, so a pilsner needs a big handful of them. A punchy modern hop in that beer would be wrong, not an upgrade.'
	},

	/* --- Mash and run-off ---------------------------------------------------- */
	{
		id: 'mash',
		word: 'mash',
		plain:
			'Stirring the crushed grain into hot water, around 65 °C, and leaving it alone for an hour. It looks and smells like hot porridge. In that hour the enzymes in the grain, natural chemicals released by the sprouting, cut its starch into sugar.'
	},
	{
		id: 'dough-in',
		word: 'dough in',
		plain:
			'The act of stirring the crushed grain into the hot water at the start of the mash. The name is borrowed from bread making, because the moment it goes in it thickens like dough.',
		soWhat: 'Stir the lumps out properly. Dry pockets in the middle never convert to sugar.'
	},
	{
		id: 'wort',
		word: 'wort',
		plain:
			'The sweet liquid drained off the soaked grain. It is sugar water with a strong grain flavour, and it is what the yeast turns into beer. Said "wert", rhyming with hurt.',
		soWhat:
			'Every figure on the page before fermentation describes wort. It is not beer yet: no alcohol, no fizz.'
	},
	{
		id: 'tun',
		word: 'tun',
		plain:
			'The vessel the mash happens in, usually an insulated box or a cool-box with a tap near the bottom. It holds the heat for an hour without being on a flame, and the tap lets the liquid drain off the grain afterwards.'
	},
	{
		id: 'mash-rest',
		word: 'mash rest',
		plain:
			'A stretch of time the mash is held at one steady temperature. A simple mash is a single rest of about an hour. A step mash has two or three rests at rising temperatures, each aimed at a different enzyme, which is a natural chemical in the grain that breaks starch down.'
	},
	{
		id: 'enzymes',
		word: 'enzymes',
		plain:
			'Natural chemicals inside the malt that cut its starch into sugar once they are wet and warm. They are the entire reason the mash works, and they are destroyed by heat above roughly 78 °C.',
		soWhat: 'The mash temperature is really a choice about which enzyme does most of the work.'
	},
	{
		id: 'beta-amylase',
		word: 'beta-amylase',
		plain:
			'One of the two starch-cutting chemicals in malt. It works best near 63 °C and snips small, simple sugars off the ends of the starch chains, which yeast eats easily. Above about 70 °C it is destroyed within minutes.',
		soWhat: 'A cooler mash favours it, and gives a drier, thinner beer.'
	},
	{
		id: 'alpha-amylase',
		word: 'alpha-amylase',
		plain:
			'The other starch-cutting chemical in malt. It works best near 70 °C and chops starch anywhere along the chain, which leaves long pieces the yeast cannot eat.',
		soWhat: 'A hotter mash favours it, and gives a fuller, sweeter beer.'
	},
	{
		id: 'dextrins',
		word: 'dextrins',
		plain:
			'Sugar chains left too long for yeast to eat. They go straight through fermentation and stay in the finished beer, where they add thickness and a rounded feel but hardly any sweetness.',
		soWhat:
			'Mashing hotter makes more of them, which is how you make a beer feel full without making it sweet.'
	},
	{
		id: 'decoction',
		word: 'decoction',
		plain:
			'An old German method: scoop out part of the hot grain porridge, boil it hard in a separate pot, then stir it back in to lift the whole mash to the next temperature. The boiling adds a toasty, bready depth.',
		soWhat: 'It adds hours to the day, and modern malt rarely needs it.'
	},
	{
		id: 'mash-out',
		word: 'mash-out',
		plain:
			'A short, hot final rest at the end of the mash, around 76 °C. The heat switches off the starch-cutting chemicals, so the mix of sugars is fixed from that moment, and it thins the liquid so it drains more freely.'
	},
	{
		id: 'grain-bed',
		word: 'grain bed',
		plain:
			'The settled layer of soaked grain sitting in the vessel once the mash is over, usually 10 to 20 cm deep. The liquid drains down through it, and the bed filters itself clear on the way.',
		soWhat:
			'Sticky grains such as wheat, rye and oats make the bed drain slowly or block it completely.'
	},
	{
		id: 'vorlauf',
		word: 'vorlauf',
		plain:
			'Drawing off the first litre or two, which comes out cloudy with grain bits, and gently pouring it back over the top of the grain until it runs clear. German for "run ahead", said "for-lauf".'
	},
	{
		id: 'lauter',
		word: 'lauter',
		plain:
			'Draining the sweet liquid away from the spent grain and into the boiling pot. Also called the run-off. "Lauter" is German for clear, and that is the point: the grain sits on a mesh or false bottom and filters the liquid as it goes.'
	},
	{
		id: 'runnings',
		word: 'runnings',
		plain:
			'The liquid coming out of the tap during the run-off. The first runnings are thick and very sweet. The last runnings are weak and watery, and brewers stop collecting before they get too weak.'
	},
	{
		id: 'sparge',
		word: 'sparge',
		plain:
			'Rinsing the drained grain with hot water to wash out the sugar still clinging to it. About a third of the sugar is still in there when the mash ends, so this is where a lot of it is recovered.',
		soWhat:
			'Rinse too hot or too far and you pull drying, tea-like tannin out of the husks along with the sugar.'
	},
	{
		id: 'tannin',
		word: 'tannin',
		plain:
			'A natural compound in grain husks, and in tea leaves and grape skins. In small amounts it does nothing. Pulled out by water that is too hot, or too rinsed of sugar, it makes the beer taste drying and dull.',
		soWhat: 'This is a flaw, and nothing later in the process removes it.'
	},
	{
		id: 'astringency',
		word: 'astringency',
		plain:
			'A flaw: a drying, mouth-puckering feel like cold over-brewed tea or chewing a grape skin. It is a feeling rather than a taste, which is why it is easy to miss on the first mouthful and obvious by the third.',
		soWhat:
			'It comes from rinsing the grain too hot or too hard, or from leaving hops sitting in the beer for weeks.'
	},

	/* --- Boil ---------------------------------------------------------------- */
	{
		id: 'kettle',
		word: 'kettle',
		plain:
			'The big pot the liquid is boiled in after it has been drained off the grain. A stock pot on the hob at home, a steam-heated copper vessel in a brewery. Nothing to do with a tea kettle.'
	},
	{
		id: 'boil',
		word: 'boil',
		plain:
			'An hour or more of hard, uncovered boiling of the sweet liquid. It kills anything living in it, drives off raw grain smells, boils away water so the sugar is more concentrated, and turns hop resin into bitterness.',
		soWhat:
			'Bitterness needs heat and time; smell is destroyed by both. That one trade-off explains every hop schedule ever written.'
	},
	{
		id: 'bittering-charge',
		word: 'bittering charge',
		plain:
			'The hops thrown in at the start of the boil, usually a full hour before the end. The long boil converts their resin into bitterness and destroys their smell, so this batch of hops is there for bitterness alone.'
	},
	{
		id: 'hot-break',
		word: 'hot break',
		plain:
			'The grey-brown clumps of protein that form and drop out during the boil, a bit like egg drop in soup. It looks alarming and is a good sign.',
		soWhat: 'Protein that leaves in the pot cannot cloud the beer in the glass later.'
	},
	{
		id: 'whirlpool',
		word: 'whirlpool',
		plain:
			'Stirring the pot into a spin after the boil so the spent hops and protein gather in a cone in the middle, leaving clearer liquid to draw off the side. A whirlpool addition is hops added at that moment, when the liquid is hot but no longer boiling.',
		soWhat:
			'Hops added here give smell and flavour with only a little bitterness, because bitterness needs a full boil.'
	},
	{
		id: 'dms',
		word: 'DMS',
		plain:
			'A flaw that smells of cooked sweetcorn, tinned vegetables or boiled cabbage. It reads as harmless on a page and is genuinely unpleasant in the glass.',
		soWhat:
			'It boils away in an open, rolling boil, so it turns up when the lid was on, the boil was too gentle, or the cooling took too long.'
	},

	/* --- Chill and pitch ----------------------------------------------------- */
	{
		id: 'cold-break',
		word: 'cold break',
		plain:
			'A second lot of protein that clumps together and drops out when the boiled liquid is cooled quickly. Fast cooling makes it form in sharp clumps that sink.',
		soWhat: 'Cool slowly and much of it stays floating, so the beer ends up permanently murky.'
	},
	{
		id: 'aeration',
		word: 'aeration',
		plain:
			'Deliberately splashing or stirring air into the cooled liquid just before the yeast goes in. Yeast needs oxygen once, at the very start, to build healthy cells before it begins fermenting.',
		soWhat: 'This is the only moment air is wanted. Everywhere after fermentation, air is damage.'
	},
	{
		id: 'pitch',
		word: 'pitch',
		plain:
			'Adding the yeast to the cooled liquid. That is the whole meaning of the word. It is the moment sugar water starts becoming beer.'
	},
	{
		id: 'pitch-rate',
		word: 'pitch rate',
		plain:
			'How much yeast you add, measured against how much liquid there is and how sugary it is. Too little and the yeast has to breed hard to catch up.',
		soWhat:
			'Under-pitching makes harsh, solventy flavours and can leave the beer unfinished and sweet. Strong beers need more yeast, not the same amount working harder.'
	},

	/* --- Fermentation -------------------------------------------------------- */
	{
		id: 'krausen',
		word: 'krausen',
		plain:
			'The thick, rocky foam that sits on top of the beer during the first days of fermentation. Said "kroy-zen". It rises, holds for a few days and falls back.',
		soWhat: 'Seeing it is the plainest sign that fermentation has started and is going well.'
	},
	{
		id: 'attenuation',
		word: 'attenuation',
		plain:
			'How much of the sugar the yeast actually ate, written as a percentage. High attenuation leaves a dry beer, low attenuation a sweeter and thicker one.',
		soWhat:
			'The percentage is not a grade. A yeast at 70% is not worse than one at 85%, it is for a different beer.'
	},
	{
		id: 'flocculation',
		word: 'flocculation',
		plain:
			'How readily the yeast clumps together and sinks once it has finished working. High-flocculating yeast drops out quickly and leaves clear beer; low-flocculating yeast stays floating.',
		soWhat:
			'It is part of why a hazy IPA is hazy, and why a yeast that drops out too early can leave the beer unfinished.'
	},
	{
		id: 'esters',
		word: 'esters',
		plain:
			'Fruity smells the yeast itself makes while it works: banana, pear, apple, sometimes bubblegum. Nothing fruity was added, and these are not a fault.',
		soWhat:
			'Warmer fermentation makes more of them. It is why a Bavarian wheat beer smells of banana.'
	},
	{
		id: 'phenols',
		word: 'phenols',
		plain:
			'Spicy or smoky smells the yeast makes: clove, black pepper, sometimes smoke or a medicinal note. Only some yeast strains make them at all.',
		soWhat: 'Right in a wheat beer or a Belgian ale, and clearly wrong in a lager.'
	},
	{
		id: 'fusel-alcohol',
		word: 'fusel alcohol',
		plain:
			'A flaw. Heavier alcohols the yeast makes when it ferments too warm, tasting and smelling of solvent or nail varnish, with a harsh burn at the back of the throat. They are what a rough hangover is usually blamed on.',
		soWhat:
			'They do not fade with age. The defence is pitching plenty of yeast and keeping the first days cool.'
	},
	{
		id: 'hot',
		word: 'hot',
		plain:
			'In tasting notes, hot means the burn of alcohol in the throat, the way a spirit burns. It has nothing to do with the temperature the beer is served at.',
		soWhat:
			'A beer called hot is badly made rather than simply strong. A well-made 10% beer should not burn.'
	},
	{
		id: 'diacetyl',
		word: 'diacetyl',
		plain:
			'A flaw, despite how nice it sounds written down. It tastes of butter, butterscotch or the coating on cinema popcorn, and it leaves a slick, greasy film on the tongue that does not rinse away.',
		soWhat:
			'Yeast makes it early and normally clears it up at the end, so it appears when the beer was chilled or bottled before the yeast had finished.'
	},
	{
		id: 'dry',
		word: 'dry',
		plain:
			'Not sweet. A dry beer is one where the yeast ate nearly all the sugar, so there is little left to taste.',
		soWhat: 'It says nothing about strength. A 9% tripel is dry and a 4% milk stout is sweet.'
	},
	{
		id: 'bone-dry',
		word: 'bone dry',
		plain:
			'Completely without sweetness. It is a compliment, not a complaint, and it does not mean thin or watery.',
		soWhat: 'A saison is bone dry and still full of pepper, fruit and fizz.'
	},
	{
		id: 'body',
		word: 'body',
		plain:
			'How thick or thin the beer feels in the mouth, in the way skimmed milk and cream differ. It comes from what the yeast could not eat: long sugar chains and protein.',
		soWhat: 'It is a feeling, not a flavour, and it is separate from both sweetness and strength.'
	},

	/* --- Packaging and after ------------------------------------------------- */
	{
		id: 'trub',
		word: 'trub',
		plain:
			'The sludge left in the bottom of the pot or the fermenting bucket: spent hop matter, clumped protein and dead yeast. Said "troob".',
		soWhat:
			'Some is unavoidable and harmless. A lot of it carried into the bottle makes the beer taste stale sooner.'
	},
	{
		id: 'cold-crash',
		word: 'cold crash',
		plain:
			'Chilling the finished beer to near freezing for a day or two before packaging, so the yeast and haze fall to the bottom and the beer above goes clear.',
		soWhat:
			'Do it before the yeast has finished tidying up and you lock in the buttery diacetyl fault for good.'
	},
	{
		id: 'dry-hop',
		word: 'dry hop',
		plain:
			'Adding hops to the beer after fermentation, cold, with no boiling at all. It adds smell and flavour and no measurable bitterness, because bitterness needs heat.',
		soWhat:
			'This is where nearly all the fruit and pine smell of a modern IPA comes from. Two or three days is plenty; longer adds grassy, over-steeped notes and no more aroma.'
	},
	{
		id: 'priming',
		word: 'priming',
		plain:
			'Adding a measured dose of sugar to the beer as it goes into the bottle. The last of the yeast eats it, sealed in, and the gas it makes has nowhere to go, so it dissolves into the beer.',
		soWhat:
			'That is where the fizz in a bottled beer comes from. Too much sugar and the bottles gush or burst.'
	},
	{
		id: 'conditioning',
		word: 'conditioning',
		plain:
			'The waiting after fermentation, in bottle, keg or tank. Two things happen at once: the beer smooths out and knits together, and its hop smell slowly fades while air does its slow damage.',
		soWhat:
			'Which of the two wins depends on the beer. An imperial stout gains for months; an IPA is best within weeks.'
	},
	{
		id: 'lager',
		word: 'lager',
		plain:
			'As a verb, to store beer cold, close to freezing, for weeks after fermentation: German for "to store". As a noun it means beer made that way, with a yeast that works cold and settles to the bottom, which is most of the beer sold in the world.',
		soWhat:
			'The cold weeks are what make a lager taste clean. Skip them and it tastes rough and slightly buttery.'
	},
	{
		id: 'oxidation',
		word: 'oxidation',
		plain:
			'A flaw: air getting into the beer after fermentation, and the slow damage it does. The fresh hop smell goes first, then the beer turns stale, tasting of wet cardboard, sherry or old paper.',
		soWhat:
			'Nothing reverses it. It is only prevented, by gentle handling at packaging and cold storage afterwards.'
	},

	/* --- Vocabulary that spans the whole process ----------------------------- */
	{
		id: 'gravity-points',
		word: 'gravity points',
		plain:
			'The digits after the 1.0 in a gravity reading, said on their own: liquid at 1.052 is "52 points". It is the same sugar measurement in fewer syllables.',
		soWhat: 'It is the number bitterness is divided by to give the BU:GU balance figure.'
	},
	{
		id: 'top-fermenting',
		word: 'top-fermenting',
		plain:
			'Yeast that works warm, around 18 to 22 °C, and gathers at the surface of the beer while it ferments. Beer made with it is called ale.',
		soWhat:
			'Warm working means more fruity smells, so ales taste of the yeast as well as the malt and hops.'
	},
	{
		id: 'bottom-fermenting',
		word: 'bottom-fermenting',
		plain:
			'Yeast that works cold, around 8 to 14 °C, and settles to the bottom as it goes. Beer made with it is called lager.',
		soWhat:
			'Cold working means almost no fruity smells, so a lager tastes clean and hides nothing that went wrong.'
	},
	{
		id: 'style',
		word: 'style',
		plain:
			'A named recipe tradition with agreed limits: a pilsner, a stout, an IPA. Each one has an expected range for strength, bitterness and colour, written down so competitions can judge fairly.',
		soWhat:
			'It describes what people already brew rather than setting rules. A beer outside every style is unusual, not wrong.'
	}
];

/* -------------------------------------------------------------------------- */
/* Lookup                                                                     */
/* -------------------------------------------------------------------------- */

export const FIGURE_BY_ID = new Map(FIGURES.map((f) => [f.id, f]));

/**
 * Keyed on the lowercased word so callers can pass whatever casing the UI used.
 * Terms are looked up from prose, where the same word appears capitalised at the
 * start of a sentence and lowercase in the middle of one.
 */
export const TERM_BY_WORD = new Map(TERMS.map((t) => [t.word.toLowerCase(), t]));

export function figureFor(id: string): Figure | undefined {
	return FIGURE_BY_ID.get(id);
}

export function termFor(word: string): Term | undefined {
	return TERM_BY_WORD.get(word.trim().toLowerCase());
}
