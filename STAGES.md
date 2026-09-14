# What each stage is for

The standard this app is held to. When a judgement call comes up — should this
control exist, does this text belong here, is this stage finished — it is
settled here, not invented on the spot.

## The promise

You are brewing a beer, one step at a time, and at every step you understand
what you are physically doing and why it matters. Nothing is decided for you.
Nothing is claimed about the beer before it is true.

## Rules that hold everywhere

0. **A target is a claim about the intention, not about the beer.** So while
   no figure is claimed before the brew day has made it, the _target_ is
   compared against where the recipe is heading from the moment there is grain
   in the kettle — and the miss is said in a brewer's words where the decision
   is being made: "too bitter: 97 IBU, porter wants 25–45" beside the slider,
   in the watch list, and first thing on the report. Feedback that arrives one
   stage after the decision is not feedback.

1. **The reader makes the decision.** If a stage asks for a real choice, it
   waits for it. A brew you can click through without deciding anything is a
   beer the simulator made while you watched.
2. **Defaults are labelled as defaults.** A number that is a property of your
   equipment (volume, efficiency, boil length) may be pre-filled, but it says
   `default` until you move it.
3. **One explanation per level.** Header = what you do and what it sets.
   Beside a control = about that control only. One `Why X matters` disclosure =
   the stage's why plus its deep dive. The action bar = only what is missing.
   Adding a new place for text means removing one.
4. **No number before it is true.** No gravity before the mash, no alcohol
   before fermentation, no style match before the glass is poured. An empty or
   zero figure is never shown; the stage says what is missing instead.
5. **Every trade word is introduced where it first appears.** tun, sparge, wort,
   grist, mash-out, runnings, cold break, dextrins, whirlpool, DMS.
6. **The shape follows the kind of decision, not the shape of the screen next
   door.** One pick from a short list is a row of cards. Building something out
   of parts is a list of parts. Copying a neighbour's form without asking what
   kind of question it answers is how the grain stage ended up leading with
   presets when choosing your own malts is the point of it.
7. **Every card is named for what the beer does, not for the mechanism.** "Step
   mash — beta then alpha, more fermentable than either alone" told a reader
   with no brewing behind them nothing at all. "Crisp and dry" does.

## The shape

**One question per screen.** There are twenty-two, and if brewing turns out to
have more, there are more. Nine stages came from the brief rather than from
brewing, and every stage that held more than one decision read as a pile — the
water stage was the only one anybody ever found clear, and it is the only one
that ever asked a single question.

A screen is one of two things, never both:

- **Pick one.** A row of cards with names in plain words, and where an expert
  route exists it is one more card in the same row — never a lesser affordance
  beside them. Water, mash, chill, packaging.
- **Build a list.** Because a grist and a hop schedule genuinely are lists.
  Grain, kettle hops, dry hops.

Never a wizard inside a screen. That was tried and it fragmented the journey
instead of making one.

**The nine stages survive as grouping**, because they remain the unit the engine
works in: the grain is milled or it is not, and there is no gravity before the
mash. Answering the last question of a stage carries that stage out, which is
why the button reads "Next" inside a stage and "Mill the grain" at the end of
one. The physical act stays where it belongs.

**The side panel is the vessel and what is in it** — what you have so far.
Numbers fold away behind one line; they are not the answer to that question.

## The nine stages

Each names the physical act, the decision it asks for, and what it must not do.

### 1. Water

- **You are doing:** deciding how much beer you are making, then filling a pot,
  cutting or treating the water, putting it on to heat.
- **You decide:** how much beer, then which water. Both one pick from a short
  list. Batch size comes first because every volume on the day is measured
  against it — asking it after the water had been heated to a volume computed
  from a default was backwards. Treating the water yourself is the specialist
  route and sits in the same grid.
- **Must show:** how much, and how hot, because "heat the water" is meaningless
  without them. The strike temperature is explained _here_, once.
- **Must not:** claim anything about the finished beer. This is a pot of water.

### 2. Grain

- **You are doing:** weighing out four or five kilos of malt and milling it.
- **You decide:** which malts and how much of each. **This is the heart of the
  app** — the grist is the beer, and building it yourself is the point. The
  malt list is the stage. Ready grists are a shortcut at the weight of a
  shortcut.
- **Must show:** the real colour of each malt, its share of the grist, and
  whether enough of the grist carries enzymes.
- **Must not:** put a preset where the decision belongs.

### 3. Mash

- **You are doing:** stirring the crushed grain into hot water, reading the
  thermometer, and waiting an hour.
- **You decide:** what temperature to aim for — and then what to do about the
  temperature you actually got. The model rolls the miss, deterministically
  from the recipe, the way a real brew day misses (one standard deviation of
  about a degree). Topping up with hot water restores the aim and thins the
  mash; living with it runs the rest where it landed, and the beer that comes
  out is the beer of the number on the thermometer. The stage waits for that
  decision: nothing closes the lid until the brewer has read the thermometer.
- **Must show:** where the rest sits between the two enzymes, because that is
  the whole mechanism, and what each choice at the thermometer does to the
  finished beer, on the card.
- **Must not:** re-teach the strike temperature. Water owns that. And must not
  pretend the mash hit its number — every calculator does, and no brewer has.

### 4. Sparge

- **You are doing:** draining the tun into the kettle and rinsing the grain.
- **You decide:** what you are brewing on. That is the real decision at the tun — how thoroughly you rinse — and it is
  the kit in front of you. Efficiency and collection volume are consequences of
  it, never controls.
- **Must show:** where every litre goes, and that the boil takes volume away.
- **Must not:** explain the simulator. Explain the tap. And never ask for a
  number nobody chooses: "brewhouse efficiency" as a slider was the clearest
  example this app ever had of a control that is not a decision.

### 5. Boil & hops

- **You are doing:** a rolling boil with a timer, hops in at planned times.
- **You decide:** the hop schedule. Kettle hops are required; whirlpool and dry
  hops are optional and say so.
- **Must show:** that bitterness needs heat and time while aroma is destroyed by
  both, laid out from kettle to fermenter.
- **Must not:** call itself beer. No yeast, no alcohol.

### 6. Chill

- **You are doing:** sanitising everything the cold wort will touch, cooling
  the wort, and siphoning it into the bucket.
- **You decide:** how clean the kit is — a rinse, boiling water, a no-rinse
  sanitiser, or bleach — then how fast to chill, then how carefully to
  transfer. Sanitation is a modelled variable: a rinse leaves what the last
  batch left and feeds the contamination risk; bleach kills everything and
  leaves a medicinal note if the rinse afterwards is ordinary. It was the one
  thing on a brew day the model did not know about, and the step most first
  batches go wrong on.
- **Must show:** risk as probability, not prophecy, and each choice's risk on
  its card from a run of the model.

### 7. Ferment

- **You are doing:** pitching yeast, sealing the airlock, leaving it alone.
- **You decide:** which yeast, how much of it, how warm, how long — four
  screens, because they are four acts. This stage was once one screen with five
  sliders, a toggle, a text field and a graph on it, and survived that way only
  because nobody looked at it. Each temperature and length is a card placed
  inside the strain you actually chose, with what it does to this beer on the
  card. Schedules with more than one rest live behind "set it myself".
- **Must show:** that the strain and the temperature make much of the beer's
  character, and that time is what clears the butterscotch.

### 8. Condition

- **You are doing:** bottling with priming sugar, or kegging, then waiting.
- **You decide:** carbonation, how long, how cold.
- **Must show:** both clocks — what time gives this beer and what it takes away.

### 9. Taste

- **You are doing:** opening one and pouring it. Pouring is an act like any
  other, so it has a button, and it is what unlocks the judgement.
- **You decide:** nothing. The report is the payoff.
- **Must show:** the beer as it actually is, every judgement traceable to a
  decision you made — and it opens with somebody drinking it, in the order a
  person meets a beer, because that is the answer to "what did you make". The
  meters and the technical values are not.
- **Must not:** guess at a beer that has not been brewed. And the tasting note
  must never contradict the fault list; both read the same thresholds.

## How this is checked

Not by reading the code. Brew a beer **from an empty kettle**, read every word
as someone who has never brewed, and check each stage against its block above.
That is the only pass that has ever found anything.

From an empty kettle specifically. A recipe loaded from the catalogue arrives
already brewed and already judged, so it exercises none of the gating — which
is how a brew made from scratch came to be one click short of its own verdict
without anybody noticing.
