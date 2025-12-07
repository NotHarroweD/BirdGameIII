
export enum MoveType {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  SPECIAL = 'SPECIAL',
  HEAL = 'HEAL',
  DRAIN = 'DRAIN',
}

export enum Altitude {
  GROUND = 0,
  LOW = 1,
  HIGH = 2
}

export enum Weather {
  CLEAR = 'CLEAR',
  TAILWIND = 'TAILWIND',
  STORM = 'STORM'
}

export enum SkillCheckType {
  NONE = 'NONE',
  TIMING = 'TIMING',
  MASH = 'MASH',
  COMBO = 'COMBO',
}

export enum Rarity {
  COMMON = 'COMMON', // Egg (White)
  UNCOMMON = 'UNCOMMON', // Hatching (Green)
  RARE = 'RARE', // Nesting (Blue)
  EPIC = 'EPIC', // Fledgling (Purple)
  LEGENDARY = 'LEGENDARY', // Juvenile (Red)
  MYTHIC = 'MYTHIC' // Adult (Gold)
}

export enum GearType {
  BEAK = 'BEAK',
  CLAWS = 'CLAWS'
}

export enum GameScreen {
  MENU,
  HUB,
  BATTLE,
  RESULT,
  CATCH
}

export enum HubTab {
  ROSTER = 'ROSTER',
  INVENTORY = 'INVENTORY',
  LAB = 'LAB',
  MAP = 'MAP',
  UPGRADES = 'UPGRADES'
}

export type UtilityBuffType = 'XP_BONUS' | 'SCRAP_BONUS' | 'HUNT_BONUS' | 'FEATHER_BONUS' | 'DIAMOND_BATTLE_CHANCE' | 'DIAMOND_HUNT_CHANCE' | 'GEM_FIND_CHANCE';
export type StatType = 'HP' | 'ATK' | 'DEF' | 'SPD' | 'NRG';

export interface GearBuff {
  stat: UtilityBuffType;
  value: number; // Percentage
  rarity: Rarity;
}

export interface StatBonus {
  stat: StatType;
  value: number; // Percentage
  rarity: Rarity;
}

export interface Gem {
    id: string;
    name: string;
    rarity: Rarity;
    buffs: GearBuff[];
}

export interface Gear {
  id: string;
  type: GearType;
  name: string;
  rarity: Rarity;
  attackBonus: number;
  effectValue: number; // Crit Chance % for Beak, Bleed Damage % for Claws
  statBonuses: StatBonus[]; // New: Stat increases
  sockets: (Gem | null)[];
}

export interface RarityTier {
  id: Rarity;
  name: string;
  color: string;
  borderColor: string;
  glowColor: string;
  minMult: number;
  maxMult: number;
  dropRate: number;
}

export interface Move {
  id: string;
  name: string;
  description: string;
  type: MoveType;
  power: number; 
  cost: number; 
  accuracy: number; 
  cooldown: number;
  effect?: 'stun' | 'poison' | 'dodge' | 'buff_atk' | 'lifesteal' | 'sure_hit';
  requiresHeight?: boolean;
  skillCheck?: SkillCheckType;
  rarity?: Rarity;
}

export interface Bird {
  id: string;
  name: string;
  species: string;
  description: string;
  imageUrl: string;
  baseHp: number;
  baseEnergy: number;
  baseSpeed: number;
  baseAttack: number;
  baseDefense: number;
  passive: {
    name: string;
    description: string;
  };
  moves: Move[];
  huntingConfig: {
    baseRate: number; // Feathers per second
    description: string;
  };
}

export type StatRange = [number, number]; // [min, max]

export interface BirdStatsConfig {
  hp: StatRange;
  energy: StatRange;
  attack: StatRange;
  defense: StatRange;
  speed: StatRange;
}

export interface BirdTemplate {
  id: string;
  name: string;
  species: string;
  description: string;
  imageUrl: string;
  passive: {
    name: string;
    description: string;
  };
  moves: Move[];
  baseStats: BirdStatsConfig; // Base stats for Common rarity
  huntingConfig: {
    baseRate: number;
    description: string;
  };
}

// Instance of a bird owned by player (Progression)
export interface BirdInstance extends Bird {
  instanceId: string;
  rarity: Rarity;
  level: number;
  xp: number;
  xpToNextLevel: number;
  kills: number;
  prestigeLevel: number;
  gear: {
    beak: Gear | null;
    claws: Gear | null;
  };
}

export interface BattleBird extends BirdInstance {
  currentHp: number;
  currentEnergy: number;
  isDefending: boolean;
  statusEffects: string[]; // 'bleed', 'stun', etc.
  altitude: Altitude;
  // Stats scaled by level AND rarity AND gear
  maxHp: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattleLog {
  timestamp: number;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'effect' | 'weather';
}

export interface UpgradeState {
    scrapChanceLevel: number;
    craftRarityLevel: number;
    catchRarityLevel: number;
    rosterCapacityLevel: number;
    gemRarityLevel: number; // New: Gemforge level
    // Legacy fields kept for compatibility or repurposing
    clickPower: number; 
    passiveIncome: number; 
    dropRate: number; 
}

export interface PlayerState {
  feathers: number; 
  scrap: number; // Crafting currency
  diamonds: number; // Premium/Rare currency
  totalBattles: number;
  highestZone: number;
  birds: BirdInstance[];
  selectedBirdId: string;
  huntingBirdIds: string[];
  inventory: {
    gear: Gear[];
    gems: Gem[];
    potions: number;
    revives: number;
  };
  upgrades: UpgradeState;
}

export interface BattleResult {
  winner: 'player' | 'opponent';
  rewards: {
    feathers: number;
    xp: number;
    scrap: number;
    diamonds: number;
    gem?: Gem;
  };
}

export interface HubProps {
  playerState: PlayerState;
  onBattle: () => void;
  onUpgrade: (type: keyof UpgradeState) => void;
  onSelectBird: (instanceId: string) => void;
  onTryCraft: (type: GearType) => Gear | null;
  onTryCraftGem: () => Gem | null; // New
  onKeepGear: (gear: Gear) => void;
  onSalvageGear: (gear: Gear) => void;
  onKeepGem: (gem: Gem) => void; // New
  onSalvageGem: (gem: Gem) => void; // New
  onEquip: (birdId: string, gearId: string) => void;
  onUnequip: (birdId: string, slot: 'beak' | 'claws') => void;
  onAssignHunter: (birdId: string) => void;
  onRecallHunter: (birdId: string) => void;
  initialTab?: HubTab;
  onKeepBird: (bird: BirdInstance) => void;
  onReleaseBird: (bird: BirdInstance) => void;
  onSocketGem: (gearId: string, gemId: string, socketIndex: number) => void;
  onUnsocketGem: (gearId: string, socketIndex: number) => void;
}
