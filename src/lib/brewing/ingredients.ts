import type { Fermentable, Hop, Yeast } from './types';

/* -------------------------------------------------------------------------- */
/* Fermentables                                                               */
/*                                                                            */
/* `potential` is fine-grind dry-basis yield as a fraction of sucrose.        */
/* `fermentability` multiplies the grist's share of attenuable extract:       */
/* 1 is neutral, lactose is 0, plain dextrose is well above 1.                */
/* -------------------------------------------------------------------------- */

export const FERMENTABLES: Fermentable[] = [
	{
		id: 'pilsner',
		name: 'Pilsner malt',
		category: 'base',
		potential: 0.81,
		colourEbc: 3.5,
		maxShare: 1,
		diastatic: true,
		fermentability: 1,
		sensory: { malt: 3, crispness: 2 },
		blurb: 'Pale, clean and faintly honeyed. The blank canvas of continental brewing.',
		note: 'Kilned gently, so it keeps a high enzyme load and a delicate, slightly grainy sweetness. Rich in the precursor that turns into DMS, which is why pilsner malt likes a vigorous, uncovered 90 minute boil.'
	},
	{
		id: 'pale-ale',
		name: 'Pale ale malt',
		category: 'base',
		potential: 0.8,
		colourEbc: 6,
		maxShare: 1,
		diastatic: true,
		fermentability: 1,
		sensory: { malt: 3.5 },
		blurb: 'A touch more kilning than pilsner: bready, dependable, forgiving.',
		note: 'The default base malt for ales. Plenty of diastatic power to convert itself and a reasonable load of adjuncts alongside it.'
	},
	{
		id: 'maris-otter',
		name: 'Maris Otter',
		category: 'base',
		potential: 0.81,
		colourEbc: 6.5,
		maxShare: 1,
		diastatic: true,
		fermentability: 0.99,
		sensory: { malt: 4.5, caramel: 0.5 },
		blurb: 'English floor-malted classic with a nutty, biscuit depth.',
		note: 'A heritage barley variety kept alive by brewers rather than farmers. It gives more malt character than its colour suggests, which is why so many British bitters use nothing else.'
	},
	{
		id: 'vienna',
		name: 'Vienna malt',
		category: 'base',
		potential: 0.8,
		colourEbc: 8,
		maxShare: 0.9,
		diastatic: true,
		fermentability: 0.99,
		sensory: { malt: 5, caramel: 0.5 },
		blurb: 'Light toast and a warm golden colour.',
		note: 'Kilned a little hotter than pale malt. Fine as 100% of a grist when you want a malt-forward beer that still finishes clean.'
	},
	{
		id: 'munich-light',
		name: 'Munich malt (light)',
		category: 'base',
		potential: 0.79,
		colourEbc: 15,
		maxShare: 0.7,
		diastatic: true,
		fermentability: 0.97,
		sensory: { malt: 6.5, caramel: 1 },
		blurb: 'Deep bready malt with a faint toasted crust.',
		note: 'Retains just enough enzymes to convert itself. Use it as a base for märzen and bock, or as 10–20% of a pale grist to add malt depth without sweetness.'
	},
	{
		id: 'munich-dark',
		name: 'Munich malt (dark)',
		category: 'base',
		potential: 0.78,
		colourEbc: 30,
		maxShare: 0.5,
		diastatic: true,
		fermentability: 0.95,
		sensory: { malt: 8, caramel: 2 },
		blurb: 'Rich toasted bread crust and dark amber colour.',
		note: 'Low diastatic power, so it usually needs a pale base alongside it above about half the grist.'
	},
	{
		id: 'wheat-malt',
		name: 'Wheat malt',
		category: 'base',
		potential: 0.81,
		colourEbc: 4,
		maxShare: 0.7,
		diastatic: true,
		fermentability: 0.99,
		sensory: { malt: 2.5, body: 1.5 },
		blurb: 'Protein-rich, builds dense foam and a soft haze.',
		note: 'Husk-free, so a large share makes the mash sticky and slow to run off. Rice hulls help above roughly 50%.'
	},
	{
		id: 'rye-malt',
		name: 'Rye malt',
		category: 'base',
		potential: 0.78,
		colourEbc: 7,
		maxShare: 0.35,
		diastatic: true,
		fermentability: 0.98,
		sensory: { malt: 3, body: 2, crispness: 1 },
		blurb: 'Peppery, dry and slick on the palate.',
		note: 'Extremely gummy in the mash. Rewarding in small amounts, and a genuine lautering hazard above a third of the grist.'
	},
	{
		id: 'smoked-malt',
		name: 'Smoked malt (beech)',
		category: 'base',
		potential: 0.79,
		colourEbc: 6,
		maxShare: 0.6,
		diastatic: true,
		fermentability: 0.99,
		sensory: { malt: 3, phenols: 9.5 },
		blurb: 'Beechwood smoke, from a whisper to a campfire.',
		note: 'Traditional rauchbier uses 50–100%. At 5–10% it reads as savoury complexity rather than smoke.'
	},
	{
		id: 'flaked-oats',
		name: 'Flaked oats',
		category: 'adjunct',
		potential: 0.75,
		colourEbc: 2,
		maxShare: 0.3,
		diastatic: false,
		fermentability: 0.92,
		sensory: { body: 3.5, sweetness: 0.5 },
		blurb: 'Silky body and a soft, hazy mouthfeel.',
		note: 'The beta-glucans that make oat beers feel creamy also make the mash gluey. 10–20% is the usual sweet spot.'
	},
	{
		id: 'flaked-wheat',
		name: 'Flaked wheat',
		category: 'adjunct',
		potential: 0.77,
		colourEbc: 3,
		maxShare: 0.4,
		diastatic: false,
		fermentability: 0.97,
		sensory: { body: 1.5 },
		blurb: 'Foam stability and protein haze, with little flavour of its own.',
		note: 'Unmalted, so it contributes no enzymes. Common in witbier and modern hazy IPA.'
	},
	{
		id: 'crystal-light',
		name: 'Crystal malt (light, 40 EBC)',
		category: 'speciality',
		potential: 0.75,
		colourEbc: 40,
		maxShare: 0.2,
		diastatic: false,
		fermentability: 0.75,
		sensory: { caramel: 3, sweetness: 1.5, body: 1 },
		blurb: 'Light toffee and a golden glow.',
		note: 'Stewed while still wet so the starch converts inside the husk, then kilned. The sugars it carries are largely unfermentable, which is why crystal malt sweetens as well as colours.'
	},
	{
		id: 'crystal-medium',
		name: 'Crystal malt (medium, 120 EBC)',
		category: 'speciality',
		potential: 0.74,
		colourEbc: 120,
		maxShare: 0.15,
		diastatic: false,
		fermentability: 0.7,
		sensory: { caramel: 5, sweetness: 2.5, body: 1.5 },
		blurb: 'Caramel, dried fruit and copper colour.',
		note: 'The traditional backbone of English bitters and American amber ales. Above roughly 12% it starts to taste sticky.'
	},
	{
		id: 'crystal-dark',
		name: 'Crystal malt (dark, 240 EBC)',
		category: 'speciality',
		potential: 0.72,
		colourEbc: 240,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.65,
		sensory: { caramel: 6, sweetness: 2.5, roast: 1, body: 1.5 },
		blurb: 'Burnt sugar, raisin and a hint of roast.',
		note: 'Powerful. Beyond about 8% of the grist, dark crystal reads as cough syrup rather than caramel.'
	},
	{
		id: 'special-b',
		name: 'Special B',
		category: 'speciality',
		potential: 0.72,
		colourEbc: 300,
		maxShare: 0.08,
		diastatic: false,
		fermentability: 0.7,
		sensory: { caramel: 6, sweetness: 2, roast: 1.5 },
		blurb: 'Raisin, plum and dark rum. Unmistakably Belgian.',
		note: 'A deeply stewed crystal malt. Two to five percent is usually plenty in a dubbel.'
	},
	{
		id: 'biscuit',
		name: 'Biscuit malt',
		category: 'speciality',
		potential: 0.77,
		colourEbc: 45,
		maxShare: 0.15,
		diastatic: false,
		fermentability: 0.98,
		sensory: { malt: 4, caramel: 0.5 },
		blurb: 'Toasted bread and digestive biscuit, with no added sweetness.',
		note: 'Roasted rather than stewed, so it adds flavour and colour without the residual sugar of crystal malt.'
	},
	{
		id: 'aromatic',
		name: 'Aromatic malt',
		category: 'speciality',
		potential: 0.77,
		colourEbc: 50,
		maxShare: 0.15,
		diastatic: false,
		fermentability: 0.97,
		sensory: { malt: 6 },
		blurb: 'Concentrated malt aroma, like Munich turned up.',
		note: 'A few percent lifts malt aroma noticeably. Large amounts turn muddy.'
	},
	{
		id: 'melanoidin',
		name: 'Melanoidin malt',
		category: 'speciality',
		potential: 0.76,
		colourEbc: 60,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.96,
		sensory: { malt: 5, caramel: 1.5 },
		blurb: 'The decoction shortcut: bready depth and red hues.',
		note: 'Rich in Maillard products that a long decoction mash would otherwise create.'
	},
	{
		id: 'pale-chocolate',
		name: 'Pale chocolate malt',
		category: 'roast',
		potential: 0.71,
		colourEbc: 450,
		maxShare: 0.12,
		diastatic: false,
		fermentability: 0.9,
		sensory: { roast: 4, malt: 1 },
		blurb: 'Cocoa and coffee cream without harsh edges.',
		note: 'Gentler than standard chocolate malt. Useful when you want colour and cocoa but not ash.'
	},
	{
		id: 'chocolate',
		name: 'Chocolate malt',
		category: 'roast',
		potential: 0.7,
		colourEbc: 700,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.9,
		sensory: { roast: 6, caramel: 0.5 },
		blurb: 'Dark cocoa, espresso and deep brown colour.',
		note: 'The backbone of porters. Five percent already reads clearly as roast.'
	},
	{
		id: 'carafa-special',
		name: 'Carafa Special III',
		category: 'roast',
		potential: 0.7,
		colourEbc: 1100,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.9,
		sensory: { roast: 5 },
		blurb: 'Dehusked, so it darkens deeply without astringency.',
		note: 'The husk carries most of the harsh, tannic character of roasted grain. Removing it lets you reach black colour with a smooth palate.'
	},
	{
		id: 'roasted-barley',
		name: 'Roasted barley',
		category: 'roast',
		potential: 0.68,
		colourEbc: 1200,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.9,
		sensory: { roast: 8, bitterness: 1.5, crispness: 1 },
		blurb: 'Dry coffee bitterness. The signature of Irish stout.',
		note: 'Unmalted and roasted hard. It contributes real bitterness alongside the hops, which is why dry stouts need less alpha acid than their flavour suggests.'
	},
	{
		id: 'black-malt',
		name: 'Black malt',
		category: 'roast',
		potential: 0.68,
		colourEbc: 1300,
		maxShare: 0.07,
		diastatic: false,
		fermentability: 0.9,
		sensory: { roast: 8, bitterness: 1, crispness: 1.5 },
		blurb: 'Sharp, ashy and jet black.',
		note: 'Mostly used in small amounts for colour adjustment. Above a few percent it turns acrid.'
	},
	{
		id: 'acidulated',
		name: 'Acidulated malt',
		category: 'speciality',
		potential: 0.79,
		colourEbc: 4,
		maxShare: 0.06,
		diastatic: false,
		fermentability: 1,
		sensory: { acidity: 1.5, crispness: 1 },
		blurb: 'Lactic-acid coated malt for lowering mash pH.',
		note: 'Roughly 1% of the grist drops mash pH by about 0.1. A clean way to acidify without touching a bottle of acid.'
	},
	{
		id: 'brewing-sugar',
		name: 'Brewing sugar (dextrose)',
		category: 'sugar',
		potential: 1,
		colourEbc: 0,
		maxShare: 0.2,
		diastatic: false,
		fermentability: 1.35,
		sensory: { crispness: 1.5, alcoholWarmth: 0.5 },
		blurb: 'Pure fermentable: more alcohol, less body.',
		note: 'Belgian brewers use sugar to reach high strength while keeping the beer drinkable. Above roughly 20% the beer starts to taste thin and cidery.'
	},
	{
		id: 'candi-dark',
		name: 'Dark candi sugar',
		category: 'sugar',
		potential: 0.78,
		colourEbc: 300,
		maxShare: 0.2,
		diastatic: false,
		fermentability: 1.25,
		sensory: { caramel: 3, malt: 1, alcoholWarmth: 0.5 },
		blurb: 'Dried fruit, toffee and rum, and still highly fermentable.',
		note: 'The trick behind dubbels: dark, complex flavour that ferments almost completely away, leaving depth without sweetness.'
	},
	{
		id: 'lactose',
		name: 'Lactose',
		category: 'sugar',
		potential: 0.75,
		colourEbc: 2,
		maxShare: 0.12,
		diastatic: false,
		fermentability: 0,
		sensory: { sweetness: 5, body: 2 },
		blurb: 'Milk sugar. Brewing yeast cannot ferment it at all.',
		note: 'Everything you add stays in the glass as sweetness and body. Use it deliberately, and remember it raises FG without raising ABV.'
	},
	{
		id: 'honey-malt',
		name: 'Honey malt',
		category: 'speciality',
		potential: 0.76,
		colourEbc: 50,
		maxShare: 0.1,
		diastatic: false,
		fermentability: 0.8,
		sensory: { sweetness: 2.5, malt: 3, caramel: 1.5 },
		blurb: 'Intense honeyed sweetness.',
		note: 'Distinctive and easy to overdo. Three to five percent is usually enough to notice.'
	}
];

export const FERMENTABLE_BY_ID = new Map(FERMENTABLES.map((f) => [f.id, f]));

export function getFermentable(id: string): Fermentable | undefined {
	return FERMENTABLE_BY_ID.get(id);
}

/* -------------------------------------------------------------------------- */
/* Hops                                                                       */
/* -------------------------------------------------------------------------- */

export const HOPS: Hop[] = [
	// Germany
	{
		id: 'hallertau-mf',
		name: 'Hallertau Mittelfrüh',
		origin: 'German',
		alphaAcid: 4,
		aromaIntensity: 0.8,
		bitternessQuality: 0.8,
		tags: ['floral', 'herbal', 'spicy'],
		blurb: 'The classic noble hop: soft, floral and slightly herbal.'
	},
	{
		id: 'tettnanger',
		name: 'Tettnanger',
		origin: 'German',
		alphaAcid: 4.5,
		aromaIntensity: 0.8,
		bitternessQuality: 0.8,
		tags: ['spicy', 'herbal', 'floral'],
		blurb: 'Delicate and peppery, a touch brighter than Hallertau.'
	},
	{
		id: 'spalt-select',
		name: 'Spalt Select',
		origin: 'German',
		alphaAcid: 4.5,
		aromaIntensity: 0.75,
		bitternessQuality: 0.8,
		tags: ['floral', 'spicy', 'herbal'],
		blurb: 'Refined and restrained. Built for pilsner and altbier.'
	},
	{
		id: 'hersbrucker',
		name: 'Hersbrucker',
		origin: 'German',
		alphaAcid: 3.5,
		aromaIntensity: 0.75,
		bitternessQuality: 0.8,
		tags: ['floral', 'herbal', 'earthy'],
		blurb: 'Gentle hay and wildflower character.'
	},
	{
		id: 'saphir',
		name: 'Saphir',
		origin: 'German',
		alphaAcid: 3.5,
		aromaIntensity: 0.9,
		bitternessQuality: 0.75,
		tags: ['citrus', 'floral', 'herbal'],
		blurb: 'A modern noble hop with tangerine brightness.'
	},
	{
		id: 'perle',
		name: 'Perle',
		origin: 'German',
		alphaAcid: 8,
		aromaIntensity: 0.85,
		bitternessQuality: 0.85,
		tags: ['spicy', 'floral', 'herbal'],
		blurb: 'Clean bittering with a minty, green edge.'
	},
	{
		id: 'magnum',
		name: 'Magnum',
		origin: 'German',
		alphaAcid: 13,
		aromaIntensity: 0.4,
		bitternessQuality: 0.6,
		tags: ['herbal', 'earthy'],
		blurb: 'Almost neutral. Chosen for smooth bitterness, not aroma.'
	},
	{
		id: 'herkules',
		name: 'Herkules',
		origin: 'German',
		alphaAcid: 16,
		aromaIntensity: 0.5,
		bitternessQuality: 0.75,
		tags: ['resin', 'spicy', 'earthy'],
		blurb: 'High alpha workhorse with a faint dank undertone.'
	},
	// Czech and neighbours
	{
		id: 'saaz',
		name: 'Saaz',
		origin: 'Czech',
		alphaAcid: 3.5,
		aromaIntensity: 0.8,
		bitternessQuality: 0.7,
		tags: ['spicy', 'herbal', 'earthy'],
		blurb: 'Soft, hay-like and unmistakable in a Czech pilsner.'
	},
	{
		id: 'styrian-goldings',
		name: 'Styrian Goldings',
		origin: 'Slovenian',
		alphaAcid: 4.5,
		aromaIntensity: 0.85,
		bitternessQuality: 0.75,
		tags: ['earthy', 'floral', 'herbal'],
		blurb: 'Elegant and slightly lemony, despite its Fuggle parentage.'
	},
	{
		id: 'strisselspalt',
		name: 'Strisselspalt',
		origin: 'French',
		alphaAcid: 3.5,
		aromaIntensity: 0.75,
		bitternessQuality: 0.75,
		tags: ['floral', 'herbal', 'citrus'],
		blurb: 'Alsace noble hop with a pear and blossom lift.'
	},
	// England
	{
		id: 'ekg',
		name: 'East Kent Goldings',
		origin: 'English',
		alphaAcid: 5.5,
		aromaIntensity: 0.85,
		bitternessQuality: 0.7,
		tags: ['floral', 'earthy', 'herbal'],
		blurb: 'Honeyed, lavender-tinged and deeply traditional.'
	},
	{
		id: 'fuggle',
		name: 'Fuggle',
		origin: 'English',
		alphaAcid: 4.5,
		aromaIntensity: 0.8,
		bitternessQuality: 0.7,
		tags: ['earthy', 'herbal', 'floral'],
		blurb: 'Woodland floor and mild mint. The other half of English brewing.'
	},
	{
		id: 'challenger',
		name: 'Challenger',
		origin: 'English',
		alphaAcid: 7.5,
		aromaIntensity: 0.85,
		bitternessQuality: 0.75,
		tags: ['spicy', 'floral', 'citrus'],
		blurb: 'Versatile: clean bitterness and a marmalade note late.'
	},
	{
		id: 'target',
		name: 'Target',
		origin: 'English',
		alphaAcid: 11,
		aromaIntensity: 0.8,
		bitternessQuality: 0.95,
		tags: ['resin', 'earthy', 'herbal'],
		blurb: 'Assertive and sage-like. Bitterness with shoulders.'
	},
	{
		id: 'bramling-cross',
		name: 'Bramling Cross',
		origin: 'English',
		alphaAcid: 6,
		aromaIntensity: 0.9,
		bitternessQuality: 0.75,
		tags: ['berry', 'spicy', 'earthy'],
		blurb: 'Blackcurrant and lemon. A British hop that behaves like a new-world one.'
	},
	{
		id: 'first-gold',
		name: 'First Gold',
		origin: 'English',
		alphaAcid: 7.5,
		aromaIntensity: 0.85,
		bitternessQuality: 0.75,
		tags: ['citrus', 'floral', 'spicy'],
		blurb: 'Orange peel and a touch of apricot over a Goldings base.'
	},
	// United States
	{
		id: 'cascade',
		name: 'Cascade',
		origin: 'American',
		alphaAcid: 5.5,
		aromaIntensity: 1,
		bitternessQuality: 0.8,
		tags: ['citrus', 'floral'],
		blurb: 'Grapefruit and flowers. The hop that started American craft brewing.'
	},
	{
		id: 'centennial',
		name: 'Centennial',
		origin: 'American',
		alphaAcid: 10,
		aromaIntensity: 1.05,
		bitternessQuality: 0.85,
		tags: ['citrus', 'floral', 'resin'],
		blurb: 'Lemon and pine. Sometimes called super Cascade.'
	},
	{
		id: 'chinook',
		name: 'Chinook',
		origin: 'American',
		alphaAcid: 13,
		aromaIntensity: 1.05,
		bitternessQuality: 1.05,
		tags: ['pine', 'resin', 'citrus'],
		blurb: 'Pine forest and grapefruit pith, with a firm bitterness.'
	},
	{
		id: 'columbus',
		name: 'Columbus',
		origin: 'American',
		alphaAcid: 15,
		aromaIntensity: 1.1,
		bitternessQuality: 1,
		tags: ['dank', 'resin', 'earthy'],
		blurb: 'Pungent, oily and herbal. The classic dank hop.'
	},
	{
		id: 'simcoe',
		name: 'Simcoe',
		origin: 'American',
		alphaAcid: 13,
		aromaIntensity: 1.15,
		bitternessQuality: 0.9,
		tags: ['pine', 'berry', 'tropical'],
		blurb: 'Pine and passionfruit at once, with a savoury edge.'
	},
	{
		id: 'citra',
		name: 'Citra',
		origin: 'American',
		alphaAcid: 12,
		aromaIntensity: 1.3,
		bitternessQuality: 0.8,
		tags: ['citrus', 'tropical', 'stone-fruit'],
		blurb: 'Mango, lime and grapefruit. Loud in the best way.'
	},
	{
		id: 'mosaic',
		name: 'Mosaic',
		origin: 'American',
		alphaAcid: 12.5,
		aromaIntensity: 1.3,
		bitternessQuality: 0.85,
		tags: ['tropical', 'berry', 'dank'],
		blurb: 'Blueberry, mango and a dank underside.'
	},
	{
		id: 'amarillo',
		name: 'Amarillo',
		origin: 'American',
		alphaAcid: 9,
		aromaIntensity: 1.15,
		bitternessQuality: 0.8,
		tags: ['citrus', 'stone-fruit', 'floral'],
		blurb: 'Orange, apricot and blossom.'
	},
	{
		id: 'willamette',
		name: 'Willamette',
		origin: 'American',
		alphaAcid: 5,
		aromaIntensity: 0.8,
		bitternessQuality: 0.7,
		tags: ['floral', 'earthy', 'herbal'],
		blurb: 'The American answer to Fuggle: mild and slightly fruity.'
	},
	{
		id: 'el-dorado',
		name: 'El Dorado',
		origin: 'American',
		alphaAcid: 14,
		aromaIntensity: 1.2,
		bitternessQuality: 0.8,
		tags: ['tropical', 'stone-fruit', 'citrus'],
		blurb: 'Pear drop, watermelon and candied pineapple.'
	},
	{
		id: 'sorachi-ace',
		name: 'Sorachi Ace',
		origin: 'Japanese',
		alphaAcid: 13,
		aromaIntensity: 1.2,
		bitternessQuality: 0.85,
		tags: ['citrus', 'herbal'],
		blurb: 'Lemon zest and fresh dill. Polarising, and unforgettable.'
	},
	// New Zealand
	{
		id: 'nelson-sauvin',
		name: 'Nelson Sauvin',
		origin: 'New Zealand',
		alphaAcid: 12,
		aromaIntensity: 1.25,
		bitternessQuality: 0.9,
		tags: ['tropical', 'stone-fruit', 'resin'],
		blurb: 'Gooseberry and white wine. Named for Sauvignon Blanc.'
	},
	{
		id: 'motueka',
		name: 'Motueka',
		origin: 'New Zealand',
		alphaAcid: 7,
		aromaIntensity: 1.1,
		bitternessQuality: 0.75,
		tags: ['citrus', 'tropical', 'herbal'],
		blurb: 'Lime and lemongrass over a noble backbone.'
	},
	{
		id: 'riwaka',
		name: 'Riwaka',
		origin: 'New Zealand',
		alphaAcid: 5.5,
		aromaIntensity: 1.25,
		bitternessQuality: 0.75,
		tags: ['citrus', 'tropical', 'stone-fruit'],
		blurb: 'Intense grapefruit and passionfruit for its modest alpha.'
	},
	// Australia
	{
		id: 'galaxy',
		name: 'Galaxy',
		origin: 'Australian',
		alphaAcid: 14,
		aromaIntensity: 1.35,
		bitternessQuality: 0.9,
		tags: ['tropical', 'citrus', 'stone-fruit'],
		blurb: 'Passionfruit and peach at full volume.'
	},
	{
		id: 'vic-secret',
		name: 'Vic Secret',
		origin: 'Australian',
		alphaAcid: 17,
		aromaIntensity: 1.2,
		bitternessQuality: 0.9,
		tags: ['tropical', 'pine', 'stone-fruit'],
		blurb: 'Pineapple and pine needles, with real bittering power.'
	},
	{
		id: 'ella',
		name: 'Ella',
		origin: 'Australian',
		alphaAcid: 14,
		aromaIntensity: 1.05,
		bitternessQuality: 0.85,
		tags: ['floral', 'spicy', 'stone-fruit'],
		blurb: 'Aniseed and grapefruit when pushed, delicate when restrained.'
	}
];

export const HOP_BY_ID = new Map(HOPS.map((h) => [h.id, h]));

export function getHop(id: string): Hop | undefined {
	return HOP_BY_ID.get(id);
}

/* -------------------------------------------------------------------------- */
/* Yeast                                                                      */
/* -------------------------------------------------------------------------- */

export const YEASTS: Yeast[] = [
	{
		id: 'american-ale',
		name: 'Clean American ale',
		kind: 'ale',
		attenuation: 0.78,
		tempMinC: 15,
		tempMaxC: 22,
		tempIdealC: 19,
		flocculation: 'medium',
		esterBase: 1.2,
		phenolBase: 0,
		tempSensitivity: 0.5,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'Neutral and dependable. Lets malt and hops speak for themselves.',
		note: 'The default choice for American pale ales and IPAs. Its neutrality is the point: almost nothing it produces distracts from the hops.'
	},
	{
		id: 'english-ale',
		name: 'English ale',
		kind: 'ale',
		attenuation: 0.7,
		tempMinC: 16,
		tempMaxC: 22,
		tempIdealC: 19,
		flocculation: 'high',
		esterBase: 4,
		phenolBase: 0,
		tempSensitivity: 0.8,
		souring: 0,
		alcoholTolerance: 0.1,
		blurb: 'Fruity, malty and quick to drop bright.',
		note: 'Low attenuation leaves body and sweetness behind, which is exactly what a bitter needs. High flocculation can stall if the beer is left cold and undisturbed.'
	},
	{
		id: 'irish-ale',
		name: 'Irish ale',
		kind: 'ale',
		attenuation: 0.73,
		tempMinC: 17,
		tempMaxC: 22,
		tempIdealC: 19,
		flocculation: 'medium',
		esterBase: 2.2,
		phenolBase: 0,
		tempSensitivity: 0.6,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'Slightly fruity with a dry, mineral finish.',
		note: 'Built for stout: it tolerates roast bitterness and finishes crisply without stripping the malt.'
	},
	{
		id: 'neipa-ale',
		name: 'Hazy IPA ale',
		kind: 'ale',
		attenuation: 0.75,
		tempMinC: 18,
		tempMaxC: 23,
		tempIdealC: 20,
		flocculation: 'low',
		esterBase: 5,
		phenolBase: 0,
		tempSensitivity: 0.9,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'Stone-fruit esters and a permanent soft haze.',
		note: 'Low flocculation keeps yeast in suspension, which is part of why hazy IPAs stay hazy. Its esters are chosen to echo tropical hop aroma rather than compete with it.'
	},
	{
		id: 'belgian-abbey',
		name: 'Belgian abbey',
		kind: 'ale',
		attenuation: 0.8,
		tempMinC: 18,
		tempMaxC: 26,
		tempIdealC: 21,
		flocculation: 'medium',
		esterBase: 6,
		phenolBase: 3,
		tempSensitivity: 1.1,
		souring: 0,
		alcoholTolerance: 0.13,
		blurb: 'Banana, pear and a warm peppery lift.',
		note: 'Traditionally allowed to free-rise during fermentation. That rising temperature is what builds the ester ladder of a dubbel or tripel.'
	},
	{
		id: 'saison',
		name: 'Saison',
		kind: 'ale',
		attenuation: 0.88,
		tempMinC: 20,
		tempMaxC: 32,
		tempIdealC: 26,
		flocculation: 'low',
		esterBase: 6,
		phenolBase: 5,
		tempSensitivity: 0.85,
		souring: 0.5,
		alcoholTolerance: 0.13,
		blurb: 'Ferments almost everything. Peppery, citric and bone dry.',
		note: 'Famous for stalling around 1.030 and then finishing if kept warm. Saison strains genuinely prefer heat, so the usual warning about hot fermentation applies much later than normal.'
	},
	{
		id: 'hefeweizen',
		name: 'Hefeweizen',
		kind: 'ale',
		attenuation: 0.75,
		tempMinC: 17,
		tempMaxC: 24,
		tempIdealC: 19,
		flocculation: 'low',
		esterBase: 7,
		phenolBase: 7,
		tempSensitivity: 1.3,
		souring: 0,
		alcoholTolerance: 0.1,
		blurb: 'Banana and clove, dialled by temperature.',
		note: 'Cooler fermentation favours clove-like phenols, warmer favours banana esters. Few strains give the brewer this much direct control over flavour.'
	},
	{
		id: 'kolsch',
		name: 'Kölsch',
		kind: 'ale',
		attenuation: 0.76,
		tempMinC: 14,
		tempMaxC: 20,
		tempIdealC: 17,
		flocculation: 'high',
		esterBase: 2,
		phenolBase: 0,
		tempSensitivity: 0.9,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'An ale that wants to be a lager: subtle fruit, crisp finish.',
		note: 'Fermented cool and then lagered, it produces a beer most drinkers would guess was bottom-fermented.'
	},
	{
		id: 'czech-lager',
		name: 'Czech lager',
		kind: 'lager',
		attenuation: 0.73,
		tempMinC: 8,
		tempMaxC: 14,
		tempIdealC: 11,
		flocculation: 'high',
		esterBase: 0.8,
		phenolBase: 0,
		tempSensitivity: 1.2,
		souring: 0,
		alcoholTolerance: 0.1,
		blurb: 'Malty, soft and slow. Leaves a little sweetness behind.',
		note: 'Lager strains work slowly and produce diacetyl on the way. A warm rest at the end of fermentation is how brewers clean it up.'
	},
	{
		id: 'german-lager',
		name: 'German lager',
		kind: 'lager',
		attenuation: 0.77,
		tempMinC: 9,
		tempMaxC: 15,
		tempIdealC: 12,
		flocculation: 'medium',
		esterBase: 0.6,
		phenolBase: 0,
		tempSensitivity: 1.2,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'Crisp, dry and almost invisible.',
		note: 'The most unforgiving yeast in this list: with nothing to hide behind, every process flaw shows up in the glass.'
	},
	{
		id: 'california-lager',
		name: 'California lager',
		kind: 'lager',
		attenuation: 0.76,
		tempMinC: 14,
		tempMaxC: 20,
		tempIdealC: 17,
		flocculation: 'high',
		esterBase: 1.5,
		phenolBase: 0,
		tempSensitivity: 0.7,
		souring: 0,
		alcoholTolerance: 0.11,
		blurb: 'A lager strain that tolerates ale temperatures.',
		note: 'Used for steam beer. It gives lager-like cleanliness without refrigeration, at the cost of a slight woody fruitiness.'
	},
	{
		id: 'kveik-voss',
		name: 'Kveik (Voss)',
		kind: 'ale',
		attenuation: 0.82,
		tempMinC: 25,
		tempMaxC: 40,
		tempIdealC: 32,
		flocculation: 'high',
		esterBase: 5,
		phenolBase: 0,
		tempSensitivity: 0.35,
		souring: 0,
		alcoholTolerance: 0.14,
		blurb: 'Norwegian farmhouse yeast: orange peel, and astonishingly fast.',
		note: 'Kveik breaks the usual rule that hot fermentation means fusel alcohol. At 35 °C it can finish a beer in two days and still taste clean.'
	},
	{
		id: 'brett-blend',
		name: 'Brett-forward blend',
		kind: 'wild',
		attenuation: 0.88,
		tempMinC: 18,
		tempMaxC: 26,
		tempIdealC: 22,
		flocculation: 'low',
		esterBase: 5,
		phenolBase: 5,
		tempSensitivity: 0.7,
		souring: 2,
		alcoholTolerance: 0.12,
		blurb: 'Pineapple, hay and barnyard funk. Very dry.',
		note: 'Brettanomyces slowly consumes sugars other yeasts leave behind, so these beers keep drying out for months in the bottle.'
	},
	{
		id: 'mixed-sour',
		name: 'Mixed sour culture',
		kind: 'wild',
		attenuation: 0.85,
		tempMinC: 18,
		tempMaxC: 30,
		tempIdealC: 24,
		flocculation: 'low',
		esterBase: 4,
		phenolBase: 3,
		tempSensitivity: 0.6,
		souring: 6,
		alcoholTolerance: 0.12,
		blurb: 'Lactic bacteria alongside yeast: clean tartness and depth.',
		note: 'Lactobacillus is inhibited by hops, so soured beers are traditionally brewed with very low bitterness. High IBU and a sour culture fight each other.'
	}
];

export const YEAST_BY_ID = new Map(YEASTS.map((y) => [y.id, y]));

export function getYeast(id: string): Yeast | undefined {
	return YEAST_BY_ID.get(id);
}
