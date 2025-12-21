import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, SkillCheckType, BattleResult, Rarity, ActiveBuff, Consumable, APShopState, ZoneClearReward, StatType } from '../types';
import { RARITY_CONFIG } from '../constants';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { BattleResultOverlay } from './BattleResultOverlay';

import { createOpponent } from './battle/opponentGenerator';
import { calculateRewards } from './battle/rewardLogic';
import { calculateCombatResult } from './battle/combatLogic';
import { ActiveSkillCheck, FloatingText, Particle } from './battle/types';
import { getScaledStats } from './battle/utils';
import { applyPassivesAndRegen, getAIBestMove } from './battle/engine';
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
      const opp = createOpponent(enemyLevel, requiredRarities || [], currentZoneProgress || []);
      opponentRef.current = opp;
      setOpponentBird(opp);
      startLoop();
      return () => stopLoop();
  }, []);

  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  
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

  const lastTickRef = useRef(Date.now());
  const animationFrameRef = useRef<number>(0);

  const controls = useAnimation(); 
  const playerAnim = useAnimation(); 
  const opponentAnim = useAnimation(); 
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
      if (winnerRef.current) return;
      if (playerBird && playerBird.currentHp <= 0) handleWin('opponent');
      else if (opponentBird && opponentBird.currentHp <= 0) handleWin('player');
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
      setParticles(current => current.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };

  const triggerCooldown = (id: string, duration: number) => {
    const expiry = Date.now() + duration;
    setLastUsedMap(prev => ({ ...prev, [id]: expiry }));
    lastUsedMapRef.current = { ...lastUsedMapRef.current, [id]: expiry };
  };

  const executeMove = async (attacker: BattleBird, defender: BattleBird, move: Move, isPlayer: boolean, multiplier: number, secondaryMultiplier: number = 0) => {
    if (winnerRef.current) return;
    const anim = isPlayer ? playerAnim : opponentAnim;
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        anim.start({ x: isPlayer ? 60 : -60, transition: { duration: 0.1 } }).then(() => anim.start({ x: 0, transition: { duration: 0.3, type: "spring" } }));
    }
    const outcome = calculateCombatResult(attacker, defender, move, multiplier);
    if (outcome.isHit) {
        if (move.type === MoveType.HEAL) {
            const heal = Math.floor(move.power * multiplier * (attacker.attack / 100)); 
            const update = (prev: any) => prev ? ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + heal) }) : null;
            if (isPlayer) setPlayerBird(update); else setOpponentBird(update);
            spawnFloatingText(`+${heal} HP`, isPlayer ? 'player' : 'opponent', 0, -40, "text-emerald-400", 1.5);
        } else if (move.type === MoveType.DEFENSE) {
            const updateDefender = (prev: any) => {
                if (!prev) return null;
                const effects = [...prev.statusEffects];
                if (move.effect === 'dodge' && !effects.includes('dodge')) effects.push('dodge');
                return { ...prev, statusEffects: effects };
            };
            if (isPlayer) setPlayerBird(updateDefender); else setOpponentBird(updateDefender);
        } else {
            const damage = outcome.damage;
            if (move.effect === 'lifesteal' || move.type === MoveType.DRAIN) {
                 const heal = Math.floor(damage * (move.type === MoveType.DRAIN ? (secondaryMultiplier || 0.25) : 0.5));
                 const update = (prev: any) => prev ? ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + heal) }) : null;
                 if (isPlayer) setPlayerBird(update); else setOpponentBird(update);
                 spawnFloatingText(`+${heal} HP`, isPlayer ? 'player' : 'opponent', 40, -20, "text-purple-400", 1.2);
            }
            const updateDefender = (prev: any) => {
                if (!prev) return null;
                const effects = [...prev.statusEffects];
                if (outcome.appliedBleed && !effects.includes('bleed')) effects.push('bleed');
                return { ...prev, currentHp: Math.max(0, prev.currentHp - damage), statusEffects: effects };
            };
            if (isPlayer) setOpponentBird(updateDefender); else setPlayerBird(updateDefender);
            triggerShake(damage > 30 ? 20 : 8);
            triggerHitFlash();
            spawnFloatingText(`-${damage}`, isPlayer ? 'opponent' : 'player', 50, 40, "text-rose-500", 2.5);
            spawnParticles(0, 0, "#f43f5e", 12);
        }
    }
  };

  const handleWin = (w: 'player' | 'opponent') => {
      if (winnerRef.current || !opponentBirdRef.current) return;
      winnerRef.current = w;
      setWinner(w);
      stopLoop();
      const rewards = calculateRewards(opponentBirdRef.current, playerBirdInstance, enemyLevel, activeBuffs, apShop, gemUnlocked || false);
      onReportResults({ winner: w, opponentRarity: opponentBirdRef.current.rarity, rewards });
      setTimeout(() => setResultData({ winner: w, opponentRarity: opponentBirdRef.current!.rarity, rewards }), 1000);
  };

  const startLoop = () => {
    const loop = () => {
      if (winnerRef.current) return;
      const now = Date.now();
      if (now - lastTickRef.current >= 100) {
          const factor = (now - lastTickRef.current) / 1000;
          lastTickRef.current = now;
          const { player, opponent } = applyPassivesAndRegen(playerBirdRef.current, opponentBirdRef.current, factor);
          setPlayerBird(player);
          setOpponentBird(opponent);
          if (now >= aiNextActionTime.current && opponentBirdRef.current && playerBirdRef.current) {
              const move = getAIBestMove(opponentBirdRef.current, now, lastUsedMapRef.current);
              if (move) {
                  triggerCooldown(`ai_${move.id}`, move.cooldown);
                  executeMove(opponentBirdRef.current, playerBirdRef.current, move, false, 1.0);
              }
              aiNextActionTime.current = now + 2000 + Math.random() * 1000;
          }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  };
  const stopLoop = () => cancelAnimationFrame(animationFrameRef.current);
  const aiNextActionTime = useRef(0);
  
  const handleMove = (move: Move) => {
      const now = Date.now();
      if (winnerRef.current || activeSkillCheck || !playerBird || playerBird.currentEnergy < move.cost || now < (lastUsedMap[move.id] || 0)) return;
      
      setPlayerBird(prev => prev ? ({...prev, currentEnergy: prev.currentEnergy - move.cost}) : null);
      setPlayerTurnCount(p => p + 1);
      
      if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) {
          const check: ActiveSkillCheck = { type: move.skillCheck, move, startTime: now, progress: 0 };
          skillCheckRef.current = check;
          setActiveSkillCheck(check);
      } else {
          triggerCooldown(move.id, move.cooldown);
          if (playerBirdRef.current && opponentBirdRef.current) {
              executeMove(playerBirdRef.current, opponentBirdRef.current, move, true, 1.0);
          }
      }
  };

  if (!opponentBird || !playerBird) return null;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 relative overflow-hidden flex flex-col font-sans minigame-container">
       <AnimatePresence>{hitFlash && <motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-overlay" />}</AnimatePresence>
       <BattleHeader enemyLevel={enemyLevel} enemyPrefix={opponentBird.enemyPrefix} currentZoneProgress={currentZoneProgress || []} requiredRarities={requiredRarities || []} onShowThreatDetails={() => setShowThreatDetails(true)} />
       <BattleStage playerBird={playerBird} opponentBird={opponentBird} playerAnim={playerAnim} opponentAnim={opponentAnim} floatingTexts={floatingTexts} particles={particles} />
       <BattleControls playerBird={playerBird} lastUsedMap={lastUsedMap} onMove={handleMove} disabled={!!winner || !!activeSkillCheck} />
       <MinigameOverlay activeSkillCheck={activeSkillCheck} onComplete={(m, s) => {
           const check = skillCheckRef.current;
           if (!check) return;
           skillCheckRef.current = null;
           setActiveSkillCheck(null);
           
           const isSupport = check.move.type === MoveType.HEAL || check.move.type === MoveType.DEFENSE;
           const targetSide = isSupport ? 'player' : 'opponent';
           const xPos = isSupport ? 50 : -50;
           
           spawnFloatingText(m >= 1.5 ? "PERFECT!" : "GOOD", targetSide, xPos, -100, m >= 1.5 ? "text-yellow-400" : "text-white", 2);
           
           triggerCooldown(check.move.id, (playerBirdRef.current?.id === 'hummingbird' && m >= 1.5) ? check.move.cooldown / 2 : check.move.cooldown);
           if (playerBirdRef.current && opponentBirdRef.current) executeMove(playerBirdRef.current, opponentBirdRef.current, check.move, true, m, s);
       }} />
       <AnimatePresence>{resultData && <BattleResultOverlay winner={resultData.winner} rewards={resultData.rewards} initialBird={initialPlayerBird.current} updatedBird={playerBirdInstance} onContinue={onBattleExit} currentZoneProgress={currentZoneProgress || []} requiredRarities={requiredRarities || []} opponentRarity={opponentBird.rarity} isHighestZone={highestZone === enemyLevel} onApplyLevelUpReward={onApplyLevelUpReward} />}</AnimatePresence>
       <ThreatDetailsModal isVisible={showThreatDetails} prefix={opponentBird.enemyPrefix!} onClose={() => setShowThreatDetails(false)} />
    </div>
  );
};