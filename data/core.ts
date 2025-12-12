
import { PlayerState } from '../types';

export const INITIAL_PLAYER_STATE: PlayerState = {
  feathers: 0,
  scrap: 0,
  diamonds: 0,
  totalBattles: 0,
  highestZone: 1,
  currentZoneProgress: [],
  birds: [],
  selectedBirdId: '',
  huntingBirdIds: [],
  inventory: {
    gear: [],
    gems: [],
    consumables: [],
    potions: 5,
    revives: 1
  },
  activeBuffs: [],
  upgrades: {
    clickPower: 1,
    passiveIncome: 0,
    dropRate: 1,
    scrapChanceLevel: 0,
    craftRarityLevel: 0,
    catchRarityLevel: 0,
    rosterCapacityLevel: 0,
    gemRarityLevel: 0
  },
  ap: 0,
  completedAchievementIds: [],
  lifetimeStats: {
      totalFeathers: 0,
      totalScrap: 0,
      totalCrafts: 0,
      totalCatches: 0,
      battlesWon: 0,
      highestZoneReached: 1
  },
  apShop: {
      featherBoost: 0,
      scrapBoost: 0,
      diamondBoost: 0,
      itemDropBoost: 0,
      gemDropBoost: 0
  },
  unlocks: {
      workshop: false,
      clawCrafting: false,
      gemCrafting: false,
      upgrades: false,
      achievements: false
  }
};

export const XP_TABLE = {
  BASE: 100,
  GROWTH_FACTOR: 1.5
};

export const ROSTER_BASE_CAPACITY = 2;
