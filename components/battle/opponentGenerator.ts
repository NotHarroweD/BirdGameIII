
import { BIRD_TEMPLATES, generateBird, rollRarity } from '../../constants';
import { BattleBird, EnemyPrefix, Altitude, Rarity } from '../../types';
import { getScaledStats } from './utils';

export const createOpponent = (level: number, requiredRarities: Rarity[], currentZoneProgress: Rarity[]): BattleBird => {
    const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
    
    // Rarity Logic
    let rarity = rollRarity(level * 25 + 10, 'CRAFT', 1);
    const missingRarities = requiredRarities.filter(r => !currentZoneProgress.includes(r));
    if (missingRarities.length > 0 && Math.random() < 0.20) {
        rarity = missingRarities[Math.floor(Math.random() * missingRarities.length)];
    }
    
    const instance = generateBird(template, rarity);
    instance.level = level;
    
    // Scale Stats
    const stats = getScaledStats(instance, level, true); // true for isEnemy

    // Prefix Logic
    let prefix = EnemyPrefix.NONE;
    if (Math.random() < 0.25) { 
        const types = [EnemyPrefix.MERCHANT, EnemyPrefix.HOARDER, EnemyPrefix.SCRAPOHOLIC, EnemyPrefix.GENIUS, EnemyPrefix.GEMFINDER];
        prefix = types[Math.floor(Math.random() * types.length)];
    }

    let finalMaxHp = stats.maxHp;
    let finalAttack = stats.attack;
    let finalDefense = stats.defense;
    let finalSpeed = stats.speed;

    if (prefix === EnemyPrefix.MERCHANT) {
        finalMaxHp = Math.floor(finalMaxHp * 1.5);
        finalAttack = Math.floor(finalAttack * 1.5);
    } else if (prefix === EnemyPrefix.HOARDER) {
        finalMaxHp = Math.floor(finalMaxHp * 2.0);
        finalDefense = Math.floor(finalDefense * 1.5);
    } else if (prefix === EnemyPrefix.GEMFINDER) {
        const roll = Math.random();
        if (roll < 0.25) finalMaxHp = Math.floor(finalMaxHp * 2.0);
        else if (roll < 0.5) finalAttack = Math.floor(finalAttack * 2.0);
        else if (roll < 0.75) finalDefense = Math.floor(finalDefense * 2.0);
        else finalSpeed = Math.floor(finalSpeed * 1.5);
    } else if (prefix === EnemyPrefix.SCRAPOHOLIC) {
        finalDefense = Math.floor(finalDefense * 2.0);
    } else if (prefix === EnemyPrefix.GENIUS) {
        finalAttack = Math.floor(finalAttack * 1.5);
        finalSpeed = Math.floor(finalSpeed * 1.5);
    }

    return {
        ...stats,
        maxHp: finalMaxHp,
        currentHp: finalMaxHp,
        attack: finalAttack,
        defense: finalDefense,
        speed: finalSpeed,
        maxEnergy: stats.maxEnergy,
        currentEnergy: stats.maxEnergy,
        isDefending: false,
        statusEffects: [],
        altitude: Altitude.LOW,
        enemyPrefix: prefix
    };
};
