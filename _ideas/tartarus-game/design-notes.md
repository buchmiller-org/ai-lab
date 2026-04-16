# TARTARUS — Design Notes & Prototype Parking Lot

Ideas logged here are **not committed to the design**. They emerged during the consulting review and have real merit, but carry enough uncertainty that they need hands-on prototyping before the GDD is updated. Revisit these after the first playable milestone exists.

---

## Idea 1: Tier 2 Shop as a Timed Zone-Transition Window

**The idea:** Instead of the Tier 2 Rig Overhaul panel being available at any time (opened by tapping the Rig or the dashboard button), it opens *automatically* at each zone boundary as a structured 12-second decision window — the same moment as the Zone Transition Event. Tier 1 micro-upgrades remain always-available.

**Why it's interesting:**
- Removes the "is it safe to open the menu right now?" friction question, replacing it with a purer "what do I buy?" decision
- Makes Scrap banking toward a *known* window the meta-game of the economy
- Creates 5 predictable dramatic peaks per run instead of an ever-present option
- Aligns naturally with the pacing table (Phase 9 panic buy, Phase 14 final buy both fall at zone transitions)
- Megacorp framing writes itself: *"Zone 3 achieved. Orbital Workshop uplink open. You have 12 seconds. Choose efficiently."*

**Why it's uncertain:**
- The current "open during a wave at your own risk" design is its own kind of decision — timing the shop opens. Removing that changes the fundamental character of the Tier 2 experience.
- Could feel like the game is forcing a shop screen on you at an inconvenient moment (zone transition events and shop simultaneously may be too much)
- Combining Zone Transition Events + Tier 2 window at the same boundary moment risks cognitive overload — may need to alternate them rather than stack them
- Needs side-by-side playtesting against the original to confirm it's meaningfully better, not just different

**Prototype test:** Build both. Play each for a week. Compare how often players feel frustrated vs. empowered by the shop interaction.

---

## Idea 2: Overdrive Mode (Drill Speed Toggle)

**The idea:** A single toggle button on the dashboard — **Normal Mode** vs. **Overdrive**. In Overdrive, the drill accelerates through depth faster and processes material more quickly (higher Scrap yield per phase), but diverts power away from auto-turrets, reducing their fire rate by 20%. One button. One tradeoff.

**Why it's interesting:**
- Gives the player meaningful agency over the pace of the game — more tension = more reward, or breathe and consolidate
- Thematically fits: Corporate efficiency mode vs. survival caution
- The Megacorp would appreciate Overdrive ("VOID-FANG is drilling at optimal throughput. Efficiency noted.") and comment on pulling back ("VOID-FANG has reduced drill rate. Caution logged as inefficiency.")
- Extends the "decisions at every cadence" model without adding a new resource

**Why it's uncertain:**
- Discoverability risk: a toggle that sits quietly in the UI and gets ignored is worse than no toggle at all. If players don't naturally reach for it, it's dead UI real estate.
- The 20% fire rate reduction may need significant tuning to feel meaningful without feeling punishing
- Could be seen as a "hold Overdrive always in safe moments, flip off in danger" trivial binary rather than a real decision
- Needs UX emphasis — the button must be prominent enough that players actually think about it

**Prototype test:** Add the toggle to Milestone 2 (Rig + Enemy build). Observe whether playtesters naturally discover and use it without being told about it. If they don't notice it after 3 runs, it needs more UI emphasis or a different interaction model.

---

*Last updated: following consulting review, post-GDD revision session.*
