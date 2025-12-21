
import { BattleBird, Move, MoveType, Altitude, GearPrefix } from '../../types';

export interface CombatResult {
    damage: number;
    isCrit: boolean;
    isHit: boolean;
    appliedBleed: boolean;
    blockedDamage?: number;
}

export const calculateCombatResult = (
    attacker: BattleBird,
    defender: BattleBird,
    move: Move,
    multiplier: number
): CombatResult => {
    
    // 1. Accuracy Check
    let accuracy = move.accuracy;
    
    // Speed Evasion Logic
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        if (defender.speed > attacker.speed) {
            if (attacker.id !== 'hawk') { // Hawk passive: Keen Eye
                const speedDelta = defender.speed - attacker.speed;
                const evasionChance = Math.min(40, speedDelta * 0.5);
                accuracy -= evasionChance;
            }
        }
    }
    
    // Bonus accuracy from minigame multiplier
    if (multiplier >= 1.5) accuracy += 20;

    const hit = Math.random() * 100 <= accuracy;

    if (!hit) {
        return { damage: 0, isCrit: false, isHit: false, appliedBleed: false };
    }

    // 2. Damage Calculation
    if (move.type === MoveType.HEAL || move.type === MoveType.DEFENSE) {
        return { damage: 0, isCrit: false, isHit: true, appliedBleed: false };
    }

    let damage = move.power * (attacker.attack / defender.defense);
    
    // Crit
    let isCrit = false;
    if (attacker.gear?.beak) {
        const critChance = attacker.gear.beak.paramValue || 0;
        if (attacker.gear.beak.prefix === GearPrefix.GREAT && Math.random() * 100 < critChance) {
            isCrit = true;
            damage *= 1.5;
        }
    }

    // Eagle Passive (Predator)
    if (attacker.id === 'eagle' && defender.currentHp < defender.maxHp * 0.5) {
        damage *= 1.25;
    }

    // Altitude Bonus
    if (attacker.altitude > defender.altitude) damage *= 1.2;
    damage *= multiplier;

    // High Altitude Crit Bonus
    if (attacker.altitude === Altitude.HIGH && Math.random() < 0.25) {
        damage *= 1.5;
    }

    damage = Math.floor(damage);

    // Shield Block Logic
    let blockedDamage = 0;
    const hasShield = defender.statusEffects.some(e => e.type === 'shield');
    if (hasShield && damage > 0) {
        const originalDamage = damage;
        damage = Math.floor(damage * 0.5); // 50% Reduction
        blockedDamage = originalDamage - damage;
    }

    // Bleed Application
    let appliedBleed = false;
    // Check both gear slots for SHARP prefix
    const bleedBonus = (attacker.gear?.beak?.prefix === GearPrefix.SHARP ? (attacker.gear.beak.paramValue || 5) : 0) + 
                      (attacker.gear?.claws?.prefix === GearPrefix.SHARP ? (attacker.gear.claws.paramValue || 5) : 0);

    if (bleedBonus > 0) {
        // Scale chance with prefix value (usually 5-30)
        if (Math.random() * 100 < (15 + bleedBonus)) {
            appliedBleed = true;
        }
    } else if (attacker.gear?.claws) {
        // Base claws have a small fixed chance
        if (Math.random() < 0.15) {
            appliedBleed = true;
        }
    }

    return { damage, isCrit, isHit: true, appliedBleed, blockedDamage };
};
