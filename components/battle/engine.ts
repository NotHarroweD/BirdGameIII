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
        
        let newHp = bird.currentHp;
        let newEnergy = bird.currentEnergy;
        
        // Passives
        if (bird.id === 'vulture') {
            newHp = Math.min(bird.maxHp, newHp + Math.ceil(bird.maxHp * 0.03));
            newEnergy = Math.min(bird.maxEnergy, newEnergy + 10);
        }
        
        // Energy Regen
        const regenRate = bird.id === 'hummingbird' ? 7.5 : 5;
        newEnergy = Math.min(bird.maxEnergy, newEnergy + (regenRate * factor));
        
        return { ...bird, currentHp: newHp, currentEnergy: newEnergy };
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
    return available[Math.floor(Math.random() * available.length)];
};
