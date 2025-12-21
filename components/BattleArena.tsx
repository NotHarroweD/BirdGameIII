
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BattleBird, Move, BirdInstance, Rarity, MoveType, SkillCheckType, Altitude, ActiveBuff, APShopState, EnemyPrefix, StatType, ZoneClearReward } from '../types';
import { BattleStage } from './battle/BattleStage';
import { BattleControls } from './battle/BattleControls';
import { BattleHeader } from './battle/BattleHeader';
import { MinigameOverlay } from './battle/MinigameOverlay';
import { BattleResultOverlay } from './BattleResultOverlay';
import { ThreatDetailsModal } from './battle/ThreatDetailsModal';
import { applyPassivesAndRegen, getAIBestMove } from './battle/engine';
import { createOpponent } from './battle/opponentGenerator';
import { calculateCombatResult } from './battle/combatLogic';
import { calculateRewards } from './battle/rewardLogic';
import { FloatingText, Particle, ActiveSkillCheck } from './battle/types';
import { useAnimation } from 'framer-motion';
import { getScaledStats } from './battle/utils';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  highestZone: number;
  onReportResults: (result: any) => void;
  onBattleExit: (playAgain: boolean) => void;
  onZoneCleared: (reward: ZoneClearReward) => void;
  onApplyLevelUpReward: (birdId: string, stat: StatType, value: number) => void;
  activeBuffs: ActiveBuff[];
  apShop: APShopState;
  currentZoneProgress: Rarity[];
  requiredRarities: Rarity[];
  gemUnlocked: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  playerBirdInstance,
  enemyLevel,
  highestZone,
  onReportResults,
  onBattleExit,
  onZoneCleared,
  onApplyLevelUpReward,
  activeBuffs,
  apShop,
  currentZoneProgress,
  requiredRarities,
  gemUnlocked
}) => {
  // Capture initial state for result screen comparisons
  const [initialBirdSnapshot] = useState<BirdInstance>(playerBirdInstance);

  // Init Player Battle Bird
  const [playerBird, setPlayerBird] = useState<BattleBird>(() => {
      const stats = getScaledStats(playerBirdInstance, playerBirdInstance.level);
      return {
          ...stats,
          maxHp: stats.maxHp,
          currentHp: stats.maxHp,
          maxEnergy: stats.maxEnergy,
          currentEnergy: stats.maxEnergy,
          attack: stats.attack,
          defense: stats.defense,
          speed: stats.speed,
          isDefending: false,
          statusEffects: [],
          altitude: Altitude.LOW
      };
  });

  const [opponentBird, setOpponentBird] = useState<BattleBird>(() => createOpponent(enemyLevel, requiredRarities, currentZoneProgress));
  
  // Refs for stable access in callbacks
  const playerBirdRef = useRef(playerBird);
  const opponentBirdRef = useRef(opponentBird);
  
  // Ref to prevent state updates after game over
  const isGameOverRef = useRef(false);
  // Ref to prevent multiple turn executions
  const isOpponentActingRef = useRef(false);
  
  useEffect(() => { playerBirdRef.current = playerBird; }, [playerBird]);
  useEffect(() => { opponentBirdRef.current = opponentBird; }, [opponentBird]);

  // 'active' replaces 'player_turn' as the main state where game is running.
  const [battleState, setBattleState] = useState<'intro' | 'active' | 'skill_check' | 'victory' | 'defeat'>('active');
  const [activeSkillCheck, setActiveSkillCheck] = useState<ActiveSkillCheck | null>(null);
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});
  const lastUsedMapRef = useRef(lastUsedMap);

  useEffect(() => { lastUsedMapRef.current = lastUsedMap; }, [lastUsedMap]);
  
  // Visuals
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const playerAnim = useAnimation();
  const opponentAnim = useAnimation();
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Result
  const [rewards, setRewards] = useState<any>(null);

  // Game Loop for Regen/Passive
  useEffect(() => {
      // Run interval regardless of battleState, check game over inside
      const interval = setInterval(() => {
          if (isGameOverRef.current) return;
          
          setPlayerBird(prev => {
              if (!prev) return prev;
              const { player } = applyPassivesAndRegen(prev, null, 0.1); 
              return player!;
          });
          setOpponentBird(prev => {
              if (!prev) return prev;
              const { opponent } = applyPassivesAndRegen(null, prev, 0.1); 
              return opponent!;
          });
      }, 200);
      return () => clearInterval(interval);
  }, []);

  const spawnFloatingText = useCallback((text: string, target: 'player' | 'opponent', x: number, y: number, color: string, scale: number = 1, icon?: 'shield', customType?: 'rot-eater') => {
      const id = Math.random().toString();
      setFloatingTexts(prev => [...prev, { id, text, x, y, color, scale, target, icon, customType }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 2000);
  }, []);

  const handleVictory = useCallback((opponent: BattleBird) => {
      if (isGameOverRef.current) return;
      isGameOverRef.current = true;
      
      setBattleState('victory');
      const results = calculateRewards(opponent, playerBirdInstance, enemyLevel, activeBuffs, apShop, gemUnlocked);
      setRewards(results);
      onReportResults({ 
          winner: 'player', 
          rewards: results,
          opponentRarity: opponent.rarity 
      });
  }, [playerBirdInstance, enemyLevel, activeBuffs, apShop, gemUnlocked, onReportResults]);

  const handleDefeat = useCallback((opponent: BattleBird) => {
      if (isGameOverRef.current) return;
      isGameOverRef.current = true;
      
      setBattleState('defeat');
      // Ensure rewards state is set to allow overlay to render
      setRewards({ xp: 0, feathers: 0, scrap: 0, diamonds: 0 });
      
      onReportResults({ 
          winner: 'opponent', 
          rewards: { xp: 0, feathers: 0, scrap: 0, diamonds: 0 }, 
          opponentRarity: opponent.rarity 
      });
  }, [onReportResults]);

  const processOpponentTurn = useCallback(async () => {
      // Don't act if game over or already acting
      if (isGameOverRef.current || isOpponentActingRef.current) return;
      
      // AI Logic Check - can we move?
      const freshOpponent = opponentBirdRef.current;
      if (freshOpponent.currentHp <= 0) return; // Dead birds don't peck

      const now = Date.now();
      // Check if any move is valid BEFORE setting acting ref to avoid locking the loop
      // Use Ref for lastUsedMap to avoid stale closure and dependency churn
      const possibleMove = getAIBestMove(freshOpponent, now, lastUsedMapRef.current);
      
      if (!possibleMove) {
          // Fallback Logic:
          // 1. Check if we have moves ready (cooldown ok) but lack energy.
          // 2. OR if energy is just generally low (< 20).
          // If so, trigger recharge to prevent stalling.
          const movesOffCooldown = freshOpponent.moves.filter(m => now >= (lastUsedMapRef.current[`ai_${m.id}`] || 0));
          const canAffordAny = movesOffCooldown.some(m => freshOpponent.currentEnergy >= m.cost);
          
          if ((movesOffCooldown.length > 0 && !canAffordAny) || freshOpponent.currentEnergy < 20) {
               isOpponentActingRef.current = true;
               setOpponentBird(prev => ({ ...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + 40) })); 
               spawnFloatingText("RECHARGE", 'opponent', 0, -40, "text-yellow-400", 1.0);
               // Shortened delay
               await new Promise(r => setTimeout(r, 600));
               isOpponentActingRef.current = false;
          }
          return;
      }

      // We have a move, commit to acting
      isOpponentActingRef.current = true;
      setAiThinking(true); 

      try {
          const selectedMove = possibleMove;
          
          // Show move name for visibility
          spawnFloatingText(selectedMove.name.toUpperCase(), 'opponent', 0, -80, "text-white", 1.2);

          // Reduced delay for faster pacing
          await new Promise(r => setTimeout(r, 500));
          setAiThinking(false);

          if (isGameOverRef.current) return;

          // Re-fetch in case state changed during delay
          const currentOpponent = opponentBirdRef.current;
          const currentPlayer = playerBirdRef.current;

          // Apply Costs
          setLastUsedMap(prev => ({ ...prev, [`ai_${selectedMove.id}`]: Date.now() + selectedMove.cooldown }));
          setOpponentBird(prev => ({ ...prev, currentEnergy: Math.max(0, prev.currentEnergy - selectedMove.cost) }));

          // Animation
          if (selectedMove.type === MoveType.ATTACK || selectedMove.type === MoveType.SPECIAL || selectedMove.type === MoveType.DRAIN) {
              await opponentAnim.start({ x: -50, transition: { duration: 0.1 } });
              await opponentAnim.start({ x: 0, transition: { duration: 0.1 } });
              playerAnim.start({ x: [0, 5, -5, 5, -5, 0], transition: { duration: 0.3 } });
          }

          const outcome = calculateCombatResult(currentOpponent, currentPlayer, selectedMove, 1.0);
          let newPlayerHp = currentPlayer.currentHp;
          let newOpponentHp = currentOpponent.currentHp;

          // Vulture Passive
          if (currentOpponent.id === 'vulture') {
              const hpRegen = Math.floor(currentOpponent.maxHp * 0.05);
              const nrgRegen = 10;
              newOpponentHp = Math.min(currentOpponent.maxHp, newOpponentHp + hpRegen);
              setOpponentBird(prev => ({ 
                  ...prev, 
                  currentHp: newOpponentHp,
                  currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + nrgRegen) 
              }));
              // Position Rot popup to the far right/left (x: 160)
              spawnFloatingText(`${hpRegen}:${nrgRegen}`, 'opponent', 160, -20, "text-white", 1.0, undefined, 'rot-eater');
          }

          if (outcome.isHit) {
              if (selectedMove.type === MoveType.HEAL) {
                   const heal = Math.floor(selectedMove.power * (currentOpponent.attack / 50));
                   newOpponentHp = Math.min(currentOpponent.maxHp, newOpponentHp + heal);
                   setOpponentBird(prev => ({ ...prev, currentHp: newOpponentHp }));
                   spawnFloatingText(`+${heal} HP`, 'opponent', 0, -40, "text-emerald-400", 1.5);
              } else if (selectedMove.type === MoveType.DEFENSE) {
                   const effectType = selectedMove.effect === 'dodge' ? 'dodge' : 'shield';
                   const roll = Math.random();
                   let quality = "WEAK ";
                   let color = "text-slate-400";
                   if (roll > 0.9) { quality = "PERFECT "; color = "text-yellow-400"; } 
                   else if (roll > 0.4) { quality = "GOOD "; color = "text-blue-300"; }

                   setOpponentBird(prev => ({ ...prev, statusEffects: [...prev.statusEffects, { type: effectType, startTime: Date.now(), duration: 5000 }] }));
                   spawnFloatingText(`${quality}${effectType.toUpperCase()}`, 'opponent', 0, -40, color, 1.0, effectType === 'shield' ? 'shield' : undefined);
                   
                   setTimeout(() => {
                       if (!isGameOverRef.current) {
                            setOpponentBird(prev => ({ ...prev, statusEffects: prev.statusEffects.filter(e => e.type !== effectType) }));
                       }
                   }, 5000);
              } else {
                   const damage = outcome.damage;
                   
                   // Show Crit for Enemy
                   if (outcome.isCrit) {
                       spawnFloatingText("CRIT!", 'player', 0, -95, "text-rose-500", 2.0);
                   }

                   newPlayerHp = Math.max(0, currentPlayer.currentHp - damage);
                   setPlayerBird(prev => ({ ...prev, currentHp: newPlayerHp }));
                   
                   // Shift damage text slightly left (-30) to make room for block text if present
                   // Added "-" sign
                   spawnFloatingText(`-${damage}`, 'player', -30, -40, "text-rose-500", outcome.isCrit ? 2.0 : 1.5);
                   
                   if (outcome.blockedDamage && outcome.blockedDamage > 0) {
                       // Show blocked amount to the right (x: 50)
                       spawnFloatingText(`${outcome.blockedDamage}`, 'player', 50, -40, "text-blue-300", 1.0, 'shield');
                   }

                   // Apply Bleed to Player
                   if (outcome.appliedBleed) {
                        setPlayerBird(prev => {
                            if (prev.statusEffects.some(e => e.type === 'bleed')) return prev;
                            return { ...prev, statusEffects: [...prev.statusEffects, { type: 'bleed', startTime: Date.now(), duration: 10000 }] };
                        });
                        spawnFloatingText("BLEED", 'player', 20, -60, "text-rose-700", 1.0);
                   }

                   // Opponent Drain / Lifesteal Effect
                   if (selectedMove.type === MoveType.DRAIN || selectedMove.effect === 'lifesteal') {
                      const heal = Math.floor(damage * 0.5);
                      newOpponentHp = Math.min(currentOpponent.maxHp, newOpponentHp + heal);
                      setOpponentBird(prev => ({ ...prev, currentHp: newOpponentHp }));
                      spawnFloatingText(`+${heal}`, 'opponent', 0, -40, "text-emerald-400", 1.2);
                   }
              }
          } else {
              spawnFloatingText("MISS", 'player', 0, -40, "text-slate-400", 1.2);
          }

          if (newPlayerHp <= 0) {
              // Reduced delay to game over
              setTimeout(() => handleDefeat(currentOpponent), 800);
          }
      } catch (error) {
          console.error("AI Turn Error:", error);
      } finally {
          isOpponentActingRef.current = false;
      }
  }, [handleVictory, handleDefeat, spawnFloatingText, playerAnim, opponentAnim]);

  // AI Game Loop - Check for actions every 500ms
  // Empty dependency array ensures it doesn't reset on player interaction or battleState flicker
  useEffect(() => {
      const aiInterval = setInterval(() => {
          if (isGameOverRef.current) return;
          processOpponentTurn();
      }, 500);
      return () => clearInterval(aiInterval);
  }, [processOpponentTurn]);

  const executePlayerMove = useCallback(async (move: Move, multiplier: number) => {
      if (isGameOverRef.current) return;

      // Unblock UI immediately
      setBattleState('active');
      setLastUsedMap(prev => ({ ...prev, [move.id]: Date.now() + move.cooldown }));
      
      const currentPB = playerBirdRef.current;
      const currentOB = opponentBirdRef.current;

      // Pay Cost
      setPlayerBird(prev => ({ ...prev, currentEnergy: Math.max(0, prev.currentEnergy - move.cost) }));

      // Animation - Fire and forget (don't block logic)
      if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
          playerAnim.start({ x: 50, transition: { duration: 0.1 } }).then(() => {
              playerAnim.start({ x: 0, transition: { duration: 0.1 } });
          });
          opponentAnim.start({ x: [0, 5, -5, 5, -5, 0], transition: { duration: 0.3 } });
      }

      // Calculate Logic Immediately
      const outcome = calculateCombatResult(currentPB, currentOB, move, multiplier);
      let newOpponentHp = currentOB.currentHp;
      let newPlayerHp = currentPB.currentHp;

      // Vulture Passive
      if (currentPB.id === 'vulture') {
          const hpRegen = Math.floor(currentPB.maxHp * 0.05);
          const nrgRegen = 10;
          newPlayerHp = Math.min(currentPB.maxHp, newPlayerHp + hpRegen);
          setPlayerBird(prev => ({ 
              ...prev, 
              currentHp: newPlayerHp,
              currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + nrgRegen) 
          }));
          spawnFloatingText(`${hpRegen}:${nrgRegen}`, 'player', 160, -20, "text-white", 1.0, undefined, 'rot-eater');
      }
      
      if (outcome.isHit) {
          if (move.type === MoveType.HEAL) {
              const heal = Math.floor(move.power * multiplier * (currentPB.attack / 50));
              newPlayerHp = Math.min(currentPB.maxHp, newPlayerHp + heal);
              setPlayerBird(prev => ({ ...prev, currentHp: newPlayerHp }));
              spawnFloatingText(`+${heal} HP`, 'player', 0, -40, "text-emerald-400", 1.5);
          } else if (move.type === MoveType.DEFENSE) {
              const effectType = move.effect === 'dodge' ? 'dodge' : 'shield';
              let quality = "WEAK ";
              let color = "text-slate-400";
              if (multiplier >= 1.5) { quality = "PERFECT "; color = "text-yellow-400"; } 
              else if (multiplier >= 1.2) { quality = "GOOD "; color = "text-blue-300"; }

              setPlayerBird(prev => {
                  return { ...prev, statusEffects: [...prev.statusEffects, { type: effectType, startTime: Date.now(), duration: 5000 }] };
              });
              
              spawnFloatingText(`${quality}${effectType.toUpperCase()}`, 'player', 0, -40, color, 1.2, effectType === 'shield' ? 'shield' : undefined);
              setTimeout(() => {
                  if (!isGameOverRef.current) {
                        setPlayerBird(prev => ({ ...prev, statusEffects: prev.statusEffects.filter(e => e.type !== effectType) }));
                  }
              }, 5000);
          } else {
              // Damage
              let damage = outcome.damage;
              
              if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) {
                  let qText = "WEAK";
                  let qColor = "text-slate-400";
                  if (multiplier >= 1.5) { qText = "PERFECT!"; qColor = "text-yellow-400"; } 
                  else if (multiplier >= 1.2) { qText = "GOOD!"; qColor = "text-blue-300"; }
                  spawnFloatingText(qText, 'opponent', 100, -20, qColor, 0.9);
              }

              if (outcome.isCrit) {
                  spawnFloatingText("CRIT!", 'opponent', 0, -95, "text-yellow-400", 2.0);
              }
              
              newOpponentHp = Math.max(0, currentOB.currentHp - damage);
              setOpponentBird(prev => ({ ...prev, currentHp: newOpponentHp }));
              
              // Added "-" sign
              spawnFloatingText(`-${damage}`, 'opponent', -30, -40, "text-rose-500", outcome.isCrit ? 2.5 : 1.5);

              if (outcome.blockedDamage && outcome.blockedDamage > 0) {
                  spawnFloatingText(`${outcome.blockedDamage}`, 'opponent', 50, -40, "text-blue-300", 1.0, 'shield');
              }

              if (outcome.appliedBleed) {
                  setOpponentBird(prev => {
                      if (prev.statusEffects.some(e => e.type === 'bleed')) return prev;
                      return { ...prev, statusEffects: [...prev.statusEffects, { type: 'bleed', startTime: Date.now(), duration: 10000 }] };
                  });
                  spawnFloatingText("BLEED", 'opponent', 20, -60, "text-rose-700", 1.0);
              }

              if (move.type === MoveType.DRAIN || move.effect === 'lifesteal') {
                  const heal = Math.floor(damage * 0.5);
                  newPlayerHp = Math.min(currentPB.maxHp, currentPB.currentHp + heal);
                  setPlayerBird(prev => ({ ...prev, currentHp: newPlayerHp }));
                  spawnFloatingText(`+${heal}`, 'player', 0, -40, "text-emerald-400", 1.2);
              }
          }
      } else {
          spawnFloatingText("MISS", 'opponent', 0, -40, "text-slate-400", 1.2);
      }

      // Check Victory Condition Immediately
      if (newOpponentHp <= 0) {
          // Reduced delay to game over
          setTimeout(() => handleVictory(currentOB), 600);
      }
  }, [handleVictory, spawnFloatingText, playerAnim, opponentAnim]);

  const handleSkillCheckComplete = useCallback((multiplier: number, secondaryMult: number = 0) => {
      if (isGameOverRef.current) {
          setActiveSkillCheck(null);
          return;
      }
      
      setActiveSkillCheck(prev => {
          if (!prev) return null;
          const move = prev.move;
          
          // Use setTimeout to allow state update to clear the overlay first
          setTimeout(() => {
              if (!isGameOverRef.current) {
                  executePlayerMove(move, multiplier);
              }
          }, 0);
          
          return null;
      });
  }, [executePlayerMove]);

  const handlePlayerMove = useCallback((move: Move) => {
      if (isGameOverRef.current || battleState === 'victory' || battleState === 'defeat') return;
      
      if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) {
          setBattleState('skill_check');
          setActiveSkillCheck({
              type: move.skillCheck,
              move,
              startTime: Date.now(),
              progress: 0
          });
      } else {
          executePlayerMove(move, 1.0);
      }
  }, [battleState, executePlayerMove]);

  const isControlsDisabled = battleState !== 'active';

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
        {/* Header Info */}
        <BattleHeader 
            enemyLevel={enemyLevel} 
            enemyPrefix={opponentBird.enemyPrefix}
            currentZoneProgress={currentZoneProgress}
            requiredRarities={requiredRarities}
            onShowThreatDetails={() => setShowThreatDetails(true)}
            canFlee={true}
            onFlee={() => onBattleExit(false)}
        />

        {/* Main Stage */}
        <BattleStage 
            playerBird={playerBird} 
            opponentBird={opponentBird} 
            playerAnim={playerAnim} 
            opponentAnim={opponentAnim} 
            floatingTexts={floatingTexts} 
            particles={particles}
        />

        {/* Controls */}
        <BattleControls 
            playerBird={playerBird} 
            lastUsedMap={lastUsedMap} 
            onMove={handlePlayerMove} 
            disabled={isControlsDisabled}
        />

        {/* Overlays */}
        {activeSkillCheck && (
            <MinigameOverlay activeSkillCheck={activeSkillCheck} onComplete={handleSkillCheckComplete} />
        )}

        {(battleState === 'victory' || battleState === 'defeat') && rewards && (
            <BattleResultOverlay 
                winner={battleState === 'victory' ? 'player' : 'opponent'}
                rewards={rewards || { xp: 0, feathers: 0, scrap: 0, diamonds: 0 }}
                initialBird={initialBirdSnapshot}
                updatedBird={playerBirdInstance} 
                onContinue={onBattleExit}
                currentZoneProgress={currentZoneProgress}
                requiredRarities={requiredRarities}
                opponentRarity={opponentBird.rarity}
                enemyPrefix={opponentBird.enemyPrefix}
                isHighestZone={enemyLevel === highestZone}
                onApplyLevelUpReward={onApplyLevelUpReward}
            />
        )}

        <ThreatDetailsModal isVisible={showThreatDetails} prefix={opponentBird.enemyPrefix || EnemyPrefix.NONE} onClose={() => setShowThreatDetails(false)} />
    </div>
  );
};
