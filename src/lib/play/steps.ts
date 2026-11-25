/**
 * The hands-on brew day, one physical action per screen.
 *
 * The question flow asks what you want and rolls where it lands. This one
 * hands you a recipe card and the kit, and you do it: you light the gas and
 * cut it when the water is hot enough, you tip the grain in and stir, you drop
 * the hops in when the clock says so. What happened is recorded and judged.
 *
 * `ask` is the instruction, in the second person. `hint` says what you are
 * physically doing and why it matters, in two sentences at most; the hints
 * read in order as one brew day, like the ones in `questions.ts`. `pan` is
 * where along the workshop wall the step stands, so walking from the mash tun
 * to the kettle slides the room along.
 */

export type PlayStepId =
	| 'card'
	| 'strike'
	| 'dough-in'
	| 'rest'
	| 'vorlauf'
	| 'sparge'
	| 'boil'
	| 'flameout'
	| 'sanitise'
	| 'chill'
	| 'transfer'
	| 'pitch'
	| 'ferment'
	| 'bottle'
	| 'pour';

export type PlayStep = {
	id: PlayStepId;
	/** Which part of the day, for the header. */
	place: string;
	ask: string;
	hint: string;
	pan: number;
};

export const PLAY_STEPS: PlayStep[] = [
	{
		id: 'card',
		place: 'The recipe',
		ask: 'What are you brewing today?',
		hint: 'Pick a recipe card. It says what to aim for at every step; how close you get is up to your hands.',
		pan: 0
	},
	{
		id: 'strike',
		place: 'Mash',
		ask: 'Heat the water.',
		hint: 'The grain will cool the water when it goes in, so you heat it a few degrees past the mash temperature. The pot keeps heating for a moment after you turn the gas down, so turn it down a little early.',
		pan: 0.08
	},
	{
		id: 'dough-in',
		place: 'Mash',
		ask: 'Tip the grain in and stir.',
		hint: 'Pour the crushed malt in and stir until there are no dry clumps left. Until it is stirred through, the thermometer is reading a hot or a cold pocket, not the mash.',
		pan: 0.08
	},
	{
		id: 'rest',
		place: 'Mash',
		ask: 'Hold the temperature for the rest.',
		hint: 'Enzymes in the malt are turning starch into sugar. The temperature decides which kind of sugar: cooler gives sugar the yeast can eat, warmer leaves more body behind. A lid keeps the heat in.',
		pan: 0.08
	},
	{
		id: 'vorlauf',
		place: 'Run-off',
		ask: 'Pour the cloudy runnings back until they run clear.',
		hint: 'Open the tap and the first liquid out is full of flour and husk. Pour it gently back over the grain and the grain bed starts to filter it. Brewers call this the vorlauf.',
		pan: 0.2
	},
	{
		id: 'sparge',
		place: 'Run-off',
		ask: 'Rinse the grain until the kettle is full.',
		hint: 'Hot water poured over the grain washes out the sugar still clinging to it. Stop at the mark: more water means a weaker beer, less means less beer.',
		pan: 0.2
	},
	{
		id: 'boil',
		place: 'Boil',
		ask: 'Boil it, and add the hops on time.',
		hint: 'Turn the gas right up. When it first boils, a foam rises fast, so turn the gas down before it goes over. Hops boiled for a long time make the beer bitter; hops added near the end keep their smell.',
		pan: 0.36
	},
	{
		id: 'flameout',
		place: 'Boil',
		ask: 'Gas off. Steep the last hops.',
		hint: 'The wort is just below boiling and still. Hops dropped in now steep instead of boiling, so they give smell and very little bitterness.',
		pan: 0.36
	},
	{
		id: 'sanitise',
		place: 'Cold side',
		ask: 'Spray everything the cold beer will touch.',
		hint: 'From here on, anything that touches the wort can grow in it. Cleaning removes the dirt you can see; sanitiser kills the germs you cannot see. Spray each piece of kit.',
		pan: 0.52
	},
	{
		id: 'chill',
		place: 'Cold side',
		ask: 'Cool it down to pitching temperature.',
		hint: 'Run cold water through the copper coil. While the wort is warm, nothing protects it from germs, so the faster it cools the better. Stop when it is cool enough for the yeast.',
		pan: 0.52
	},
	{
		id: 'transfer',
		place: 'Cold side',
		ask: 'Siphon it into the fermenter, gently.',
		hint: 'Keep the end of the hose under the surface. Splashing mixes air into the wort, and air spoils beer slowly.',
		pan: 0.6
	},
	{
		id: 'pitch',
		place: 'Fermenter',
		ask: 'Add the yeast.',
		hint: 'Tear the packet and sprinkle it on. The card says how much to use. Too little and the yeast has to multiply a lot first, which makes fruity, hot flavours.',
		pan: 0.74
	},
	{
		id: 'ferment',
		place: 'Fermenter',
		ask: 'Keep it at the right temperature until it is done.',
		hint: 'The yeast eats the sugar and makes alcohol, CO₂ and most of the flavour. Take a sample to read the gravity. It is done when the reading stops falling and the buttery taste has gone.',
		pan: 0.74
	},
	{
		id: 'bottle',
		place: 'Bottling',
		ask: 'Add the priming sugar and fill the bottles.',
		hint: 'A small dose of sugar, sealed in each bottle, gives the last of the yeast something to eat, and the CO₂ it makes has nowhere to go but into the beer. The dose decides how fizzy it gets.',
		pan: 0.9
	},
	{
		id: 'pour',
		place: 'The glass',
		ask: 'Pour one.',
		hint: 'Two weeks later. Tilt the glass, pour down the side, and straighten it at the end to raise a head.',
		pan: 1
	}
];

export const PLAY_STEP_BY_ID = new Map(PLAY_STEPS.map((s) => [s.id, s]));

export function playStepIndex(id: PlayStepId): number {
	return PLAY_STEPS.findIndex((s) => s.id === id);
}
