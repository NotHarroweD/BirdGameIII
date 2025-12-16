
import { PlayerState, Rarity } from '../types';
import { INITIAL_PLAYER_STATE, BIRD_TEMPLATES } from '../constants';

const SAVE_KEY = 'bird_game_save_v8';

export const saveGame = (state: PlayerState) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save game", e);
  }
};

export const resetGame = () => {
  localStorage.removeItem(SAVE_KEY);
};

export const loadGame = (): PlayerState => {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
      try {
          const parsed = JSON.parse(saved);
          
          // Migration Logic
          const migrateGear = (g: any) => {
              if (!g) return null;
              if (!g.statBonuses) {
                  g.statBonuses = []; 
              }
              if (!g.sockets) {
                  g.sockets = []; 
              }
              // Migration for prefixes (v8)
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
                  
                  // Refresh image URL from template to fix broken links
                  const template = BIRD_TEMPLATES.find(t => t.id === b.id);
                  if (template) {
                      b.imageUrl = template.imageUrl;
                  }
              });
          }
          // Ensure new fields exist
          if (!parsed.upgrades.gemRarityLevel) {
              parsed.upgrades.gemRarityLevel = 0;
          }
          if (!parsed.activeBuffs) {
              parsed.activeBuffs = [];
          }
          // Achievement Fields
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
          // Unlocks Field
          if (!parsed.unlocks) {
              parsed.unlocks = {
                  workshop: false,
                  clawCrafting: false,
                  gemCrafting: false,
                  upgrades: false,
                  achievements: false
              };
          } else {
              // Ensure new keys exist if migrating from partial unlocks
              if (parsed.unlocks.upgrades === undefined) parsed.unlocks.upgrades = false;
              if (parsed.unlocks.achievements === undefined) parsed.unlocks.achievements = false;
              if (parsed.unlocks.clawCrafting === undefined) parsed.unlocks.clawCrafting = false;
              // beakCrafting deprecated, ensure workshop covers it if migrated from old state
              if (parsed.unlocks.beakCrafting && !parsed.unlocks.workshop) parsed.unlocks.workshop = true;
          }
          
          // Ensure currentZoneProgress exists
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
