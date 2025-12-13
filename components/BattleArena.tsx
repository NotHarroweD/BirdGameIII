
import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, Weather, SkillCheckType, BattleResult, Rarity, Gear, StatType, Gem, ActiveBuff, ConsumableType, Consumable, APShopState, GearPrefix, EnemyPrefix } from '../types';
import { BIRD_TEMPLATES, RARITY_CONFIG, rollRarity, generateBird, XP_TABLE, BUFF_LABELS, generateGem } from '../constants';
import { Button } from './Button';
import { HealthBar } from './HealthBar';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Activity, ArrowUp, ArrowDown, Cloud, CloudLightning, Wind, Crosshair, Zap, Award, ChevronsUp, ChevronRight, Shield, Heart, RotateCcw, Map, Hammer, Gem as GemIcon, Droplets, Skull, Hexagon, Eye, Moon, Flame, Briefcase, Check, AlertCircle, AlertTriangle, Star, Sparkles } from 'lucide-react';
import { getAITurn } from '../services/geminiService';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  highestZone: number; // New Prop for context
  onBattleComplete: (result: BattleResult, playAgain: boolean) => void;
  activeBuffs?: ActiveBuff[]; 
  apShop?: APShopState;
  currentZoneProgress?: Rarity[];
  requiredRarities?: Rarity[];
  gemUnlocked?: boolean;
}

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
    // Player scaling buffed to 20% per level (was 10%) to help keep up with enemy difficulty
    // Enemies keep 10% base scaling, but get the difficulty multiplier below
    const growthRate = isEnemy ? 0.1 : 0.2;
    let scale = 1 + (level * growthRate);
    
    // For enemies, add extra difficulty multiplier per zone level
    if (isEnemy) {
        // Significantly increased difficulty scaling per zone
        // 15% per level, compounding aggression
        const difficultyMult = 1 + ((level - 1) * 0.15); 
        scale *= difficultyMult;
    }
    
    // Add Gear Bonuses
    let atkBonus = 0;
    let hpBonus = 0;
    let energyBonus = 0;
    let defBonus = 0;
    let spdBonus = 0;

    const applyGear = (gear: Gear | null) => {
        if (!gear) return;
        atkBonus += gear.attackBonus || 0;
        
        // Quality Prefix adds flat attack
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

const LootItem: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    subLabel: string, 
    borderColor: string, 
    bgColor: string, 
    textColor: string,
    delay: number,
    type: 'diamond' | 'gem' | 'item',
    isBonus?: boolean
}> = ({ icon, label, subLabel, borderColor, bgColor, textColor, delay, type, isBonus }) => {
    return (
        <motion.div 
            initial={{ scale: 0, y: 50, rotate: -10 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15, 
                delay: delay 
            }}
            className={`relative p-3 rounded-lg border-2 flex items-center gap-4 ${borderColor} ${bgColor} shadow-lg overflow-hidden group ${isBonus ? 'shadow-yellow-500/20' : ''}`}
        >
            {isBonus && (
                <>
                    <div className="absolute inset-0 bg-yellow-500/10 animate-pulse pointer-events-none" />
                    <div className="absolute top-0 right-0 p-1 z-20">
                        <span className="text-[8px] font-black bg-yellow-500 text-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">BONUS</span>
                    </div>
                </>
            )}

            {/* Animated Background Shine */}
            <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "linear", delay: delay + 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />

            <div className="relative">
                {/* Type specific background glow animation */}
                <motion.div 
                    animate={type === 'gem' ? { rotate: 360 } : type === 'diamond' ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className={`absolute inset-0 blur-md opacity-60 ${textColor.replace('text-', 'bg-')}`} 
                />
                <motion.div
                    animate={type === 'diamond' ? { rotateY: 360 } : {}}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="relative z-10"
                >
                    {icon}
                </motion.div>
            </div>

            <div className="text-left flex-1 min-w-0 z-10">
                <div className={`text-sm font-black tracking-wide ${textColor} drop-shadow-md`}>{label}</div>
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider opacity-80">{subLabel}</div>
            </div>
            
            <div className="z-10">
                {type === 'diamond' && <Sparkles size={16} className="text-blue-200 animate-pulse" />}
                {type === 'gem' && <Hexagon size={16} className={`${textColor} opacity-50`} />}
                {type === 'item' && <Award size={16} className={`${textColor} opacity-50`} />}
            </div>
        </motion.div>
    );
};

const BattleResultOverlay: React.FC<{
    winner: 'player' | 'opponent';
    rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem; consumable?: Consumable };
    initialBird: BirdInstance;
    onContinue: (playAgain: boolean) => void;
    currentZoneProgress: Rarity[];
    requiredRarities: Rarity[];
    opponentRarity: Rarity;
    enemyPrefix?: EnemyPrefix;
    isHighestZone: boolean;
}> = ({ winner, rewards, initialBird, onContinue, currentZoneProgress, requiredRarities, opponentRarity, enemyPrefix, isHighestZone }) => {
    
    const isVictory = winner === 'player';
    
    // Animation States
    const [displayFeathers, setDisplayFeathers] = useState(0);
    const [displayScrap, setDisplayScrap] = useState(0);
    const [displayXp, setDisplayXp] = useState(0);
    const [xpBarWidth, setXpBarWidth] = useState(0);
    const [showLoot, setShowLoot] = useState(false);
    const [showButtons, setShowButtons] = useState(false);

    // Calculate final level
    const finalLevel = React.useMemo(() => {
        if (!isVictory) return initialBird.level;
        let lvl = initialBird.level;
        let xp = initialBird.xp + rewards.xp;
        let next = initialBird.xpToNextLevel;
        while (xp >= next) {
            xp -= next;
            lvl++;
            next = Math.floor(XP_TABLE.BASE * Math.pow(lvl, XP_TABLE.GROWTH_FACTOR));
        }
        return lvl;
    }, [isVictory, initialBird, rewards]);

    // Calculate if zone cleared - if the last required rarity is collected
    const isZoneCleared = React.useMemo(() => {
        if (!isVictory || !isHighestZone) return false;
        const newProgress = new Set(currentZoneProgress);
        newProgress.add(opponentRarity);
        return requiredRarities.every(r => newProgress.has(r));
    }, [isVictory, currentZoneProgress, opponentRarity, requiredRarities, isHighestZone]);

    useEffect(() => {
        if (!isVictory) {
            setShowButtons(true);
            return;
        }

        // Reduced delay to let the Victory Title slam in
        const countDelay = 400; 
        
        const startXpPercent = (initialBird.xp / initialBird.xpToNextLevel) * 100;
        const endXpPercent = Math.min(100, ((initialBird.xp + rewards.xp) / initialBird.xpToNextLevel) * 100);
        
        setXpBarWidth(startXpPercent);

        let animationFrameId: number;
        let startTime: number;
        const duration = 800; // Faster counting (800ms vs 1500ms)

        const startCounting = () => {
            startTime = Date.now();
            const animate = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                
                // Exponential ease out for "rolling to a stop" feel
                const ease = 1 - Math.pow(1 - progress, 3);

                setDisplayFeathers(Math.floor(rewards.feathers * ease));
                setDisplayScrap(Math.floor(rewards.scrap * ease));
                setDisplayXp(Math.floor(rewards.xp * ease));
                setXpBarWidth(startXpPercent + ((endXpPercent - startXpPercent) * ease));

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    // Finished counting
                    setShowLoot(true);
                    setTimeout(() => setShowButtons(true), 300); // Buttons appear much quicker after loot
                }
            };
            animationFrameId = requestAnimationFrame(animate);
        };

        const timer = setTimeout(startCounting, countDelay);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isVictory]);

    // Auto-advance logic for Zone Clear
    useEffect(() => {
        if (showButtons && isZoneCleared) {
            const timer = setTimeout(() => {
                onContinue(false); // Go to Hub/Modal
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [showButtons, isZoneCleared, onContinue]);

    const isSpecialXp = enemyPrefix === EnemyPrefix.GENIUS;
    const isSpecialFeathers = enemyPrefix === EnemyPrefix.MERCHANT;
    const isSpecialScrap = enemyPrefix === EnemyPrefix.SCRAPOHOLIC;
    const isSpecialGem = enemyPrefix === EnemyPrefix.GEMFINDER;
    const isSpecialItem = enemyPrefix === EnemyPrefix.HOARDER;

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
        >
            <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className={`w-full max-w-sm bg-slate-900 border-2 p-1 rounded-2xl relative overflow-hidden flex flex-col items-center shadow-2xl max-h-[90vh] ${isVictory ? 'border-cyan-500 shadow-cyan-500/30' : 'border-rose-500 shadow-rose-500/30'}`}
            >
                {/* Content Container */}
                <div className="bg-slate-950/80 w-full h-full rounded-xl p-5 flex flex-col items-center gap-4 relative overflow-y-auto">
                    
                    {/* Animated Background Rays */}
                    {isVictory && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(6,182,212,0.1)_20deg,transparent_40deg,rgba(6,182,212,0.1)_60deg,transparent_80deg)] opacity-50"
                            />
                        </div>
                    )}

                    <div className="relative z-10 text-center shrink-0 w-full">
                        <motion.div
                            initial={{ scale: 3, opacity: 0, y: -50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
                        >
                            <h2 className={`font-tech text-6xl font-black italic tracking-tighter mb-1 ${isVictory ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}>
                                {isVictory ? 'VICTORY' : 'DEFEAT'}
                            </h2>
                        </motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0, width: 0 }} 
                            animate={{ opacity: 1, width: '100%' }} 
                            transition={{ delay: 0.3, duration: 0.3 }}
                            className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent w-full mb-2" 
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-400 text-xs font-mono uppercase tracking-[0.3em]"
                        >
                            {isVictory ? 'MISSION ACCOMPLISHED' : 'CRITICAL FAILURE'}
                        </motion.div>
                    </div>

                    {/* Rewards */}
                    {isVictory && (
                        <div className="w-full space-y-3 relative z-10">
                            {/* XP Bar */}
                            <motion.div 
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                className={`p-3 rounded-lg border relative overflow-hidden group shadow-lg ${isSpecialXp ? 'bg-cyan-900/40 border-cyan-500/50 shadow-cyan-500/20' : 'bg-slate-900 border-slate-800'}`}
                            >
                                <div className="flex justify-between items-center mb-1 relative z-10">
                                    <div className={`flex items-center gap-2 text-xs font-bold ${isSpecialXp ? 'text-cyan-300' : 'text-yellow-400'}`}>
                                        <Zap size={14} className={isSpecialXp ? 'fill-cyan-300' : 'fill-yellow-400'} /> XP GAINED
                                        {isSpecialXp && <span className="text-[8px] bg-cyan-500 text-black px-1 rounded ml-1 animate-pulse">BONUS</span>}
                                    </div>
                                    <motion.div 
                                        className={`font-mono text-lg font-bold ${isSpecialXp ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]' : 'text-white'}`}
                                        animate={showLoot ? { scale: [1, 1.3, 1], color: isSpecialXp ? '#67e8f9' : '#facc15' } : {}}
                                    >
                                        +{displayXp}
                                    </motion.div>
                                </div>
                                {/* Bar Container */}
                                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                                    <motion.div 
                                        className={`h-full relative ${isSpecialXp ? 'bg-gradient-to-r from-cyan-600 to-cyan-300' : 'bg-gradient-to-r from-yellow-600 to-yellow-300'}`}
                                        style={{ width: `${xpBarWidth}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px]" />
                                    </motion.div>
                                </div>
                                {xpBarWidth >= 100 && (
                                    <motion.div 
                                        initial={{ scale: 0, opacity: 0 }} 
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-20 backdrop-blur-sm"
                                    >
                                        <span className="text-yellow-400 font-black font-tech tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-2xl animate-pulse">LEVEL UP!</span>
                                        <span className="text-white font-mono font-bold text-xl mt-1 drop-shadow-md">LVL {finalLevel}</span>
                                    </motion.div>
                                )}
                            </motion.div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                 <motion.div 
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className={`p-3 rounded-lg border flex flex-col items-center shadow-md relative overflow-hidden ${isSpecialFeathers ? 'bg-yellow-900/30 border-yellow-500/50 shadow-yellow-500/20' : 'bg-slate-900/80 border-slate-800'}`}
                                >
                                     {isSpecialFeathers && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />}
                                     <div className="absolute inset-0 bg-cyan-500/5" />
                                     <div className={`text-[9px] uppercase font-bold tracking-wider mb-1 relative z-10 flex items-center gap-1 ${isSpecialFeathers ? 'text-yellow-300' : 'text-slate-500'}`}>
                                         Feathers {isSpecialFeathers && <Star size={8} className="fill-yellow-300 text-yellow-300" />}
                                     </div>
                                     <motion.div 
                                        className={`font-mono text-2xl font-black relative z-10 ${isSpecialFeathers ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]' : 'text-cyan-400'}`}
                                        animate={showLoot ? { scale: [1, 1.4, 1], textShadow: isSpecialFeathers ? "0 0 15px rgba(253,224,71,0.8)" : "0 0 10px rgba(34,211,238,0.5)" } : {}}
                                     >
                                         +{displayFeathers}
                                     </motion.div>
                                 </motion.div>
                                 <motion.div 
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className={`p-3 rounded-lg border flex flex-col items-center shadow-md relative overflow-hidden ${isSpecialScrap ? 'bg-slate-800 border-slate-400 shadow-slate-400/20' : 'bg-slate-900/80 border-slate-800'}`}
                                >
                                     {isSpecialScrap && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
                                     <div className="absolute inset-0 bg-slate-500/5" />
                                     <div className={`text-[9px] uppercase font-bold tracking-wider mb-1 relative z-10 flex items-center gap-1 ${isSpecialScrap ? 'text-white' : 'text-slate-500'}`}>
                                         Scrap {isSpecialScrap && <Star size={8} className="fill-white text-white" />}
                                     </div>
                                     <motion.div 
                                        className={`font-mono text-2xl font-black relative z-10 ${isSpecialScrap ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-slate-200'}`}
                                        animate={showLoot ? { scale: [1, 1.4, 1], textShadow: isSpecialScrap ? "0 0 15px rgba(255,255,255,0.8)" : "0 0 10px rgba(226,232,240,0.5)" } : {}}
                                     >
                                         +{displayScrap}
                                     </motion.div>
                                 </motion.div>
                            </div>

                            {/* Drop Sequence Container */}
                            <div className="space-y-3 min-h-[80px] py-2">
                                <AnimatePresence>
                                    {showLoot && (
                                        <>
                                            {rewards.diamonds > 0 && (
                                                <LootItem 
                                                    key="diamond"
                                                    type="diamond"
                                                    icon={<GemIcon size={24} className="text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.8)]" />}
                                                    label={`+${rewards.diamonds} DIAMONDS`}
                                                    subLabel="RARE CURRENCY"
                                                    borderColor="border-blue-500/50"
                                                    bgColor="bg-blue-950/40"
                                                    textColor="text-blue-200"
                                                    delay={0}
                                                />
                                            )}

                                            {rewards.gem && (
                                                <LootItem 
                                                    key="gem"
                                                    type="gem"
                                                    icon={<Hexagon size={24} className={`${RARITY_CONFIG[rewards.gem.rarity].color} drop-shadow-md`} />}
                                                    label={rewards.gem.name}
                                                    subLabel="SOCKETABLE GEM"
                                                    borderColor={RARITY_CONFIG[rewards.gem.rarity].borderColor}
                                                    bgColor="bg-slate-900/80"
                                                    textColor={RARITY_CONFIG[rewards.gem.rarity].color}
                                                    delay={0.1}
                                                    isBonus={isSpecialGem}
                                                />
                                            )}

                                            {rewards.consumable && (
                                                <LootItem 
                                                    key="item"
                                                    type="item"
                                                    icon={<Briefcase size={24} className={`${RARITY_CONFIG[rewards.consumable.rarity].color} drop-shadow-md`} />}
                                                    label={`${rewards.consumable.count > 1 ? `x${rewards.consumable.count} ` : ''}${rewards.consumable.type === 'HUNTING_SPEED' ? 'Chrono Feather' : 'Fortune Charm'}`}
                                                    subLabel="CONSUMABLE"
                                                    borderColor={RARITY_CONFIG[rewards.consumable.rarity].borderColor}
                                                    bgColor="bg-slate-900/80"
                                                    textColor={RARITY_CONFIG[rewards.consumable.rarity].color}
                                                    delay={0.2}
                                                    isBonus={isSpecialItem}
                                                />
                                            )}
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            {/* Zone Progress */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ delay: 0.8 }}
                                className="w-full bg-slate-900 p-2 rounded border border-slate-800 flex flex-col items-center gap-1 mt-auto"
                            >
                                 <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Zone Progress</div>
                                 <ZoneProgress progress={currentZoneProgress} required={requiredRarities} currentOpponentRarity={opponentRarity} isVictory={isVictory} />
                            </motion.div>
                        </div>
                    )}
                    
                    {!isVictory && (
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800 text-center relative z-10 w-full mb-4">
                            <Skull size={32} className="mx-auto text-slate-700 mb-2" />
                            <div className="text-slate-400 text-sm mb-2">Unit sustained heavy damage.</div>
                            <div className="text-[10px] text-slate-500 uppercase">Rewards Minimal</div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 w-full relative z-10 mt-auto min-h-[88px]">
                        <AnimatePresence>
                            {showButtons && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="flex flex-col gap-2 w-full"
                                >
                                    <Button fullWidth onClick={() => onContinue(true)} className="animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                        <RotateCcw size={16} className="mr-2" /> BATTLE AGAIN
                                    </Button>
                                    <Button fullWidth variant="secondary" onClick={() => onContinue(false)}>
                                        RETURN TO HUB
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Main Component
export const BattleArena: React.FC<BattleArenaProps> = ({ 
    playerBirdInstance, 
    enemyLevel, 
    highestZone,
    onBattleComplete, 
    activeBuffs = [], 
    apShop,
    currentZoneProgress = [],
    requiredRarities = [],
    gemUnlocked = false
}) => {
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
  
  // Use BattleBird directly for opponent to store enemy prefix
  const opponentRef = useRef<BattleBird | null>(null);
  
  if (!opponentRef.current) {
      const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
      
      // Update: Increased scaler significantly to 25 to ensure higher zones spawn high rarities
      let rarity = rollRarity(enemyLevel * 25 + 10, 'CRAFT', 1); 

      // Pity System: If the player is hunting for specific rarities to clear the zone,
      // give a 20% chance to force spawn one of the missing rarities.
      const missingRarities = requiredRarities.filter(r => !currentZoneProgress.includes(r));
      if (missingRarities.length > 0 && Math.random() < 0.20) {
          rarity = missingRarities[Math.floor(Math.random() * missingRarities.length)];
      }
      
      const instance = generateBird(template, rarity);
      instance.level = enemyLevel;
      
      const stats = getScaledStats(instance, enemyLevel, true);
      
      // Determine Enemy Prefix
      let prefix = EnemyPrefix.NONE;
      if (Math.random() < 0.25) { // 25% chance for a special enemy
          const types = [EnemyPrefix.MERCHANT, EnemyPrefix.HOARDER, EnemyPrefix.SCRAPOHOLIC, EnemyPrefix.GENIUS, EnemyPrefix.GEMFINDER];
          prefix = types[Math.floor(Math.random() * types.length)];
      }

      // Apply Prefix Stat Modifiers
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
          // Boost random stat
          const roll = Math.random();
          if (roll < 0.25) finalMaxHp = Math.floor(finalMaxHp * 2.0);
          else if (roll < 0.5) finalAttack = Math.floor(finalAttack * 2.0);
          else if (roll < 0.75) finalDefense = Math.floor(finalDefense * 2.0);
          else finalSpeed = Math.floor(finalSpeed * 2.0);
      }

      opponentRef.current = {
          ...stats,
          maxHp: finalMaxHp,
          attack: finalAttack,
          defense: finalDefense,
          speed: finalSpeed,
          currentHp: finalMaxHp,
          currentEnergy: stats.maxEnergy,
          isDefending: false,
          statusEffects: [],
          altitude: Altitude.LOW,
          enemyPrefix: prefix
      };
  }
  
  const [opponentBird, setOpponentBird] = useState<BattleBird>(opponentRef.current);

  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  
  const [resultData, setResultData] = useState<{
      winner: 'player' | 'opponent';
      opponentRarity: Rarity;
      rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem; consumable?: Consumable };
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
  const lastFrameTimeRef = useRef(Date.now()); // New ref to calculate frame delta properly
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
    if (opponentBird.enemyPrefix && opponentBird.enemyPrefix !== EnemyPrefix.NONE) {
        addLog(`WARNING: Enemy is a ${opponentBird.enemyPrefix}!`, 'info');
    }
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

    // Special Behavior: Scrapoholic Enemy
    // Either misses (0%) or Crits (100% implicit later, here we just check hit)
    let scrapoholicCrit = false;
    let hit = Math.random() * 100 <= accuracy;

    if (!isPlayer && attacker.enemyPrefix === EnemyPrefix.SCRAPOHOLIC && move.type === MoveType.ATTACK) {
        if (Math.random() < 0.5) {
            hit = false; // Forced Miss
        } else {
            hit = true;
            scrapoholicCrit = true; // Forced Crit
        }
    }
    
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
            
            // Check Gear Prefixes for Crit
            let critChance = 0;
            const checkCrit = (g: Gear | null) => {
                if (g && g.prefix === GearPrefix.GREAT && g.paramValue) {
                    critChance += g.paramValue;
                }
            };
            checkCrit(currentAttackerState.gear?.beak);
            checkCrit(currentAttackerState.gear?.claws);

            let isCrit = false;
            if (scrapoholicCrit || (Math.random() * 100 < critChance)) {
                isCrit = true;
                damage *= 1.5;
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
            
            // Check Gear Prefixes for Bleed
            let appliedBleed = false;
            const checkBleed = (g: Gear | null) => {
                if (g && g.prefix === GearPrefix.SHARP) {
                    // 50% chance to bleed with Sharp weapons
                    if (Math.random() < 0.5) appliedBleed = true;
                }
            };
            checkBleed(currentAttackerState.gear?.beak);
            checkBleed(currentAttackerState.gear?.claws);

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
          // ... (Existing Reward Logic - Unchanged)
          const rarityConfig = RARITY_CONFIG[opponentBird.rarity];
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
          const apScrapMult = getAPBoostMult(apShop?.scrapBoost || 0);
          const apDiamondMult = getAPMult(apShop?.diamondBoost || 0);
          const apItemMult = getAPMult(apShop?.itemDropBoost || 0);
          const apGemMult = getAPMult(apShop?.gemDropBoost || 0);

          let enemyFeatherMult = 1.0;
          let enemyScrapMult = 1.0;
          let enemyXpMult = 1.0;
          let enemyGemChanceMult = 1.0;
          let enemyItemChanceMult = 1.0;
          let guaranteedItem = false;
          let guaranteedScrap = false;

          switch(opponentBird.enemyPrefix) {
              case EnemyPrefix.MERCHANT: enemyFeatherMult = 5.0; break;
              case EnemyPrefix.HOARDER: guaranteedItem = true; break;
              case EnemyPrefix.SCRAPOHOLIC: enemyScrapMult = 3.0; guaranteedScrap = true; break;
              case EnemyPrefix.GENIUS: enemyXpMult = 5.0; break;
              case EnemyPrefix.GEMFINDER: enemyGemChanceMult = 20.0; break; // Significantly boosted gem drop multiplier for Gemfinders
          }

          const baseXp = 100 * (1 + enemyLevel * 0.8) * rarityMult; // Buffed zone scaler
          const xpReward = Math.floor(baseXp * (1 + (xpBonus / 100)) * enemyXpMult);
          
          const baseFeathers = 50 * (1 + enemyLevel * 0.5) * rarityMult; // Buffed zone scaler
          const featherReward = Math.floor(baseFeathers * (1 + (featherBonus / 100)) * consumableMult * apFeatherMult * enemyFeatherMult);
          
          let scrapChance = 0;
          let scrapMin = 0;
          let scrapMax = 0;

          if (guaranteedScrap) {
              scrapChance = 1.0;
              scrapMin = 10; scrapMax = 20; 
          } else {
              switch (opponentBird.rarity) {
                  case Rarity.COMMON: scrapChance = 0.25; scrapMin = 2; scrapMax = 5; break; // Was 0.15
                  case Rarity.UNCOMMON: scrapChance = 0.40; scrapMin = 5; scrapMax = 10; break; // Was 0.25
                  case Rarity.RARE: scrapChance = 0.55; scrapMin = 8; scrapMax = 15; break; // Was 0.40
                  case Rarity.EPIC: scrapChance = 0.75; scrapMin = 15; scrapMax = 30; break; // Was 0.60
                  case Rarity.LEGENDARY: scrapChance = 0.90; scrapMin = 40; scrapMax = 80; break; // Was 0.80
                  case Rarity.MYTHIC: scrapChance = 1.00; scrapMin = 100; scrapMax = 200; break;
                  default: scrapChance = 0.20; scrapMin = 1; scrapMax = 3;
              }
          }

          const levelScale = (1 + enemyLevel * 0.6) * (1 + playerBird.level * 0.1); // Buffed zone scaler
          
          let scrapReward = 0;
          if (Math.random() < scrapChance) {
              const baseScrap = scrapMin + Math.random() * (scrapMax - scrapMin);
              scrapReward = Math.floor(baseScrap * levelScale * (1 + (scrapBonus / 100)) * consumableMult * apScrapMult * enemyScrapMult);
          }

          let diamondReward = 0;
          const baseDiamondChance = 5.0; 
          const totalDiamondChance = (baseDiamondChance + diamondChanceBonus) * apDiamondMult;
          if (Math.random() * 100 < totalDiamondChance) {
               diamondReward = 1;
          }

          // Rarity boost for drops based on Enemy Rarity
          // Common: 0, Uncommon: 20, Rare: 50, Epic: 80, Legendary: 110, Mythic: 150
          let dropLevel = 0;
          switch (opponentBird.rarity) {
              case Rarity.COMMON: dropLevel = 0; break;
              case Rarity.UNCOMMON: dropLevel = 20; break;
              case Rarity.RARE: dropLevel = 50; break;
              case Rarity.EPIC: dropLevel = 80; break;
              case Rarity.LEGENDARY: dropLevel = 110; break;
              case Rarity.MYTHIC: dropLevel = 150; break;
          }

          let gemReward: Gem | undefined;
          if (gemUnlocked) {
              const baseGemChance = 1.0; // Increased base chance for gems
              let rarityGemBonus = 0;
              switch (opponentBird.rarity) {
                  case Rarity.RARE: rarityGemBonus = 0.5; break;
                  case Rarity.EPIC: rarityGemBonus = 1.5; break;
                  case Rarity.LEGENDARY: rarityGemBonus = 3.0; break;
                  case Rarity.MYTHIC: rarityGemBonus = 5.0; break;
              }
              const totalGemChance = (baseGemChance + rarityGemBonus + gemFindBonus) * apGemMult * enemyGemChanceMult;
              
              if (Math.random() * 100 < totalGemChance) {
                  const gemRarity = rollRarity(dropLevel, 'CRAFT', 1);
                  gemReward = generateGem(gemRarity);
              }
          }

          let consumableReward: Consumable | undefined;
          let baseConsumableChance = 5.0;
          if (guaranteedItem) baseConsumableChance = 100.0;
          
          switch (opponentBird.rarity) {
              case Rarity.COMMON: baseConsumableChance += 3.0; break;
              case Rarity.UNCOMMON: baseConsumableChance += 5.0; break;
              case Rarity.RARE: baseConsumableChance += 8.0; break;
              case Rarity.EPIC: baseConsumableChance += 12.0; break;
              case Rarity.LEGENDARY: baseConsumableChance += 18.0; break;
              case Rarity.MYTHIC: baseConsumableChance += 25.0; break;
          }
          const totalItemChance = (baseConsumableChance + itemFindBonus) * apItemMult * enemyItemChanceMult;

          if (Math.random() * 100 < totalItemChance) {
              const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
              const rarity = rollRarity(dropLevel, 'CRAFT', 1);
              
              // High Rarity enemies drop more items
              let count = 1;
              if (opponentBird.rarity === Rarity.LEGENDARY && Math.random() < 0.5) count = 2;
              if (opponentBird.rarity === Rarity.MYTHIC) count = Math.random() < 0.5 ? 2 : 3;

              consumableReward = { type, rarity, count };
          }
          
          setTimeout(() => {
              setResultData({ 
                  winner: 'player', 
                  opponentRarity: opponentBird.rarity,
                  rewards: { xp: xpReward, feathers: featherReward, scrap: scrapReward, diamonds: diamondReward, gem: gemReward, consumable: consumableReward } 
              });
          }, 500); // Reduced delay for result overlay
      } else {
          setTimeout(() => {
              setResultData({ 
                  winner: 'opponent', 
                  opponentRarity: opponentBird.rarity,
                  rewards: { xp: 10, feathers: 5, scrap: 0, diamonds: 0 } 
              });
          }, 500);
      }
  };

  const getAPBoostMult = (level: number) => 1 + (level * 0.02);

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
      spawnFloatingText(text, 'player', 0, -50, color, 2);
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
      const newCheck = { ...check, stage: 2, storedMultiplier: dmgMult, startTime: Date.now(), progress: 0, direction: 1 as 1 | -1 };
      skillCheckRef.current = newCheck;
      setActiveSkillCheck(newCheck);
      spawnFloatingText(dmgMult >= 1.5 ? "POWER MAX!" : "CHARGED", 'player', 0, -80, "text-cyan-400", 1.5);
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
      let multiplier = 0.9 + Math.random() * 0.2;
      if (ai.enemyPrefix === EnemyPrefix.GENIUS) multiplier = 1.5;
      executeMove(ai, pl, move, false, multiplier);
      aiNextActionTime.current = now + 2000 + Math.random() * 1000;
  };
  const aiNextActionTime = useRef(0);

  const startLoop = () => {
    const loop = () => {
      if (winnerRef.current) return;
      const now = Date.now();
      
      // Separate Frame Delta for smooth animation/minigame physics (16ms = 60fps target)
      const frameDelta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Tick Delta for game logic (Energy, AI)
      const tickDelta = now - lastTickRef.current;

      if (skillCheckRef.current) {
          const check = skillCheckRef.current;
          // Use frameDelta normalized to ~16ms frame time for consistent speed
          const timeScale = frameDelta / 16.67;

          if (check.type === SkillCheckType.TIMING || check.type === SkillCheckType.COMBO) {
              const speed = check.type === SkillCheckType.COMBO && check.stage === 2 ? 2.5 : 1.5;
              let p = check.progress + (speed * timeScale) * (check.direction || 1);
              if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1;
              check.progress = Math.max(0, Math.min(100, p));
              setActiveSkillCheck({...check});
          } else if (check.type === SkillCheckType.MASH) {
              if (check.progress >= 100) { resolveMinigame(100); } 
              else if (now - check.startTime > 3000) { resolveMinigame(); } 
              else { setActiveSkillCheck(prev => prev ? ({...prev, progress: Math.max(0, prev.progress - (0.12 * timeScale))}) : null); }
          } else if (check.type === SkillCheckType.DRAIN_GAME) {
              if (check.stage === 1) { 
                  const speed = 2.0; 
                  let p = check.progress + (speed * timeScale) * (check.direction || 1); 
                  if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1; 
                  check.progress = Math.max(0, Math.min(100, p)); 
                  setActiveSkillCheck({...check}); 
              } else { 
                  const speed = 3.0; 
                  let p = check.progress + (speed * timeScale) * (check.direction || 1); 
                  if (p >= 100 || p <= 0) check.direction = ((check.direction || 1) * -1) as 1 | -1; 
                  check.progress = Math.max(0, Math.min(100, p)); 
                  setActiveSkillCheck({...check}); 
              }
          }
      }

      if (now - lastBleedTickRef.current > 1000) {
          lastBleedTickRef.current = now;
          if (playerBirdRef.current.statusEffects.includes('bleed')) { setPlayerBird(prev => ({...prev, currentHp: Math.max(0, prev.currentHp - Math.floor(prev.maxHp * 0.025))})); spawnFloatingText("-BLEED", 'player', -30, 0, "text-rose-600"); }
          if (opponentBirdRef.current.statusEffects.includes('bleed')) { setOpponentBird(prev => ({...prev, currentHp: Math.max(0, prev.currentHp - Math.floor(prev.maxHp * 0.025))})); spawnFloatingText("-BLEED", 'opponent', 30, 0, "text-rose-600"); }
          const applyVulturePassive = (bird: BattleBird, setBird: React.Dispatch<React.SetStateAction<BattleBird>>, target: 'player'|'opponent') => { if (bird.id === 'vulture') { const heal = Math.ceil(bird.maxHp * 0.015); setBird(prev => ({ ...prev, currentHp: Math.min(prev.maxHp, prev.currentHp + heal) })); } };
          applyVulturePassive(playerBirdRef.current, setPlayerBird, 'player');
          applyVulturePassive(opponentBirdRef.current, setOpponentBird, 'opponent');
      }

      // Game Logic Tick (Energy Regen, AI)
      if (tickDelta >= 100) {
          const factor = tickDelta/1000;
          const applyEnergyRegen = (bird: BattleBird, setBird: React.Dispatch<React.SetStateAction<BattleBird>>) => { const baseRegen = 5; const effectiveRegen = bird.id === 'hummingbird' ? baseRegen * 1.5 : baseRegen; setBird(prev => ({...prev, currentEnergy: Math.min(prev.maxEnergy, prev.currentEnergy + (effectiveRegen * factor))})); };
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
      if (move.skillCheck && move.skillCheck !== SkillCheckType.NONE) { setActiveSkillCheck({ type: move.skillCheck, move, startTime: Date.now(), progress: move.skillCheck === SkillCheckType.TIMING ? 0 : 20, direction: 1, stage: 1 }); } else { executeMove(playerBird, opponentBird, move, true, 1.0); }
  };
  const handleMash = (e: any) => { e.preventDefault(); const check = skillCheckRef.current; if (!check) return; if (check.type === SkillCheckType.MASH) { setActiveSkillCheck(prev => prev ? ({...prev, progress: Math.min(100, prev.progress + 8)}) : null); } else if (check.type === SkillCheckType.TIMING) { resolveMinigame(); } else if (check.type === SkillCheckType.COMBO || check.type === SkillCheckType.DRAIN_GAME) { if (check.stage === 1) { advanceComboStage(); } else { resolveMinigame(); } } };

  const isLowerZone = enemyLevel < highestZone;

  // New Helper for Enemy Title Details
  const getPrefixDetails = (prefix: EnemyPrefix) => {
      switch(prefix) {
          case EnemyPrefix.MERCHANT: return { title: "MERCHANT", color: "text-yellow-400", icon: <Award size={20} className="text-yellow-400 fill-yellow-400/20" /> };
          case EnemyPrefix.HOARDER: return { title: "HOARDER", color: "text-purple-400", icon: <Briefcase size={20} className="text-purple-400 fill-purple-400/20" /> };
          case EnemyPrefix.SCRAPOHOLIC: return { title: "SCRAPOHOLIC", color: "text-slate-300", icon: <Hammer size={20} className="text-slate-300 fill-slate-300/20" /> };
          case EnemyPrefix.GENIUS: return { title: "GENIUS", color: "text-cyan-400", icon: <Zap size={20} className="text-cyan-400 fill-cyan-400/20" /> };
          case EnemyPrefix.GEMFINDER: return { title: "GEMFINDER", color: "text-rose-400", icon: <Hexagon size={20} className="text-rose-400 fill-rose-400/20" /> };
          default: return null;
      }
  };

  const prefixInfo = opponentBird.enemyPrefix !== EnemyPrefix.NONE ? getPrefixDetails(opponentBird.enemyPrefix!) : null;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 relative overflow-hidden flex flex-col font-sans select-none touch-none">
       <AnimatePresence>
           {hitFlash && (
               <motion.div 
                   initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-white z-50 pointer-events-none mix-blend-overlay"
               />
           )}
       </AnimatePresence>

       {/* --- Top Bar --- */}
       <div className="h-12 bg-slate-900/80 flex items-center justify-between px-4 text-xs font-bold border-b border-slate-800 z-10 shrink-0">
           <div className="flex items-center gap-2">
               {prefixInfo ? (
                   <span className={`${prefixInfo.color} flex items-center gap-1 animate-pulse`}>
                       {prefixInfo.icon} SPECIAL ENEMY
                   </span>
               ) : (
                   <span className="text-slate-500 flex items-center gap-1"><Check size={14}/> STANDARD THREAT</span>
               )}
           </div>
           
           <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                   <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">
                       {isLowerZone ? "Status" : `Zone ${enemyLevel} Clearance`}
                   </div>
                   {isLowerZone ? (
                       <span className="text-emerald-400 font-tech font-bold">ZONE SECURED</span>
                   ) : (
                       <ZoneProgress progress={currentZoneProgress} required={requiredRarities} />
                   )}
               </div>
           </div>
       </div>

       {/* ... Battle Stage ... */}
       <div className="flex-1 relative flex flex-col items-center overflow-hidden">
           
           {/* Opponent */}
           <motion.div animate={opponentAnim} className="flex-1 w-full flex flex-col items-center justify-center relative p-2 bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-1 w-full">
                     <div className="relative mb-2">
                        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[opponentBird.rarity].borderColor} relative z-10`}>
                            <img 
                                src={opponentBird.imageUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/400x400/1e293b/475569?text=' + opponentBird.name;
                                }}
                            />
                        </div>
                        {prefixInfo && (
                            <div className={`absolute -top-3 -right-3 z-20 bg-slate-950 p-2 rounded-full border shadow-lg ${prefixInfo.color.replace('text-', 'border-')}`}>
                                {prefixInfo.icon}
                            </div>
                        )}
                        <div className="absolute -left-12 top-0 flex flex-col gap-1 w-24 items-end">
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

                     <div className="w-full max-w-sm text-center mb-1">
                         <div className="flex items-center justify-center flex-wrap gap-x-2 leading-none">
                             {prefixInfo && (
                                 <span className={`font-black font-tech text-lg md:text-xl uppercase tracking-tighter ${prefixInfo.color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>
                                     {prefixInfo.title}
                                 </span>
                             )}
                             <span className={`font-black font-tech text-xl md:text-2xl uppercase tracking-tighter ${RARITY_CONFIG[opponentBird.rarity].color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>
                                 {opponentBird.name}
                             </span>
                         </div>
                     </div>

                     <div className="w-40 md:w-48">
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
           <motion.div animate={playerAnim} className="flex-1 w-full flex flex-col items-center justify-center relative p-2 md:p-4 bg-gradient-to-t from-slate-900/50 to-transparent">
                <div className="flex flex-col items-center gap-1 w-full">
                     <div className="w-full text-center mb-1">
                         <div className={`font-black font-tech text-lg md:text-xl uppercase tracking-tighter ${RARITY_CONFIG[playerBird.rarity].color} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`}>
                             {playerBird.name}
                         </div>
                     </div>
                     <div className="w-40 md:w-48 mb-2">
                         <HealthBar current={playerBird.currentHp} max={playerBird.maxHp} type="health" showValue={true} />
                         <div className="h-1" />
                         <HealthBar current={playerBird.currentEnergy} max={playerBird.maxEnergy} type="energy" showValue={true} />
                     </div>

                     <div className="relative">
                        <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[playerBird.rarity].borderColor} relative z-10 max-h-[25vh]`}>
                            <img 
                                src={playerBird.imageUrl} 
                                className="w-full h-full object-cover scale-x-[-1]" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                    e.currentTarget.src = 'https://placehold.co/400x400/1e293b/475569?text=' + playerBird.name;
                                }}
                            />
                        </div>
                        <div className="absolute -left-12 top-0 flex flex-col gap-1 w-24 items-end">
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
                    
                    const hasCrit = (playerBird.gear?.beak?.prefix === GearPrefix.GREAT || playerBird.gear?.claws?.prefix === GearPrefix.GREAT);
                    const hasBleed = (playerBird.gear?.beak?.prefix === GearPrefix.SHARP || playerBird.gear?.claws?.prefix === GearPrefix.SHARP);
                    
                    const showCrit = m.type === MoveType.ATTACK && hasCrit;
                    const showBleed = m.type === MoveType.ATTACK && hasBleed;

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

       {/* ... Minigame Overlay (unchanged) ... */}
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
                   onContinue={(playAgain) => onBattleComplete(resultData as any, playAgain)} // Cast for type safety if needed
                   currentZoneProgress={currentZoneProgress}
                   requiredRarities={requiredRarities}
                   opponentRarity={resultData.opponentRarity}
                   enemyPrefix={opponentBird.enemyPrefix}
                   isHighestZone={enemyLevel === highestZone}
               />
           )}
       </AnimatePresence>
    </div>
  );
};
