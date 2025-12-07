
import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, Weather, SkillCheckType, BattleResult, Rarity, Gear, StatType, Gem } from '../types';
import { BIRD_TEMPLATES, RARITY_CONFIG, rollRarity, generateBird, XP_TABLE, BUFF_LABELS, generateGem } from '../constants';
import { Button } from './Button';
import { HealthBar } from './HealthBar';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Activity, ArrowUp, ArrowDown, Cloud, CloudLightning, Wind, Crosshair, Zap, Award, ChevronsUp, ChevronRight, Shield, Heart, RotateCcw, Map, Hammer, Gem as GemIcon, Droplets, Skull, Hexagon } from 'lucide-react';
import { getAITurn } from '../services/geminiService';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  onBattleComplete: (result: BattleResult, playAgain: boolean) => void;
}

// Moved StatusBadge here as it is used
const StatusBadge: React.FC<{ type: string }> = ({ type }) => {
    let icon = <Activity size={12} />;
    let color = "text-slate-400";
    let label = type;

    if (type === 'bleed') { icon = <Droplets size={12} />; color = "text-rose-500"; label = "BLEED"; }
    if (type === 'stun') { icon = <Zap size={12} />; color = "text-yellow-500"; label = "STUN"; }
    if (type === 'dodge') { icon = <Wind size={12} />; color = "text-cyan-500"; label = "EVASIVE"; }

    return (
        <motion.div 
           initial={{ scale: 0 }} animate={{ scale: 1 }}
           className={`flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 rounded border border-slate-700 ${color}`}
        >
            {icon} <span className="text-[9px] font-bold">{label}</span>
        </motion.div>
    );
 };

// Helper to scale stats based on level + Gear
const getScaledStats = (bird: BirdInstance, level: number) => {
    const scale = 1 + (level * 0.1);
    
    // Add Gear Bonuses
    let atkBonus = 0;
    let hpBonus = 0;
    let energyBonus = 0;
    let defBonus = 0;
    let spdBonus = 0;

    const applyGear = (gear: Gear | null) => {
        if (!gear) return;
        atkBonus += gear.attackBonus || 0;
        
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

// FX Types
interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  target: 'player' | 'opponent';
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

// Minigame State
interface ActiveSkillCheck {
  type: SkillCheckType;
  move: Move;
  startTime: number;
  progress: number;
  direction?: 1 | -1;
  stage?: number; // For COMBO: 1 (Power), 2 (Absorb)
  storedMultiplier?: number; // Result of stage 1
}

export const BattleArena: React.FC<BattleArenaProps> = ({ playerBirdInstance, enemyLevel, onBattleComplete }) => {
  // --- Game State ---
  const playerStats = getScaledStats(playerBirdInstance, playerBirdInstance.level);
  const [playerBird, setPlayerBird] = useState<BattleBird>({ 
    ...playerStats,
    currentHp: playerStats.maxHp, 
    currentEnergy: playerStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW
  });
  
  // Generate random opponent
  const opponentRef = useRef<BirdInstance | null>(null);
  
  if (!opponentRef.current) {
      const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
      const rarity = rollRarity(); // Opponent has random rarity
      const instance = generateBird(template, rarity);
      instance.level = enemyLevel;
      opponentRef.current = instance;
  }
  
  const opponentStats = getScaledStats(opponentRef.current!, enemyLevel);

  const [opponentBird, setOpponentBird] = useState<BattleBird>({ 
    ...opponentStats,
    currentHp: opponentStats.maxHp, 
    currentEnergy: opponentStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW
  });

  const [weather, setWeather] = useState<Weather>(Weather.CLEAR);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  
  // Result State for Overlay
  const [resultData, setResultData] = useState<{
      winner: 'player' | 'opponent';
      rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem };
  } | null>(null);
  
  // --- Refs for Game Loop ---
  const playerBirdRef = useRef(playerBird);
  const opponentBirdRef = useRef(opponentBird);
  const weatherRef = useRef(weather);
  const winnerRef = useRef(winner);
  
  useEffect(() => { playerBirdRef.current = playerBird; }, [playerBird]);
  useEffect(() => { opponentBirdRef.current = opponentBird; }, [opponentBird]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);

  // --- Skill Check State ---
  const [activeSkillCheck, setActiveSkillCheck] = useState<ActiveSkillCheck | null>(null);
  const skillCheckRef = useRef<ActiveSkillCheck | null>(null);

  // --- Real-time State ---
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});
  const lastUsedMapRef = useRef<Record<string, number>>({}); 
  
  useEffect(() => { lastUsedMapRef.current = lastUsedMap; }, [lastUsedMap]);
  useEffect(() => { skillCheckRef.current = activeSkillCheck; }, [activeSkillCheck]);

  // --- Animation & FX ---
  const [gameTime, setGameTime] = useState(0);
  const startTimeRef = useRef(Date.now());
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
    addLog(`ENCOUNTER STARTED: ${opponentBird.name} (${RARITY_CONFIG[opponentBird.rarity].name})`, 'info');
    startLoop();
    return () => stopLoop();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Helpers ---
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
    }, 2000); // 2 seconds lifetime
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

  // --- Combat Logic ---
  const executeMove = async (attacker: BattleBird, defender: BattleBird, move: Move, isPlayer: boolean, multiplier: number, secondaryMultiplier: number = 0) => {
    // Anim
    const anim = isPlayer ? playerAnim : opponentAnim;
    
    // Improved attack animation - Lunge and recoil
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        const xMove = isPlayer ? 60 : -60;
        const yMove = isPlayer ? -60 : 60;
        
        // Anticipation
        await anim.start({ x: -xMove * 0.2, y: -yMove * 0.2, scale: 0.9, transition: { duration: 0.1 } });
        // Strike
        await anim.start({ x: xMove, y: yMove, scale: 1.2, transition: { duration: 0.08, ease: "easeIn" } });
        // Return
        anim.start({ x: 0, y: 0, scale: 1, transition: { duration: 0.3, type: "spring" } });
    }

    let accuracy = move.accuracy;
    
    // Speed-based Evasion Logic
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        if (defender.speed > attacker.speed) {
            const speedDelta = defender.speed - attacker.speed;
            const evasionChance = Math.min(40, speedDelta * 0.5);
            accuracy -= evasionChance;
        }
    }

    if (weatherRef.current === Weather.STORM) accuracy -= 20;
    if (multiplier >= 1.5) accuracy += 20;

    const hit = Math.random() * 100 <= accuracy;
    
    // Determine who to update
    const setAttacker = isPlayer ? setPlayerBird : setOpponentBird;
    const setDefender = isPlayer ? setOpponentBird : setPlayerBird;
    const currentAttackerState = isPlayer ? playerBirdRef.current : opponentBirdRef.current;
    const currentDefenderState = isPlayer ? opponentBirdRef.current : playerBirdRef.current;
    
    // Identify target for Floating Text
    const attackerTarget = isPlayer ? 'player' : 'opponent';
    const defenderTarget = isPlayer ? 'opponent' : 'player';

    // Queue text helper to prevent overlap
    const queueText = (text: string, target: 'player' | 'opponent', color: string, scale: number, delay: number, xOffset = 0) => {
        setTimeout(() => spawnFloatingText(text, target, xOffset + (Math.random() * 20 - 10), (Math.random() * 20), color, scale), delay);
    };

    if (hit) {
        if (move.type === MoveType.HEAL) {
            const healAmount = Math.floor(move.power * multiplier * (currentAttackerState.attack / 100)); 
            setAttacker(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + healAmount) }));
            queueText(`+${healAmount} HP`, attackerTarget, "text-emerald-400", 1.5, 0);
            addLog(`${attacker.name} heals for ${healAmount}.`, 'heal');

        } else if (move.type === MoveType.DEFENSE) {
             addLog(`${attacker.name} braces for impact!`, 'info');
             queueText("SHIELD UP", attackerTarget, "text-cyan-400", 1.2, 0);

        } else {
            // Damage calc
            let damage = move.power * (currentAttackerState.attack / currentDefenderState.defense);
            
            // Critical Hit Logic (Beak)
            let isCrit = false;
            if (currentAttackerState.gear?.beak) {
                const critChance = currentAttackerState.gear.beak.effectValue;
                if (Math.random() * 100 < critChance) {
                    isCrit = true;
                    damage *= 1.5;
                }
            }

            if (currentAttackerState.altitude > currentDefenderState.altitude) damage *= 1.2;
            damage *= multiplier;

            if (currentAttackerState.altitude === Altitude.HIGH && Math.random() < 0.25) {
                damage *= 1.5;
            }

            damage = Math.floor(damage);
            
            // Handle Lifesteal or Drain
            if (move.effect === 'lifesteal' || move.type === MoveType.DRAIN) {
                 const healFactor = move.type === MoveType.DRAIN ? (secondaryMultiplier > 0 ? secondaryMultiplier : 0.25) : 0.5;
                 const healAmt = Math.floor(damage * healFactor);
                 setAttacker(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + healAmt) }));
                 queueText(`+${healAmt} HP (DRAIN)`, attackerTarget, "text-purple-400", 1.2, 500, 40);
            }
            
            // Handle Bleed (Claws)
            let appliedBleed = false;
            if (currentAttackerState.gear?.claws) {
                if (Math.random() < 0.5) {
                    appliedBleed = true;
                }
            }

            setDefender(prev => {
                const newHp = Math.max(0, prev.currentHp - damage);
                const newEffects = [...prev.statusEffects];
                if (appliedBleed && !newEffects.includes('bleed')) newEffects.push('bleed');

                if (newHp <= 0) handleWin(isPlayer ? 'player' : 'opponent');
                return { ...prev, currentHp: newHp, statusEffects: newEffects };
            });

            triggerShake(damage > 30 ? 20 : 8);
            triggerHitFlash();

            // Shake victim
            const victimAnim = isPlayer ? playerAnim : opponentAnim;
            victimAnim.start({ x: [0, 15, -15, 10, -10, 0], transition: { duration: 0.3 } });

            // Stagger texts so they appear sequentially and clearly
            let delayOffset = 0;
            if (isCrit) {
                queueText("CRITICAL!", defenderTarget, "text-yellow-400", 1.8, delayOffset, 0);
                delayOffset += 200;
            }
            
            queueText(`-${damage}`, defenderTarget, "text-rose-500", 2.5, delayOffset, 0);
            delayOffset += 200;
            
            if (appliedBleed) {
                queueText("BLEED APPLIED", defenderTarget, "text-rose-600", 1.2, delayOffset, 0);
            }
            
            spawnParticles(0, 0, "#f43f5e", 12);
            addLog(`${attacker.name} used ${move.name}! -${damage}`, 'damage');
        }
    } else {
        // If speed difference caused miss
        if (defender.speed > attacker.speed && Math.random() < 0.5) {
             queueText("DODGED!", defenderTarget, "text-cyan-400", 1.5, 0);
             // Dodge animation
             const dodgeAnim = isPlayer ? playerAnim : opponentAnim;
             dodgeAnim.start({ x: isPlayer ? -50 : 50, transition: { duration: 0.2 } }).then(() => {
                 dodgeAnim.start({ x: 0, transition: { duration: 0.2 } });
             });
        } else {
             queueText("MISS", defenderTarget, "text-slate-500", 1.5, 0);
        }
    }
  };

  const handleWin = (w: 'player' | 'opponent') => {
      setWinner(w);
      if (w === 'player') {
          const rarityConfig = RARITY_CONFIG[opponentBird.rarity];
          const rarityMult = rarityConfig.minMult; 
          
          // --- CALCULATE REWARDS WITH GEM BUFFS ---
          let xpBonus = 0;
          let scrapBonus = 0;
          let featherBonus = 0;
          let diamondChanceBonus = 0;
          let gemFindBonus = 0;

          // Utility Buffs are now on GEMS in sockets
          const addGemBuffs = (g: Gear | null) => {
               if (!g || !g.sockets) return;
               g.sockets.forEach(gem => {
                   if (gem) {
                       gem.buffs.forEach(b => {
                           if (b.stat === 'XP_BONUS') xpBonus += b.value;
                           if (b.stat === 'SCRAP_BONUS') scrapBonus += b.value;
                           if (b.stat === 'FEATHER_BONUS') featherBonus += b.value;
                           if (b.stat === 'DIAMOND_BATTLE_CHANCE') diamondChanceBonus += b.value;
                           if (b.stat === 'GEM_FIND_CHANCE') gemFindBonus += b.value;
                       });
                   }
               });
          };
          addGemBuffs(playerBirdInstance.gear.beak);
          addGemBuffs(playerBirdInstance.gear.claws);

          // 1. XP
          const baseXp = 100 * (1 + enemyLevel * 0.5) * rarityMult;
          const xpReward = Math.floor(baseXp * (1 + (xpBonus / 100)));
          
          // 2. Feathers
          const baseFeathers = 50 * (1 + enemyLevel * 0.2) * rarityMult;
          const featherReward = Math.floor(baseFeathers * (1 + (featherBonus / 100)));
          
          // 3. Scrap
          let scrapChance = 0;
          let scrapMin = 0;
          let scrapMax = 0;

          switch (opponentBird.rarity) {
              case Rarity.COMMON: scrapChance = 0.15; scrapMin = 2; scrapMax = 5; break;
              case Rarity.UNCOMMON: scrapChance = 0.25; scrapMin = 5; scrapMax = 10; break;
              case Rarity.RARE: scrapChance = 0.40; scrapMin = 8; scrapMax = 15; break;
              case Rarity.EPIC: scrapChance = 0.60; scrapMin = 15; scrapMax = 30; break;
              case Rarity.LEGENDARY: scrapChance = 0.80; scrapMin = 40; scrapMax = 80; break;
              case Rarity.MYTHIC: scrapChance = 1.00; scrapMin = 100; scrapMax = 200; break;
              default: scrapChance = 0.10; scrapMin = 1; scrapMax = 3;
          }

          const levelScale = (1 + enemyLevel * 0.3) * (1 + playerBird.level * 0.1);
          
          let scrapReward = 0;
          if (Math.random() < scrapChance) {
              const baseScrap = scrapMin + Math.random() * (scrapMax - scrapMin);
              scrapReward = Math.floor(baseScrap * levelScale * (1 + (scrapBonus / 100)));
          }

          // 4. Diamonds
          let diamondReward = 0;
          const baseDiamondChance = 1.0; 
          const totalDiamondChance = baseDiamondChance + diamondChanceBonus;
          if (Math.random() * 100 < totalDiamondChance) {
               diamondReward = 1;
          }

          // 5. Gems
          let gemReward: Gem | undefined;
          const baseGemChance = 0.5; // Base 0.5%
          // Chance increases with opponent rarity
          let rarityGemBonus = 0;
          switch (opponentBird.rarity) {
              case Rarity.RARE: rarityGemBonus = 0.5; break;
              case Rarity.EPIC: rarityGemBonus = 1.5; break;
              case Rarity.LEGENDARY: rarityGemBonus = 3.0; break;
              case Rarity.MYTHIC: rarityGemBonus = 5.0; break;
          }
          const totalGemChance = baseGemChance + rarityGemBonus + gemFindBonus;
          
          if (Math.random() * 100 < totalGemChance) {
              // Generate Gem
              const gem = generateGem(rollRarity(opponentBird.rarity === Rarity.COMMON ? 0 : 2)); 
              gemReward = gem;
          }
          
          setTimeout(() => {
              setResultData({ winner: 'player', rewards: { xp: xpReward, feathers: featherReward, scrap: scrapReward, diamonds: diamondReward, gem: gemReward } });
          }, 1500);
      } else {
          setTimeout(() => {
              setResultData({ winner: 'opponent', rewards: { xp: 10, feathers: 5, scrap: 0, diamonds: 0 } });
          }, 1500);
      }
  };

  const resolveMinigame = (overrideProgress?: number) => {
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
          multiplier = check.storedMultiplier || 1.0;
          if (progress >= 45 && progress <= 55) secondaryMultiplier = 1.0; 
          else if (progress >= 30 && progress <= 70) secondaryMultiplier = 0.5; 
          else secondaryMultiplier = 0.1; 
      }

      let text = "GOOD";
      let color = "text-white";
      if (multiplier >= 1.5) { text = "PERFECT!"; color = "text-yellow-400"; }
      else if (multiplier < 0.8) { text = "WEAK"; color = "text-slate-500"; }
      
      if (check.type === SkillCheckType.COMBO) {
           if (secondaryMultiplier === 1.0) { text = "MAX DRAIN!"; color = "text-purple-400"; }
           else if (secondaryMultiplier === 0.1) { text = "POOR ABSORB"; color = "text-slate-400"; }
      }

      spawnFloatingText(text, 'player', 0, -50, color, 2);
      executeMove(playerBirdRef.current, opponentBirdRef.current, check.move, true, multiplier, secondaryMultiplier);
  };

  const advanceComboStage = () => {
      const check = skillCheckRef.current;
      if (!check || check.stage !== 1) return;

      const progress = check.progress;
      let dmgMult = 1.0;
      
      if (progress >= 45 && progress <= 55) dmgMult = 1.5;
      else if (progress >= 30 && progress <= 70) dmgMult = 1.2;
      else dmgMult = 0.8;
      
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
      
      spawnFloatingText(dmgMult >= 1.5 ? "POWER MAX!" : "CHARGED", 'player', 0, -80, "text-cyan-400", 1.5);
  };

  // --- AI & Updates ---
  const aiNextActionTime = useRef(0);
  
  const processAI = (now: number) => {
      if (winnerRef.current || now < aiNextActionTime.current) return;
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

  const startLoop = () => {
    const loop = () => {
      if (winnerRef.current) return;
      const now = Date.now();
      const delta = now - lastTickRef.current;
      
      // Minigame Logic
      if (skillCheckRef.current) {
          const check = skillCheckRef.current;
          if (check.type === SkillCheckType.TIMING || check.type === SkillCheckType.COMBO) {
              const speed = check.type === SkillCheckType.COMBO && check.stage === 2 ? 2.5 : 1.5;
              let p = check.progress + (speed * (delta/16)) * (check.direction || 1);
              if (p >= 100 || p <= 0) check.direction = (check.direction || 1) * -1;
              check.progress = Math.max(0, Math.min(100, p));
              setActiveSkillCheck({...check});
          } else if (check.type === SkillCheckType.MASH) {
              if (check.progress >= 100) {
                   resolveMinigame(100);
              } else if (now - check.startTime > 3000) {
                  resolveMinigame(); 
              } else {
                  setActiveSkillCheck(prev => prev ? ({...prev, progress: Math.max(0, prev.progress - (0.12 * (delta/16)))}) : null);
              }
          }
      }

      // 1-Second Tick (Energy, Bleed)
      if (now - lastBleedTickRef.current > 1000) {
          lastBleedTickRef.current = now;
          if (playerBirdRef.current.statusEffects.includes('bleed')) {
              setPlayerBird(prev => ({...prev, currentHp: Math.max(0, prev.currentHp - Math.floor(prev.maxHp * 0.05))}));
              spawnFloatingText("-BLEED", 'player', -30, 0, "text-rose-600");
          }
          if (opponentBirdRef.current.statusEffects.includes('bleed')) {
              setOpponentBird(prev => ({...prev, currentHp: Math.max(0, prev.currentHp - Math.floor(prev.maxHp * 0.05))}));
              spawnFloatingText("-BLEED", 'opponent', 30, 0, "text-rose-600");
          }
      }

      if (delta >= 100) {
          const factor = delta/1000;
          setPlayerBird(prev => ({...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + (5 * factor))}));
          setOpponentBird(prev => ({...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + (5 * factor))}));
          processAI(now);
          lastTickRef.current = now;
      }

      setGameTime(now - startTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => cancelAnimationFrame(animationFrameRef.current);

  const handleMove = (move: Move) => {
      if (winner || activeSkillCheck || playerBird.currentEnergy < move.cost) return;
      setPlayerBird(prev => ({...prev, currentEnergy: prev.currentEnergy - move.cost}));
      triggerCooldown(move.id, move.cooldown);
      
      if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) {
          setActiveSkillCheck({ 
              type: move.skillCheck, 
              move, 
              startTime: Date.now(), 
              progress: move.skillCheck === SkillCheckType.TIMING ? 0 : 20, 
              direction: 1,
              stage: 1 
          });
      } else {
          executeMove(playerBird, opponentBird, move, true, 1.0);
      }
  };
  
  const handleMash = (e: any) => {
      e.preventDefault();
      const check = skillCheckRef.current;
      if (!check) return;

      if (check.type === SkillCheckType.MASH) {
          setActiveSkillCheck(prev => prev ? ({...prev, progress: Math.min(100, prev.progress + 8)}) : null);
      } else if (check.type === SkillCheckType.TIMING) {
          resolveMinigame();
      } else if (check.type === SkillCheckType.COMBO) {
          if (check.stage === 1) {
              advanceComboStage();
          } else {
              resolveMinigame();
          }
      }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 relative overflow-hidden flex flex-col font-sans">
       
       {/* Screen Flash FX */}
       <AnimatePresence>
           {hitFlash && (
               <motion.div 
                   initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-overlay"
               />
           )}
       </AnimatePresence>

       {/* --- Top Bar (Weather) --- */}
       <div className="h-10 bg-slate-900/80 flex items-center justify-between px-4 text-xs font-bold border-b border-slate-800 z-10 shrink-0">
           <div className="flex items-center gap-2 text-cyan-500">
               <Wind size={14} /> {weather === Weather.CLEAR ? 'CLEAR SKIES' : weather}
           </div>
           <div className="text-slate-500">ZONE {enemyLevel}</div>
       </div>

       {/* --- Battle Stage --- */}
       <div className="flex-1 relative flex flex-col items-center overflow-hidden">
           
           {/* Opponent */}
           <motion.div animate={opponentAnim} className="flex-1 w-full flex flex-col items-center justify-center relative p-4 bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-2">
                     <div className="relative">
                        <div className={`w-32 h-32 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[opponentBird.rarity].borderColor} relative z-10`}>
                            <img src={opponentBird.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -right-16 top-0 flex flex-col gap-1 w-24 items-start">
                             <div className={`w-6 h-6 rounded bg-slate-800 border flex items-center justify-center text-[10px] font-bold ${RARITY_CONFIG[opponentBird.rarity].borderColor}`}>
                                 {opponentBird.level}
                             </div>
                             {opponentBird.statusEffects.map((effect, i) => (
                                 <StatusBadge key={i} type={effect} />
                             ))}
                             {opponentBird.altitude === Altitude.HIGH && (
                                 <StatusBadge type="dodge" /> 
                             )}
                        </div>
                     </div>

                     <div className="w-48">
                         <div className="flex justify-between text-xs font-bold mb-1">
                             <span className={RARITY_CONFIG[opponentBird.rarity].color}>{opponentBird.name}</span>
                             <span className="text-rose-400">{Math.round(opponentBird.currentHp)}</span>
                         </div>
                         <HealthBar current={opponentBird.currentHp} max={opponentBird.maxHp} type="health" showValue={false} />
                         <div className="h-1" />
                         <HealthBar current={opponentBird.currentEnergy} max={opponentBird.maxEnergy} type="energy" showValue={false} />
                     </div>
                </div>

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {floatingTexts.filter(ft => ft.target === 'opponent').map(ft => (
                        <motion.div 
                            key={ft.id} 
                            initial={{ y: 0, opacity: 0, scale: 0.2 }} 
                            animate={{ 
                                y: -120, 
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, ft.scale! * 1.5, ft.scale!],
                            }} 
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`absolute font-black text-5xl whitespace-nowrap z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] ${ft.color}`} 
                            style={{ 
                                marginLeft: ft.x,
                                WebkitTextStroke: '1px black',
                            }}
                        >
                            {ft.text}
                        </motion.div>
                    ))}
                    {particles.map(p => (
                         <motion.div key={p.id} initial={{x:0, y:0, opacity:1}} animate={{x: (Math.random()-0.5)*250, y: (Math.random()-0.5)*250, opacity:0}} className="absolute w-2 h-2 rounded-full shadow-lg mix-blend-screen" style={{backgroundColor: p.color}} />
                    ))}
                </div>
           </motion.div>
           
           <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

           {/* Player */}
           <motion.div animate={playerAnim} className="flex-1 w-full flex flex-col items-center justify-center relative p-4 bg-gradient-to-t from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-2">
                     <div className="w-48 mb-2">
                         <div className="flex justify-between text-xs font-bold mb-1">
                             <span className={RARITY_CONFIG[playerBird.rarity].color}>{playerBird.name}</span>
                             <span className="text-emerald-400">{Math.round(playerBird.currentHp)}</span>
                         </div>
                         <HealthBar current={playerBird.currentHp} max={playerBird.maxHp} type="health" showValue={false} />
                         <div className="h-1" />
                         <HealthBar current={playerBird.currentEnergy} max={playerBird.maxEnergy} type="energy" showValue={false} />
                     </div>

                     <div className="relative">
                        <div className={`w-36 h-36 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[playerBird.rarity].borderColor} relative z-10`}>
                            <img src={playerBird.imageUrl} className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                        <div className="absolute -left-20 top-0 flex flex-col gap-1 w-24 items-end">
                             {playerBird.statusEffects.map((effect, i) => (
                                 <StatusBadge key={i} type={effect} />
                             ))}
                        </div>
                     </div>
                </div>

                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {floatingTexts.filter(ft => ft.target === 'player').map(ft => (
                        <motion.div 
                            key={ft.id} 
                            initial={{ y: 0, opacity: 0, scale: 0.2 }} 
                            animate={{ 
                                y: -120, 
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, ft.scale! * 1.5, ft.scale!],
                            }} 
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`absolute font-black text-5xl whitespace-nowrap z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] ${ft.color}`} 
                            style={{ 
                                marginLeft: ft.x,
                                WebkitTextStroke: '1px black',
                            }}
                        >
                            {ft.text}
                        </motion.div>
                    ))}
                 </div>
           </motion.div>

       </div>

       {/* --- Controls Area --- */}
       <div className="bg-slate-900 border-t border-slate-700 p-2 shrink-0 pb-6 md:pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-40 md:h-24">
                {playerBird.moves.map(m => {
                    const onCd = (lastUsedMap[m.id] || 0) + m.cooldown > Date.now();
                    const remaining = Math.max(0, ((lastUsedMap[m.id] || 0) + m.cooldown) - Date.now());
                    
                    const showCrit = m.type === MoveType.ATTACK && playerBird.gear?.beak;
                    const showBleed = m.type === MoveType.ATTACK && playerBird.gear?.claws;

                    return (
                        <button 
                            key={m.id} 
                            disabled={onCd || playerBird.currentEnergy < m.cost} 
                            onClick={() => handleMove(m)} 
                            className={`
                                relative flex flex-col items-center justify-center p-2 rounded-lg border-b-4 transition-all active:translate-y-1 overflow-hidden
                                ${playerBird.currentEnergy < m.cost ? 'bg-slate-800 border-slate-700 opacity-50' : 
                                  m.type === MoveType.ATTACK ? 'bg-rose-900/50 border-rose-700 hover:bg-rose-800/50' : 
                                  m.type === MoveType.DEFENSE ? 'bg-cyan-900/50 border-cyan-700 hover:bg-cyan-800/50' :
                                  m.type === MoveType.HEAL ? 'bg-emerald-900/50 border-emerald-700 hover:bg-emerald-800/50' :
                                  m.type === MoveType.DRAIN ? 'bg-purple-900/50 border-purple-700 hover:bg-purple-800/50' :
                                  'bg-amber-900/50 border-amber-700 hover:bg-amber-800/50'}
                            `}
                        >
                            {onCd && (
                                <div className="absolute inset-0 bg-slate-950/80 z-20 flex items-center justify-center text-white font-mono text-sm">
                                    {(remaining/1000).toFixed(1)}s
                                </div>
                            )}

                            <div className="mb-1">
                                {m.type === MoveType.ATTACK && <Crosshair size={20} className="text-rose-400" />}
                                {m.type === MoveType.DEFENSE && <Shield size={20} className="text-cyan-400" />}
                                {m.type === MoveType.HEAL && <Heart size={20} className="text-emerald-400" />}
                                {m.type === MoveType.SPECIAL && <Zap size={20} className="text-amber-400" />}
                                {m.type === MoveType.DRAIN && <Activity size={20} className="text-purple-400" />}
                            </div>

                            <div className="font-bold text-sm text-slate-100 uppercase tracking-tight leading-none text-center mb-1">{m.name}</div>
                            
                            <div className="flex items-center gap-1 text-xs text-cyan-300 font-mono">
                                <Zap size={10} fill="currentColor" /> {m.cost}
                            </div>
                            
                            <div className="absolute top-1 left-1 flex gap-0.5">
                                {showCrit && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" title="Crit Enabled" />}
                                {showBleed && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" title="Bleed Enabled" />}
                            </div>

                            {m.skillCheck !== SkillCheckType.NONE && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>
       </div>

       {/* --- Minigame Overlay --- */}
       <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={handleMash}
            >
                <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest text-center px-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                    {activeSkillCheck.type === SkillCheckType.TIMING ? "TAP WHEN GREEN!" : 
                     activeSkillCheck.type === SkillCheckType.COMBO 
                       ? (activeSkillCheck.stage === 1 ? "STAGE 1: POWER" : "STAGE 2: ABSORB")
                       : "TAP FAST!"}
                </div>

                <div className="w-[85%] h-16 border-4 border-slate-700 rounded-xl relative overflow-hidden bg-slate-900 shadow-2xl">
                    {activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO ? (
                        <>
                            <div className="absolute left-[40%] right-[40%] bg-emerald-500/40 h-full border-x-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                            <motion.div 
                                className={`absolute w-3 h-full shadow-[0_0_15px_white] ${activeSkillCheck.type === SkillCheckType.COMBO && activeSkillCheck.stage === 2 ? 'bg-purple-400' : 'bg-white'}`} 
                                style={{left: `${activeSkillCheck.progress}%`}} 
                            />
                        </>
                    ) : (
                        <>
                             <div className="absolute left-[70%] right-[10%] top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500 z-0 flex items-center justify-center">
                                 <div className="text-[9px] font-bold text-emerald-400 -rotate-90">BONUS</div>
                             </div>
                             <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-cyan-500/20 border-l border-cyan-500 z-0" />
                             <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 relative z-10 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{width: `${activeSkillCheck.progress}%`}} />
                        </>
                    )}
                </div>
                
                <div className="text-slate-400 font-mono text-sm text-center">
                    {activeSkillCheck.type === SkillCheckType.MASH 
                        ? "Stop in GREEN zone for bonus,\nor fill to 100% for OVERCHARGE!" 
                        : "(Tap anywhere to stop)"}
                </div>
            </motion.div>
        )}
       </AnimatePresence>

       {/* --- Results Overlay --- */}
       <AnimatePresence>
           {resultData && (
               <BattleResultOverlay 
                    winner={resultData.winner}
                    rewards={resultData.rewards}
                    initialBird={playerBirdInstance}
                    onContinue={(playAgain) => onBattleComplete(resultData, playAgain)}
               />
           )}
       </AnimatePresence>
    </div>
  );
};

// Internal Sub-Component for Results
const BattleResultOverlay: React.FC<{
    winner: 'player' | 'opponent';
    rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem };
    initialBird: BirdInstance;
    onContinue: (playAgain: boolean) => void;
}> = ({ winner, rewards, initialBird, onContinue }) => {
    
    // XP Calculation Logic for Display
    const [displayXp, setDisplayXp] = useState(initialBird.xp);
    const [displayLevel, setDisplayLevel] = useState(initialBird.level);
    const [displayMaxXp, setDisplayMaxXp] = useState(initialBird.xpToNextLevel);
    const [levelUp, setLevelUp] = useState(false);

    useEffect(() => {
        if (winner !== 'player') return;

        let currentXp = initialBird.xp;
        let currentLevel = initialBird.level;
        let currentMax = initialBird.xpToNextLevel;
        let remainingReward = rewards.xp;

        // Animate XP
        const interval = setInterval(() => {
            if (remainingReward <= 0) {
                clearInterval(interval);
                return;
            }

            const step = Math.ceil(rewards.xp / 50); // Speed of fill
            const gain = Math.min(step, remainingReward);
            
            currentXp += gain;
            remainingReward -= gain;

            if (currentXp >= currentMax) {
                currentXp -= currentMax;
                currentLevel++;
                currentMax = Math.floor(XP_TABLE.BASE * Math.pow(currentLevel, XP_TABLE.GROWTH_FACTOR));
                setLevelUp(true);
                setTimeout(() => setLevelUp(false), 1000); // Reset flash
            }

            setDisplayXp(currentXp);
            setDisplayLevel(currentLevel);
            setDisplayMaxXp(currentMax);

        }, 30);

        return () => clearInterval(interval);

    }, [winner]);

    return (
       <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6">
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-center mb-8"
           >
               {winner === 'player' ? (
                   <>
                       <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)] font-tech italic">VICTORY</h1>
                       <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-2" />
                   </>
               ) : (
                   <h1 className="text-6xl font-black text-rose-600 font-tech">DEFEAT</h1>
               )}
           </motion.div>

           {winner === 'player' && (
               <div className="w-full max-w-sm space-y-6">
                    {/* Rewards Grid */}
                    <div className="flex flex-wrap justify-center gap-2">
                        <motion.div 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col items-center min-w-[80px]"
                        >
                            <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Currency</div>
                            <div className="flex items-center gap-1 text-xl font-tech font-bold text-yellow-400">
                                <Award size={18} /> +{rewards.feathers}
                            </div>
                        </motion.div>

                        {rewards.scrap > 0 && (
                            <motion.div 
                              initial={{ x: 0, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.25 }}
                              className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col items-center min-w-[80px]"
                            >
                                <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Scrap</div>
                                <div className="flex items-center gap-1 text-xl font-tech font-bold text-slate-300">
                                    <Hammer size={18} /> +{rewards.scrap}
                                </div>
                            </motion.div>
                        )}

                        {rewards.diamonds > 0 && (
                            <motion.div 
                              initial={{ x: 0, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.28 }}
                              className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col items-center min-w-[80px]"
                            >
                                <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Diamonds</div>
                                <div className="flex items-center gap-1 text-xl font-tech font-bold text-blue-400">
                                    <GemIcon size={18} /> +{rewards.diamonds}
                                </div>
                            </motion.div>
                        )}

                        {rewards.gem && (
                             <motion.div 
                               initial={{ x: 0, opacity: 0, scale: 0.8 }}
                               animate={{ x: 0, opacity: 1, scale: 1 }}
                               transition={{ delay: 0.35 }}
                               className={`bg-slate-900 border p-2 rounded flex flex-col items-center min-w-[80px] ${RARITY_CONFIG[rewards.gem.rarity].borderColor}`}
                             >
                                 <div className={`text-[9px] uppercase font-bold mb-1 ${RARITY_CONFIG[rewards.gem.rarity].color}`}>Gem Found!</div>
                                 <div className={`flex items-center gap-1 text-lg font-tech font-bold ${RARITY_CONFIG[rewards.gem.rarity].color}`}>
                                     <Hexagon size={18} /> {rewards.gem.name}
                                 </div>
                             </motion.div>
                        )}

                        <motion.div 
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col items-center min-w-[80px]"
                        >
                             <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Experience</div>
                             <div className="flex items-center gap-1 text-xl font-tech font-bold text-cyan-400">
                                <Zap size={18} /> +{rewards.xp}
                            </div>
                        </motion.div>
                    </div>

                    <motion.div 
                         initial={{ y: 20, opacity: 0 }}
                         animate={{ y: 0, opacity: 1 }}
                         transition={{ delay: 0.4 }}
                         className="bg-slate-900 border border-slate-800 p-6 rounded relative overflow-hidden"
                    >
                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <div className="text-xl font-bold font-tech flex items-center gap-2">
                                LEVEL {displayLevel}
                                {levelUp && <motion.span initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-yellow-400 text-sm font-black flex items-center"><ChevronsUp size={16}/> UP!</motion.span>}
                            </div>
                            <div className="text-xs font-mono text-slate-400">{Math.floor(displayXp)} / {displayMaxXp} XP</div>
                        </div>

                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative z-10">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                style={{ width: `${(displayXp / displayMaxXp) * 100}%` }}
                            />
                        </div>
                        
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.5)_0%,transparent_70%)]" />
                    </motion.div>
               </div>
           )}

           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 1 }}
             className="mt-12 w-full max-w-sm flex gap-3"
           >
                <Button onClick={() => onContinue(false)} size="lg" fullWidth variant="secondary">
                   <Map className="mr-2" size={18} /> RETURN
               </Button>
               <Button onClick={() => onContinue(true)} size="lg" fullWidth className="animate-pulse">
                   <RotateCcw className="mr-2" size={18} /> BATTLE AGAIN
               </Button>
           </motion.div>
       </motion.div>
    );
};
