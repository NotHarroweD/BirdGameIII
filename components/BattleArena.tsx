
import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, Weather, SkillCheckType, BattleResult, Rarity, Gear, StatType, Gem, ActiveBuff, ConsumableType, Consumable, APShopState, GearPrefix, EnemyPrefix, ZoneClearReward, GearType } from '../types';
import { BIRD_TEMPLATES, RARITY_CONFIG, rollRarity, generateBird, XP_TABLE, BUFF_LABELS, generateGem, generateCraftedGear } from '../constants';
import { Button } from './Button';
import { HealthBar } from './HealthBar';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Activity, ArrowUp, ArrowDown, Cloud, CloudLightning, Wind, Crosshair, Zap, Award, ChevronsUp, ChevronRight, Shield, Heart, RotateCcw, Map, Hammer, Gem as GemIcon, Droplets, Skull, Hexagon, Eye, Moon, Flame, Briefcase, Check, AlertCircle, AlertTriangle, Star, Sparkles, Info, X } from 'lucide-react';
import { getAITurn } from '../services/geminiService';
import { BattleResultOverlay } from './BattleResultOverlay';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  highestZone: number;
  onBattleComplete: (result: BattleResult, playAgain: boolean) => void;
  onZoneCleared?: (reward: ZoneClearReward) => void;
  activeBuffs?: ActiveBuff[]; 
  apShop?: APShopState;
  currentZoneProgress?: Rarity[];
  requiredRarities?: Rarity[];
  gemUnlocked?: boolean;
}

const ENEMY_TYPE_INFO: Record<EnemyPrefix, { description: string, stats: string, rewards: string }> = {
    [EnemyPrefix.NONE]: { description: 'Standard Enemy', stats: 'Base Stats', rewards: 'Standard' },
    [EnemyPrefix.MERCHANT]: { description: 'Wealthy Carrier', stats: '+50% HP, +50% ATK', rewards: '3x Feathers' },
    [EnemyPrefix.HOARDER]: { description: 'Item Collector', stats: '+100% HP, +50% DEF', rewards: 'Guaranteed Item' },
    [EnemyPrefix.SCRAPOHOLIC]: { description: 'Scrap Scavenger', stats: '+100% DEF', rewards: '3x Scrap, Guaranteed Drop' },
    [EnemyPrefix.GENIUS]: { description: 'Tactical Mind', stats: '+50% ATK, +50% SPD', rewards: '3x XP' },
    [EnemyPrefix.GEMFINDER]: { description: 'Crystal Seeker', stats: 'High Random Stat', rewards: 'Guaranteed Gem' },
};

const PREFIX_STYLES: Record<EnemyPrefix, { color: string, animation: any }> = {
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
const getScaledStats = (bird: BirdInstance, level: number, isEnemy: boolean = false) => {
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
  reflexTargets?: { id: number; x: number; y: number; value: number; hit: boolean }[]; // For REFLEX
}

const ZoneProgress: React.FC<{ 
    progress: Rarity[], 
    required: Rarity[], 
    currentOpponentRarity?: Rarity,
    isVictory?: boolean
}> = ({ progress, required, currentOpponentRarity, isVictory }) => {
    return (
        <div className="flex items-center gap-1">
            {required.map((rarity, index) => {
                const isCollected = progress.includes(rarity);
                // Check if this specific instance is fulfilling a new rarity requirement
                const isNewUnlock = isVictory && currentOpponentRarity === rarity && !isCollected;
                const config = RARITY_CONFIG[rarity];
                
                return (
                    <div key={rarity} className="relative">
                        <div 
                            className={`w-3 h-3 rotate-45 border transition-all duration-500 ${
                                isCollected || isNewUnlock
                                    ? `${config.color.replace('text-', 'bg-')} ${config.borderColor}` 
                                    : `bg-slate-900 border-slate-700 opacity-50`
                            } ${isNewUnlock ? 'animate-pulse shadow-[0_0_10px_white]' : ''}`}
                            title={config.name}
                        />
                        {(isCollected || isNewUnlock) && (
                            <div className={`absolute inset-0 flex items-center justify-center -rotate-45`}>
                                {/* Checkmark or Effect */}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const BattleArena: React.FC<BattleArenaProps> = ({ 
    playerBirdInstance, 
    enemyLevel, 
    highestZone,
    onBattleComplete, 
    onZoneCleared,
    activeBuffs = [], 
    apShop,
    currentZoneProgress = [],
    requiredRarities = [],
    gemUnlocked = false
}) => {
  const playerStats = getScaledStats(playerBirdInstance, playerBirdInstance.level);
  
  const [playerBird, setPlayerBird] = useState<BattleBird>({ 
    ...playerStats,
    currentHp: playerStats.maxHp, 
    currentEnergy: playerStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW
  });

  const opponentRef = useRef<BirdInstance | null>(null);
  
  if (!opponentRef.current) {
      const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
      let rarity = rollRarity(enemyLevel * 25 + 10, 'CRAFT', 1);
      const missingRarities = requiredRarities.filter(r => !currentZoneProgress.includes(r));
      if (missingRarities.length > 0 && Math.random() < 0.20) {
            rarity = missingRarities[Math.floor(Math.random() * missingRarities.length)];
      }
      
      const instance = generateBird(template, rarity);
      instance.level = enemyLevel;
      opponentRef.current = instance;
  }
  
  const opponentStats = getScaledStats(opponentRef.current!, enemyLevel, true);

  // Apply Enemy Prefix Logic
  useEffect(() => {
        if (!opponentRef.current) return;
        
        let prefix = EnemyPrefix.NONE;
        if (Math.random() < 0.25) { 
            const types = [EnemyPrefix.MERCHANT, EnemyPrefix.HOARDER, EnemyPrefix.SCRAPOHOLIC, EnemyPrefix.GENIUS, EnemyPrefix.GEMFINDER];
            prefix = types[Math.floor(Math.random() * types.length)];
        }

        let finalMaxHp = opponentStats.maxHp;
        let finalAttack = opponentStats.attack;
        let finalDefense = opponentStats.defense;
        let finalSpeed = opponentStats.speed;

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

        setOpponentBird(prev => ({
            ...prev,
            maxHp: finalMaxHp,
            currentHp: finalMaxHp, // Ensure current starts full
            attack: finalAttack,
            defense: finalDefense,
            speed: finalSpeed,
            enemyPrefix: prefix
        }));
  }, []);

  const [opponentBird, setOpponentBird] = useState<BattleBird>({ 
    ...opponentStats,
    currentHp: opponentStats.maxHp, 
    currentEnergy: opponentStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW,
    enemyPrefix: EnemyPrefix.NONE
  });

  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  
  const [resultData, setResultData] = useState<{
      winner: 'player' | 'opponent';
      opponentRarity: Rarity;
      rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem; consumable?: Consumable };
      zoneClearReward?: ZoneClearReward;
  } | null>(null);
  
  const playerBirdRef = useRef(playerBird);
  const opponentBirdRef = useRef(opponentBird);
  const winnerRef = useRef(winner);
  
  useEffect(() => { playerBirdRef.current = playerBird; }, [playerBird]);
  useEffect(() => { opponentBirdRef.current = opponentBird; }, [opponentBird]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);

  const [activeSkillCheck, setActiveSkillCheck] = useState<ActiveSkillCheck | null>(null);
  const skillCheckRef = useRef<ActiveSkillCheck | null>(null);

  const [lastUsedMap, setLastUsedMap] = useState<Record<string, number>>({});
  const lastUsedMapRef = useRef<Record<string, number>>({}); 
  
  useEffect(() => { lastUsedMapRef.current = lastUsedMap; }, [lastUsedMap]);
  useEffect(() => { skillCheckRef.current = activeSkillCheck; }, [activeSkillCheck]);

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

  const getAPMult = (level: number) => {
      return 1 + (level * 0.02);
  };

  const executeMove = async (attacker: BattleBird, defender: BattleBird, move: Move, isPlayer: boolean, multiplier: number, secondaryMultiplier: number = 0) => {
    // Anim
    const anim = isPlayer ? playerAnim : opponentAnim;
    
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        const xMove = isPlayer ? 60 : -60;
        const yMove = isPlayer ? -60 : 60;
        await anim.start({ x: -xMove * 0.2, y: -yMove * 0.2, scale: 0.9, transition: { duration: 0.1 } });
        await anim.start({ x: xMove, y: yMove, scale: 1.2, transition: { duration: 0.08, ease: "easeIn" } });
        anim.start({ x: 0, y: 0, scale: 1, transition: { duration: 0.3, type: "spring" } });
    }

    let accuracy = move.accuracy;
    
    if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
        if (defender.speed > attacker.speed) {
            if (attacker.id !== 'hawk') {
                const speedDelta = defender.speed - attacker.speed;
                const evasionChance = Math.min(40, speedDelta * 0.5);
                accuracy -= evasionChance;
            }
        }
    }
    
    if (multiplier >= 1.5) accuracy += 20;

    const hit = Math.random() * 100 <= accuracy;
    
    const setAttacker = isPlayer ? setPlayerBird : setOpponentBird;
    const setDefender = isPlayer ? setOpponentBird : setPlayerBird;
    const currentAttackerState = isPlayer ? playerBirdRef.current : opponentBirdRef.current;
    const currentDefenderState = isPlayer ? opponentBirdRef.current : playerBirdRef.current;
    
    const attackerTarget = isPlayer ? 'player' : 'opponent';
    const defenderTarget = isPlayer ? 'opponent' : 'player';

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
            let damage = move.power * (currentAttackerState.attack / currentDefenderState.defense);
            
            let isCrit = false;
            if (currentAttackerState.gear?.beak) {
                const critChance = currentAttackerState.gear.beak.paramValue || 0;
                if (Math.random() * 100 < critChance) {
                    isCrit = true;
                    damage *= 1.5;
                }
            }

            if (attacker.id === 'eagle' && defender.currentHp < defender.maxHp * 0.5) {
                damage *= 1.25;
                queueText("PREDATOR", attackerTarget, "text-rose-500", 1.0, 0, 50);
            }

            if (currentAttackerState.altitude > currentDefenderState.altitude) damage *= 1.2;
            damage *= multiplier;

            if (currentAttackerState.altitude === Altitude.HIGH && Math.random() < 0.25) {
                damage *= 1.5;
            }

            damage = Math.floor(damage);
            
            if (move.effect === 'lifesteal' || move.type === MoveType.DRAIN) {
                 const healFactor = move.type === MoveType.DRAIN ? (secondaryMultiplier > 0 ? secondaryMultiplier : 0.25) : 0.5;
                 const healAmt = Math.floor(damage * healFactor);
                 setAttacker(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + healAmt) }));
                 queueText(`+${healAmt} HP (DRAIN)`, attackerTarget, "text-purple-400", 1.2, 500, 40);
            }
            
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

            const victimAnim = isPlayer ? playerAnim : opponentAnim;
            victimAnim.start({ x: [0, 15, -15, 10, -10, 0], transition: { duration: 0.3 } });

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
        if (defender.speed > attacker.speed && Math.random() < 0.5) {
             queueText("DODGED!", defenderTarget, "text-cyan-400", 1.5, 0);
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
          // Use current ref to ensure we get the updated prefix state
          const opponent = opponentBirdRef.current;
          const rarityConfig = RARITY_CONFIG[opponent.rarity];
          const rarityMult = rarityConfig.minMult; 
          
          let xpBonus = 0;
          let scrapBonus = 0;
          let featherBonus = 0;
          let diamondChanceBonus = 0;
          let gemFindBonus = 0;
          let itemFindBonus = 0;

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
                           if (b.stat === 'ITEM_FIND_CHANCE') itemFindBonus += b.value;
                       });
                   }
               });
          };
          addGemBuffs(playerBirdInstance.gear.beak);
          addGemBuffs(playerBirdInstance.gear.claws);

          const rewardBuff = activeBuffs.find(b => b.type === ConsumableType.BATTLE_REWARD);
          let consumableMult = 1.0;
          if (rewardBuff) {
              consumableMult = rewardBuff.multiplier;
          }

          const apFeatherMult = getAPMult(apShop?.featherBoost || 0);
          const apScrapMult = getAPMult(apShop?.scrapBoost || 0);
          const apDiamondMult = getAPMult(apShop?.diamondBoost || 0);
          const apItemMult = getAPMult(apShop?.itemDropBoost || 0);
          const apGemMult = getAPMult(apShop?.gemDropBoost || 0);

          // Apply Prefix Bonuses
          let prefixXpMult = opponent.enemyPrefix === EnemyPrefix.GENIUS ? 3 : 1;
          let prefixFeatherMult = opponent.enemyPrefix === EnemyPrefix.MERCHANT ? 3 : 1;
          let prefixScrapMult = opponent.enemyPrefix === EnemyPrefix.SCRAPOHOLIC ? 3 : 1;
          
          const baseXp = 100 * (1 + enemyLevel * 0.5) * rarityMult * prefixXpMult;
          const xpReward = Math.floor(baseXp * (1 + (xpBonus / 100)));
          
          const baseFeathers = 50 * (1 + enemyLevel * 0.2) * rarityMult * prefixFeatherMult;
          const featherReward = Math.floor(baseFeathers * (1 + (featherBonus / 100)) * consumableMult * apFeatherMult);
          
          let scrapChance = 0;
          let scrapMin = 0;
          let scrapMax = 0;

          switch (opponent.rarity) {
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
          // Scrapoholic always drops scrap
          if (Math.random() < scrapChance || opponent.enemyPrefix === EnemyPrefix.SCRAPOHOLIC) {
              const baseScrap = scrapMin + Math.random() * (scrapMax - scrapMin);
              scrapReward = Math.floor(baseScrap * levelScale * (1 + (scrapBonus / 100)) * consumableMult * apScrapMult * prefixScrapMult);
          }

          let diamondReward = 0;
          const baseDiamondChance = 5.0; 
          const totalDiamondChance = (baseDiamondChance + diamondChanceBonus) * apDiamondMult;
          if (Math.random() * 100 < totalDiamondChance) {
               diamondReward = 1;
          }

          let gemReward: Gem | undefined;
          let totalGemChance = 0;
          
          // Check for Gemfinder prefix first to guarantee drop regardless of unlock status
          if (opponent.enemyPrefix === EnemyPrefix.GEMFINDER) {
              totalGemChance = 1000;
          } else if (gemUnlocked) {
              // Only drop standard gems if unlocked
              const baseGemChance = 0.5; 
              let rarityGemBonus = 0;
              switch (opponentBird.rarity) {
                  case Rarity.RARE: rarityGemBonus = 0.5; break;
                  case Rarity.EPIC: rarityGemBonus = 1.5; break;
                  case Rarity.LEGENDARY: rarityGemBonus = 3.0; break;
                  case Rarity.MYTHIC: rarityGemBonus = 5.0; break;
              }
              totalGemChance = (baseGemChance + rarityGemBonus + gemFindBonus) * apGemMult;
          }
          
          if (Math.random() * 100 < totalGemChance) {
              const gem = generateGem(rollRarity(opponentBird.rarity === Rarity.COMMON ? 0 : 2)); 
              gemReward = gem;
          }

          let consumableReward: Consumable | undefined;
          let totalItemChance = 0;

          if (opponent.enemyPrefix === EnemyPrefix.HOARDER) {
              // Guaranteed Item Drop for Hoarders
              totalItemChance = 1000;
          } else {
              let baseConsumableChance = 5.0; 
              switch (opponentBird.rarity) {
                  case Rarity.COMMON: baseConsumableChance = 3.0; break;
                  case Rarity.UNCOMMON: baseConsumableChance = 5.0; break;
                  case Rarity.RARE: baseConsumableChance = 8.0; break;
                  case Rarity.EPIC: baseConsumableChance = 12.0; break;
                  case Rarity.LEGENDARY: baseConsumableChance = 18.0; break;
                  case Rarity.MYTHIC: baseConsumableChance = 25.0; break;
              }
              totalItemChance = (baseConsumableChance + itemFindBonus) * apItemMult;
          }

          if (Math.random() * 100 < totalItemChance) {
              const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
              const rarity = rollRarity(-1); 
              consumableReward = { type, rarity, count: 1 };
          }

          // ZONE CLEAR LOGIC
          let zoneClearReward: ZoneClearReward | undefined;
          const isHighestZone = enemyLevel === highestZone;
          
          if (isHighestZone) {
              // Use flexible matching logic similar to GameLogic to ensure popup triggers correctly
              const RARITY_ORDER = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];
              const opponentRarityIdx = RARITY_ORDER.indexOf(opponent.rarity);
              let satisfiedRarity: Rarity | null = null;

              if (!currentZoneProgress.includes(opponent.rarity)) {
                  satisfiedRarity = opponent.rarity;
              } else {
                  // Check if this victory satisfies a lower pending requirement
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
                  // Construct hypothetical progress including this battle's win
                  const newProgress = [...currentZoneProgress, satisfiedRarity];
                  const isZoneCleared = requiredRarities?.every(r => newProgress.includes(r)) ?? false;
                  
                  if (isZoneCleared) {
                      const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
                      // Generate rarity based on zone difficulty
                      const rarity = rollRarity(enemyLevel * 10, 'CRAFT', 1);
                      const rewardItem: Consumable = { type, rarity, count: 1 };

                      zoneClearReward = {
                          feathers: enemyLevel * 200,
                          scrap: enemyLevel * 50,
                          consumable: rewardItem
                      };
                      // Trigger the popup immediately via App handler to credit rewards now
                      if (onZoneCleared) {
                          onZoneCleared(zoneClearReward);
                      }
                  }
              }
          }
          
          setTimeout(() => {
              setResultData({ 
                  winner: 'player', 
                  opponentRarity: opponent.rarity,
                  // Note: zoneClearReward is intentionally NOT passed here to prevent double-crediting in handleBattleComplete
                  rewards: { xp: xpReward, feathers: featherReward + (zoneClearReward?.feathers || 0), scrap: scrapReward + (zoneClearReward?.scrap || 0), diamonds: diamondReward, gem: gemReward, consumable: consumableReward },
              });
          }, 1500);
      } else {
          setTimeout(() => {
              setResultData({ 
                  winner: 'opponent', 
                  opponentRarity: opponentBirdRef.current.rarity,
                  rewards: { xp: 10, feathers: 5, scrap: 0, diamonds: 0 } 
              });
          }, 1500);
      }
  };

  // ... (Resolve minigame logic unchanged)
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
      } else if (check.type === SkillCheckType.DRAIN_GAME) {
          multiplier = check.storedMultiplier || 1.0; 
          const dist = Math.abs(progress - 50);
          if (dist < 5) secondaryMultiplier = 1.0; 
          else if (dist < 15) secondaryMultiplier = 0.5; 
          else secondaryMultiplier = 0.1; 
      }
      let text = "GOOD";
      let color = "text-white";
      if (multiplier >= 1.5) { text = "PERFECT!"; color = "text-yellow-400"; }
      else if (multiplier < 0.8) { text = "WEAK"; color = "text-slate-500"; }
      
      if (check.type === SkillCheckType.COMBO || check.type === SkillCheckType.DRAIN_GAME) {
           if (secondaryMultiplier === 1.0) { text = "MAX DRAIN!"; color = "text-purple-400"; }
           else if (secondaryMultiplier === 0.1) { text = "POOR ABSORB"; color = "text-slate-400"; }
      }
      // Explicitly set target to 'opponent' so it appears on the right side of the screen (enemy side)
      spawnFloatingText(text, 'opponent', 0, -50, color, 2);
      executeMove(playerBirdRef.current, opponentBirdRef.current, check.move, true, multiplier, secondaryMultiplier);
  };

  const advanceComboStage = () => {
      const check = skillCheckRef.current;
      if (!check || check.stage !== 1) return;
      const progress = check.progress;
      let dmgMult = 1.0;
      if (check.type === SkillCheckType.COMBO) {
          if (progress >= 45 && progress <= 55) dmgMult = 1.5;
          else if (progress >= 30 && progress <= 70) dmgMult = 1.2;
          else dmgMult = 0.8;
      } else if (check.type === SkillCheckType.DRAIN_GAME) {
          if (progress >= 90) dmgMult = 1.5;
          else if (progress >= 60) dmgMult = 1.2;
          else if (progress >= 30) dmgMult = 1.0;
          else dmgMult = 0.5;
      }
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
      spawnFloatingText(dmgMult >= 1.5 ? "POWER MAX!" : "CHARGED", 'opponent', 0, -80, "text-cyan-400", 1.5);
  };

  // Interpolate Color Helper for Reflex Game
  // t: 0 (Red/Empty) -> 1 (Full/Color)
  const getReflexColor = (type: MoveType, value: number) => {
      const t = value / 100;
      // Start Colors (Emerald for Heal, Cyan for Shield)
      const start = type === MoveType.HEAL ? [16, 185, 129] : [6, 182, 212];
      // End Color (Rose-600)
      const end = [225, 29, 72]; 
      
      const r = Math.round(end[0] + (start[0] - end[0]) * t);
      const g = Math.round(end[1] + (start[1] - end[1]) * t);
      const b = Math.round(end[2] + (start[2] - end[2]) * t);
      
      return `rgb(${r}, ${g}, ${b})`;
  };

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
  const aiNextActionTime = useRef(0);

  const startLoop = () => {
    const loop = () => {
      if (winnerRef.current) return;
      const now = Date.now();
      const delta = now - lastTickRef.current;
      if (skillCheckRef.current) {
          const check = skillCheckRef.current;
          if (check.type === SkillCheckType.TIMING || check.type === SkillCheckType.COMBO) {
              const speed = check.type === SkillCheckType.COMBO && check.stage === 2 ? 2.5 : 1.5;
              let p = check.progress + (speed * (delta/16)) * (check.direction || 1);
              if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1;
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
          } else if (check.type === SkillCheckType.REFLEX && check.reflexTargets) {
              // REFLEX GAME: Use functional update to prevent overwriting user input ('hit' status)
              setActiveSkillCheck(prev => {
                  if (!prev || prev.type !== SkillCheckType.REFLEX || !prev.reflexTargets) return prev;
                  
                  const newTargets = prev.reflexTargets.map(t => {
                      // Only drain value if not hit.
                      if (!t.hit && t.value > 0) {
                          return { ...t, value: Math.max(0, t.value - (0.4 * (delta/16))) };
                      }
                      return t;
                  });
                  
                  return { ...prev, reflexTargets: newTargets };
              });
          } else if (check.type === SkillCheckType.DRAIN_GAME) {
              if (check.stage === 1) {
                  const speed = 2.0; 
                  let p = check.progress + (speed * (delta/16)) * (check.direction || 1);
                  if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1;
                  check.progress = Math.max(0, Math.min(100, p));
                  setActiveSkillCheck({...check});
              } else {
                  const speed = 3.0;
                  let p = check.progress + (speed * (delta/16)) * (check.direction || 1);
                  if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1;
                  check.progress = Math.max(0, Math.min(100, p));
                  setActiveSkillCheck({...check});
              }
          }
      }
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
          const applyVulturePassive = (bird: BattleBird, setBird: React.Dispatch<React.SetStateAction<BattleBird>>, target: 'player'|'opponent') => {
              if (bird.id === 'vulture') {
                  const heal = Math.ceil(bird.maxHp * 0.03); 
                  setBird(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + heal) }));
              }
          };
          applyVulturePassive(playerBirdRef.current, setPlayerBird, 'player');
          applyVulturePassive(opponentBirdRef.current, setOpponentBird, 'opponent');
      }
      if (delta >= 100) {
          const factor = delta/1000;
          const applyEnergyRegen = (bird: BattleBird, setBird: React.Dispatch<React.SetStateAction<BattleBird>>) => {
             const baseRegen = 5;
             const effectiveRegen = bird.id === 'hummingbird' ? baseRegen * 1.5 : baseRegen;
             setBird(prev => ({...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + (effectiveRegen * factor))}));
          };
          applyEnergyRegen(playerBirdRef.current, setPlayerBird);
          applyEnergyRegen(opponentBirdRef.current, setOpponentBird);
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
          let reflexTargets = undefined;
          if (move.skillCheck === SkillCheckType.REFLEX) {
              reflexTargets = [
                  { id: 1, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                  { id: 2, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                  { id: 3, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false }
              ];
          }
          setActiveSkillCheck({ 
              type: move.skillCheck, 
              move, 
              startTime: Date.now(), 
              progress: move.skillCheck === SkillCheckType.TIMING ? 0 : 20, 
              direction: 1,
              stage: 1,
              reflexTargets
          });
      } else {
          executeMove(playerBird, opponentBird, move, true, 1.0);
      }
  };
  
  const handleMash = (e: React.PointerEvent) => {
      e.preventDefault();
      const check = skillCheckRef.current;
      if (!check) return;
      
      // Ignore MASH handling for REFLEX type (handled by button clicks)
      if (check.type === SkillCheckType.REFLEX) return;

      if (check.type === SkillCheckType.MASH) {
          setActiveSkillCheck(prev => prev ? ({...prev, progress: Math.min(100, prev.progress + 8)}) : null);
      } else if (check.type === SkillCheckType.TIMING) {
          resolveMinigame();
      } else if (check.type === SkillCheckType.COMBO || check.type === SkillCheckType.DRAIN_GAME) {
          if (check.stage === 1) {
              advanceComboStage();
          } else {
              resolveMinigame();
          }
      }
  };

  const handleReflexTap = (e: React.PointerEvent, id: number) => {
      e.stopPropagation();
      e.preventDefault(); 

      setActiveSkillCheck(prev => {
          if (!prev || prev.type !== SkillCheckType.REFLEX || !prev.reflexTargets) return prev;

          const clickedTarget = prev.reflexTargets.find(t => t.id === id);
          if (!clickedTarget || clickedTarget.hit) return prev;

          spawnParticles(e.clientX, e.clientY, prev.move.type === MoveType.HEAL ? "#10b981" : "#06b6d4", 5);

          const newTargets = prev.reflexTargets.map(t => t.id === id ? { ...t, hit: true } : t);
          
          if (newTargets.every(t => t.hit)) {
              // Resolve Reflex Game immediately
              const avgValue = newTargets.reduce((sum, t) => sum + t.value, 0) / 3;
              let multiplier = 1.0;
              let text = "OK";
              let color = "text-white";

              if (avgValue >= 70) {
                  multiplier = 1.5;
                  text = "PERFECT!";
                  color = "text-yellow-400";
              } else if (avgValue >= 30) {
                  multiplier = 1.2;
                  text = "GOOD";
                  color = "text-cyan-400";
              } else {
                  multiplier = 0.8;
                  text = "SLOW";
                  color = "text-slate-400";
              }

              spawnFloatingText(text, 'opponent', 0, -50, color, 2);
              
              setTimeout(() => {
                  setActiveSkillCheck(null);
                  executeMove(playerBirdRef.current, opponentBirdRef.current, prev.move, true, multiplier);
              }, 100);
              
              return { ...prev, reflexTargets: newTargets };
          } else {
              return { ...prev, reflexTargets: newTargets };
          }
      });
  };

  const prefix = opponentBird.enemyPrefix || EnemyPrefix.NONE;
  const isSpecial = prefix !== EnemyPrefix.NONE;
  const styleConfig = PREFIX_STYLES[prefix];

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

       {/* --- Top Bar (Threat Level & Progression) --- */}
       <div className="h-12 bg-slate-900/80 flex items-center justify-between px-4 text-xs font-bold border-b border-slate-800 z-10 shrink-0">
           <div 
               className={`flex items-center gap-2 ${isSpecial ? styleConfig.color : 'text-slate-400'} cursor-pointer hover:opacity-80 transition-opacity`}
               onClick={() => isSpecial && setShowThreatDetails(true)}
           >
               <Activity size={14} className={isSpecial ? 'animate-pulse' : ''} /> 
               <span className="uppercase font-bold tracking-wider">
                   {prefix === EnemyPrefix.NONE ? 'STANDARD THREAT' : `${prefix} THREAT`}
               </span>
               {isSpecial && <Info size={14} />}
           </div>
           
           {/* Zone Progress Indicators */}
           <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                   <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Zone {enemyLevel} Clearance</div>
                   <ZoneProgress progress={currentZoneProgress} required={requiredRarities} />
               </div>
           </div>
       </div>

       {/* Battle Stage */}
       <div className="flex-1 relative flex flex-col items-center overflow-hidden">
           {/* Opponent */}
           <motion.div animate={opponentAnim} className="flex-1 w-full flex flex-col items-center justify-center relative p-4 bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-2">
                     <div className="relative">
                        <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[opponentBird.rarity].borderColor} relative z-10`}>
                            <img 
                                src={opponentBird.imageUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/400x400/1e293b/475569?text=' + opponentBird.name;
                                }}
                            />
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
                         <div className="flex flex-col items-center mb-1">
                             <div className={`text-2xl font-black font-tech uppercase tracking-tighter leading-none ${RARITY_CONFIG[opponentBird.rarity].color} drop-shadow-md text-center flex flex-col items-center gap-1`}>
                                 {isSpecial && (
                                     <motion.span 
                                        className={`text-sm ${styleConfig.color} tracking-widest`}
                                        animate={styleConfig.animation}
                                     >
                                         {prefix}
                                     </motion.span>
                                 )}
                                 <span>{opponentBird.name}</span>
                             </div>
                         </div>
                         <HealthBar current={opponentBird.currentHp} max={opponentBird.maxHp} type="health" showValue={true} />
                         <div className="h-1" />
                         <HealthBar current={opponentBird.currentEnergy} max={opponentBird.maxEnergy} type="energy" showValue={true} />
                     </div>
                </div>
                {/* Floating Texts */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {floatingTexts.filter(ft => ft.target === 'opponent').map(ft => (
                        <motion.div 
                            key={ft.id} 
                            initial={{ y: 0, opacity: 0, scale: 0.2 }} 
                            animate={{ 
                                y: -120, 
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, ft.scale! * 1.5, ft.scale! * 1.0],
                            }} 
                            transition={{ duration: 2, ease: "easeOut", times: [0, 0.2, 0.7, 1] }}
                            className={`absolute font-black text-5xl whitespace-nowrap z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] ${ft.color}`} 
                            style={{ marginLeft: ft.x, WebkitTextStroke: '1px black' }}
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
           <motion.div animate={playerAnim} className="flex-1 w-full flex flex-col items-center justify-end md:justify-center relative p-2 pb-4 md:p-4 bg-gradient-to-t from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-2">
                     <div className="w-48 mb-2">
                         <div className="flex flex-col items-center mb-1">
                             <div className={`text-xl font-black font-tech uppercase tracking-tighter leading-none ${RARITY_CONFIG[playerBird.rarity].color} drop-shadow-md text-center`}>
                                 {playerBird.name}
                             </div>
                         </div>
                         <HealthBar current={playerBird.currentHp} max={playerBird.maxHp} type="health" showValue={true} />
                         <div className="h-1" />
                         <HealthBar current={playerBird.currentEnergy} max={playerBird.maxEnergy} type="energy" showValue={true} />
                     </div>

                     <div className="relative">
                        <div className={`w-28 h-28 md:w-40 md:h-40 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[playerBird.rarity].borderColor} relative z-10`}>
                            <img 
                                src={playerBird.imageUrl} 
                                className="w-full h-full object-cover scale-x-[-1]" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/400x400/1e293b/475569?text=' + playerBird.name;
                                }}
                            />
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
                                scale: [0.5, ft.scale! * 1.5, ft.scale! * 1.0],
                            }} 
                            transition={{ duration: 2, ease: "easeOut", times: [0, 0.2, 0.7, 1] }}
                            className={`absolute font-black text-5xl whitespace-nowrap z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] ${ft.color}`} 
                            style={{ marginLeft: ft.x, WebkitTextStroke: '1px black' }}
                        >
                            {ft.text}
                        </motion.div>
                    ))}
                 </div>
           </motion.div>
       </div>

       {/* Controls */}
       <div className="bg-slate-900 border-t border-slate-700 p-2 shrink-0 pb-6 md:pb-2 z-20">
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
                {activeSkillCheck.type === SkillCheckType.REFLEX && activeSkillCheck.reflexTargets ? (
                    <div className="absolute inset-0 w-full h-full relative">
                        <div className="absolute top-10 w-full text-center text-white font-tech text-2xl animate-pulse drop-shadow-md pointer-events-none z-50">
                            TAP TARGETS!
                        </div>
                        {activeSkillCheck.reflexTargets.map((t) => {
                            const currentColor = getReflexColor(activeSkillCheck.move.type, t.value);
                            return (
                                !t.hit && (
                                    <motion.button
                                        key={t.id}
                                        onPointerDown={(e) => handleReflexTap(e, t.id)}
                                        className="absolute w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl active:scale-95 transition-transform cursor-pointer"
                                        style={{ 
                                            left: `${t.x}%`, 
                                            top: `${t.y}%`, 
                                            transform: 'translate(-50%, -50%)',
                                            borderColor: currentColor,
                                            backgroundColor: 'rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {/* Circular Progress Draining */}
                                        <div 
                                            className="absolute inset-0 rounded-full opacity-50"
                                            style={{
                                                background: `conic-gradient(${currentColor} ${t.value}%, transparent 0)`
                                            }}
                                        />
                                        {/* Icon */}
                                        {activeSkillCheck.move.type === MoveType.HEAL ? (
                                            <Heart size={32} className="drop-shadow-md relative z-10" style={{ color: currentColor, fill: currentColor }} />
                                        ) : (
                                            <Shield size={32} className="drop-shadow-md relative z-10" style={{ color: currentColor, fill: currentColor }} />
                                        )}
                                    </motion.button>
                                )
                            );
                        })}
                    </div>
                ) : (
                    <>
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest text-center px-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                            {activeSkillCheck.type === SkillCheckType.TIMING ? "TAP WHEN GREEN!" : 
                            activeSkillCheck.type === SkillCheckType.COMBO 
                            ? (activeSkillCheck.stage === 1 ? "STAGE 1: POWER" : "STAGE 2: ABSORB")
                            : activeSkillCheck.type === SkillCheckType.DRAIN_GAME
                            ? (activeSkillCheck.stage === 1 ? "CHARGE POWER!" : "SYNC VITALITY!")
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
                            ) : activeSkillCheck.type === SkillCheckType.DRAIN_GAME ? (
                                activeSkillCheck.stage === 1 ? (
                                    <>
                                        <div className="absolute right-0 top-0 bottom-0 w-[30%] bg-blue-500/20 border-l border-blue-500 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-blue-300">MAX</span>
                                        </div>
                                        <div className="h-full bg-gradient-to-r from-blue-900 to-cyan-400 relative z-10 shadow-[0_0_15px_#22d3ee]" style={{width: `${activeSkillCheck.progress}%`}} />
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute left-[45%] right-[45%] top-0 bottom-0 bg-purple-500/40 border-x-2 border-purple-400 z-0 flex items-center justify-center shadow-[0_0_20px_rgba(192,132,252,0.5)]">
                                            <Heart size={16} className="text-purple-200 fill-purple-200" />
                                        </div>
                                        <motion.div 
                                            className="absolute w-2 h-full bg-white shadow-[0_0_15px_white] z-20"
                                            style={{left: `${activeSkillCheck.progress}%`}} 
                                        />
                                    </>
                                )
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
                    </>
                )}
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
                    currentZoneProgress={currentZoneProgress}
                    requiredRarities={requiredRarities}
                    opponentRarity={resultData.opponentRarity}
                    enemyPrefix={opponentBird.enemyPrefix}
                    isHighestZone={highestZone === enemyLevel}
               />
           )}
       </AnimatePresence>

       {/* --- Threat Details Modal --- */}
       <AnimatePresence>
           {showThreatDetails && isSpecial && (
               <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                   onClick={() => setShowThreatDetails(false)}
               >
                   <motion.div
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                       className="bg-slate-900 border-2 border-amber-500/50 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative"
                       onClick={e => e.stopPropagation()}
                   >
                       <button onClick={() => setShowThreatDetails(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                       
                       <div className="text-center mb-6">
                           <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/50">
                               <AlertTriangle size={32} className="text-amber-400" />
                           </div>
                           <h3 className="font-tech text-2xl text-white uppercase tracking-widest">{prefix} THREAT</h3>
                           <div className="text-amber-400 font-bold text-sm">{ENEMY_TYPE_INFO[prefix].description}</div>
                       </div>

                       <div className="space-y-4">
                           <div className="bg-slate-950 p-4 rounded border border-slate-800">
                               <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Combat Modifiers</div>
                               <div className="text-rose-400 font-mono font-bold text-sm">{ENEMY_TYPE_INFO[prefix].stats}</div>
                           </div>
                           <div className="bg-slate-950 p-4 rounded border border-slate-800">
                               <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Victory Rewards</div>
                               <div className="text-emerald-400 font-mono font-bold text-sm">{ENEMY_TYPE_INFO[prefix].rewards}</div>
                           </div>
                       </div>
                       
                       <div className="mt-6 text-center text-[10px] text-slate-500 italic">
                           Tap anywhere to close
                       </div>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};
