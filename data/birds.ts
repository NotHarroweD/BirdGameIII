
import { BirdTemplate, MoveType, SkillCheckType, Rarity, BirdInstance } from '../types';

export const BIRD_TEMPLATES: BirdTemplate[] = [
  {
    id: 'eagle',
    name: 'Eagle',
    species: 'Apex Predator',
    description: 'Balanced fighter with strong attacks.',
    imageUrl: 'https://placehold.co/400x400/1e293b/475569?text=Eagle',
    baseHp: 100,
    baseEnergy: 100,
    baseAttack: 10,
    baseDefense: 5,
    baseSpeed: 6,
    baseStats: {
        hp: [90, 110],
        energy: [90, 110],
        attack: [8, 12],
        defense: [4, 6],
        speed: [5, 7]
    },
    passive: {
      name: 'Predator',
      description: 'Deals 25% more damage to enemies below 50% HP.'
    },
    moves: [
      { id: 'peck', name: 'Peck', description: 'Basic attack.', type: MoveType.ATTACK, power: 15, cost: 5, accuracy: 100, cooldown: 1000, skillCheck: SkillCheckType.TIMING },
      { id: 'screech', name: 'Screech', description: 'Stun chance.', type: MoveType.SPECIAL, power: 10, cost: 20, accuracy: 80, cooldown: 5000, skillCheck: SkillCheckType.MASH },
      { id: 'dive', name: 'Dive Bomb', description: 'High damage from above.', type: MoveType.ATTACK, power: 40, cost: 25, accuracy: 90, requiresHeight: true, cooldown: 4000, skillCheck: SkillCheckType.TIMING },
      { id: 'roost', name: 'Roost', description: 'Recover energy.', type: MoveType.DEFENSE, power: 0, cost: 0, accuracy: 100, cooldown: 3000, effect: 'shield' }
    ],
    huntingConfig: { baseRate: 1.0, description: 'Standard hunting rate.' }
  },
  {
    id: 'hawk',
    name: 'Hawk',
    species: 'Sky Hunter',
    description: 'High critical chance and bleed effects.',
    imageUrl: 'https://placehold.co/400x400/1e293b/475569?text=Hawk',
    baseHp: 80,
    baseEnergy: 90,
    baseAttack: 12,
    baseDefense: 4,
    baseSpeed: 8,
    baseStats: {
        hp: [75, 90],
        energy: [80, 100],
        attack: [10, 14],
        defense: [3, 5],
        speed: [7, 9]
    },
    passive: {
      name: 'Keen Eye',
      description: 'Ignores enemy evasion buffs.'
    },
    moves: [
      { id: 'slash', name: 'Talon Slash', description: 'Bleed chance.', type: MoveType.ATTACK, power: 20, cost: 10, accuracy: 95, cooldown: 1500, skillCheck: SkillCheckType.FLICK },
      { id: 'focus', name: 'Focus', description: 'Next attack crits.', type: MoveType.SPECIAL, power: 0, cost: 15, accuracy: 100, cooldown: 6000, skillCheck: SkillCheckType.REFLEX },
      { id: 'rush', name: 'Aerial Rush', description: 'Multi-hit.', type: MoveType.ATTACK, power: 12, cost: 15, accuracy: 90, cooldown: 2500, skillCheck: SkillCheckType.COMBO },
      { id: 'evade', name: 'Barrel Roll', description: 'Dodge next attack.', type: MoveType.DEFENSE, power: 0, cost: 10, accuracy: 100, cooldown: 4000, effect: 'dodge' }
    ],
    huntingConfig: { baseRate: 1.2, description: 'Fast but finds less scrap.' }
  },
  {
    id: 'owl',
    name: 'Owl',
    species: 'Night Watcher',
    description: 'High defense and magic/special moves.',
    imageUrl: 'https://placehold.co/400x400/1e293b/475569?text=Owl',
    baseHp: 90,
    baseEnergy: 120,
    baseAttack: 8,
    baseDefense: 8,
    baseSpeed: 4,
    baseStats: {
        hp: [85, 100],
        energy: [110, 130],
        attack: [6, 10],
        defense: [6, 10],
        speed: [3, 5]
    },
    passive: {
      name: 'Wisdom',
      description: 'Gains more XP from battles.'
    },
    moves: [
      { id: 'hoot', name: 'Sonic Wave', description: 'Hits all ranges.', type: MoveType.SPECIAL, power: 25, cost: 20, accuracy: 100, cooldown: 3000, skillCheck: SkillCheckType.TIMING },
      { id: 'glare', name: 'Hypnosis', description: 'Lowers enemy damage.', type: MoveType.SPECIAL, power: 0, cost: 25, accuracy: 90, cooldown: 8000, skillCheck: SkillCheckType.MASH },
      { id: 'wing_shield', name: 'Wing Shield', description: 'Blocks damage.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, cooldown: 5000, skillCheck: SkillCheckType.REFLEX, effect: 'shield' },
      { id: 'gust', name: 'Gust', description: 'Push back.', type: MoveType.ATTACK, power: 15, cost: 10, accuracy: 95, cooldown: 2000, skillCheck: SkillCheckType.FLICK }
    ],
    huntingConfig: { baseRate: 0.9, description: 'Bonus XP during hunts.' }
  },
  {
    id: 'hummingbird',
    name: 'Hummingbird',
    species: 'Speed Demon',
    description: 'Extremely fast but fragile.',
    imageUrl: 'https://placehold.co/400x400/1e293b/475569?text=Hummingbird',
    baseHp: 50,
    baseEnergy: 150,
    baseAttack: 6,
    baseDefense: 2,
    baseSpeed: 15,
    baseStats: {
        hp: [45, 60],
        energy: [130, 160],
        attack: [5, 8],
        defense: [1, 3],
        speed: [12, 18]
    },
    passive: {
      name: 'Hyper Metabolism',
      description: 'Regenerates energy faster.'
    },
    moves: [
      { id: 'zip', name: 'Zip', description: 'Instant hit.', type: MoveType.ATTACK, power: 10, cost: 5, accuracy: 100, cooldown: 500, skillCheck: SkillCheckType.MASH },
      { id: 'swarm', name: 'Needle Flurry', description: 'Many small hits.', type: MoveType.ATTACK, power: 30, cost: 30, accuracy: 85, cooldown: 3000, skillCheck: SkillCheckType.COMBO },
      { id: 'dodge', name: 'Blur', description: 'High dodge chance.', type: MoveType.DEFENSE, power: 0, cost: 20, accuracy: 100, cooldown: 2000, skillCheck: SkillCheckType.REFLEX, effect: 'dodge' },
      { id: 'drain', name: 'Nectar Drain', description: 'Steals health.', type: MoveType.DRAIN, power: 20, cost: 25, accuracy: 95, cooldown: 4000, skillCheck: SkillCheckType.DRAIN_GAME }
    ],
    huntingConfig: { baseRate: 1.5, description: 'Chance for double yield.' }
  },
  {
    id: 'vulture',
    name: 'Vulture',
    species: 'Scavenger',
    description: 'Durable survivor.',
    imageUrl: 'https://placehold.co/400x400/1e293b/475569?text=Vulture',
    baseHp: 120,
    baseEnergy: 80,
    baseAttack: 9,
    baseDefense: 7,
    baseSpeed: 5,
    baseStats: {
        hp: [110, 140],
        energy: [70, 90],
        attack: [7, 11],
        defense: [6, 9],
        speed: [4, 6]
    },
    passive: {
      name: 'Rot Eater',
      description: 'Recovers HP and Energy slightly every turn.'
    },
    moves: [
      { id: 'acid_puke', name: 'Acid Bile', description: 'Corrosive attack.', type: MoveType.ATTACK, power: 25, cost: 15, accuracy: 90, cooldown: 1500, skillCheck: SkillCheckType.MASH },
      { id: 'harden', name: 'Harden', description: 'Toughen skin.', type: MoveType.DEFENSE, power: 0, cost: 15, accuracy: 100, cooldown: 8000, skillCheck: SkillCheckType.REFLEX, effect: 'shield' },
      { id: 'carrion_feast', name: 'Carrion Feast', description: 'Drain life from enemy.', type: MoveType.DRAIN, power: 40, cost: 35, accuracy: 95, cooldown: 4500, skillCheck: SkillCheckType.DRAIN_GAME },
      { id: 'bone_drop', name: 'Bone Drop', description: 'Drop from height.', type: MoveType.SPECIAL, power: 60, cost: 45, accuracy: 85, requiresHeight: true, cooldown: 6000, skillCheck: SkillCheckType.TIMING }
    ],
    huntingConfig: {
      baseRate: 0.8,
      description: 'Higher chance to find Items.'
    }
  }
];

export const BIRDS = BIRD_TEMPLATES;

export const generateBird = (template: BirdTemplate, rarity: Rarity): BirdInstance => {
    // Basic scaling based on rarity
    let multiplier = 1.0;
    if (rarity === Rarity.UNCOMMON) multiplier = 1.1;
    if (rarity === Rarity.RARE) multiplier = 1.3;
    if (rarity === Rarity.EPIC) multiplier = 1.6;
    if (rarity === Rarity.LEGENDARY) multiplier = 2.0;
    if (rarity === Rarity.MYTHIC) multiplier = 3.0;

    const rollStat = (range: [number, number]) => {
        return Math.floor((range[0] + Math.random() * (range[1] - range[0])) * multiplier);
    };

    return {
        ...template,
        instanceId: Math.random().toString(36).substring(7),
        rarity,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        statPoints: 0,
        kills: 0,
        prestigeLevel: 0,
        gear: { beak: null, claws: null },
        baseHp: rollStat(template.baseStats.hp),
        baseEnergy: rollStat(template.baseStats.energy),
        baseAttack: rollStat(template.baseStats.attack),
        baseDefense: rollStat(template.baseStats.defense),
        baseSpeed: rollStat(template.baseStats.speed),
    };
};
