/**
 * BrewLab domain model.
 *
 * Everything in `src/lib/brewing` is pure TypeScript with no UI dependency:
 * the same engine runs in tests, in the browser and (in principle) anywhere else.
 */

/* -------------------------------------------------------------------------- */
/* Units                                                                      */
/* -------------------------------------------------------------------------- */

/** Specific gravity, e.g. 1.052. */
export type Gravity = number;
/** Colour in EBC. SRM is derived where needed. */
export type EBC = number;
/** Litres. */
export type Litres = number;
/** Kilograms. */
export type Kilograms = number;
/** Grams. */
export type Grams = number;
/** Degrees Celsius. */
export type Celsius = number;

/* -------------------------------------------------------------------------- */
/* Water                                                                      */
/* -------------------------------------------------------------------------- */

/** Ion concentrations in ppm (mg/L). */
export type WaterProfile = {
	id: string;
	name: string;
	description: string;
	calcium: number;
	magnesium: number;
	sodium: number;
	sulfate: number;
	chloride: number;
	bicarbonate: number;
};

export type SaltKey = 'gypsum' | 'calciumChloride' | 'epsom' | 'bakingSoda' | 'chalk';

/** Salt additions in grams across the full batch. */
export type SaltAdditions = Record<SaltKey, Grams>;

export type WaterSetup = {
	profileId: string;
	/** Present only when profileId === 'custom'. */
	custom?: Omit<WaterProfile, 'id' | 'name' | 'description'>;
	salts: SaltAdditions;
	/** 88% lactic acid, millilitres across the full batch. */
	lacticAcidMl: number;
};

/* -------------------------------------------------------------------------- */
/* Fermentables                                                               */
/* -------------------------------------------------------------------------- */

export type FermentableCategory = 'base' | 'speciality' | 'roast' | 'adjunct' | 'sugar';

export type Fermentable = {
	id: string;
	name: string;
	category: FermentableCategory;
	/** Fine grind dry basis yield as a fraction of sucrose, e.g. 0.80. */
	potential: number;
	colourEbc: EBC;
	/** Recommended maximum share of the grist, 0–1. */
	maxShare: number;
	/** Whether the malt carries enough diastatic power to convert itself (and others). */
	diastatic: boolean;
	/**
	 * Diastatic power in degrees Lintner: how much starch-converting enzyme this
	 * malt brings per unit weight. Roughly 0 for anything kilned or roasted hard
	 * enough to destroy the enzymes; 35 is the rule-of-thumb floor for a grist to
	 * convert itself.
	 */
	diastaticPowerLintner: number;
	/**
	 * Multiplier on apparent attenuation contributed by this fermentable's share.
	 * 1 = neutral, >1 = drier, <1 = more residual sweetness.
	 */
	fermentability: number;
	/** Per-kg-per-share sensory pushes, scaled by grist share in the engine. */
	sensory: Partial<SensoryVector>;
	/** One-line description shown in the picker. */
	blurb: string;
	/** Longer educational note. */
	note: string;
};

export type FermentableAddition = {
	id: string;
	fermentableId: string;
	weightKg: Kilograms;
};

/* -------------------------------------------------------------------------- */
/* Mash                                                                       */
/* -------------------------------------------------------------------------- */

export type MashStepKind = 'acid' | 'protein' | 'beta' | 'alpha' | 'mashout';

export type MashStep = {
	id: string;
	kind: MashStepKind;
	tempC: Celsius;
	minutes: number;
};

export type MashSetup = {
	steps: MashStep[];
	/** Litres of strike water per kg of grain. */
	thicknessLPerKg: number;
};

/* -------------------------------------------------------------------------- */
/* Hops                                                                       */
/* -------------------------------------------------------------------------- */

export type HopTag =
	| 'citrus'
	| 'tropical'
	| 'stone-fruit'
	| 'berry'
	| 'floral'
	| 'spicy'
	| 'herbal'
	| 'resin'
	| 'pine'
	| 'earthy'
	| 'grassy'
	| 'dank';

export type HopOrigin =
	| 'German'
	| 'Czech'
	| 'English'
	| 'American'
	| 'New Zealand'
	| 'Australian'
	| 'Slovenian'
	| 'French'
	| 'Japanese';

export type Hop = {
	id: string;
	name: string;
	origin: HopOrigin;
	/** Alpha acid percentage, e.g. 12.5. */
	alphaAcid: number;
	/** Relative aroma intensity per gram, 0.6 (soft) – 1.4 (loud). */
	aromaIntensity: number;
	/** Co-humulone-ish harshness proxy: higher = sharper bitterness. */
	bitternessQuality: number;
	tags: HopTag[];
	blurb: string;
};

export type HopUse = 'boil' | 'whirlpool' | 'dryHop';

export type HopAddition = {
	id: string;
	hopId: string;
	use: HopUse;
	grams: Grams;
	/** Boil: minutes remaining in boil. Whirlpool: stand minutes. Dry hop: days of contact. */
	time: number;
	/** Whirlpool only: stand temperature. */
	tempC?: Celsius;
	/** Dry hop only: day of fermentation the hops go in. */
	day?: number;
};

/* -------------------------------------------------------------------------- */
/* Yeast and fermentation                                                     */
/* -------------------------------------------------------------------------- */

export type YeastKind = 'ale' | 'lager' | 'wild';

export type Yeast = {
	id: string;
	name: string;
	kind: YeastKind;
	/** Apparent attenuation as a fraction, e.g. 0.78. */
	attenuation: number;
	tempMinC: Celsius;
	tempMaxC: Celsius;
	/** Sweet spot used for ester/phenol modelling. */
	tempIdealC: Celsius;
	flocculation: 'low' | 'medium' | 'high';
	/** Ester production at ideal temperature, 0–10 scale contribution. */
	esterBase: number;
	/** Phenol (clove/pepper) production at ideal temperature. */
	phenolBase: number;
	/** How strongly esters/phenols climb with temperature. */
	tempSensitivity: number;
	/** Adds tartness (Brett/lacto style cultures). */
	souring: number;
	/** Alcohol tolerance, ABV fraction. */
	alcoholTolerance: number;
	blurb: string;
	note: string;
};

export type PitchRate = 'under' | 'standard' | 'over';

export type FermentationStep = {
	id: string;
	tempC: Celsius;
	days: number;
	label: string;
};

export type FermentationSetup = {
	yeastId: string;
	pitchRate: PitchRate;
	steps: FermentationStep[];
	/** Cold crash to ~2 °C before packaging. */
	coldCrash: boolean;
};

export type ChillSetup = {
	/** Minutes from flameout to pitching temperature. */
	minutes: number;
	pitchTempC: Celsius;
	/** How carefully the cold side is handled. */
	transferQuality: 'careless' | 'normal' | 'closed';
};

export type ConditioningSetup = {
	days: number;
	tempC: Celsius;
	/** Volumes of CO2. */
	co2Volumes: number;
	/**
	 * Bottles carbonate themselves from a measured dose of sugar and yeast, which
	 * needs a warm fortnight before the cold store. A keg is carbonated from a
	 * gas bottle and needs neither. The stage used to assume bottles and mention
	 * kegs in a footnote, and would happily compute a priming dose for beer sent
	 * straight to 3 °C, where nothing would have carbonated at all.
	 *
	 * Both are optional so that recipes saved before they existed still load;
	 * read them through `packagingOf()` rather than directly.
	 */
	packaging?: 'bottles' | 'keg';
	/** Where bottles sit while they carbonate, before they go somewhere cold. */
	carbonationTempC?: Celsius;
};

/* -------------------------------------------------------------------------- */
/* Recipe                                                                     */
/* -------------------------------------------------------------------------- */

export type Recipe = {
	name: string;
	/** Litres into the fermenter. */
	batchVolumeL: Litres;
	/** Litres at the start of the boil. */
	preBoilVolumeL: Litres;
	boilTimeMin: number;
	/** Brewhouse efficiency as a percentage, e.g. 72. */
	efficiencyPct: number;
	water: WaterSetup;
	fermentables: FermentableAddition[];
	mash: MashSetup;
	hops: HopAddition[];
	fermentation: FermentationSetup;
	chill: ChillSetup;
	conditioning: ConditioningSetup;
	/** Optional target style for Brew to Style mode. */
	targetStyleId?: string;
	notes?: string;
};

export type StoredRecipe = {
	schemaVersion: number;
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	recipe: Recipe;
};

/* -------------------------------------------------------------------------- */
/* Sensory                                                                    */
/* -------------------------------------------------------------------------- */

export type SensoryKey =
	| 'sweetness'
	| 'bitterness'
	| 'body'
	| 'malt'
	| 'caramel'
	| 'roast'
	| 'hopFlavour'
	| 'hopAroma'
	| 'fruitEsters'
	| 'phenols'
	| 'acidity'
	| 'alcoholWarmth'
	| 'crispness';

/** Every axis is displayed on a 0–10 scale. */
export type SensoryVector = Record<SensoryKey, number>;

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

export type Range = { min: number; max: number };

export type StyleProfile = {
	id: string;
	name: string;
	family:
		| 'lager'
		| 'pale ale'
		| 'ipa'
		| 'amber & brown'
		| 'dark'
		| 'wheat'
		| 'belgian'
		| 'strong'
		| 'sour & smoked';
	og: Range;
	fg: Range;
	abv: Range;
	ibu: Range;
	ebc: Range;
	/** Sensory expectations on the 0–10 scale; omitted axes are not judged. */
	sensory: Partial<Record<SensoryKey, Range>>;
	/** Requires an explicit souring culture or process to be a candidate at all. */
	requiresSouring?: boolean;
	/**
	 * The hop family the style is built on. 'classic' covers noble, English and
	 * other floral, spicy, herbal and earthy hops; 'modern' covers the citrus,
	 * tropical, pine and dank end. Only judged when the beer actually has hop
	 * character to judge.
	 */
	hopCharacter?: 'classic' | 'modern';
	blurb: string;
};

export type StyleMatch = {
	styleId: string;
	name: string;
	/** 0–100 similarity, labelled as a match, never as a probability. */
	match: number;
	/** Human-language notes on what pulls the beer away from the style. */
	deviations: string[];
};

/* -------------------------------------------------------------------------- */
/* Findings, scores, results                                                  */
/* -------------------------------------------------------------------------- */

export type Severity = 'info' | 'caution' | 'warning' | 'severe';

export type ScoreKey = 'technical' | 'coherence' | 'enjoyment';

export type Finding = {
	/** Stable code, e.g. MASH_TOO_HOT. Used by tests and by the report. */
	code: string;
	severity: Severity;
	title: string;
	explanation: string;
	/** Negative numbers lower a score, positive raise it. */
	impact: Partial<Record<ScoreKey, number>>;
	/** Recipe fields the user should look at, e.g. 'mash.steps'. */
	fields: string[];
};

export type ScoreContribution = {
	label: string;
	detail: string;
	/** Points added or removed from the 0–100 score. */
	delta: number;
};

export type Score = {
	value: number;
	positives: ScoreContribution[];
	negatives: ScoreContribution[];
};

export type Scores = Record<ScoreKey, Score> & { overall: number };

export type Metrics = {
	og: Gravity;
	fg: Gravity;
	abv: number;
	ibu: number;
	ebc: number;
	srm: number;
	/** Apparent attenuation as a percentage. */
	attenuation: number;
	mashPh: number;
	/** Bitterness to gravity units ratio. */
	buGu: number;
	/** Total grist weight in kg. */
	grainKg: number;
	preBoilGravity: Gravity;
	/** Calories per 330 ml, a rough estimate. */
	kcalPer330: number;
	co2Volumes: number;
};

export type AgePoint = {
	/** Weeks after packaging. */
	week: number;
	/** 0–100 drinking quality prediction. */
	quality: number;
	note: string;
};

export type KeyDecision = {
	title: string;
	detail: string;
	/** Positive = helped the beer, negative = hurt it. */
	direction: 1 | -1 | 0;
};

export type Improvement = {
	title: string;
	detail: string;
	fields: string[];
};

export type SimulationResult = {
	metrics: Metrics;
	sensory: SensoryVector;
	findings: Finding[];
	scores: Scores;
	styles: StyleMatch[];
	keyDecisions: KeyDecision[];
	improvements: Improvement[];
	ageCurve: AgePoint[];
	/** Human verdict headline. */
	verdict: { headline: string; summary: string };
	/** Non-fatal validation problems; the simulation still returns safe numbers. */
	validation: string[];
	/** Style conformity, only when the recipe has a target style. */
	targetStyle?: StyleMatch;
};

/* -------------------------------------------------------------------------- */
/* Challenges                                                                 */
/* -------------------------------------------------------------------------- */

export type ChallengeCheck = {
	id: string;
	label: string;
	/** Evaluated against the finished simulation. */
	test: (result: SimulationResult, recipe: Recipe) => boolean;
};

export type Challenge = {
	id: string;
	name: string;
	brief: string;
	hint: string;
	difficulty: 'easy' | 'medium' | 'hard';
	/** Optional starting recipe, e.g. a deliberately flawed beer to repair. */
	startingRecipeId?: string;
	checks: ChallengeCheck[];
};

export type ChallengeProgress = {
	challengeId: string;
	completedAt: string;
	bestOverall: number;
};
