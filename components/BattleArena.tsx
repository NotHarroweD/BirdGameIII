import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, SkillCheckType, BattleResult, Rarity, ActiveBuff, ConsumableType, Consumable, APShopState, EnemyPrefix, ZoneClearReward, StatType } from '../types';
import { RARITY_CONFIG, rollRarity } from '../constants';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { BattleResultOverlay } from './BattleResultOverlay';

import { createOpponent } from './battle/opponentGenerator';
import { calculateRewards } from './battle/rewardLogic';
import { calculateCombatResult } from './battle/combatLogic';
import { ActiveSkillCheck, FloatingText, Particle } from './battle/types';
import { getScaledStats, getReflexColor } from './battle/utils';
import { BattleControls } from './battle/BattleControls';
import { MinigameOverlay } from './battle/MinigameOverlay';
import { BattleStage } from './battle/BattleStage';
import { BattleHeader } from './battle/BattleHeader';
import { ThreatDetailsModal } from './battle/ThreatDetailsModal';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  highestZone: number;
  onReportResults: (result: BattleResult) => void;
  onBattleExit: (playAgain: boolean) => void;
  onZoneCleared?: (reward: ZoneClearReward) => void;
  onApplyLevelUpReward?: (birdId: string, stat: StatType, value: number) => void;
  activeBuffs?: ActiveBuff[]; 
  apShop?: APShopState;
  currentZoneProgress?: Rarity[];
  requiredRarities?: Rarity[];
  gemUnlocked?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ 
    playerBirdInstance, 
    enemyLevel, 
    highestZone,
    onReportResults,
    onBattleExit, 
    onZoneCleared,
    onApplyLevelUpReward,
    activeBuffs = [], 
    apShop,
    currentZoneProgress = [],
    requiredRarities = [],
    gemUnlocked = false
}) => {
  const initialPlayerBird = useRef<BirdInstance>(playerBirdInstance);
  const playerStats = getScaledStats(playerBirdInstance, playerBirdInstance.level);
  
  const [playerBird, setPlayerBird] = useState<BattleBird | null>({ 
    ...playerStats,
    currentHp: playerStats.maxHp, 
    currentEnergy: playerStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW
  });

  const [playerTurnCount, setPlayerTurnCount] = useState(0);
  const opponentRef = useRef<BirdInstance | null>(null);
  const [opponentBird, setOpponentBird] = useState<BattleBird | null>(null);

  useEffect(() => {
      const opp = createOpponent(enemyLevel, requiredRarities, currentZoneProgress);
      opponentRef.current = opp;
      setOpponentBird(opp);
      addLog(`ENCOUNTER STARTED: ${opp.name} (${RARITY_CONFIG[opp.rarity].name})`, 'info');
      startLoop();
      return () => stopLoop();
  }, []);

  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  
  const [resultData, setResultData] = useState<{
      winner: 'player' | 'opponent';
      opponentRarity: Rarity;
      rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: any; consumable?: Consumable };
      zoneClearReward?: ZoneClearReward;
  } | null>(null);
  
  const playerBirdRef = useRef(playerBird);
  const opponentBirdRef = useRef(opponentBird);
  const winnerRef = useRef<string | null>(null);
  
  useEffect(() => { playerBirdRef.current = playerBird; }, [playerBird]);
  useEffect(() => { opponentBirdRef.current = opponentBird; }, [opponentBird]);

  const [activeSkillCheck, setActiveSkillCheck] = useState<ActiveSkillCheck | null>(null);
  const skillCheckRef = useRef<ActiveSkillCheck | null>(null);

  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});
  const lastUsedMapRef = useRef<Record<string, number>>({}); 
  
  useEffect(() => { lastUsedMapRef.current = lastUsedMap; }, [lastUsedMap]);

  const [gameTime, setGameTime] = useState(0);
  const startTimeRef = useRef(Date.now());
  const lastFrameTimeRef = useRef(Date.now());
  const lastTickRef = useRef(Date.now());
  const lastBleedTickRef = useRef(Date.now());
  const animationFrameRef = useRef<number>(0);

  const controls = useAnimation(); 
  const playerAnim = useAnimation(); 
  const opponentAnim = useAnimation(); 
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
      if (winnerRef.current) return;
      if (playerBird && playerBird.currentHp <= 0) {
          handleWin('opponent');
      } else if (opponentBird && opponentBird.currentHp <= 0) {
          handleWin('player');
      }
  }, [playerBird?.currentHp, opponentBird?.currentHp]);

  const triggerShake = async (intensity = 10) => {
    await controls.start({
      x: [0, -intensity, intensity, -intensity/2, intensity/2, 0],
      transition: { duration: 0.2 }
    });
  };

  const triggerHitFlash = () => {
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 100);
  };

  const spawnFloatingText = (text: string, target: 'player' | 'opponent', x: number, y: number, color: string, scale = 1) => {
    const id = Math.random().toString(36);
    setFloatingTexts(prev => [...prev, { id, text, x, y, color, scale, target }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 3000);
  };

  const spawnParticles = (x: number, y: number, color: string, count = 8) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({ id: Math.random().toString(36), x, y, color });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };
  
  const addLog = (message: string, type: BattleLog['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  };

  const triggerCooldown = (id: string, duration: number) => {
    const now = Date.now();
    setLastUsedMap(prev => ({ ...prev, [id]: now }));
    lastUsedMapRef.current = { ...lastUsedMapRef.current, [id]: now };
  };

  const executeMove = async (attacker: BattleBird, defender: BattleBird, move: Move, isPlayer: boolean, multiplier: number, secondaryMultiplier: number = 0) => {
    if (winnerRef.current) return;
    
    const anim = isPlayer ? playerAnim : opponentAnim;
    
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        const xMove = isPlayer ? 60 : -60;
        const yMove = isPlayer ? -60 : 60;
        anim.start({ x: -xMove * 0.2, y: -yMove * 0.2, scale: 0.9, transition: { duration: 0.1 } }).then(() => {
            anim.start({ x: xMove, y: yMove, scale: 1.2, transition: { duration: 0.08, ease: "easeIn" } }).then(() => {
                anim.start({ x: 0, y: 0, scale: 1, transition: { duration: 0.3, type: "spring" } });
            });
        });
    }

    const setAttacker = isPlayer ? setPlayerBird : setOpponentBird;
    const setDefender = isPlayer ? setOpponentBird : setPlayerBird;
    const attackerTarget = isPlayer ? 'player' : 'opponent';
    const defenderTarget = isPlayer ? 'opponent' : 'player';

    const queueText = (text: string, target: 'player' | 'opponent', color: string, scale: number, delay: number, xOffset = 0) => {
        setTimeout(() => {
            if (winnerRef.current) return;
            spawnFloatingText(text, target, xOffset + (Math.random() * 20 - 10), (Math.random() * 20), color, scale);
        }, delay);
    };

    const outcome = calculateCombatResult(attacker, defender, move, multiplier);

    if (outcome.isHit) {
        if (move.type === MoveType.HEAL) {
            const healAmount = Math.floor(move.power * multiplier * (attacker.attack / 100)); 
            setAttacker((prev: BattleBird | null) => {
                const next = prev ? ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + healAmount) }) : null;
                if (isPlayer) playerBirdRef.current = next; else opponentBirdRef.current = next;
                return next;
            });
            queueText(`+${healAmount} HP`, attackerTarget, "text-emerald-400", 1.5, 0);
            addLog(`${attacker.name} heals for ${healAmount}.`, 'heal');

        } else if (move.type === MoveType.DEFENSE) {
             addLog(`${attacker.name} braces for impact!`, 'info');
             queueText("SHIELD UP", attackerTarget, "text-cyan-400", 1.2, 0);

        } else {
            let finalDamage = outcome.damage;
            
            if (move.effect === 'lifesteal' || move.type === MoveType.DRAIN) {
                 const healFactor = move.type === MoveType.DRAIN ? (secondaryMultiplier > 0 ? secondaryMultiplier : 0.25) : 0.5;
                 const healAmt = Math.floor(finalDamage * healFactor);
                 setAttacker((prev: BattleBird | null) => {
                    const next = prev ? ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + healAmt) }) : null;
                    if (isPlayer) playerBirdRef.current = next; else opponentBirdRef.current = next;
                    return next;
                 });
                 queueText(`+${healAmt} HP (DRAIN)`, attackerTarget, "text-purple-400", 1.2, 500, 40);
            }
            
            setDefender((prev: BattleBird | null) => {
                if (!prev) return null;
                const newHp = Math.max(0, prev.currentHp - finalDamage);
                const newEffects = [...prev.statusEffects];
                if (outcome.appliedBleed && !newEffects.includes('bleed')) newEffects.push('bleed');
                const next = { ...prev, currentHp: newHp, statusEffects: newEffects };
                if (isPlayer) opponentBirdRef.current = next; else playerBirdRef.current = next;
                return next;
            });

            triggerShake(finalDamage > 30 ? 20 : 8);
            triggerHitFlash();

            const victimAnim = isPlayer ? opponentAnim : playerAnim;
            victimAnim.start({ x: [0, 15, -15, 10, -10, 0], transition: { duration: 0.3 } });

            let delayOffset = 0;
            if (outcome.isCrit) {
                queueText("CRITICAL!", defenderTarget, "text-yellow-400", 1.8, delayOffset, 0);
                delayOffset += 200;
            }
            
            queueText(`-${finalDamage}`, defenderTarget, "text-rose-500", 2.5, delayOffset, 0);
            delayOffset += 200;
            
            if (outcome.appliedBleed) {
                queueText("BLEED APPLIED", defenderTarget, "text-rose-600", 1.2, delayOffset, 0);
            }
            
            spawnParticles(0, 0, "#f43f5e", 12);
            addLog(`${attacker.name} used ${move.name}! -${finalDamage}`, 'damage');
        }
    } else {
        if (defender.speed > attacker.speed && Math.random() < 0.5) {
             queueText("DODGED!", defenderTarget, "text-cyan-400", 1.5, 0);
             const dodgeAnim = isPlayer ? opponentAnim : playerAnim;
             dodgeAnim.start({ x: isPlayer ? 50 : -50, transition: { duration: 0.2 } }).then(() => {
                 dodgeAnim.start({ x: 0, transition: { duration: 0.2 } });
             });
        } else {
             queueText("MISS", defenderTarget, "text-slate-500", 1.5, 0);
        }
    }
  };

  const handleWin = (w: 'player' | 'opponent') => {
      if (winnerRef.current || !opponentBirdRef.current) return;
      
      winnerRef.current = w;
      setWinner(w);
      stopLoop();

      if (w === 'player') {
          const rewards = calculateRewards(
              opponentBirdRef.current,
              playerBirdInstance,
              enemyLevel,
              activeBuffs,
              apShop,
              gemUnlocked
          );

          onReportResults({
              winner: 'player',
              opponentRarity: opponentBirdRef.current.rarity,
              rewards
          });

          let zoneClearReward: ZoneClearReward | undefined;
          const isHighestZone = enemyLevel === highestZone;
          
          if (isHighestZone) {
              const RARITY_ORDER = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];
              const opponentRarityIdx = RARITY_ORDER.indexOf(opponentBirdRef.current.rarity);
              let satisfiedRarity: Rarity | null = null;

              if (!currentZoneProgress.includes(opponentBirdRef.current.rarity)) {
                  satisfiedRarity = opponentBirdRef.current.rarity;
              } else {
                  for (const req of requiredRarities) {
                      if (!currentZoneProgress.includes(req)) {
                          const reqIdx = RARITY_ORDER.indexOf(req);
                          if (opponentRarityIdx >= reqIdx) {
                              satisfiedRarity = req;
                              break;
                          }
                      }
                  }
              }

              if (satisfiedRarity) {
                  const newProgress = [...currentZoneProgress, satisfiedRarity];
                  const isZoneCleared = requiredRarities?.every(r => newProgress.includes(r)) ?? false;
                  
                  if (isZoneCleared) {
                      const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
                      const pool = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE];
                      const rarity = pool[Math.floor(Math.random() * pool.length)];
                      const rewardItem: Consumable = { type, rarity, count: 1 };

                      zoneClearReward = {
                          feathers: enemyLevel * 200,
                          scrap: enemyLevel * 50,
                          consumable: rewardItem
                      };
                      if (onZoneCleared) {
                          onZoneCleared(zoneClearReward);
                      }
                  }
              }
          }
          
          setTimeout(() => {
              setResultData({ 
                  winner: 'player', 
                  opponentRarity: opponentBirdRef.current!.rarity,
                  rewards,
              });
          }, 1000);
      } else {
          onReportResults({
              winner: 'opponent',
              opponentRarity: opponentBirdRef.current.rarity,
              rewards: { xp: 0, feathers: 0, scrap: 0, diamonds: 0 }
          });

          setTimeout(() => {
              setResultData({ 
                  winner: 'opponent', 
                  opponentRarity: opponentBirdRef.current!.rarity,
                  rewards: { xp: 0, feathers: 0, scrap: 0, diamonds: 0 }
              });
          }, 1000);
      }
  };

  const handleFlee = () => {
      stopLoop();
      onBattleExit(false);
  };

  const resolveMinigame = (overrideProgress?: number, finalMultiplier?: number) => {
      const check = skillCheckRef.current;
      if (!check) return;
      
      skillCheckRef.current = null;
      setActiveSkillCheck(null);
      
      const progress = overrideProgress !== undefined ? overrideProgress : check.progress;
      let multiplier = 1.0;
      let secondaryMultiplier = 0; 
      if (check.type === SkillCheckType.TIMING) {
          if (progress >= 45 && progress <= 55) multiplier = 1.5;
          else if (progress >= 30 && progress <= 70) multiplier = 1.2;
          else multiplier = 0.7;
      } else if (check.type === SkillCheckType.MASH) {
          if (progress >= 100) multiplier = 1.5; 
          else if (progress >= 70 && progress <= 90) multiplier = 1.2; 
          else if (progress > 90) multiplier = 1.1;
          else if (progress >= 40) multiplier = 1.0;
          else multiplier = 0.6;
      } else if (check.type === SkillCheckType.COMBO) {
          multiplier = finalMultiplier ?? check.accumulatedMultiplier ?? 1.0;
          secondaryMultiplier = 0; 
      } else if (check.type === SkillCheckType.DRAIN_GAME) {
          multiplier = check.storedMultiplier || 1.0; 
          if (progress >= 90 && progress <= 100) secondaryMultiplier = 1.5; 
          else if (progress >= 75 && progress < 90) secondaryMultiplier = 1.2; 
          else if (progress >= 55 && progress < 75) secondaryMultiplier = 1.0;
          else secondaryMultiplier = 0.5; 
      }
      
      let text = "GOOD";
      let color = "text-white";
      if (multiplier >= 1.5) { text = "PERFECT!"; color = "text-yellow-400"; }
      else if (multiplier < 0.8) { text = "WEAK"; color = "text-slate-500"; }
      
      if (check.type === SkillCheckType.DRAIN_GAME) {
           if (secondaryMultiplier >= 1.5) { text = "MAX DRAIN!"; color = "text-purple-400"; }
           else if (secondaryMultiplier < 1.0) { text = "POOR ABSORB"; color = "text-slate-400"; }
      }
      
      spawnFloatingText(text, 'opponent', 0, -50, color, 2);
      if (playerBirdRef.current && opponentBirdRef.current) {
          executeMove(playerBirdRef.current, opponentBirdRef.current, check.move, true, multiplier, secondaryMultiplier);
      }
  };

  const advanceComboStage = () => {
      const check = skillCheckRef.current;
      if (!check || check.isFlashing) return;
      
      const progress = check.progress;

      if (check.type === SkillCheckType.DRAIN_GAME) {
          if (check.stage !== 1) return;
          let dmgMult = 1.0;
          if (progress >= 42 && progress <= 52) dmgMult = 1.5;
          else if (progress >= 35 && progress <= 60) dmgMult = 1.2;
          else if (progress >= 25 && progress <= 75) dmgMult = 1.0;
          else dmgMult = 0.6;
          
          const newCheck = {
              ...check,
              stage: 2,
              storedMultiplier: dmgMult,
              startTime: Date.now(),
              progress: 0,
              direction: 1 as 1 | -1
          };
          skillCheckRef.current = newCheck;
          setActiveSkillCheck(newCheck);
          spawnFloatingText(dmgMult >= 1.5 ? "CRITICAL HIT!" : "CHARGED", 'opponent', 0, -80, "text-cyan-400", 1.5);
      } else if (check.type === SkillCheckType.COMBO) {
          const targetStart = check.targetZoneStart ?? 40;
          const targetWidth = check.targetZoneWidth ?? 38;
          const targetMid = targetStart + (targetWidth / 2);
          const diff = Math.abs(progress - targetMid);
          
          let hitMult = 0.2;
          const isHit = diff <= targetWidth / 2;
          
          let newComboCounter = isHit ? (check.currentCombo || 0) + 1 : 0;
          let hitFeedback = undefined;

          if (isHit) {
              if (newComboCounter === 1) hitFeedback = { text: "1x Combo", color: "text-emerald-400", id: Date.now(), intensity: 1 };
              else if (newComboCounter === 2) hitFeedback = { text: "2x Combo", color: "text-blue-400", id: Date.now(), intensity: 2 };
              else if (newComboCounter >= 3) hitFeedback = { text: "3x COMBO!!", color: "text-purple-400", id: Date.now(), intensity: 3 };

              if (diff <= targetWidth / 8) { hitMult = 0.6; }
              else { hitMult = 0.4; }
          }

          const newAccumulated = (check.accumulatedMultiplier || 0) + (isHit ? hitMult : 0);
          const newMarkers = isHit ? [...(check.hitMarkers || []), { id: Date.now(), progress }] : (check.hitMarkers || []);

          const updatedCheck = {
              ...check,
              isFlashing: true,
              hitMarkers: newMarkers,
              hitFeedback,
              currentCombo: newComboCounter,
              accumulatedMultiplier: newAccumulated
          };
          skillCheckRef.current = updatedCheck;
          setActiveSkillCheck(updatedCheck);

          setTimeout(() => {
              const currentCheck = skillCheckRef.current;
              if (!currentCheck || currentCheck.type !== SkillCheckType.COMBO) return;

              if (currentCheck.stage! < (currentCheck.maxStages || 3)) {
                  const nextWidth = currentCheck.stage === 1 ? 28 : 20; 
                  const nextCheck = {
                      ...currentCheck,
                      isFlashing: false,
                      stage: currentCheck.stage! + 1,
                      targetZoneWidth: nextWidth,
                      targetZoneStart: Math.random() * (100 - nextWidth),
                      hitMarkers: [],
                      hitFeedback: currentCheck.hitFeedback 
                  };
                  skillCheckRef.current = nextCheck;
                  setActiveSkillCheck(nextCheck);
              } else {
                  resolveMinigame(progress, newAccumulated);
              }
          }, 120); 
      }
  };

  const processAI = (now: number) => {
      if (winnerRef.current || now < aiNextActionTime.current || !opponentBirdRef.current || !playerBirdRef.current) return;
      const ai = opponentBirdRef.current;
      const pl = playerBirdRef.current;
      const availableMoves = ai.moves.filter(m => {
          const cd = lastUsedMapRef.current[`ai_${m.id}`] || 0;
          return now >= cd + m.cooldown && ai.currentEnergy >= m.cost;
      });
      if (availableMoves.length === 0) { aiNextActionTime.current = now + 500; return; }
      const move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      triggerCooldown(`ai_${move.id}`, move.cooldown);
      executeMove(ai, pl, move, false, 0.9 + Math.random()*0.2);
      aiNextActionTime.current = now + 2000 + Math.random() * 1000;
  };
  const aiNextActionTime = useRef(0);

  const startLoop = () => {
    const loop = () => {
      if (winnerRef.current) return;
      const now = Date.now();
      
      const frameDelta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      
      const logicDelta = now - lastTickRef.current;
      
      if (skillCheckRef.current) {
          const check = skillCheckRef.current;
          const physicsMult = frameDelta / 16.66; 

          if (check.type === SkillCheckType.TIMING || check.type === SkillCheckType.COMBO) {
              const speed = check.type === SkillCheckType.COMBO ? (1.2 + (check.stage || 1) * 0.7) : 1.5;
              let p = check.progress + (speed * physicsMult) * (check.direction || 1);
              if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1;
              check.progress = Math.max(0, Math.min(100, p));
              setActiveSkillCheck({...check});
          } else if (check.type === SkillCheckType.MASH) {
              if (check.progress >= 100) {
                   resolveMinigame(100);
              } else if (now - check.startTime > 3000) {
                  resolveMinigame(); 
              } else {
                  check.progress = Math.max(0, check.progress - (0.12 * physicsMult));
                  setActiveSkillCheck({...check});
              }
          } else if (check.type === SkillCheckType.REFLEX && check.reflexTargets) {
              check.reflexTargets = check.reflexTargets.map(t => {
                  if (!t.hit && t.value > 0) {
                      return { ...t, value: Math.max(0, t.value - (0.4 * physicsMult)) };
                  }
                  return t;
              });
              setActiveSkillCheck({...check});
          } else if (check.type === SkillCheckType.DRAIN_GAME) {
              if (check.stage === 1) {
                  const speed = 0.3; 
                  let p = check.progress - (speed * physicsMult);
                  if (p <= 0) p = 100; 
                  check.progress = p;
                  setActiveSkillCheck({...check});
              } else {
                  const speed = 0.4; 
                  let p = check.progress + (speed * physicsMult);
                  if (p >= 100) {
                      resolveMinigame(100);
                      return;
                  } else {
                    check.progress = Math.min(100, p);
                    setActiveSkillCheck({...check});
                  }
              }
          }
      }
      
      if (logicDelta >= 100) {
          const factor = logicDelta / 1000;
          lastTickRef.current = now;

          if (now - lastBleedTickRef.current > 2000) {
              lastBleedTickRef.current = now;
              let playerDied = false;
              let opponentDied = false;

              if (playerBirdRef.current?.statusEffects.includes('bleed')) {
                  const dmg = Math.floor(playerBirdRef.current.maxHp * 0.05);
                  const remaining = playerBirdRef.current.currentHp - dmg;
                  if (remaining <= 0) {
                      playerDied = true;
                      setPlayerBird(prev => {
                        const next = prev ? ({...prev, currentHp: 0}) : null;
                        playerBirdRef.current = next;
                        return next;
                      });
                  } else {
                      setPlayerBird(prev => {
                        const next = prev ? ({...prev, currentHp: remaining}) : null;
                        playerBirdRef.current = next;
                        return next;
                      });
                      spawnFloatingText("-BLEED", 'player', -30, 0, "text-rose-600");
                  }
              }

              if (!winnerRef.current && !playerDied && opponentBirdRef.current?.statusEffects.includes('bleed')) {
                  const dmg = Math.floor(opponentBirdRef.current.maxHp * 0.05);
                  const remaining = opponentBirdRef.current.currentHp - dmg;
                  if (remaining <= 0) {
                      opponentDied = true;
                      setOpponentBird(prev => {
                        const next = prev ? ({...prev, currentHp: 0}) : null;
                        opponentBirdRef.current = next;
                        return next;
                      });
                  } else {
                      setOpponentBird(prev => {
                        const next = prev ? ({...prev, currentHp: remaining}) : null;
                        opponentBirdRef.current = next;
                        return next;
                      });
                      spawnFloatingText("-BLEED", 'opponent', 30, 0, "text-rose-600");
                  }
              }

              const applyVulturePassive = (bird: BattleBird | null, setBird: React.Dispatch<React.SetStateAction<BattleBird | null>>, isPl: boolean) => {
                  if (bird && bird.id === 'vulture') {
                      const heal = Math.ceil(bird.maxHp * 0.03); 
                      setBird((prev: BattleBird | null) => {
                          if (!prev || prev.currentHp <= 0) return prev; 
                          const next = { ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + heal) };
                          if (isPl) playerBirdRef.current = next; else opponentBirdRef.current = next;
                          return next;
                      });
                  }
              };
              
              if (!winnerRef.current && !playerDied && !opponentDied) {
                  applyVulturePassive(playerBirdRef.current, setPlayerBird, true);
                  applyVulturePassive(opponentBirdRef.current, setOpponentBird, false);
              }
          }

          const applyEnergyRegen = (bird: BattleBird | null, setBird: React.Dispatch<React.SetStateAction<BattleBird | null>>, isPl: boolean) => {
             if (!bird) return;
             const baseRegen = 5;
             const effectiveRegen = bird.id === 'hummingbird' ? baseRegen * 1.5 : baseRegen;
             setBird((prev: BattleBird | null) => {
                const next = prev ? ({...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + (effectiveRegen * factor))}) : null;
                if (isPl) playerBirdRef.current = next; else opponentBirdRef.current = next;
                return next;
             });
          };
          applyEnergyRegen(playerBirdRef.current, setPlayerBird, true);
          applyEnergyRegen(opponentBirdRef.current, setOpponentBird, false);
          
          processAI(now);
      }
      
      setGameTime(Math.floor((now - startTimeRef.current) / 1000));
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  };
  const stopLoop = () => cancelAnimationFrame(animationFrameRef.current);
  
  const handleMove = (move: Move) => {
      if (winnerRef.current || activeSkillCheck || !playerBird || playerBird.currentEnergy < move.cost) return;
      
      setPlayerBird(prev => {
        const next = prev ? ({...prev, currentEnergy: prev.currentEnergy - move.cost}) : null;
        playerBirdRef.current = next;
        return next;
      });
      setPlayerTurnCount(prev => prev + 1);
      
      triggerCooldown(move.id, move.cooldown);
      if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) {
          let reflexTargets = undefined;
          if (move.skillCheck === SkillCheckType.REFLEX) {
              reflexTargets = [
                  { id: 1, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                  { id: 2, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                  { id: 3, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false }
              ];
          }
          const check: ActiveSkillCheck = { 
              type: move.skillCheck, 
              move, 
              startTime: Date.now(), 
              progress: move.skillCheck === SkillCheckType.DRAIN_GAME ? 100 : (move.skillCheck === SkillCheckType.TIMING ? 0 : 20), 
              direction: 1,
              stage: 1,
              reflexTargets,
              maxStages: move.skillCheck === SkillCheckType.COMBO ? 3 : 2,
              targetZoneWidth: move.skillCheck === SkillCheckType.COMBO ? 38 : 15,
              targetZoneStart: move.skillCheck === SkillCheckType.COMBO ? Math.random() * 62 : 40,
              accumulatedMultiplier: 0,
              currentCombo: 0,
              hitMarkers: [],
              isFlashing: false
          };
          
          lastFrameTimeRef.current = Date.now();
          skillCheckRef.current = check;
          setActiveSkillCheck(check);
      } else {
          if (playerBirdRef.current && opponentBirdRef.current) {
              executeMove(playerBirdRef.current, opponentBirdRef.current, move, true, 1.0);
          }
      }
  };
  
  const handleMash = (e: React.PointerEvent) => {
      e.preventDefault();
      const check = skillCheckRef.current;
      if (!check) return;
      
      if (check.type === SkillCheckType.REFLEX) return;

      if (check.type === SkillCheckType.MASH) {
          check.progress = Math.min(100, check.progress + 8);
          setActiveSkillCheck({...check});
      } else if (check.type === SkillCheckType.TIMING) {
          resolveMinigame();
      } else if (check.type === SkillCheckType.COMBO || check.type === SkillCheckType.DRAIN_GAME) {
          advanceComboStage();
      }
  };

  const handleRelease = (e: React.PointerEvent) => {
      const check = skillCheckRef.current;
      if (check && check.type === SkillCheckType.DRAIN_GAME && check.stage === 2) {
          resolveMinigame();
      }
  };

  const handleReflexTap = (e: React.PointerEvent, id: number) => {
      e.stopPropagation();
      e.preventDefault(); 

      const check = skillCheckRef.current;
      if (!check || check.type !== SkillCheckType.REFLEX || !check.reflexTargets) return;

      const clickedTarget = check.reflexTargets.find(t => t.id === id);
      if (!clickedTarget || clickedTarget.hit) return;

      spawnParticles(e.clientX, e.clientY, check.move.type === MoveType.HEAL ? "#10b981" : "#06b6d4", 5);

      const newTargets = check.reflexTargets.map(t => t.id === id ? { ...t, hit: true } : t);
      check.reflexTargets = newTargets;
      
      if (newTargets.every(t => t.hit)) {
          const avgValue = newTargets.reduce((sum, t) => sum + t.value, 0) / 3;
          let multiplier = 1.0;
          let text = "OK";
          let color = "text-white";

          if (avgValue >= 70) { multiplier = 1.5; text = "PERFECT!"; color = "text-yellow-400"; } 
          else if (avgValue >= 30) { multiplier = 1.2; text = "GOOD"; color = "text-cyan-400"; } 
          else { multiplier = 0.8; text = "SLOW"; color = "text-slate-400"; }

          spawnFloatingText(text, 'opponent', 0, -50, color, 2);
          
          skillCheckRef.current = null;
          setActiveSkillCheck(null);
          if (playerBirdRef.current && opponentBirdRef.current) {
              executeMove(playerBirdRef.current, opponentBirdRef.current, check.move, true, multiplier);
          }
      } else {
          setActiveSkillCheck({...check});
      }
  };

  if (!opponentBird || !playerBird) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">INITIALIZING COMBAT...</div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 relative overflow-hidden flex flex-col font-sans">
       <AnimatePresence>
           {hitFlash && (
               <motion.div 
                   initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-overlay"
               />
           )}
       </AnimatePresence>

       <BattleHeader 
            enemyLevel={enemyLevel}
            enemyPrefix={opponentBird.enemyPrefix}
            currentZoneProgress={currentZoneProgress}
            requiredRarities={requiredRarities}
            onShowThreatDetails={() => setShowThreatDetails(true)}
            canFlee={playerTurnCount >= 10 && !winner}
            onFlee={handleFlee}
       />

       <BattleStage 
            playerBird={playerBird}
            opponentBird={opponentBird}
            playerAnim={playerAnim}
            opponentAnim={opponentAnim}
            floatingTexts={floatingTexts}
            particles={particles}
       />

       <BattleControls 
            playerBird={playerBird} 
            lastUsedMap={lastUsedMap} 
            onMove={handleMove} 
            disabled={!!winner || !!activeSkillCheck} 
       />

       <MinigameOverlay 
            activeSkillCheck={activeSkillCheck} 
            onMash={handleMash} 
            onRelease={handleRelease}
            onReflexTap={handleReflexTap} 
       />

       <AnimatePresence>
           {resultData && (
               <BattleResultOverlay 
                    winner={resultData.winner}
                    rewards={resultData.rewards}
                    initialBird={initialPlayerBird.current}
                    updatedBird={playerBirdInstance}
                    onContinue={onBattleExit}
                    currentZoneProgress={currentZoneProgress}
                    requiredRarities={requiredRarities}
                    opponentRarity={resultData.opponentRarity}
                    enemyPrefix={opponentBird.enemyPrefix}
                    isHighestZone={highestZone === enemyLevel}
                    onApplyLevelUpReward={onApplyLevelUpReward}
               />
           )}
       </AnimatePresence>

       <ThreatDetailsModal 
            isVisible={showThreatDetails}
            prefix={opponentBird.enemyPrefix || EnemyPrefix.NONE}
            onClose={() => setShowThreatDetails(false)}
       />
    </div>
  );
};