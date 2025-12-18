![Deploy Website](https://github.com/NotHarroweD/BirdGameIII/actions/workflows/deploy.yml/badge.svg)
# 🦅 Bird Game 3: Wings of Glory

Welcome to the official repository for **Bird Game 3**, a tactical avian combat game where strategy meets procedural loot and intense battle mechanics.

---

## 🛠 Latest Update Log

### [1.3.0] - Mechanical Refinement & UI Polish
**Release Date: Current**

#### 📈 Progression & Leveling
- **Persistent Level-Up Rewards**: Stat options are now generated once per level-up point and stored on the bird instance. This eliminates the "reroll exploit" where players could reset their options by closing the menu.
- **Multi-Level Scaling**: Battles that grant massive XP now correctly trigger multiple level-up sequences, allowing players to assign all earned stat points sequentially.

#### 📡 Recruitment & Scanning
- **Rarity Weighted Randomness**: Overhauled the bird catching algorithm. While high multipliers (like x5) significantly boost the odds of high-tier birds, they no longer guarantee a specific rarity, ensuring every encounter remains a surprise.
- **Signal Booster Integration**: The bird catching upgrade now explicitly lists the highest rarity class currently obtainable and unlocks new tiers every 5 levels.
- **Early Game Gating**: Rare (Blue) birds now strictly require a x5 multiplier to appear in the early game, emphasizing skill in the scanning mini-game.

#### 📦 Inventory & Gear
- **UI Synchronization**: Re-engineered the Beak equipment menu to match the scrollable, high-capacity behavior of the Claws and Gems menus.
- **Resource Boost Standardizing**: Unified all Hunting and Battle boosts to display as percentages (e.g., +15%) rather than mixed multipliers.
- **Dynamic HUD**: Dashboard displays now automatically hide resource types with 0% bonuses, providing a cleaner tactical overview.

---

### [1.2.0] - Tactical Rebalance
#### ⚔️ Combat & Enemy Balancing
- **Strict Zone Gating**: Enemies of specific rarity classes now only appear once the player reaches the zone where that rarity is required for clearance.
- **Weighted Encounters**: Overhauled the encounter generator to ensure lower-tier enemies remain the primary encounter type.

#### 💎 Loot & Economics
- **Prestige Rarity**: Significantly increased the internal score thresholds for **Mythic** and **Legendary** items.
- **Zone Reward Capping**: Restricted the item rewards for clearing a zone to a pool of Common, Uncommon, and Rare tiers.

---

### [1.1.0] - Workshop Overhaul
#### 🔨 Crafting
- **Rarity Engine 2.0**: Re-engineered the rarity calculation logic for more consistent progression.
- **Crafting Gating**: Implemented hard caps based on facility levels.

---

## 🎮 Game Architecture
Bird Game 3 is built with **React**, **Tailwind CSS**, and **Framer Motion**, featuring a persistent save system and procedurally generated gear stats.
