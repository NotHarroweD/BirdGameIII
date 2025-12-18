
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield, Zap } from 'lucide-react';
import { ActiveSkillCheck } from './types';
import { getReflexColor } from './utils';

interface MinigameOverlayProps {
    activeSkillCheck: ActiveSkillCheck | null;
    onMash: (e: React.PointerEvent) => void;
    onRelease?: (e: React.PointerEvent) => void;
    onReflexTap: (e: React.PointerEvent, id: number) => void;
}

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ activeSkillCheck, onMash, onRelease, onReflexTap }) => {
    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={onMash}
                onPointerUp={onRelease}
                onPointerLeave={onRelease}
            >
                {activeSkillCheck.type === SkillCheckType.REFLEX && activeSkillCheck.reflexTargets ? (
                    <div className="absolute inset-0 w-full h-full relative">
                        <div className="absolute top-16 w-full text-center text-white font-tech text-3xl animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-50 tracking-widest">
                            TAP TARGETS!
                        </div>
                        {activeSkillCheck.reflexTargets.map((t) => {
                            const currentColor = getReflexColor(activeSkillCheck.move.type, t.value);
                            return (
                                !t.hit && (
                                    <motion.button
                                        key={t.id}
                                        onPointerDown={(e) => onReflexTap(e, t.id)}
                                        className="absolute w-32 h-32 rounded-full flex items-center justify-center border-[6px] shadow-[0_0_40px_rgba(0,0,0,0.6)] active:scale-95 transition-transform cursor-pointer touch-manipulation"
                                        style={{ 
                                            left: `${t.x}%`, 
                                            top: `${t.y}%`, 
                                            transform: 'translate(-50%, -50%)',
                                            borderColor: currentColor,
                                            backgroundColor: 'rgba(0,0,0,0.7)'
                                        }}
                                    >
                                        <div 
                                            className="absolute inset-0 rounded-full opacity-40"
                                            style={{
                                                background: `conic-gradient(${currentColor} ${t.value}%, transparent 0)`
                                            }}
                                        />
                                        {activeSkillCheck.move.type === MoveType.HEAL ? (
                                            <Heart size={56} className="drop-shadow-[0_0_20px_rgba(0,0,0,1)] relative z-10" style={{ color: currentColor, fill: currentColor }} />
                                        ) : (
                                            <Shield size={56} className="drop-shadow-[0_0_20px_rgba(0,0,0,1)] relative z-10" style={{ color: currentColor, fill: currentColor }} />
                                        )}
                                    </motion.button>
                                )
                            );
                        })}
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.DRAIN_GAME ? (
                    <div className="flex flex-col items-center gap-12">
                         <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest text-center px-4 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)]">
                            {activeSkillCheck.stage === 1 ? "PRESS & HOLD" : "RELEASE AT TARGET"}
                        </div>

                        <div className="relative w-64 h-64 flex items-center justify-center">
                            {/* Center Button */}
                            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-900 shadow-2xl relative z-20 ${activeSkillCheck.stage === 2 ? 'border-purple-400' : 'border-slate-700'}`}>
                                <Zap size={40} className={activeSkillCheck.stage === 2 ? 'text-purple-400 animate-pulse' : 'text-slate-600'} />
                            </div>

                            {/* Stage 1 Target Zone (Green Outer Ring around center) */}
                            {activeSkillCheck.stage === 1 && (
                                <div className="absolute w-[120px] h-[120px] rounded-full border-4 border-emerald-500/30 animate-pulse">
                                    <div className="absolute inset-0 border-4 border-emerald-500/50 blur-md rounded-full" />
                                </div>
                            )}

                            {/* Stage 2 Target Zone (Purple Outer Ring - Made True Edge) */}
                            {activeSkillCheck.stage === 2 && (
                                <div className="absolute w-[98%] h-[98%] rounded-full border-[10px] border-purple-500/20">
                                    <div className="absolute inset-0 border-4 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)] rounded-full" />
                                </div>
                            )}

                            {/* Active Circle (Shrinking/Expanding) */}
                            <motion.div 
                                className={`absolute rounded-full border-4 shadow-xl z-10 ${activeSkillCheck.stage === 1 ? 'border-white' : 'border-purple-400'}`}
                                style={{ 
                                    width: `${activeSkillCheck.progress}%`, 
                                    height: `${activeSkillCheck.progress}%`,
                                    opacity: 0.8
                                }}
                            >
                                <div className={`absolute inset-0 rounded-full blur-sm border-2 ${activeSkillCheck.stage === 1 ? 'border-white/50' : 'border-purple-400/50'}`} />
                            </motion.div>
                        </div>

                        <div className="text-slate-400 font-mono text-sm text-center bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-800">
                            {activeSkillCheck.stage === 1 
                                ? "Catch the circle as it reaches the center!" 
                                : "Release when circle hits the target ring!"}
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </motion.div>
        )}
       </AnimatePresence>
    );
};
