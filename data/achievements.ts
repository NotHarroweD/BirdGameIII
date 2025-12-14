
import { Achievement, APShopItem } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'system_unlock',
        name: 'Awakening',
        description: 'Unlock the Hall of Glory achievement system.',
        statKey: 'systemUnlocked',
        stages: [
            { targetValue: 1, apReward: 25, descriptionOverride: "Access the Hall of Glory" }
        ]
    },
    { 
        id: 'feathers', 
        name: 'Plucking Good', 
        description: 'Collect Feathers from any source.', 
        statKey: 'totalFeathers', 
        stages: [
            { targetValue: 1000, apReward: 5 },
            { targetValue: 5000, apReward: 10 },
            { targetValue: 15000, apReward: 15 },
            { targetValue: 50000, apReward: 20 },
            { targetValue: 150000, apReward: 30 },
            { targetValue: 500000, apReward: 50 },
            { targetValue: 1000000, apReward: 100 }
        ]
    },
    { 
        id: 'scrap', 
        name: 'Scavenger', 
        description: 'Collect Scrap from battles and recycling.', 
        statKey: 'totalScrap', 
        stages: [
            { targetValue: 100, apReward: 5 },
            { targetValue: 500, apReward: 10 },
            { targetValue: 2000, apReward: 15 },
            { targetValue: 5000, apReward: 25 },
            { targetValue: 15000, apReward: 40 },
            { targetValue: 50000, apReward: 60 }
        ]
    },
    { 
        id: 'battles', 
        name: 'Warlord', 
        description: 'Win battles against enemy birds.', 
        statKey: 'battlesWon', 
        stages: [
            { targetValue: 10, apReward: 5 },
            { targetValue: 50, apReward: 10 },
            { targetValue: 150, apReward: 15 },
            { targetValue: 300, apReward: 25 },
            { targetValue: 500, apReward: 40 },
            { targetValue: 1000, apReward: 60 },
            { targetValue: 2000, apReward: 100 }
        ]
    },
    { 
        id: 'craft', 
        name: 'Tinkerer', 
        description: 'Craft Gear or Gems in the Workshop.', 
        statKey: 'totalCrafts', 
        stages: [
            { targetValue: 5, apReward: 5 },
            { targetValue: 25, apReward: 10 },
            { targetValue: 50, apReward: 15 },
            { targetValue: 100, apReward: 25 },
            { targetValue: 250, apReward: 40 },
            { targetValue: 500, apReward: 60 }
        ]
    },
    { 
        id: 'catch', 
        name: 'Bird Watcher', 
        description: 'Successfully catch wild birds.', 
        statKey: 'totalCatches', 
        stages: [
            { targetValue: 3, apReward: 5 },
            { targetValue: 10, apReward: 10 },
            { targetValue: 25, apReward: 20 },
            { targetValue: 50, apReward: 30 },
            { targetValue: 100, apReward: 50 }
        ]
    },
    { 
        id: 'zone', 
        name: 'Pioneer', 
        description: 'Reach higher Danger Zones.', 
        statKey: 'highestZoneReached', 
        stages: [
            { targetValue: 2, apReward: 5 },
            { targetValue: 3, apReward: 10 },
            { targetValue: 5, apReward: 15 },
            { targetValue: 8, apReward: 20 },
            { targetValue: 10, apReward: 30 },
            { targetValue: 15, apReward: 50 },
            { targetValue: 20, apReward: 100 }
        ]
    },
    {
        id: 'perfect_streak',
        name: 'Synchronized',
        description: 'Achieve consecutive Perfect (x5) catches in scanning mini-games.',
        statKey: 'maxPerfectCatchStreak',
        stages: [
            { targetValue: 1, apReward: 5, descriptionOverride: 'Get a Perfect x5 Catch' },
            { targetValue: 2, apReward: 10, descriptionOverride: 'Get 2 Perfect Catches in a row' },
            { targetValue: 3, apReward: 20, descriptionOverride: 'Get 3 Perfect Catches in a row' },
            { targetValue: 5, apReward: 50, descriptionOverride: 'Get 5 Perfect Catches in a row' },
            { targetValue: 10, apReward: 100, descriptionOverride: 'Get 10 Perfect Catches in a row' }
        ]
    }
];

export const AP_SHOP_ITEMS: APShopItem[] = [
    { 
        id: 'featherBoost', 
        name: 'Feather Mastery', 
        description: 'Increases all Feather gains (Hunting & Battle).', 
        baseCost: 5, 
        costScale: 2, 
        boostPerLevel: 2 
    },
    { 
        id: 'scrapBoost', 
        name: 'Scrap Efficiency', 
        description: 'Increases all Scrap gains.', 
        baseCost: 5, 
        costScale: 2, 
        boostPerLevel: 2 
    },
    { 
        id: 'diamondBoost', 
        name: 'Carbon Luck', 
        description: 'Increases chance to find Diamonds.', 
        baseCost: 10, 
        costScale: 3, 
        boostPerLevel: 2 
    },
    { 
        id: 'itemDropBoost', 
        name: 'Loot Hunter', 
        description: 'Increases chance to find Consumables.', 
        baseCost: 10, 
        costScale: 3, 
        boostPerLevel: 2 
    },
    { 
        id: 'gemDropBoost', 
        name: 'Geologist', 
        description: 'Increases chance to find Gems.', 
        baseCost: 15, 
        costScale: 4, 
        boostPerLevel: 2 
    }
];
