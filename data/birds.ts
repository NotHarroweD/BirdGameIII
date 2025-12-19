import { BirdTemplate, BirdInstance, MoveType, SkillCheckType, Rarity, Bird } from '../types';
import { RARITY_CONFIG } from './items';

export const BIRD_TEMPLATES: BirdTemplate[] = [
  {
    id: 'hummingbird',
    name: 'Hummingbird',
    species: 'Speed Class',
    description: 'Extremely fast and evasive. Hard to hit but fragile.',
    imageUrl: 'https://images.unsplash.com/photo-1544636254-d83b6329c3d9?q=80&w=800&auto=format&fit=crop',
    baseHp: 90,
    baseEnergy: 110,
    baseAttack: 45,
    baseDefense: 35,
    baseSpeed: 95,
    baseStats: {
      hp: [90, 110], 
      energy: [110, 130],
      attack: [45, 55],
      defense: [35, 45], 
      speed: [95, 110]
    },
    passive: {
      name: 'Hyper Metabolism',
      description: 'Regenerates Energy 50% faster.'
    },
    moves: [
      { id: 'rapid_peck', name: 'Rapid Peck', description: 'Quick 3-hit combo combo.', type: MoveType.ATTACK, power: 22, cost: 10, accuracy: 95, cooldown: 4000, skillCheck: SkillCheckType.COMBO },
      { id: 'evasive_maneuvers', name: 'Evasive Maneuvers', description: 'Increases evasion.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, effect: 'dodge', cooldown: 12000, skillCheck: SkillCheckType.REFLEX },
      { id: 'nectar_sip', name: 'Nectar Sip', description: 'Restore HP.', type: MoveType.HEAL, power: 20, cost: 25, accuracy: 100, cooldown: 18000, skillCheck: SkillCheckType.REFLEX }, 
      { id: 'sonic_boom', name: 'Sonic Boom', description: 'High altitude sonic wave.', type: MoveType.SPECIAL, power: 55, cost: 45, accuracy: 90, requiresHeight: true, cooldown: 25000, skillCheck: SkillCheckType.TIMING }
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
    baseHp: 150,
    baseEnergy: 80,
    baseAttack: 80,
    baseDefense: 55,
    baseSpeed: 35,
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
      { id: 'crushing_talon', name: 'Crushing Talon', description: 'Devastating strike.', type: MoveType.ATTACK, power: 45, cost: 20, accuracy: 85, cooldown: 8000, skillCheck: SkillCheckType.TIMING },
      { id: 'iron_plumage', name: 'Iron Plumage', description: 'Reduce damage.', type: MoveType.DEFENSE, power: 0, cost: 20, accuracy: 100, cooldown: 15000, skillCheck: SkillCheckType.REFLEX },
      { id: 'scavenge', name: 'Scavenge', description: 'Heal from surroundings.', type: MoveType.HEAL, power: 30, cost: 35, accuracy: 100, cooldown: 25000, skillCheck: SkillCheckType.REFLEX },
      { id: 'sky_drop', name: 'Sky Drop', description: 'Lift and drop enemy.', type: MoveType.SPECIAL, power: 75, cost: 55, accuracy: 80, requiresHeight: true, cooldown: 30000, skillCheck: SkillCheckType.MASH }
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
    description: 'Cybernetically enhanced with guaranteed hit abilities.',
    imageUrl: 'https://cdn.discordapp.com/attachments/1037799584228974675/1448169051972178010/SSF96554KG9JE4KEW6E5FAC5X0.png?ex=693a4807&is=6938f687&hm=47a6c8449cf1b247287048c7e07fb8fbb84226a4f0bf3da875f62a22bf021ceb&',
    baseHp: 110,
    baseEnergy: 95,
    baseAttack: 60,
    baseDefense: 40,
    baseSpeed: 65,
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
      { id: 'precision_dive', name: 'Precision Dive', description: 'Guaranteed hit.', type: MoveType.ATTACK, power: 25, cost: 15, accuracy: 100, requiresHeight: true, cooldown: 6000, skillCheck: SkillCheckType.TIMING },
      { id: 'wind_ride', name: 'Wind Ride', description: 'Ride the wind.', type: MoveType.DEFENSE, power: 0, cost: 10, accuracy: 100, effect: 'dodge', cooldown: 10000, skillCheck: SkillCheckType.REFLEX },
      { id: 'roost', name: 'Roost', description: 'Rest to heal.', type: MoveType.HEAL, power: 25, cost: 25, accuracy: 100, cooldown: 20000, skillCheck: SkillCheckType.REFLEX },
      { id: 'razor_wind', name: 'Razor Wind', description: 'Wind cutter.', type: MoveType.SPECIAL, power: 50, cost: 40, accuracy: 95, cooldown: 18000, skillCheck: SkillCheckType.MASH }
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
    baseHp: 100,
    baseEnergy: 130,
    baseAttack: 55,
    baseDefense: 35,
    baseSpeed: 55,
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
      { id: 'silent_swoop', name: 'Silent Swoop', description: 'Stealth attack.', type: MoveType.ATTACK, power: 30, cost: 15, accuracy: 100, cooldown: 7000, skillCheck: SkillCheckType.TIMING },
      { id: 'feint', name: 'Feint', description: 'Confuse enemy.', type: MoveType.DEFENSE, power: 0, cost: 10, accuracy: 100, effect: 'dodge', cooldown: 12000, skillCheck: SkillCheckType.REFLEX },
      { id: 'meditate', name: 'Meditate', description: 'Focus energy to heal.', type: MoveType.HEAL, power: 25, cost: 30, accuracy: 100, cooldown: 25000, skillCheck: SkillCheckType.REFLEX },
      { id: 'moon_beam', name: 'Moon Beam', description: 'Concentrated lunar energy.', type: MoveType.SPECIAL, power: 65, cost: 50, accuracy: 90, cooldown: 30000, skillCheck: SkillCheckType.MASH }
    ],
    huntingConfig: {
      baseRate: 1.1,
      description: 'Wise hunter. 25% Chance to gain Passive XP while hunting.'
    }
  },
  {
    id: 'vulture',
    name: 'Vulture',
    species: 'Scavenger Class',
    description: 'High defense and survival. Can drain health.',
    imageUrl: 'https://images.unsplash.com/photo-1516641888365-1d4a8e0108ec?q=80&w=800&auto=format&fit=crop',
    baseHp: 140,
    baseEnergy: 70,
    baseAttack: 50,
    baseDefense: 65,
    baseSpeed: 30,
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
      { id: 'acid_puke', name: 'Acid Bile', description: 'Corrosive attack.', type: MoveType.ATTACK, power: 25, cost: 15, accuracy: 90, cooldown: 8000, skillCheck: SkillCheckType.MASH },
      { id: 'harden', name: 'Harden', description: 'Toughen skin.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, cooldown: 15000, skillCheck: SkillCheckType.REFLEX },
      { id: 'carrion_feast', name: 'Carrion Feast', description: 'Drain life from enemy.', type: MoveType.DRAIN, power: 40, cost: 35, accuracy: 95, cooldown: 22000, skillCheck: SkillCheckType.DRAIN_GAME },
      { id: 'bone_drop', name: 'Bone Drop', description: 'Drop from height.', type: MoveType.SPECIAL, power: 60, cost: 45, accuracy: 85, requiresHeight: true, cooldown: 28000 }
    ],
    huntingConfig: {
      baseRate: 0.8,
      description: 'Scavenger. 2% Chance to find Items.'
    }
  }
];

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
    baseStats: template.baseStats,
    
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
    statPoints: 0,
    kills: 0,
    prestigeLevel: 0,
    gear: {
        beak: null,
        claws: null
    }
  };
};

export const BIRDS: Bird[] = BIRD_TEMPLATES;