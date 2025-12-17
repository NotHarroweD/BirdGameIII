
import React, { useState, useEffect } from 'react';
import { BirdInstance, Rarity, Gem, Consumable, EnemyPrefix, StatType, StatOption } from '../types';
import { RARITY_CONFIG, XP_TABLE } from '../constants';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Hexagon, Briefcase, Gem as GemIcon, Star, Skull, Check, Award, Hammer, Map, RotateCcw, ArrowUp, Heart, Shield, Wind, Target, ArrowRight } from 'lucide-react';
import { getScaledStats } from './battle/utils';

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

            <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "linear", delay: delay + 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />

            <div className="relative">
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
                {type === 'diamond' && <Star size={16} className="text-blue-200 animate-pulse" />}
                {type === 'gem' && <Hexagon size={16} className={`${textColor} opacity-50`} />}
                {type === 'item' && <Briefcase size={16} className={`${textColor} opacity-50`} />}
            </div>
        </motion.div>
    );
};

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
                    </div>
                );
            })}
        </div>
    );
};

export const BattleResultOverlay: React.FC<{
    winner: 'player' | 'opponent';
    rewards: { xp: number; feathers: number; scrap: number; diamonds: number; gem?: Gem; consumable?: Consumable };
    initialBird: BirdInstance;
    updatedBird?: BirdInstance;
    onContinue: (playAgain: boolean) => void;
    currentZoneProgress: Rarity[];
    requiredRarities: Rarity[];
    opponentRarity: Rarity;
    enemyPrefix?: EnemyPrefix;
    isHighestZone: boolean;
    onApplyLevelUpReward?: (birdId: string, stat: StatType, value: number) => void;
}> = ({ winner, rewards, initialBird, updatedBird, onContinue, currentZoneProgress, requiredRarities, opponentRarity, enemyPrefix, isHighestZone, onApplyLevelUpReward }) => {
    
    const isVictory = winner === 'player';
    
    const [displayFeathers, setDisplayFeathers] = useState(0);
    const [displayScrap, setDisplayScrap] = useState(0);
    const [displayXp, setDisplayXp] = useState(0);
    const [displayCurrentXp, setDisplayCurrentXp] = useState(initialBird.xp);
    const [xpBarWidth, setXpBarWidth] = useState(0);
    const [showLoot, setShowLoot] = useState(false);
    const [showButtons, setShowButtons] = useState(false);

    const [showLevelUpRewards, setShowLevelUpRewards] = useState(false);
    const [rewardsClaimed, setRewardsClaimed] = useState(false);

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

    const isLevelUp = finalLevel > initialBird.level;

    const handleLevelUpClick = () => {
        if (rewardsClaimed) return;
        setShowLevelUpRewards(true);
    };

    const handleSelectReward = (option: {stat: StatType, value: number}) => {
        if (onApplyLevelUpReward) {
            onApplyLevelUpReward(initialBird.instanceId, option.stat, option.value);
        }
        // Logic to keep modal open if multiple points exist
        if (updatedBird && updatedBird.statPoints <= 1) {
            setRewardsClaimed(true);
            setShowLevelUpRewards(false);
        }
    };

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

        const countDelay = 1000; 
        
        const startXP = initialBird.xp;
        const endXP = initialBird.xp + rewards.xp;
        const maxXP = initialBird.xpToNextLevel;
        
        const initialPercent = Math.min(100, (startXP / maxXP) * 100);
        setXpBarWidth(initialPercent);
        setDisplayCurrentXp(startXP);

        let animationFrameId: number;
        let startTime: number;
        const duration = 1500; 

        const startCounting = () => {
            startTime = Date.now();
            const animate = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const ease = 1 - Math.pow(1 - progress, 3);

                setDisplayFeathers(Math.floor(rewards.feathers * ease));
                setDisplayScrap(Math.floor(rewards.scrap * ease));
                setDisplayXp(Math.floor(rewards.xp * ease));
                
                const currentAnimatedXp = startXP + ((endXP - startXP) * ease);
                setDisplayCurrentXp(currentAnimatedXp);
                
                const percent = Math.min(100, (currentAnimatedXp / maxXP) * 100);
                setXpBarWidth(percent);

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    setShowLoot(true);
                    setTimeout(() => setShowButtons(true), 300);
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

    const isSpecialXp = enemyPrefix === EnemyPrefix.GENIUS;
    const isSpecialFeathers = enemyPrefix === EnemyPrefix.MERCHANT;
    const isSpecialScrap = enemyPrefix === EnemyPrefix.SCRAPOHOLIC;
    const isSpecialGem = enemyPrefix === EnemyPrefix.GEMFINDER;
    const isSpecialItem = enemyPrefix === EnemyPrefix.HOARDER;

    const calculateYield = (bird: BirdInstance, level: number) => {
        const rarityConfig = RARITY_CONFIG[bird.rarity];
        return (bird.huntingConfig.baseRate * rarityConfig.minMult) * (1 + level * 0.5);
    };

    const oldStats = getScaledStats(initialBird, initialBird.level);
    const newStats = getScaledStats(initialBird, finalLevel);
    const oldYield = calculateYield(initialBird, initialBird.level);
    const newYield = calculateYield(initialBird, finalLevel);

    const StatChangeRow = ({ label, oldVal, newVal, icon: Icon, color }: { label: string, oldVal: number, newVal: number, icon: any, color: string }) => (
        <div className="flex justify-between items-center bg-slate-950/30 p-1.5 rounded border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
                <Icon size={10} className={color} />
                <span className="text-[9px] uppercase font-bold">{label}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-500">{oldVal}</span>
                {newVal > oldVal ? (
                    <>
                        <span className="text-slate-700 text-[8px]">➜</span>
                        <span className="text-emerald-400 font-bold">{newVal}</span>
                    </>
                ) : (
                    <span className="text-slate-300">{newVal}</span>
                )}
            </div>
        </div>
    );

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
                <div className="bg-slate-950/80 w-full h-full rounded-xl p-5 flex flex-col items-center gap-4 relative overflow-y-auto">
                    
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

                    {isVictory && (
                        <div className="w-full space-y-3 relative z-10">
                            <motion.div 
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                                className={`p-3 rounded-lg border relative overflow-hidden group shadow-lg transition-all duration-300 ${isSpecialXp ? 'bg-cyan-900/40 border-cyan-500/50 shadow-cyan-500/20' : 'bg-slate-900 border-slate-800'} ${isLevelUp ? 'min-h-[120px] flex flex-col justify-center' : ''}`}
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
                                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/50 relative z-10">
                                    <motion.div 
                                        className={`h-full relative ${isSpecialXp ? 'bg-gradient-to-r from-cyan-600 to-cyan-300' : 'bg-gradient-to-r from-yellow-600 to-yellow-300'}`}
                                        style={{ width: `${xpBarWidth}%` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px]" />
                                    </motion.div>
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white drop-shadow-md z-10">
                                        {Math.floor(displayCurrentXp)} / {initialBird.xpToNextLevel} XP
                                    </div>
                                </div>
                                {(xpBarWidth >= 100 || isLevelUp) && (
                                    <motion.button
                                        onClick={handleLevelUpClick}
                                        initial={{ scale: 0, opacity: 0 }} 
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-20 backdrop-blur-sm cursor-pointer hover:bg-slate-900 transition-colors group"
                                        disabled={rewardsClaimed}
                                    >
                                        <span className={`text-yellow-400 font-black font-tech tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-2xl ${!rewardsClaimed ? 'animate-pulse' : ''}`}>
                                            {rewardsClaimed ? 'UPGRADE APPLIED' : (finalLevel - initialBird.level > 1) ? `LEVEL UP x${finalLevel - initialBird.level}!` : 'LEVEL UP!'}
                                        </span>
                                        {!rewardsClaimed && (
                                            <span className="text-[10px] text-yellow-200 mt-1 uppercase tracking-wider bg-yellow-900/40 px-2 py-0.5 rounded border border-yellow-700/50">
                                                Tap to claim rewards
                                            </span>
                                        )}
                                        <span className="text-white font-mono font-bold text-xl mt-1 drop-shadow-md">LVL {finalLevel}</span>
                                    </motion.button>
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
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ delay: 0.8 }}
                                className="w-full bg-slate-900 p-2 rounded border border-slate-800 flex flex-col items-center gap-1 mt-auto"
                            >
                                 <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Zone Progress</div>
                                 {isHighestZone ? (
                                     <ZoneProgress progress={currentZoneProgress} required={requiredRarities} currentOpponentRarity={opponentRarity} isVictory={isVictory} />
                                 ) : (
                                     <div className="text-emerald-400 font-tech font-bold text-lg flex items-center gap-2">
                                         <Check size={20} /> ZONE SECURED
                                     </div>
                                 )}
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
                                        <Zap size={16} className="mr-2" /> BATTLE AGAIN
                                    </Button>
                                    <Button fullWidth variant="secondary" onClick={() => onContinue(false)}>
                                        <Map size={16} className="mr-2" /> RETURN TO HUB
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {showLevelUpRewards && updatedBird && updatedBird.pendingStatOptions && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
                            className="bg-slate-900 border-2 border-yellow-500/50 p-6 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.2)] max-h-[80vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="w-full flex items-center justify-center gap-2 mb-2 shrink-0">
                                <ArrowUp size={24} className="text-yellow-400 animate-bounce" />
                                <h2 className="font-tech text-2xl text-white uppercase tracking-widest text-center">
                                    LEVEL UP
                                </h2>
                                <ArrowUp size={24} className="text-yellow-400 animate-bounce" />
                            </div>
                            <p className="text-slate-400 text-xs mb-4 text-center shrink-0">
                                {updatedBird.statPoints} point{updatedBird.statPoints > 1 ? 's' : ''} available. Choose an upgrade.
                            </p>

                            <div className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 shrink-0">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center border-b border-slate-800 pb-1">
                                    Improvements
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatChangeRow label="HP" oldVal={oldStats.maxHp} newVal={newStats.maxHp} icon={Heart} color="text-emerald-400" />
                                    <StatChangeRow label="ATK" oldVal={oldStats.attack} newVal={newStats.attack} icon={Zap} color="text-rose-400" />
                                    <StatChangeRow label="DEF" oldVal={oldStats.defense} newVal={newStats.defense} icon={Shield} color="text-blue-400" />
                                    <StatChangeRow label="SPD" oldVal={oldStats.speed} newVal={newStats.speed} icon={Wind} color="text-cyan-400" />
                                    <StatChangeRow label="NRG" oldVal={oldStats.maxEnergy} newVal={newStats.maxEnergy} icon={Zap} color="text-yellow-400" />
                                    <div className="flex justify-between items-center bg-slate-950/30 p-1.5 rounded border border-slate-800">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Target size={10} className="text-amber-400" />
                                            <span className="text-[9px] uppercase font-bold">Yield</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono text-xs">
                                            <span className="text-slate-500">{oldYield.toFixed(1)}</span>
                                            <span className="text-slate-700 text-[8px]">➜</span>
                                            <span className="text-amber-400 font-bold">{newYield.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full shrink-0">
                                {updatedBird.pendingStatOptions.map((opt, i) => {
                                    let Icon = Zap;
                                    if (opt.stat === 'HP') Icon = Heart;
                                    if (opt.stat === 'DEF') Icon = Shield;
                                    if (opt.stat === 'SPD') Icon = Wind;
                                    
                                    const baseKeyMap: Record<StatType, keyof BirdInstance> = {
                                        'HP': 'baseHp',
                                        'ATK': 'baseAttack',
                                        'DEF': 'baseDefense',
                                        'SPD': 'baseSpeed',
                                        'NRG': 'baseEnergy'
                                    };
                                    
                                    const statKeyMap: Record<StatType, 'maxHp' | 'attack' | 'defense' | 'speed' | 'maxEnergy'> = {
                                        'HP': 'maxHp',
                                        'ATK': 'attack',
                                        'DEF': 'defense',
                                        'SPD': 'speed',
                                        'NRG': 'maxEnergy'
                                    };

                                    const baseKey = baseKeyMap[opt.stat];
                                    const statKey = statKeyMap[opt.stat];
                                    
                                    const projectedBird = { ...initialBird, [baseKey]: (initialBird[baseKey] as number) + opt.value };
                                    const projectedStats = getScaledStats(projectedBird, finalLevel);
                                    
                                    const currentVal = newStats[statKey];
                                    const projectedVal = projectedStats[statKey];

                                    return (
                                        <button 
                                            key={i}
                                            onClick={() => handleSelectReward(opt)}
                                            className={`w-full p-3 rounded-lg border-2 bg-slate-950 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 ${RARITY_CONFIG[opt.rarity].borderColor} hover:bg-slate-900 group shadow-lg`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border bg-slate-900 ${RARITY_CONFIG[opt.rarity].borderColor}`}>
                                                    <Icon size={20} className={RARITY_CONFIG[opt.rarity].color} />
                                                </div>
                                                <div className="text-left">
                                                    <div className={`font-bold font-tech text-sm ${RARITY_CONFIG[opt.rarity].color}`}>{opt.label}</div>
                                                    <div className="text-[9px] text-slate-500 font-bold uppercase">{RARITY_CONFIG[opt.rarity].name} Upgrade</div>
                                                </div>
                                            </div>
                                            
                                            <div className={`text-right ${RARITY_CONFIG[opt.rarity].color}`}>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="text-slate-500 text-sm">{currentVal}</span>
                                                    <ArrowRight size={14} className="opacity-50" /> 
                                                    <span className="text-xl font-mono font-bold drop-shadow-md">{projectedVal}</span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
