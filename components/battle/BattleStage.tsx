
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleBird, Rarity, Altitude, EnemyPrefix } from '../../types';
import { RARITY_CONFIG } from '../../constants';
import { HealthBar } from '../HealthBar';
import { StatusBadge } from './BattleUI';
import { FloatingText, Particle } from './types';
import { PREFIX_STYLES } from './utils';
import { Shield, Zap, Activity, Heart } from 'lucide-react';

interface BattleStageProps {
    playerBird: BattleBird;
    opponentBird: BattleBird;
    playerAnim: any;
    opponentAnim: any;
    floatingTexts: FloatingText[];
    particles: Particle[];
}

const ShieldOverlay: React.FC<{ startTime: number; duration: number }> = ({ startTime, duration }) => {
    const [progress, setProgress] = useState(1);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            setProgress(remaining / duration);
            if (remaining > 0) frame = requestAnimationFrame(update);
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [startTime, duration]);

    return (
        <div className="absolute inset-0 z-20 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
                <circle 
                    cx="50" cy="50" r="48" 
                    fill="none" 
                    stroke="rgba(59,130,246,0.3)" 
                    strokeWidth="4" 
                />
                <circle 
                    cx="50" cy="50" r="48" 
                    fill="rgba(59,130,246,0.1)" 
                    stroke="#60a5fa" 
                    strokeWidth="4"
                    strokeDasharray={`${progress * 301.6} 301.6`}
                    className="drop-shadow-[0_0_10px_#60a5fa]"
                />
            </svg>
        </div>
    );
};

export const BattleStage: React.FC<BattleStageProps> = ({ 
    playerBird, 
    opponentBird, 
    playerAnim, 
    opponentAnim, 
    floatingTexts, 
    particles 
}) => {
    const prefix = opponentBird.enemyPrefix || EnemyPrefix.NONE;
    const isSpecial = prefix !== EnemyPrefix.NONE;
    const styleConfig = PREFIX_STYLES[prefix];

    return (
       <div className="flex-1 w-full flex flex-col items-center justify-center relative p-4 bg-gradient-to-b from-slate-900/50 to-transparent overflow-hidden">
           {/* Opponent */}
           <motion.div animate={opponentAnim} className="flex-1 w-full flex flex-col items-center justify-center relative">
                <div className="flex flex-col items-center gap-2">
                     <div className="relative">
                        <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full border-4 overflow-hidden bg-slate-900 shadow-xl ${RARITY_CONFIG[opponentBird.rarity].borderColor} relative z-10`}>
                            <img 
                                src={opponentBird.imageUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.src.includes('placehold.co')) {
                                        target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + opponentBird.name;
                                    }
                                }}
                            />
                            {opponentBird.statusEffects.map(effect => {
                                if (effect.type === 'shield') {
                                    return <ShieldOverlay key={effect.startTime} startTime={effect.startTime} duration={effect.duration} />;
                                }
                                return null;
                            })}
                        </div>
                        <div className="absolute -right-16 top-0 flex flex-col gap-1 w-24 items-start">
                             <div className={`w-6 h-6 rounded bg-slate-800 border flex items-center justify-center text-[10px] font-bold ${RARITY_CONFIG[opponentBird.rarity].borderColor}`}>
                                 {opponentBird.level}
                             </div>
                             {opponentBird.statusEffects.map((effect, i) => (
                                 <StatusBadge key={i} type={effect.type} />
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
                    <AnimatePresence>
                    {floatingTexts.filter(ft => ft.target === 'opponent').map(ft => (
                        <motion.div 
                            key={ft.id} 
                            initial={{ y: ft.y, opacity: 0, scale: 0.5 }} 
                            animate={{ 
                                y: ft.y - 80, 
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, (ft.scale || 1.2), 1],
                            }} 
                            transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.1, 0.8, 1] }}
                            className={`absolute z-50 flex flex-col items-center justify-center ${ft.color}`} 
                            style={{ marginLeft: ft.x }}
                        >
                            {ft.customType === 'rot-eater' ? (
                                <div className="flex flex-col gap-1 bg-slate-900/90 p-2 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md min-w-[70px]">
                                     <div className="flex items-center justify-between gap-2">
                                         <Heart size={14} className="text-emerald-400 fill-emerald-400" />
                                         <span className="text-emerald-400 font-mono font-bold text-xs">+{ft.text.split(':')[0]}</span>
                                     </div>
                                     <div className="flex items-center justify-between gap-2">
                                         <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                                         <span className="text-yellow-400 font-mono font-bold text-xs">+{ft.text.split(':')[1]}</span>
                                     </div>
                                </div>
                            ) : ft.icon === 'shield' ? (
                                <div className="flex items-center gap-2 bg-blue-900/80 px-2 py-1 rounded border border-blue-500/50 shadow-lg backdrop-blur-sm">
                                    <Shield size={16} className="text-blue-300" />
                                    <span className="text-blue-100 font-bold font-mono text-sm">-{ft.text}</span>
                                </div>
                            ) : (
                                <div className="font-black text-4xl whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
                                    {ft.text}
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {particles.map(p => (
                         <motion.div key={p.id} initial={{x:0, y:0, opacity:1}} animate={{x: (Math.random()-0.5)*250, y: (Math.random()-0.5)*250, opacity:0}} className="absolute w-2 h-2 rounded-full shadow-lg mix-blend-screen" style={{backgroundColor: p.color}} />
                    ))}
                    </AnimatePresence>
                </div>
           </motion.div>
           
           <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

           {/* Player */}
           <motion.div animate={playerAnim} className="flex-1 w-full flex flex-col items-center justify-end md:justify-center relative pb-4 md:p-4">
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
                                    const target = e.currentTarget;
                                    if (!target.src.includes('placehold.co')) {
                                        target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + playerBird.name;
                                    }
                                }}
                            />
                            {playerBird.statusEffects.map(effect => {
                                if (effect.type === 'shield') {
                                    return <ShieldOverlay key={effect.startTime} startTime={effect.startTime} duration={effect.duration} />;
                                }
                                return null;
                            })}
                        </div>
                        <div className="absolute -left-20 top-0 flex flex-col gap-1 w-24 items-end">
                             {playerBird.statusEffects.map((effect, i) => (
                                 <StatusBadge key={i} type={effect.type} />
                             ))}
                        </div>
                     </div>
                </div>
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <AnimatePresence>
                    {floatingTexts.filter(ft => ft.target === 'player').map(ft => (
                        <motion.div 
                            key={ft.id} 
                            initial={{ y: ft.y, opacity: 0, scale: 0.5 }} 
                            animate={{ 
                                y: ft.y - 80, 
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, (ft.scale || 1.2), 1],
                            }} 
                            transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.1, 0.8, 1] }}
                            className={`absolute z-50 flex flex-col items-center justify-center ${ft.color}`} 
                            style={{ marginLeft: ft.x }}
                        >
                            {ft.customType === 'rot-eater' ? (
                                <div className="flex flex-col gap-1 bg-slate-900/90 p-2 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md min-w-[70px]">
                                     <div className="flex items-center justify-between gap-2">
                                         <Heart size={14} className="text-emerald-400 fill-emerald-400" />
                                         <span className="text-emerald-400 font-mono font-bold text-xs">+{ft.text.split(':')[0]}</span>
                                     </div>
                                     <div className="flex items-center justify-between gap-2">
                                         <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                                         <span className="text-yellow-400 font-mono font-bold text-xs">+{ft.text.split(':')[1]}</span>
                                     </div>
                                </div>
                            ) : ft.icon === 'shield' ? (
                                <div className="flex items-center gap-2 bg-blue-900/80 px-2 py-1 rounded border border-blue-500/50 shadow-lg backdrop-blur-sm">
                                    <Shield size={16} className="text-blue-300" />
                                    <span className="text-blue-100 font-bold font-mono text-sm">-{ft.text}</span>
                                </div>
                            ) : (
                                <div className="font-black text-4xl whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
                                    {ft.text}
                                </div>
                            )}
                        </motion.div>
                    ))}
                    </AnimatePresence>
                 </div>
           </motion.div>
       </div>
    );
};
