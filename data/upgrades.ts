
import { PlayerState } from '../types';

export const UPGRADE_COSTS = {
  CLICK_POWER: 50,
  PASSIVE_INCOME: 100,
  RECRUIT: 500,
  HEAL: 10,
  CRAFT_GEAR: 250, 
  CRAFT_SCRAP: 25,
  CRAFT_GEM: 500,
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
        maxLevel: 1000,
        effectPerLevel: '+1% Chance'
    },
    {
        id: 'catchRarityLevel',
        name: 'Signal Booster',
        description: 'Increases chance of finding higher rarity birds when scanning.',
        baseCost: { feathers: 500, scrap: 50, diamonds: 0 },
        costMultiplier: 1.4,
        maxLevel: 1000,
        effectPerLevel: '+Luck'
    },
    {
        id: 'craftRarityLevel',
        name: 'Forge Level',
        description: 'Boosts crafted gear stats. Every 5 levels unlocks the next Rarity Tier.',
        baseCost: { feathers: 300, scrap: 100, diamonds: 0 },
        costMultiplier: 1.6,
        maxLevel: 9999,
        effectPerLevel: '+Stats / Rarity Cap'
    },
    {
        id: 'gemRarityLevel',
        name: 'Gemforge Mastery',
        description: 'Boosts crafted gem strength. Every 5 levels unlocks the next Rarity Tier.',
        baseCost: { feathers: 800, scrap: 200, diamonds: 0 },
        costMultiplier: 1.7,
        maxLevel: 9999,
        effectPerLevel: '+Stats / Rarity Cap'
    },
    {
        id: 'rosterCapacityLevel',
        name: 'Habitat Expansion',
        description: 'Increases the maximum number of birds you can keep in your roster.',
        baseCost: { feathers: 0, scrap: 0, diamonds: 1 },
        costMultiplier: 2.5,
        maxLevel: 1000,
        effectPerLevel: '+1 Slot'
    }
];
