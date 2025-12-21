
import { BattleBird, Move, MoveType } from '../../types';
import { calculateCombatResult } from './combatLogic';

export const applyPassivesAndRegen = (
    player: BattleBird | null,
    opponent: BattleBird | null,
    factor: number
) => {
    const results = { player, opponent };

    const processBird = (bird: BattleBird | null, isPlayer: boolean) => {
        if (!bird || bird.currentHp <= 0) return bird;
        
        // Vulture passive logic moved to on-skill-use in BattleArena.tsx
        
        const regenRate = bird.id === 'hummingbird' ? 7.5 : 5;
        let newEnergy = Math.min(bird.maxEnergy, bird.currentEnergy + (regenRate * factor));
        
        return { ...bird, currentEnergy: newEnergy };
    };

    results.player = processBird(player, true);
    results.opponent = processBird(opponent, false);
    
    return results;
};

export const getAIBestMove = (ai: BattleBird, now: number, lastUsedMap: Record<string, number>) => {
    const available = ai.moves.filter(m => 
        now >= (lastUsedMap[`ai_${m.id}`] || 0) && 
        ai.currentEnergy >= m.cost
    );
    
    if (available.length === 0) return null;

    // Aggressive AI Logic
    
    // 1. Try to use Special or Drain moves if available and off cooldown
    const heavyHitters = available.filter(m => m.type === MoveType.SPECIAL || m.type === MoveType.DRAIN);
    if (heavyHitters.length > 0) {
        return heavyHitters[Math.floor(Math.random() * heavyHitters.length)];
    }

    // 2. Try to use standard Attacks
    const attacks = available.filter(m => m.type === MoveType.ATTACK);
    if (attacks.length > 0) {
        // Pick highest power attack
        return attacks.reduce((prev, curr) => prev.power > curr.power ? prev : curr);
    }

    // 3. Fallback to Heal/Defense if low on health/options
    const defensive = available.filter(m => m.type === MoveType.HEAL || m.type === MoveType.DEFENSE);
    if (defensive.length > 0 && ai.currentHp < ai.maxHp * 0.6) {
        return defensive[Math.floor(Math.random() * defensive.length)];
    }

    // 4. Use ANY available move to ensure action is taken
    return available[Math.floor(Math.random() * available.length)];
};
