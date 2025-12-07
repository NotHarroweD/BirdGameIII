
import { Bird, MoveType, SkillCheckType, PlayerState, Rarity, RarityTier, BirdInstance, BirdTemplate, BirdStatsConfig, Gear, GearType, GearBuff, UtilityBuffType, Gem, StatBonus, StatType } from './types';

export const INITIAL_PLAYER_STATE: PlayerState = {
  feathers: 0,
  scrap: 0,
  diamonds: 0,
  totalBattles: 0,
  highestZone: 1,
  birds: [],
  selectedBirdId: '',
  huntingBirdIds: [],
  inventory: {
    gear: [],
    gems: [],
    potions: 5,
    revives: 1
  },
  upgrades: {
    clickPower: 1,
    passiveIncome: 0,
    dropRate: 1,
    scrapChanceLevel: 0,
    craftRarityLevel: 0,
    catchRarityLevel: 0,
    rosterCapacityLevel: 0,
    gemRarityLevel: 0
  }
};

export const XP_TABLE = {
  BASE: 100,
  GROWTH_FACTOR: 1.5
};

export const ROSTER_BASE_CAPACITY = 2;

export const UPGRADE_COSTS = {
  CLICK_POWER: 50,
  PASSIVE_INCOME: 100,
  RECRUIT: 500,
  HEAL: 10,
  CRAFT_GEAR: 250, 
  CRAFT_SCRAP: 25,
  CRAFT_GEM: 1000,
  CRAFT_GEM_SCRAP: 50
};

export interface UpgradeDefinition {
    id: keyof PlayerState['upgrades'];
    name: string;
    description: string;
    baseCost: { feathers: number, scrap: number, diamonds: number };
    costMultiplier: number;
    maxLevel: number;
    effectPerLevel: string;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
    {
        id: 'scrapChanceLevel',
        name: 'Scavenger Tech',
        description: 'Increases chance to find Scrap after battles.',
        baseCost: { feathers: 250, scrap: 0, diamonds: 0 },
        costMultiplier: 1.5,
        maxLevel: 20,
        effectPerLevel: '+1% Chance'
    },
    {
        id: 'catchRarityLevel',
        name: 'Signal Booster',
        description: 'Increases chance of finding higher rarity birds when scanning.',
        baseCost: { feathers: 500, scrap: 50, diamonds: 0 },
        costMultiplier: 1.4,
        maxLevel: 5,
        effectPerLevel: '+Luck'
    },
    {
        id: 'craftRarityLevel',
        name: 'Forge Level',
        description: 'Upgrades the Forge to craft higher rarity gear and increase base stats of crafted items.',
        baseCost: { feathers: 300, scrap: 100, diamonds: 0 },
        costMultiplier: 1.6,
        maxLevel: 10,
        effectPerLevel: '+Stats & Luck'
    },
    {
        id: 'gemRarityLevel',
        name: 'Gemforge Mastery',
        description: 'Increases the likelihood of creating higher rarity gems in the Gemforge.',
        baseCost: { feathers: 800, scrap: 200, diamonds: 0 },
        costMultiplier: 1.7,
        maxLevel: 10,
        effectPerLevel: '+Gem Luck'
    },
    {
        id: 'rosterCapacityLevel',
        name: 'Habitat Expansion',
        description: 'Increases the maximum number of birds you can keep in your roster.',
        baseCost: { feathers: 0, scrap: 0, diamonds: 1 },
        costMultiplier: 1.5, // 1, 2, 3, 5, 7 diamonds etc approx
        maxLevel: 10,
        effectPerLevel: '+1 Slot'
    }
];

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

export const BUFF_LABELS: Record<string, string> = {
    // Utility (Gems)
    'XP_BONUS': 'XP Gain',
    'SCRAP_BONUS': 'Scrap Find',
    'HUNT_BONUS': 'Hunt Yield',
    'FEATHER_BONUS': 'Battle Feathers',
    'DIAMOND_BATTLE_CHANCE': 'Diamond (Battle)',
    'DIAMOND_HUNT_CHANCE': 'Diamond (Hunt)',
    'GEM_FIND_CHANCE': 'Gem Find',
    // Stats (Gear)
    'HP': 'Health',
    'ATK': 'Attack',
    'DEF': 'Defense',
    'SPD': 'Speed',
    'NRG': 'Energy'
};

// rollRarity now accepts a level boost (0-5 range usually) to shift probabilities
export const rollRarity = (boostLevel = 0): Rarity => {
  // Boost reduces the 'common' range and pushes checks higher
  const luckFactor = boostLevel * 0.05; // 5% shift per level
  const rand = Math.random() + luckFactor;

  // Base thresholds: 0.5, 0.8, 0.95, 0.99, 0.999
  // With boost, it's easier to surpass these
  
  if (rand < 0.50) return Rarity.COMMON;
  if (rand < 0.80) return Rarity.UNCOMMON;
  if (rand < 0.95) return Rarity.RARE;
  if (rand < 0.99) return Rarity.EPIC;
  if (rand < 0.999) return Rarity.LEGENDARY;
  return Rarity.MYTHIC;
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
    [Rarity.COMMON]: { min: 2, max: 5 },
    [Rarity.UNCOMMON]: { min: 5, max: 10 },
    [Rarity.RARE]: { min: 10, max: 20 },
    [Rarity.EPIC]: { min: 20, max: 35 },
    [Rarity.LEGENDARY]: { min: 35, max: 50 },
    [Rarity.MYTHIC]: { min: 50, max: 75 }
};
const STAT_TYPES: StatType[] = ['HP', 'ATK', 'DEF', 'SPD', 'NRG'];

const generateStatBonuses = (itemRarity: Rarity): StatBonus[] => {
    const maxBonuses = RARITY_INDEX[itemRarity];
    const bonuses: StatBonus[] = [];
    
    if (maxBonuses === 0) return [];
    
    // Scale number of bonuses based on rarity (similar to sockets/buffs)
    const numBonuses = Math.min(3, Math.floor(Math.random() * maxBonuses) + 1);

    for (let i = 0; i < numBonuses; i++) {
        const bonusRarityIndex = Math.max(0, RARITY_INDEX[itemRarity] - Math.floor(Math.random() * 2));
        const bonusRarity = INDEX_TO_RARITY[bonusRarityIndex];
        
        const statType = STAT_TYPES[Math.floor(Math.random() * STAT_TYPES.length)];
        const range = STAT_BONUS_RANGES[bonusRarity];
        const value = Math.floor(range.min + Math.random() * (range.max - range.min));
        
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

// Separate small range for rare chance buffs (Diamonds, Gems)
const RARE_UTILITY_BUFF_RANGES = {
    [Rarity.COMMON]: { min: 0.1, max: 0.5 },
    [Rarity.UNCOMMON]: { min: 0.5, max: 1.0 },
    [Rarity.RARE]: { min: 1.0, max: 2.0 },
    [Rarity.EPIC]: { min: 2.0, max: 3.5 },
    [Rarity.LEGENDARY]: { min: 3.5, max: 5.0 },
    [Rarity.MYTHIC]: { min: 5.0, max: 10.0 }
};

const UTILITY_BUFF_TYPES: UtilityBuffType[] = ['XP_BONUS', 'SCRAP_BONUS', 'HUNT_BONUS', 'FEATHER_BONUS', 'DIAMOND_BATTLE_CHANCE', 'DIAMOND_HUNT_CHANCE', 'GEM_FIND_CHANCE'];

// Used for GEMS
export const generateGemBuffs = (itemRarity: Rarity): GearBuff[] => {
    const maxBuffs = Math.max(1, Math.min(2, Math.floor(RARITY_INDEX[itemRarity] / 2) + 1)); 
    const buffs: GearBuff[] = [];
    
    for (let i = 0; i < maxBuffs; i++) {
        const buffRarityIndex = Math.max(0, RARITY_INDEX[itemRarity] - Math.floor(Math.random() * 2));
        const buffRarity = INDEX_TO_RARITY[buffRarityIndex];
        
        const statType = UTILITY_BUFF_TYPES[Math.floor(Math.random() * UTILITY_BUFF_TYPES.length)];
        
        const isRareType = statType === 'DIAMOND_BATTLE_CHANCE' || statType === 'DIAMOND_HUNT_CHANCE' || statType === 'GEM_FIND_CHANCE';
        const range = isRareType ? RARE_UTILITY_BUFF_RANGES[buffRarity] : UTILITY_BUFF_RANGES[buffRarity];
        
        const rawValue = range.min + Math.random() * (range.max - range.min);
        const value = isRareType ? Number(rawValue.toFixed(1)) : Math.floor(rawValue);
        
        buffs.push({
            stat: statType,
            value,
            rarity: buffRarity
        });
    }

    return buffs;
};

export const generateGem = (rarity: Rarity): Gem => {
    const config = RARITY_CONFIG[rarity];
    return {
        id: Math.random().toString(36).substring(7),
        name: `${config.name} Gem`,
        rarity: rarity,
        buffs: generateGemBuffs(rarity)
    };
};

export const generateCraftedGem = (boostLevel = 0): Gem => {
    const rarity = rollRarity(boostLevel);
    return generateGem(rarity);
};

// Socket Logic
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

    // Chance to have sockets if eligible
    const roll = Math.random();
    let numSockets = 0;
    if (maxSockets > 0) {
        if (roll < 0.4) numSockets = maxSockets; // 40% chance for full sockets
        else if (roll < 0.8) numSockets = Math.max(1, maxSockets - 1); // 40% chance for almost full
        else numSockets = 0; // 20% chance for none
    }

    return new Array(numSockets).fill(null);
};

export const generateCraftedGear = (type: GearType, boostLevel = 0): Gear => {
    const rarity = rollRarity(boostLevel);
    const config = RARITY_CONFIG[rarity];
    const mult = config.minMult + Math.random() * (config.maxMult - config.minMult);

    // Scaling base stats with boostLevel (Forge Level)
    const levelMult = 1 + (boostLevel * 0.1); 

    const baseAtk = (type === GearType.BEAK ? 10 : 5) * levelMult;
    const baseEffect = (type === GearType.BEAK ? 10 : 3) * levelMult; 

    return {
        id: Math.random().toString(36).substring(7),
        type,
        name: `${config.name} ${type === GearType.BEAK ? 'Beak' : 'Claws'}`,
        rarity,
        attackBonus: Math.floor(baseAtk * mult),
        effectValue: Math.floor(baseEffect * mult),
        statBonuses: generateStatBonuses(rarity), // Now Stat Bonuses
        sockets: generateSockets(rarity)
    };
};

// --- BIRD TEMPLATES & GENERATION ---

export const BIRD_TEMPLATES: BirdTemplate[] = [
  {
    id: 'hummingbird',
    name: 'Hummingbird',
    species: 'Speed Class',
    description: 'Extremely fast and evasive. Hard to hit but fragile.',
    imageUrl: 'https://images.unsplash.com/photo-1544636254-d83b6329c3d9?q=80&w=800&auto=format&fit=crop',
    baseStats: {
      hp: [90, 110], // Buffed from [70, 90]
      energy: [110, 130],
      attack: [45, 55],
      defense: [35, 45], // Buffed from [25, 35]
      speed: [95, 110]
    },
    passive: {
      name: 'Hyper Metabolism',
      description: 'Regenerates Energy 50% faster.'
    },
    moves: [
      { id: 'rapid_peck', name: 'Rapid Peck', description: 'Multi-hit strike.', type: MoveType.ATTACK, power: 20, cost: 10, accuracy: 95, cooldown: 2000, skillCheck: SkillCheckType.MASH }, // Power buffed 15 -> 20
      { id: 'evasive_maneuvers', name: 'Evasive Maneuvers', description: 'Increases evasion.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, effect: 'dodge', cooldown: 6000 },
      { id: 'nectar_sip', name: 'Nectar Sip', description: 'Restore HP.', type: MoveType.HEAL, power: 30, cost: 25, accuracy: 100, cooldown: 8000, skillCheck: SkillCheckType.TIMING }, // Cooldown reduced 12s -> 8s
      { id: 'sonic_boom', name: 'Sonic Boom', description: 'High altitude sonic wave.', type: MoveType.SPECIAL, power: 55, cost: 45, accuracy: 90, requiresHeight: true, cooldown: 15000, skillCheck: SkillCheckType.TIMING }
    ],
    huntingConfig: {
      baseRate: 2,
      description: 'Speedy gatherer. 10% Chance for Double Feathers.'
    }
  },
  {
    id: 'eagle',
    name: 'Eagle',
    species: 'Power Class',
    description: 'Heavy hitter with high HP and Attack. Slow speed.',
    imageUrl: 'https://images.unsplash.com/photo-1579702958013-1d0794b638b9?q=80&w=800&auto=format&fit=crop',
    baseStats: {
      hp: [150, 170],
      energy: [80, 100],
      attack: [80, 95],
      defense: [55, 65],
      speed: [35, 45]
    },
    passive: {
      name: 'Apex Predator',
      description: 'Deals 25% bonus damage to low HP targets.'
    },
    moves: [
      { id: 'crushing_talon', name: 'Crushing Talon', description: 'Devastating strike.', type: MoveType.ATTACK, power: 45, cost: 20, accuracy: 85, cooldown: 4000, skillCheck: SkillCheckType.TIMING },
      { id: 'iron_plumage', name: 'Iron Plumage', description: 'Reduce damage.', type: MoveType.DEFENSE, power: 0, cost: 20, accuracy: 100, cooldown: 8000 },
      { id: 'scavenge', name: 'Scavenge', description: 'Heal from surroundings.', type: MoveType.HEAL, power: 45, cost: 35, accuracy: 100, cooldown: 15000 },
      { id: 'sky_drop', name: 'Sky Drop', description: 'Lift and drop enemy.', type: MoveType.SPECIAL, power: 75, cost: 55, accuracy: 80, requiresHeight: true, cooldown: 18000, skillCheck: SkillCheckType.MASH }
    ],
    huntingConfig: {
      baseRate: 1,
      description: 'Reliable hunting. High base yield.'
    }
  },
  {
    id: 'hawk',
    name: 'Hawk',
    species: 'Tactical Class',
    description: 'Balanced stats with guaranteed hit abilities.',
    imageUrl: 'https://images.unsplash.com/photo-1611762744276-8e503ae8d29b?q=80&w=800&auto=format&fit=crop',
    baseStats: {
      hp: [110, 130],
      energy: [95, 115],
      attack: [60, 75],
      defense: [40, 50],
      speed: [65, 75]
    },
    passive: {
      name: 'Keen Eye',
      description: 'Attacks cannot be dodged.'
    },
    moves: [
      { id: 'precision_dive', name: 'Precision Dive', description: 'Guaranteed hit.', type: MoveType.ATTACK, power: 25, cost: 15, accuracy: 100, requiresHeight: true, cooldown: 3000, skillCheck: SkillCheckType.TIMING },
      { id: 'wind_ride', name: 'Wind Ride', description: 'Ride the wind.', type: MoveType.DEFENSE, power: 0, cost: 10, accuracy: 100, effect: 'dodge', cooldown: 5000 },
      { id: 'roost', name: 'Roost', description: 'Rest to heal.', type: MoveType.HEAL, power: 35, cost: 25, accuracy: 100, cooldown: 12000 },
      { id: 'razor_wind', name: 'Razor Wind', description: 'Wind cutter.', type: MoveType.SPECIAL, power: 50, cost: 40, accuracy: 95, cooldown: 10000, skillCheck: SkillCheckType.MASH }
    ],
    huntingConfig: {
      baseRate: 1.2,
      description: 'Keen eyes. 5% Chance to find Scrap.'
    }
  },
  {
    id: 'owl',
    name: 'Owl',
    species: 'Wisdom Class',
    description: 'High energy and accuracy. Specializes in night combat.',
    imageUrl: 'https://images.unsplash.com/photo-1540455806655-46f90ba031d2?q=80&w=800&auto=format&fit=crop',
    baseStats: {
      hp: [100, 120],
      energy: [130, 150],
      attack: [55, 65],
      defense: [35, 45],
      speed: [55, 65]
    },
    passive: {
      name: 'Night Vision',
      description: 'Immune to accuracy penalties.'
    },
    moves: [
      { id: 'silent_swoop', name: 'Silent Swoop', description: 'Stealth attack.', type: MoveType.ATTACK, power: 30, cost: 15, accuracy: 100, cooldown: 3500, skillCheck: SkillCheckType.TIMING },
      { id: 'feint', name: 'Feint', description: 'Confuse enemy.', type: MoveType.DEFENSE, power: 0, cost: 10, accuracy: 100, effect: 'dodge', cooldown: 6000 },
      { id: 'meditate', name: 'Meditate', description: 'Focus energy to heal.', type: MoveType.HEAL, power: 40, cost: 30, accuracy: 100, cooldown: 14000 },
      { id: 'moon_beam', name: 'Moon Beam', description: 'Concentrated lunar energy.', type: MoveType.SPECIAL, power: 65, cost: 50, accuracy: 90, cooldown: 16000, skillCheck: SkillCheckType.MASH }
    ],
    huntingConfig: {
      baseRate: 1.1,
      description: 'Wise hunter. +10% Experience Gain.'
    }
  },
  {
    id: 'vulture',
    name: 'Vulture',
    species: 'Scavenger Class',
    description: 'High defense and survival. Can drain health.',
    imageUrl: 'https://images.unsplash.com/photo-1516641888365-1d4a8e0108ec?q=80&w=800&auto=format&fit=crop',
    baseStats: {
      hp: [140, 160],
      energy: [70, 90],
      attack: [50, 60],
      defense: [65, 80],
      speed: [30, 40]
    },
    passive: {
      name: 'Rot Eater',
      description: 'Heals slightly every turn.'
    },
    moves: [
      { id: 'acid_puke', name: 'Acid Bile', description: 'Corrosive attack.', type: MoveType.ATTACK, power: 25, cost: 15, accuracy: 90, cooldown: 4000, skillCheck: SkillCheckType.MASH },
      { id: 'harden', name: 'Harden', description: 'Toughen skin.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, cooldown: 8000 },
      { id: 'carrion_feast', name: 'Carrion Feast', description: 'Drain life from enemy.', type: MoveType.DRAIN, power: 40, cost: 35, accuracy: 95, cooldown: 10000, skillCheck: SkillCheckType.COMBO },
      { id: 'bone_drop', name: 'Bone Drop', description: 'Drop from height.', type: MoveType.SPECIAL, power: 60, cost: 45, accuracy: 85, requiresHeight: true, cooldown: 17000 }
    ],
    huntingConfig: {
      baseRate: 0.8,
      description: 'Rare finds. 1% Chance to find Diamonds.'
    }
  }
];

// Helper to get random value in range
const getRandomInRange = (range: [number, number]) => {
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
};

export const generateBird = (template: BirdTemplate, rarity: Rarity): BirdInstance => {
  const rarityConfig = RARITY_CONFIG[rarity];
  const tierMult = rarityConfig.minMult + Math.random() * (rarityConfig.maxMult - rarityConfig.minMult);
  
  const baseHp = getRandomInRange(template.baseStats.hp);
  const baseEnergy = getRandomInRange(template.baseStats.energy);
  const baseAttack = getRandomInRange(template.baseStats.attack);
  const baseDefense = getRandomInRange(template.baseStats.defense);
  const baseSpeed = getRandomInRange(template.baseStats.speed);

  return {
    id: template.id,
    name: template.name,
    species: template.species,
    description: template.description,
    imageUrl: template.imageUrl,
    passive: template.passive,
    moves: template.moves,
    huntingConfig: template.huntingConfig,
    
    // Stats scaled by rarity multiplier
    baseHp: Math.floor(baseHp * tierMult),
    baseEnergy: Math.floor(baseEnergy * tierMult),
    baseAttack: Math.floor(baseAttack * tierMult),
    baseDefense: Math.floor(baseDefense * tierMult),
    baseSpeed: Math.floor(baseSpeed * tierMult),
    
    instanceId: Math.random().toString(36).substring(7),
    rarity,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    kills: 0,
    prestigeLevel: 0,
    gear: {
        beak: null,
        claws: null
    }
  };
};

export const BIRDS: Bird[] = BIRD_TEMPLATES.map(t => ({
    ...t,
    baseHp: t.baseStats.hp[0],
    baseEnergy: t.baseStats.energy[0],
    baseAttack: t.baseStats.attack[0],
    baseDefense: t.baseStats.defense[0],
    baseSpeed: t.baseStats.speed[0]
}));
