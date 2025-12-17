import { Rarity, RarityTier, Gear, GearType, GearBuff, UtilityBuffType, Gem, StatBonus, StatType, ConsumableType, GearPrefix } from '../types';

export const RARITY_CONFIG: Record<Rarity, RarityTier> = {
  [Rarity.COMMON]: { 
    id: Rarity.COMMON, 
    name: 'Egg', 
    color: 'text-slate-200', 
    borderColor: 'border-slate-200',
    glowColor: 'shadow-slate-200',
    minMult: 1.0,
    maxMult: 1.1,
    dropRate: 0.50 
  },
  [Rarity.UNCOMMON]: { 
    id: Rarity.UNCOMMON, 
    name: 'Hatching', 
    color: 'text-emerald-400', 
    borderColor: 'border-emerald-400',
    glowColor: 'shadow-emerald-400',
    minMult: 1.2,
    maxMult: 1.4,
    dropRate: 0.30 
  },
  [Rarity.RARE]: { 
    id: Rarity.RARE, 
    name: 'Nesting', 
    color: 'text-blue-400', 
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-400',
    minMult: 1.5,
    maxMult: 1.8,
    dropRate: 0.15 
  },
  [Rarity.EPIC]: { 
    id: Rarity.EPIC, 
    name: 'Fledgling', 
    color: 'text-purple-400', 
    borderColor: 'border-purple-400',
    glowColor: 'shadow-purple-400',
    minMult: 2.0,
    maxMult: 2.5,
    dropRate: 0.04 
  },
  [Rarity.LEGENDARY]: { 
    id: Rarity.LEGENDARY, 
    name: 'Juvenile', 
    color: 'text-rose-500', 
    borderColor: 'border-rose-500',
    glowColor: 'shadow-rose-500',
    minMult: 3.0,
    maxMult: 4.0,
    dropRate: 0.009 
  },
  [Rarity.MYTHIC]: { 
    id: Rarity.MYTHIC, 
    name: 'Adult', 
    color: 'text-yellow-400', 
    borderColor: 'border-yellow-400',
    glowColor: 'shadow-yellow-400',
    minMult: 5.0,
    maxMult: 7.0,
    dropRate: 0.001 
  },
};

export const CONSUMABLE_STATS = {
    [ConsumableType.HUNTING_SPEED]: {
        name: "Chrono Feather",
        description: "Accelerates hunting tick rate.",
        stats: {
             [Rarity.COMMON]: { mult: 1.5, duration: 60 },
             [Rarity.UNCOMMON]: { mult: 2.0, duration: 90 },
             [Rarity.RARE]: { mult: 2.5, duration: 120 },
             [Rarity.EPIC]: { mult: 3.5, duration: 180 },
             [Rarity.LEGENDARY]: { mult: 5.0, duration: 300 },
             [Rarity.MYTHIC]: { mult: 10.0, duration: 600 },
        }
    },
    [ConsumableType.BATTLE_REWARD]: {
        name: "Fortune Charm",
        description: "Increases battle rewards (Feathers & Scrap).",
        stats: {
             [Rarity.COMMON]: { mult: 1.2, duration: 3 },
             [Rarity.UNCOMMON]: { mult: 1.5, duration: 4 },
             [Rarity.RARE]: { mult: 2.0, duration: 5 },
             [Rarity.EPIC]: { mult: 2.5, duration: 8 },
             [Rarity.LEGENDARY]: { mult: 3.5, duration: 12 },
             [Rarity.MYTHIC]: { mult: 5.0, duration: 20 },
        }
    }
};

export const BUFF_LABELS: Record<string, string> = {
    // Utility (Gems)
    'XP_BONUS': 'XP Gain',
    'SCRAP_BONUS': 'Scrap Find',
    'HUNT_BONUS': 'Hunt Yield',
    'FEATHER_BONUS': 'Battle Feathers',
    'DIAMOND_BATTLE_CHANCE': 'Diamond (Battle)',
    'DIAMOND_HUNT_CHANCE': 'Diamond (Hunt)',
    'GEM_FIND_CHANCE': 'Gem Find',
    'ITEM_FIND_CHANCE': 'Item Find',
    // Stats (Gear)
    'HP': 'Health',
    'ATK': 'Attack',
    'DEF': 'Defense',
    'SPD': 'Speed',
    'NRG': 'Energy'
};

const RARITY_HIERARCHY = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];

export const getMaxCraftRarity = (level: number): Rarity => {
    // Base Unlock (Level 0) = Green (Uncommon)
    // +1 Rarity every 5 levels.
    // Lvl 0: Index 1 (Uncommon)
    // Lvl 5: Index 2 (Rare)
    // Lvl 10: Index 3 (Epic)
    // Lvl 15: Index 4 (Legendary)
    // Lvl 20: Index 5 (Mythic)
    const baseIndex = 1; // Start at Uncommon
    const bonusIndex = Math.floor(level / 5);
    const totalIndex = Math.min(5, baseIndex + bonusIndex);
    return RARITY_HIERARCHY[totalIndex];
};

/**
 * Enhanced Rarity Rolling Logic
 * Uses a base 0-1000 roll. 
 * Upgrade levels provide a flat bonus, pushing the distribution upwards.
 */
export const rollRarity = (upgradeLevel: number = 0, context: 'CATCH' | 'CRAFT' = 'CRAFT', multiplier: number = 1): Rarity => {
  // Consistent base roll 0-1000
  const baseRoll = Math.random() * 1000;
  
  // Strong level bonus for crafting progression. 
  // At Level 10 (Purple unlocked), bonus is 200, allowing access to Epic tier.
  // At Level 20 (Mythic unlocked), bonus is 400.
  const levelBonus = upgradeLevel * 20;

  let multiplierBonus = 0;
  if (context === 'CATCH') {
      if (multiplier >= 2) multiplierBonus += 50;
      if (multiplier >= 3) multiplierBonus += 120;
      if (multiplier >= 4) multiplierBonus += 300; 
      if (multiplier >= 5) multiplierBonus += 550; 
  }

  const totalScore = baseRoll + levelBonus + multiplierBonus;

  // Refined Thresholds for "Incredibly Rare" high tiers
  // Max possible score at lvl 20 is 1400 (excluding catch multipliers)
  let rarity = Rarity.COMMON;
  
  if (totalScore > 1380) rarity = Rarity.MYTHIC; // ~2% at lvl 20
  else if (totalScore > 1250) rarity = Rarity.LEGENDARY; // ~13% at lvl 20, ~5% at lvl 15
  else if (totalScore > 1080) rarity = Rarity.EPIC; // ~12% at lvl 10
  else if (totalScore > 850) rarity = Rarity.RARE; // ~25% at lvl 5
  else if (totalScore > 500) rarity = Rarity.UNCOMMON; // ~50% at lvl 0

  // Hard Gating for CRAFTING only
  // If player rolls higher than their facility allows, they get the maximum allowed tier instead.
  if (context === 'CRAFT') {
      const maxAllowed = getMaxCraftRarity(upgradeLevel);
      const currentIdx = RARITY_HIERARCHY.indexOf(rarity);
      const maxIdx = RARITY_HIERARCHY.indexOf(maxAllowed);

      if (currentIdx > maxIdx) {
          return maxAllowed;
      }
  }

  return rarity;
};

const RARITY_INDEX = {
    [Rarity.COMMON]: 0,
    [Rarity.UNCOMMON]: 1,
    [Rarity.RARE]: 2,
    [Rarity.EPIC]: 3,
    [Rarity.LEGENDARY]: 4,
    [Rarity.MYTHIC]: 5
};

const INDEX_TO_RARITY = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];

// --- STAT BONUSES FOR GEAR ---
const STAT_BONUS_RANGES = {
    [Rarity.COMMON]: { min: 5, max: 10 },
    [Rarity.UNCOMMON]: { min: 10, max: 20 },
    [Rarity.RARE]: { min: 20, max: 35 },
    [Rarity.EPIC]: { min: 35, max: 55 },
    [Rarity.LEGENDARY]: { min: 55, max: 80 },
    [Rarity.MYTHIC]: { min: 80, max: 120 }
};
const STAT_TYPES: StatType[] = ['HP', 'ATK', 'DEF', 'SPD', 'NRG'];

const generateStatBonuses = (itemRarity: Rarity, boostLevel: number = 0): StatBonus[] => {
    const maxIndex = RARITY_INDEX[itemRarity];
    const bonuses: StatBonus[] = [];
    
    if (maxIndex === undefined) return [];
    
    const numBonuses = Math.min(3, Math.floor(Math.random() * (maxIndex + 1) / 2) + 1);

    for (let i = 0; i < numBonuses; i++) {
        const roll = Math.random();
        let bonusRarityIndex = maxIndex;

        if (maxIndex > 0) {
            if (roll < 0.2) bonusRarityIndex = Math.max(0, maxIndex - 2); 
            else if (roll < 0.5) bonusRarityIndex = Math.max(0, maxIndex - 1); 
        }
        
        const bonusRarity = INDEX_TO_RARITY[bonusRarityIndex];
        const statType = STAT_TYPES[Math.floor(Math.random() * STAT_TYPES.length)];
        const range = STAT_BONUS_RANGES[bonusRarity];
        
        const rollPercent = Math.random() + (boostLevel * 0.01); 
        const value = Math.floor(range.min + (Math.min(1, rollPercent) * (range.max - range.min)));
        
        bonuses.push({
            stat: statType,
            value,
            rarity: bonusRarity
        });
    }
    return bonuses;
};

// --- UTILITY BUFFS FOR GEMS ---
const UTILITY_BUFF_RANGES = {
    [Rarity.COMMON]: { min: 1, max: 5 },
    [Rarity.UNCOMMON]: { min: 5, max: 10 },
    [Rarity.RARE]: { min: 10, max: 20 },
    [Rarity.EPIC]: { min: 20, max: 35 },
    [Rarity.LEGENDARY]: { min: 35, max: 50 },
    [Rarity.MYTHIC]: { min: 50, max: 75 }
};

const RARE_UTILITY_BUFF_RANGES = {
    [Rarity.COMMON]: { min: 0.5, max: 1.5 },
    [Rarity.UNCOMMON]: { min: 1.5, max: 3.0 },
    [Rarity.RARE]: { min: 3.0, max: 5.0 },
    [Rarity.EPIC]: { min: 5.0, max: 8.0 },
    [Rarity.LEGENDARY]: { min: 8.0, max: 12.0 },
    [Rarity.MYTHIC]: { min: 12.0, max: 20.0 }
};

const UTILITY_BUFF_TYPES: UtilityBuffType[] = ['XP_BONUS', 'SCRAP_BONUS', 'HUNT_BONUS', 'FEATHER_BONUS', 'DIAMOND_BATTLE_CHANCE', 'DIAMOND_HUNT_CHANCE', 'GEM_FIND_CHANCE', 'ITEM_FIND_CHANCE'];

export const generateGemBuffs = (itemRarity: Rarity, boostLevel: number = 0): GearBuff[] => {
    const maxBuffs = Math.max(1, Math.min(2, Math.floor(RARITY_INDEX[itemRarity] / 2) + 1)); 
    const buffs: GearBuff[] = [];
    const levelMult = 1 + (boostLevel * 0.02); 

    for (let i = 0; i < maxBuffs; i++) {
        const buffRarityIndex = Math.max(0, RARITY_INDEX[itemRarity] - Math.floor(Math.random() * 2));
        const buffRarity = INDEX_TO_RARITY[buffRarityIndex];
        const statType = UTILITY_BUFF_TYPES[Math.floor(Math.random() * UTILITY_BUFF_TYPES.length)];
        
        const isRareType = statType === 'DIAMOND_BATTLE_CHANCE' || statType === 'DIAMOND_HUNT_CHANCE' || statType === 'GEM_FIND_CHANCE' || statType === 'ITEM_FIND_CHANCE';
        const range = isRareType ? RARE_UTILITY_BUFF_RANGES[buffRarity] : UTILITY_BUFF_RANGES[buffRarity];
        const rawValue = (range.min + Math.random() * (range.max - range.min)) * levelMult;
        const value = isRareType ? Number(rawValue.toFixed(1)) : Math.floor(rawValue);
        
        buffs.push({
            stat: statType,
            value,
            rarity: buffRarity
        });
    }
    return buffs;
};

export const generateGem = (rarity: Rarity, boostLevel: number = 0): Gem => {
    const config = RARITY_CONFIG[rarity];
    return {
        id: Math.random().toString(36).substring(7),
        name: `${config.name} Gem`,
        rarity: rarity,
        buffs: generateGemBuffs(rarity, boostLevel)
    };
};

export const generateCraftedGem = (boostLevel = 0): Gem => {
    const rarity = rollRarity(boostLevel, 'CRAFT', 1);
    return generateGem(rarity, boostLevel);
};

const generateSockets = (itemRarity: Rarity): (Gem | null)[] => {
    let maxSockets = 0;
    switch (itemRarity) {
        case Rarity.COMMON: maxSockets = 0; break;
        case Rarity.UNCOMMON: maxSockets = 1; break;
        case Rarity.RARE: maxSockets = 1; break;
        case Rarity.EPIC: maxSockets = 2; break;
        case Rarity.LEGENDARY: maxSockets = 2; break;
        case Rarity.MYTHIC: maxSockets = 3; break;
        default: maxSockets = 0;
    }

    const roll = Math.random();
    let numSockets = 0;
    if (maxSockets > 0) {
        if (roll < 0.4) numSockets = maxSockets; 
        else if (roll < 0.8) numSockets = Math.max(1, maxSockets - 1); 
        else numSockets = 0; 
    }

    return new Array(numSockets).fill(null);
};

const generatePrefix = (rarity: Rarity): { prefix?: GearPrefix, value?: number } => {
    if (Math.random() > 0.4) return {};

    const prefixes = [GearPrefix.QUALITY, GearPrefix.SHARP, GearPrefix.GREAT];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let value = 0;

    const rarityIdx = RARITY_INDEX[rarity];
    const tierMult = 1 + (rarityIdx * 0.4); 

    if (prefix === GearPrefix.QUALITY) {
        value = Math.floor((2 + Math.random() * 3) * tierMult);
    } else if (prefix === GearPrefix.SHARP) {
        value = Math.floor((5 + Math.random() * 5) * tierMult);
    } else if (prefix === GearPrefix.GREAT) {
        value = Math.floor((5 + Math.random() * 5) * tierMult);
    }

    return { prefix, value };
};

const getPrefixName = (prefix: GearPrefix) => {
    switch(prefix) {
        case GearPrefix.QUALITY: return 'Quality';
        case GearPrefix.SHARP: return 'Sharp';
        case GearPrefix.GREAT: return 'Great';
        default: return '';
    }
};

export const generateCraftedGear = (type: GearType, boostLevel = 0): Gear => {
    const rarity = rollRarity(boostLevel, 'CRAFT', 1);
    const config = RARITY_CONFIG[rarity];
    const mult = config.minMult + Math.random() * (config.maxMult - config.minMult);
    const levelMult = 1 + (boostLevel * 0.15); 
    const baseAtk = (type === GearType.BEAK ? 10 : 5) * levelMult;
    const { prefix, value } = generatePrefix(rarity);
    const prefixStr = prefix ? getPrefixName(prefix) + ' ' : '';

    return {
        id: Math.random().toString(36).substring(7),
        type,
        name: `${prefixStr}${config.name} ${type === GearType.BEAK ? 'Beak' : 'Claws'}`,
        rarity,
        attackBonus: Math.floor(baseAtk * mult),
        prefix,
        paramValue: value,
        statBonuses: generateStatBonuses(rarity, boostLevel), 
        sockets: generateSockets(rarity)
    };
};