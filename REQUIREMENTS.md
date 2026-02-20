# OSRS Optimal Training — Requirements

## Overview

A single-page React web app that calculates the optimal order for training melee combat skills (Attack, Strength, Defence) in Old School RuneScape. Given a user's current levels, goal levels, and available equipment, the app computes the fastest path by determining which skill to train at each stage using the full OSRS combat formulas.

---

## Core Features

### 1. Stats Input

- **Username lookup**: Fetch the user's current Attack, Strength, and Defence levels from the OSRS Hiscores API by entering their RSN (RuneScape Name).
  - After fetching, display a confirmation step where the user can review and manually adjust the imported levels before proceeding.
- **Goal levels**: User sets a target level for each of the three skills (Attack, Strength, Defence).
- Levels are entered as skill levels (1–99). XP values are derived from the standard OSRS level-to-XP table.

### 2. Equipment Selection

- **Searchable checklist** of melee weapons and armor.
- The user checks off all items they have access to (own or can acquire).
- Equipment data is organized by slot (weapon, head, body, legs, boots, gloves, cape, ring, neck, shield, ammo).
- Each item includes its stat bonuses (attack bonuses, strength bonus, defence bonuses, prayer bonus, attack speed) stored in the bundled data files.
- The calculator determines the best available loadout at each stage based on the user's checked items and current level requirements.

### 3. Optimal Path Calculator

The core engine that computes the fastest route to all three goal levels:

- **Full OSRS combat formula implementation**:
  - Effective level calculation (base level + stance bonus + prayer bonus + void bonus, etc.)
  - Maximum attack roll = effective attack level * (equipment attack bonus + 64)
  - Maximum defence roll = effective defence level * (equipment defence bonus + 64)
  - Accuracy calculation (attack roll vs defence roll)
  - Max hit calculation from effective strength and equipment strength bonus
  - DPS = (accuracy * max hit / 2) / attack speed (in seconds)
  - XP/hr = DPS * hitpoints-per-damage * 3600 (accounting for the 4:1 HP XP ratio on melee styles)

- **Combat style modeling**: Evaluates all four melee stances:
  - **Accurate** (+3 effective Attack level, awards Attack XP)
  - **Aggressive** (+3 effective Strength level, awards Strength XP)
  - **Defensive** (+3 effective Defence level, awards Defence XP)
  - **Controlled** (+1 to each effective level, splits XP across Attack/Strength/Defence equally)
  - The calculator picks the optimal combat style at each stage based on which produces the fastest overall path to all goal levels.

- **Optimal ordering logic**: Determines whether to train Strength, Attack, or Defence first (or in what interleaved order) by evaluating how each level-up affects DPS for subsequent training. For example, training Strength may increase max hit which speeds up all future training.

- **Best-in-slot gear per stage**: At each training stage, the calculator selects the strongest available gear from the user's checked equipment, respecting level requirements.

### 4. Training Monsters

The calculator evaluates XP rates against a curated set of popular AFK training monsters:

- **Sand Crabs** (HP: 60, Def level: 1, Def bonuses: 0 across the board)
- **Ammonite Crabs** (HP: 100, Def level: 1, Def bonuses: 0 across the board)
- **Rock Crabs** (HP: 50, Def level: 1, Def bonuses: 0 across the board)
- **NMZ** (select easy/hard rumble bosses with representative stats)

For each stage of the path, the calculator picks the monster that yields the highest effective XP/hr given the user's current stats and gear.

Note: Exact monster stats should be verified against the OSRS Wiki and stored in the bundled data files.

### 5. Results Display

- **Summary panel**:
  - Total estimated time to reach all goal levels
  - Total XP gained per skill
  - Number of training stages/switches

- **Step-by-step breakdown**: An ordered list of training steps, each showing:
  1. Which skill to train (and which combat style to use)
  2. Target level for that step (e.g. "Train Strength from 40 to 50")
  3. Recommended monster
  4. Recommended gear loadout
  5. Estimated XP/hr at that stage
  6. Estimated time for that step

### 6. Shareable URLs

- All user inputs (current levels, goal levels, selected equipment) are encoded into URL query parameters.
- Users can bookmark or share the URL to reproduce the same calculation.
- The app reads URL parameters on load and pre-fills all inputs accordingly.

---

## Data Architecture

### Static Data Files (Bundled JSON)

All game data is hardcoded in JSON files shipped with the app:

- **`weapons.json`** — Melee weapons with stats: name, attack bonuses (stab/slash/crush), strength bonus, attack speed, level requirements, combat styles available.
- **`armor.json`** — Armor and accessories with stats per slot: name, slot, attack bonuses, defence bonuses, strength bonus, prayer bonus, level requirements.
- **`monsters.json`** — Training monsters: name, hitpoints, defence level, defence bonuses (stab/slash/crush), location notes.
- **`xp-table.json`** — The standard OSRS XP table mapping levels 1–99 to cumulative XP.

---

## UI / UX

### Layout

- Single-page layout, no routing needed.
- Three main sections arranged vertically or in a logical flow:
  1. **Input section** — Stats input (username lookup + manual entry), goal levels, equipment checklist
  2. **Calculate button** — Triggers the calculation
  3. **Results section** — Summary + step-by-step output

### Styling

- Plain CSS with CSS custom properties for theming.
- Dark theme by default (fits the OSRS aesthetic).
- Responsive — usable on both desktop and mobile.

---

## Technical Constraints

- React 19, Vite, plain JavaScript (no TypeScript).
- All calculations run client-side (no backend needed).
- OSRS Hiscores lookup is the only network request. Use the OSRS Hiscores API (or a CORS proxy if needed).
- No external UI libraries — build components from scratch.

---

## Future Considerations (Out of Scope for V1)

These features are not part of the initial build but may be added later:

- Ranged and Magic combat style support
- Prayer flicking / prayer bonus calculations
- Quest XP rewards as training milestones
- Special attack weapons / DPS specials
- NMZ point optimization
- Slayer task integration
- GP cost tracking for supplies
