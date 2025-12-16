
export enum GameScreen {
  MENU = 'MENU',
  SELECTION = 'SELECTION',
  HUB = 'HUB',
  BATTLE = 'BATTLE',
  CATCH = 'CATCH'
}

export enum HubTab {
  ROSTER = 'ROSTER',
  LAB = 'LAB',
  MAP = 'MAP',
  INVENTORY = 'INVENTORY',
  UPGRADES = 'UPGRADES',
  ACHIEVEMENTS = 'ACHIEVEMENTS'
}

export enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC'
}

export enum MoveType {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  HEAL = 'HEAL',
  SPECIAL = 'SPECIAL',
  DRAIN = 'DRAIN'
}

export enum SkillCheckType {
  NONE = 'NONE',
  TIMING = 'TIMING',
  MASH = 'MASH',
  COMBO = 'COMBO',
  DRAIN_GAME = 'DRAIN_GAME',
  REFLEX = 'REFLEX'
}

export enum GearType {
  BEAK = 'BEAK',
  CLAWS = 'CLAWS'
}

export enum Altitude {
  GROUND = 0,
  LOW = 1,
  HIGH = 2
}

export enum Weather {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  WINDY = 'WINDY',
  STORM = 'STORM'
}

export enum ConsumableType {
  HUNTING_SPEED = 'HUNTING_SPEED',
  BATTLE_REWARD = 'BATTLE_REWARD'
}

export enum GearPrefix {
  QUALITY = 'QUALITY',
  SHARP = 'SHARP',
  GREAT = 'GREAT'
}

export enum EnemyPrefix {
  NONE = 'NONE',
  MERCHANT = 'MERCHANT',
  HOARDER = 'HOARDER',
  SCRAPOHOLIC = 'SCRAPOHOLIC',
  GENIUS = 'GENIUS',
  GEMFINDER = 'GEMFINDER'
}

export type StatType = 'HP' | 'ATK' | 'DEF' | 'SPD' | 'NRG';
export type UtilityBuffType = 'XP_BONUS' | 'SCRAP_BONUS' | 'HUNT_BONUS' | 'FEATHER_BONUS' | 'DIAMOND_BATTLE_CHANCE' | 'DIAMOND_HUNT_CHANCE' | 'GEM_FIND_CHANCE' | 'ITEM_FIND_CHANCE';

export interface StatBonus {
  stat: StatType;
  value: number;
  rarity: Rarity;
}

export interface GearBuff {
  stat: UtilityBuffType;
  value: number;
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
  prefix?: GearPrefix;
  paramValue?: number;
  statBonuses: StatBonus[];
  sockets: (Gem | null)[];
}

export interface Consumable {
  type: ConsumableType;
  rarity: Rarity;
  count: number;
}

export interface Passive {
  name: string;
  description: string;
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
  skillCheck?: SkillCheckType;
  requiresHeight?: boolean;
  effect?: string;
}

export interface HuntingConfig {
  baseRate: number;
  description: string;
}

export interface Bird {
  id: string;
  name: string;
  species: string;
  description: string;
  imageUrl: string;
  baseHp: number;
  baseEnergy: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseStats: {
      hp: [number, number];
      energy: [number, number];
      attack: [number, number];
      defense: [number, number];
      speed: [number, number];
  };
  passive: Passive;
  moves: Move[];
  huntingConfig: HuntingConfig;
}

export interface BirdTemplate extends Bird {}

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
  maxHp: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  speed: number;
  isDefending: boolean;
  statusEffects: string[];
  altitude: Altitude;
  enemyPrefix?: EnemyPrefix;
}

export interface UpgradeState {
  clickPower: number;
  passiveIncome: number;
  dropRate: number;
  scrapChanceLevel: number;
  craftRarityLevel: number;
  catchRarityLevel: number;
  rosterCapacityLevel: number;
  gemRarityLevel: number;
}

export interface UnlocksState {
  workshop: boolean;
  clawCrafting: boolean;
  gemCrafting: boolean;
  upgrades: boolean;
  achievements: boolean;
  beakCrafting?: boolean; 
}

export interface APShopState {
  featherBoost: number;
  scrapBoost: number;
  diamondBoost: number;
  itemDropBoost: number;
  gemDropBoost: number;
}

export interface LifetimeStats {
  totalFeathers: number;
  totalScrap: number;
  totalCrafts: number;
  totalCatches: number;
  battlesWon: number;
  highestZoneReached: number;
  maxPerfectCatchStreak: number;
  systemUnlocked: number; // 0 or 1
  [key: string]: number;
}

export interface Inventory {
  gear: Gear[];
  gems: Gem[];
  consumables: Consumable[];
  potions: number;
  revives: number;
}

export interface ActiveBuff {
  type: ConsumableType;
  rarity: Rarity;
  multiplier: number;
  remaining: number;
}

export interface PlayerState {
  feathers: number;
  scrap: number;
  diamonds: number;
  totalBattles: number;
  highestZone: number;
  currentZoneProgress: Rarity[];
  birds: BirdInstance[];
  selectedBirdId: string;
  huntingBirdIds: string[];
  inventory: Inventory;
  activeBuffs: ActiveBuff[];
  upgrades: UpgradeState;
  ap: number;
  completedAchievementIds: string[];
  lifetimeStats: LifetimeStats;
  achievementBaselines: Partial<LifetimeStats>; // Snapshot of stats when achievements were unlocked
  apShop: APShopState;
  unlocks: UnlocksState;
}

export interface BattleLog {
  timestamp: number;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'buff';
}

export interface ZoneClearReward {
  feathers: number;
  scrap: number;
}

export interface BattleResult {
  winner: 'player' | 'opponent';
  opponentRarity: Rarity;
  rewards: {
    xp: number;
    feathers: number;
    scrap: number;
    diamonds: number;
    gem?: Gem;
    consumable?: Consumable;
  };
  zoneClearReward?: ZoneClearReward;
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

export interface AchievementStage {
  targetValue: number;
  apReward: number;
  descriptionOverride?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  statKey: string;
  stages: AchievementStage[];
}

export interface APShopItem {
  id: keyof APShopState;
  name: string;
  description: string;
  baseCost: number;
  costScale: number;
  boostPerLevel: number;
}

export interface HubProps {
  playerState: PlayerState;
  onBattle: () => void;
  onUpgrade: (type: keyof UpgradeState | 'recruit') => void;
  onSelectBird: (instanceId: string) => void;
  onTryCraft: (type: GearType) => Gear | null;
  onTryCraftGem: () => Gem | null;
  onKeepGear: (gear: Gear) => void;
  onSalvageGear: (gear: Gear) => void;
  onKeepGem: (gem: Gem) => void;
  onSalvageGem: (gem: Gem) => void;
  onBatchSalvageGems: (gems: Gem[]) => void;
  onEquip: (birdId: string, gearId: string) => void;
  onUnequip: (birdId: string, slot: 'beak' | 'claws') => void;
  onAssignHunter: (birdId: string) => void;
  onRecallHunter: (birdId: string) => void;
  initialTab?: HubTab;
  onKeepBird: (bird: BirdInstance) => void;
  onReleaseBird: (bird: BirdInstance) => void;
  onSocketGem: (gearId: string, gemId: string, socketIndex: number) => void;
  onUnsocketGem: (gearId: string, socketIndex: number) => void;
  onUseConsumable: (type: ConsumableType, rarity: Rarity) => void;
  onClaimAchievement: (id: string, stageIndex: number) => void;
  onBuyAPUpgrade: (id: keyof APShopState) => void;
  onUnlockFeature: (feature: keyof UnlocksState) => void;
  currentZone: number;
  onSelectZone: (zone: number) => void;
}
