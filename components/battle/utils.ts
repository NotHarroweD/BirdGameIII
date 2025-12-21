
import { BirdInstance, EnemyPrefix, Gear, GearPrefix, MoveType, Rarity, StatBonus, StatType, StatOption } from '../../types';
import { RARITY_CONFIG } from '../../constants';

export const calculateYield = (bird: BirdInstance, level: number) => {
    const rarityConfig = RARITY_CONFIG[bird.rarity];
    return (bird.huntingConfig.baseRate * rarityConfig.minMult) * (1 + level * 0.5);
};

export const ENEMY_TYPE_INFO: Record<EnemyPrefix, { description: string, stats: string, rewards: string }> = {
    [EnemyPrefix.NONE]: { description: 'Standard Enemy', stats: 'Base Stats', rewards: 'Standard' },
    [EnemyPrefix.MERCHANT]: { description: 'Wealthy Carrier', stats: '+50% HP, +50% ATK', rewards: '3x Feathers' },
    [EnemyPrefix.HOARDER]: { description: 'Item Collector', stats: '+100% HP, +50% DEF', rewards: 'Guaranteed Item' },
    [EnemyPrefix.SCRAPOHOLIC]: { description: 'Scrap Scavenger', stats: '+100% DEF', rewards: '3x Scrap, Guaranteed Drop' },
    [EnemyPrefix.GENIUS]: { description: 'Tactical Mind', stats: '+50% ATK, +50% SPD', rewards: '3x XP' },
    [EnemyPrefix.GEMFINDER]: { description: 'Crystal Seeker', stats: 'High Random Stat', rewards: 'Guaranteed Gem' },
};

export const PREFIX_STYLES: Record<EnemyPrefix, { color: string, animation: any }> = {
    [EnemyPrefix.NONE]: { color: 'text-white', animation: {} },
    [EnemyPrefix.MERCHANT]: { 
        color: 'text-yellow-400', 
        animation: { 
            textShadow: ["0 0 0px #facc15", "0 0 10px #facc15", "0 0 0px #facc15"],
            scale: [1, 1.05, 1],
            transition: { repeat: Infinity, duration: 2 } 
        } 
    },
    [EnemyPrefix.HOARDER]: { 
        color: 'text-orange-500', 
        animation: { 
            x: [0, -2, 2, -1, 1, 0],
            transition: { repeat: Infinity, repeatDelay: 2, duration: 0.5 } 
        } 
    },
    [EnemyPrefix.SCRAPOHOLIC]: { 
        color: 'text-zinc-400', 
        animation: { 
            opacity: [0.7, 1, 0.7],
            textShadow: ["0 0 0px #000", "2px 2px 0px #52525b", "0 0 0px #000"],
            transition: { repeat: Infinity, duration: 0.2 } 
        } 
    },
    [EnemyPrefix.GENIUS]: { 
        color: 'text-fuchsia-400', 
        animation: { 
            textShadow: ["0 0 5px #e879f9", "0 0 15px #e879f9", "0 0 5px #e879f9"],
            transition: { repeat: Infinity, duration: 1.5 } 
        } 
    },
    [EnemyPrefix.GEMFINDER]: { 
        color: 'text-cyan-400', 
        animation: { 
            filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
            transition: { repeat: Infinity, duration: 1 } 
        } 
    },
};

export const getScaledStats = (bird: BirdInstance, level: number, isEnemy: boolean = false) => {
    const growthRate = isEnemy ? 0.1 : 0.25;
    let scale = 1 + (level * growthRate);
    
    if (isEnemy) {
        const difficultyMult = 1 + ((level - 1) * 0.25); 
        scale *= difficultyMult;
    }
    
    let atkBonus = 0;
    let hpBonus = 0;
    let energyBonus = 0;
    let defBonus = 0;
    let spdBonus = 0;

    const applyGear = (gear: Gear | null) => {
        if (!gear) return;
        atkBonus += gear.attackBonus || 0;
        
        if (gear.prefix === GearPrefix.QUALITY && gear.paramValue) {
            atkBonus += gear.paramValue;
        }
        
        if (gear.statBonuses) {
            gear.statBonuses.forEach(b => {
                if (b.stat === 'HP') hpBonus += b.value;
                if (b.stat === 'NRG') energyBonus += b.value;
                if (b.stat === 'ATK') atkBonus += b.value;
                if (b.stat === 'DEF') defBonus += b.value;
                if (b.stat === 'SPD') spdBonus += b.value;
            });
        }
    };

    applyGear(bird.gear?.beak);
    applyGear(bird.gear?.claws);

    return {
        ...bird,
        maxHp: Math.floor(bird.baseHp * scale) + hpBonus,
        maxEnergy: Math.floor(bird.baseEnergy * scale) + energyBonus,
        attack: Math.floor(bird.baseAttack * scale) + atkBonus,
        defense: Math.floor(bird.baseDefense * scale) + defBonus,
        speed: Math.floor(bird.baseSpeed * scale) + spdBonus,
    };
};

export const getReflexColor = (type: MoveType, value: number) => {
    const t = value / 100;
    const start = type === MoveType.HEAL ? [16, 185, 129] : [6, 182, 212];
    const end = [225, 29, 72]; 
    const r = Math.round(end[0] + (start[0] - end[0]) * t);
    const g = Math.round(end[1] + (start[1] - end[1]) * t);
    const b = Math.round(end[2] + (start[2] - end[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

export const generateStatOptions = (): StatOption[] => {
    const stats: StatType[] = ['HP', 'ATK', 'DEF', 'SPD', 'NRG'];
    const options: StatOption[] = [];
    
    for(let i = 0; i < 3; i++) {
        const stat = stats[Math.floor(Math.random() * stats.length)];
        const roll = Math.random();
        let upgradeRarity = Rarity.COMMON;
        
        if (roll < 0.001) upgradeRarity = Rarity.MYTHIC;
        else if (roll < 0.005) upgradeRarity = Rarity.LEGENDARY;
        else if (roll < 0.025) upgradeRarity = Rarity.EPIC;
        else if (roll < 0.105) upgradeRarity = Rarity.RARE;
        else if (roll < 0.355) upgradeRarity = Rarity.UNCOMMON;
        
        let min = 1;
        let max = 1;

        if (stat === 'HP' || stat === 'NRG') {
            if (upgradeRarity === Rarity.COMMON) { min = 5; max = 8; }
            else if (upgradeRarity === Rarity.UNCOMMON) { min = 9; max = 15; }
            else if (upgradeRarity === Rarity.RARE) { min = 16; max = 25; }
            else if (upgradeRarity === Rarity.EPIC) { min = 26; max = 40; }
            else if (upgradeRarity === Rarity.LEGENDARY) { min = 41; max = 60; }
            else if (upgradeRarity === Rarity.MYTHIC) { min = 61; max = 85; }
        } else {
            if (upgradeRarity === Rarity.COMMON) { min = 1; max = 1; }
            else if (upgradeRarity === Rarity.UNCOMMON) { min = 2; max = 2; }
            else if (upgradeRarity === Rarity.RARE) { min = 3; max = 3; }
            else if (upgradeRarity === Rarity.EPIC) { min = 4; max = 5; }
            else if (upgradeRarity === Rarity.LEGENDARY) { min = 6; max = 7; }
            else if (upgradeRarity === Rarity.MYTHIC) { min = 8; max = 10; }
        }
        
        const value = Math.floor(min + Math.random() * (max - min + 1));
        const label = stat === 'HP' ? 'Max Health' : stat === 'ATK' ? 'Attack' : stat === 'DEF' ? 'Defense' : stat === 'SPD' ? 'Speed' : 'Max Energy';
        
        options.push({ stat, value, label, rarity: upgradeRarity });
    }
    return options;
};
