
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield } from 'lucide-react';
import { ActiveSkillCheck } from './types';
import { getReflexColor } from './utils';

interface MinigameOverlayProps {
    activeSkillCheck: ActiveSkillCheck | null;
    onMash: (e: React.PointerEvent) => void;
    onReflexTap: (e: React.PointerEvent, id: number) => void;
}

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ activeSkillCheck, onMash, onReflexTap }) => {
    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={onMash}
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
                                        {/* Circular Progress Draining */}
                                        <div 
                                            className="absolute inset-0 rounded-full opacity-40"
                                            style={{
                                                background: `conic-gradient(${currentColor} ${t.value}%, transparent 0)`
                                            }}
                                        />
                                        {/* Icon */}
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
    );
};
