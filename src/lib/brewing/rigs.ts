/**
 * What you are brewing on, and what that costs you.
 *
 * Two numbers used to sit on the run-off screen as sliders: "brewhouse
 * efficiency" and "stop collecting at". Neither is a decision anybody makes.
 * Efficiency is not a dial — it is what your kit and your patience add up to,
 * measured after the fact. And nobody stands at the tun choosing a number of
 * litres out of the air: you collect enough to boil down to the batch you
 * wanted, and how much that is follows from the kettle.
 *
 * The decision underneath both is real, though, and it is the one a homebrewer
 * actually makes: how thoroughly do you rinse the grain? A bag lifted out of a
 * pot leaves a lot of sugar behind. A pump recirculating for an hour leaves
 * almost none. Everything else is a consequence, so this file turns the choice
 * into the two numbers the engine wants and the UI stops asking.
 */

export type Rig = {
	id: string;
	name: string;
	/** What you physically do, for someone who has never seen it done. */
	what: string;
	/**
	 * Brewhouse efficiency as the engine wants it: the share of the grain's
	 * sugar that reaches the fermenter on a normal-gravity batch. The engine
	 * adjusts it further for grain bill size, mash length and enzyme content.
	 */
	efficiencyPct: number;
	/** Share of the kettle lost to steam each hour, as a fraction. */
	evaporationPerHour: number;
	/** Litres left behind with the hop debris and break material. */
	kettleLossL: number;
};

/**
 * Ordered by how much work they are, which is also the order of how much sugar
 * they get out. That is not a coincidence and the cards say so.
 *
 * The evaporation figures are for the kettle each method implies rather than
 * for the method itself: a stovetop pot is wide and open and boils off hard,
 * while an all-in-one runs under a lid with an element rather than a flame.
 */
export const RIGS: Rig[] = [
	{
		id: 'biab',
		name: 'Bag in the pot',
		what: 'One pot on the stove with the grain in a mesh bag. When the hour is up you lift the bag out and let it drip. There is no rinsing at all, so a good deal of sugar stays in the grain — and there is nothing to buy, clean or plumb.',
		efficiencyPct: 62,
		evaporationPerHour: 0.16,
		kettleLossL: 1
	},
	{
		id: 'batch-sparge',
		name: 'Cooler and kettle',
		what: 'The standard homebrew kit. A cool-box holds the mash; you drain it into the kettle, pour the rest of the hot water over the grain, stir it and drain again. Two goes at washing the sugar out, for the price of a picnic box.',
		efficiencyPct: 72,
		evaporationPerHour: 0.15,
		kettleLossL: 2
	},
	{
		id: 'fly-sparge',
		name: 'Slow rinse from the top',
		what: 'Same kit, more patience. Rather than refilling in one go you trickle water over the grain for three quarters of an hour, matching the rate it runs out at underneath. Clean water meets sugary grain the whole way down, so it rinses further.',
		efficiencyPct: 78,
		evaporationPerHour: 0.13,
		kettleLossL: 2
	},
	{
		id: 'recirculating',
		name: 'Pump and recirculate',
		what: 'An all-in-one electric system, or a small brewery. A pump draws wort from under the grain bed and returns it over the top for the whole mash, then rinses continuously as it runs off. The clearest wort and the most sugar out of the grain.',
		efficiencyPct: 85,
		evaporationPerHour: 0.08,
		kettleLossL: 2.5
	}
];

/**
 * Which rig a recipe is on.
 *
 * The efficiency is the tell, because it is the only thing the choice writes
 * that a saved recipe carries. An imported or hand-edited recipe can land
 * between two of them, and then the nearest one is the honest answer — the
 * card is a label on a number, not a claim about someone's shed.
 */
export function rigFor(efficiencyPct: number): Rig {
	let best = RIGS[0];
	for (const rig of RIGS) {
		if (
			Math.abs(rig.efficiencyPct - efficiencyPct) < Math.abs(best.efficiencyPct - efficiencyPct)
		) {
			best = rig;
		}
	}
	return best;
}

/**
 * How much to collect, to end up with the batch you asked for.
 *
 * Rounded to the half litre, because that is as finely as anyone reads a sight
 * glass, and a figure like 25.88 would be pretending.
 */
export function collectVolumeL(rig: Rig, batchVolumeL: number, boilTimeMin: number): number {
	const hours = Math.max(0, boilTimeMin) / 60;
	const remaining = Math.max(0.2, 1 - rig.evaporationPerHour * hours);
	const litres = (batchVolumeL + rig.kettleLossL) / remaining;
	return Math.round(litres * 2) / 2;
}
