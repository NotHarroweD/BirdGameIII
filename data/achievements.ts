
import { Achievement, APShopItem } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'feathers_1000', name: 'Plucking Good', description: 'Collect 1,000 total Feathers', targetValue: 1000, statKey: 'totalFeathers', apReward: 5 },
    { id: 'feathers_10000', name: 'Feathered Fortune', description: 'Collect 10,000 total Feathers', targetValue: 10000, statKey: 'totalFeathers', apReward: 10 },
    { id: 'feathers_50000', name: 'Avian Tycoon', description: 'Collect 50,000 total Feathers', targetValue: 50000, statKey: 'totalFeathers', apReward: 25 },
    
    { id: 'scrap_100', name: 'Scavenger', description: 'Collect 100 total Scrap', targetValue: 100, statKey: 'totalScrap', apReward: 5 },
    { id: 'scrap_1000', name: 'Junkyard King', description: 'Collect 1,000 total Scrap', targetValue: 1000, statKey: 'totalScrap', apReward: 15 },
    
    { id: 'battles_10', name: 'First Blood', description: 'Win 10 Battles', targetValue: 10, statKey: 'battlesWon', apReward: 5 },
    { id: 'battles_50', name: 'Veteran', description: 'Win 50 Battles', targetValue: 50, statKey: 'battlesWon', apReward: 15 },
    { id: 'battles_200', name: 'Warlord', description: 'Win 200 Battles', targetValue: 200, statKey: 'battlesWon', apReward: 30 },
    
    { id: 'craft_5', name: 'Tinkerer', description: 'Craft 5 Items', targetValue: 5, statKey: 'totalCrafts', apReward: 5 },
    { id: 'craft_25', name: 'Blacksmith', description: 'Craft 25 Items', targetValue: 25, statKey: 'totalCrafts', apReward: 15 },
    
    { id: 'catch_3', name: 'Bird Watcher', description: 'Catch 3 Birds', targetValue: 3, statKey: 'totalCatches', apReward: 5 },
    
    { id: 'zone_5', name: 'Explorer', description: 'Reach Zone 5', targetValue: 5, statKey: 'highestZoneReached', apReward: 10 },
    { id: 'zone_10', name: 'Pioneer', description: 'Reach Zone 10', targetValue: 10, statKey: 'highestZoneReached', apReward: 20 },
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
