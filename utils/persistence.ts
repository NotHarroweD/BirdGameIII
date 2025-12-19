import { PlayerState, Rarity, BirdInstance } from '../types';
import { INITIAL_PLAYER_STATE, BIRD_TEMPLATES } from '../constants';

const BASE_SAVE_KEY = 'bird_game_save_v9';

export const getSlotKey = (slot: number) => `${BASE_SAVE_KEY}_slot_${slot}`;

export const saveGame = (state: PlayerState, slot: number = 1) => {
  try {
    localStorage.setItem(getSlotKey(slot), JSON.stringify(state));
    localStorage.setItem(`${BASE_SAVE_KEY}_last_active`, slot.toString());
  } catch (e) {
    console.error("Failed to save game", e);
  }
};

export const resetGame = (slot: number = 1) => {
  localStorage.removeItem(getSlotKey(slot));
};

export interface SlotPreview {
    birds: {
        name: string;
        species: string;
        level: number;
        rarity: Rarity;
    }[];
    feathers: number;
    highestZone: number;
}

export const getSlotPreview = (slot: number): SlotPreview | null => {
    const saved = localStorage.getItem(getSlotKey(slot));
    if (!saved) return null;
    try {
        const parsed = JSON.parse(saved);
        return {
            birds: (parsed.birds || []).map((b: BirdInstance) => ({
                name: b.name,
                species: b.species,
                level: b.level,
                rarity: b.rarity
            })),
            feathers: Math.floor(parsed.feathers || 0),
            highestZone: parsed.highestZone || 1
        };
    } catch (e) {
        return null;
    }
};

export const getLastActiveSlot = (): number => {
    const last = localStorage.getItem(`${BASE_SAVE_KEY}_last_active`);
    return last ? parseInt(last) : 1;
};

export const loadGame = (slot: number): PlayerState => {
  const saved = localStorage.getItem(getSlotKey(slot));
  if (saved) {
      try {
          const parsed = JSON.parse(saved);
          
          const migrateGear = (g: any) => {
              if (!g) return null;
              if (!g.statBonuses) {
                  g.statBonuses = []; 
              }
              if (!g.sockets) {
                  g.sockets = []; 
              }
              if (g.effectValue && !g.paramValue) {
                  g.paramValue = g.effectValue;
              }
              return g;
          };

          if (parsed.inventory) {
              if (parsed.inventory.gear) {
                  parsed.inventory.gear = parsed.inventory.gear.map(migrateGear).filter(Boolean);
              }
              if (!parsed.inventory.consumables) {
                  parsed.inventory.consumables = [];
              }
          }

          if (parsed.birds) {
              parsed.birds.forEach((b: any) => {
                  if (b.gear.beak) b.gear.beak = migrateGear(b.gear.beak);
                  if (b.gear.claws) b.gear.claws = migrateGear(b.gear.claws);
                  if (b.statPoints === undefined) b.statPoints = 0;
                  
                  const template = BIRD_TEMPLATES.find(t => t.id === b.id);
                  if (template) {
                      b.imageUrl = template.imageUrl;
                      b.moves = template.moves;
                      b.passive = template.passive;
                  }
              });
          }
          if (!parsed.upgrades.gemRarityLevel) {
              parsed.upgrades.gemRarityLevel = 0;
          }
          if (!parsed.activeBuffs) {
              parsed.activeBuffs = [];
          }
          if (!parsed.ap) parsed.ap = 0;
          if (!parsed.completedAchievementIds) parsed.completedAchievementIds = [];
          if (!parsed.lifetimeStats) {
              parsed.lifetimeStats = {
                  totalFeathers: parsed.feathers || 0,
                  totalScrap: parsed.scrap || 0,
                  totalCrafts: 0,
                  totalCatches: parsed.birds?.length || 0,
                  battlesWon: 0, 
                  highestZoneReached: parsed.highestZone || 1,
                  maxPerfectCatchStreak: 0,
                  systemUnlocked: parsed.unlocks?.achievements ? 1 : 0
              };
          } else {
              if (parsed.lifetimeStats.maxPerfectCatchStreak === undefined) {
                  parsed.lifetimeStats.maxPerfectCatchStreak = 0;
              }
              if (parsed.lifetimeStats.systemUnlocked === undefined) {
                  parsed.lifetimeStats.systemUnlocked = parsed.unlocks?.achievements ? 1 : 0;
              }
          }
          
          if (!parsed.achievementBaselines) {
              parsed.achievementBaselines = {};
          }

          if (!parsed.apShop) {
              parsed.apShop = {
                  featherBoost: 0,
                  scrapBoost: 0,
                  diamondBoost: 0,
                  itemDropBoost: 0,
                  gemDropBoost: 0
              };
          }
          if (!parsed.unlocks) {
              parsed.unlocks = {
                  workshop: false,
                  clawCrafting: false,
                  gemCrafting: false,
                  upgrades: false,
                  achievements: false
              };
          } else {
              if (parsed.unlocks.upgrades === undefined) parsed.unlocks.upgrades = false;
              if (parsed.unlocks.achievements === undefined) parsed.unlocks.achievements = false;
              if (parsed.unlocks.clawCrafting === undefined) parsed.unlocks.clawCrafting = false;
              if (parsed.unlocks.beakCrafting && !parsed.unlocks.workshop) parsed.unlocks.workshop = true;
          }
          
          if (!parsed.currentZoneProgress) {
              parsed.currentZoneProgress = [];
          }

          return parsed;
      } catch (e) {
          console.error("Save file corrupted, resetting.", e);
          return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
      }
  }
  return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
};