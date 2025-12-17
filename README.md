# 🦅 Bird Game 3: Wings of Glory

Welcome to the official repository for **Bird Game 3**, a tactical avian combat game where strategy meets procedural loot and intense battle mechanics.

---

## 🛠 Latest Update Log

### [1.2.0] - Tactical Rebalance
**Release Date: Current**

#### ⚔️ Combat & Enemy Balancing
- **Strict Zone Gating**: Enemies of specific rarity classes now only appear once the player reaches the zone where that rarity is required for clearance. No more seeing gold/red enemies in Zone 1.
- **Weighted Encounters**: Overhauled the encounter generator to ensure lower-tier enemies remain the primary encounter type, while higher-tier units (Legendary and Mythic) are appropriately rare and intimidating.

#### 💎 Loot & Economics
- **Prestige Rarity**: Significantly increased the internal score thresholds for **Mythic** and **Legendary** items. These tiers are now "Incredibly Rare," requiring advanced workshop levels or extreme luck.
- **Zone Reward Capping**: Restricted the item rewards for clearing a zone to a pool of **Common (White)**, **Uncommon (Green)**, and **Rare (Blue)**. This prevents early-game high-tier item bloating and maintains the value of the crafting system.

---

### [1.1.0] - Workshop Overhaul
#### 🔨 Crafting
- **Rarity Engine 2.0**: Re-engineered the rarity calculation logic to provide a more consistent progression feel.
- **Progression Buffs**: Adjusted Forge Level and Gemforge Mastery to have a higher impact on roll results, ensuring that unlocking a new tier actually makes those items obtainable within a reasonable timeframe.
- **Crafting Gating**: Implemented hard caps on crafting results to ensure players receive the best item allowed by their current facility level when rolling high.

#### 📜 Systems
- **Update Log Initialization**: Started the formal documentation of system changes.

---

## 🎮 Game Architecture
Bird Game 3 is built with **React**, **Tailwind CSS**, and **Framer Motion**, featuring a persistent save system and procedurally generated gear stats.