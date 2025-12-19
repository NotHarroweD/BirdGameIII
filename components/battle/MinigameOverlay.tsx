import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield, Zap, Sparkles } from 'lucide-react';
import { ActiveSkillCheck } from './types';
import { getReflexColor } from './utils';

interface MinigameOverlayProps {
    activeSkillCheck: ActiveSkillCheck | null;
    onMash: (e: React.PointerEvent) => void;
    onRelease?: (e: React.PointerEvent) => void;
    onReflexTap: (e: React.PointerEvent, id: number) => void;
}

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ activeSkillCheck, onMash, onRelease, onReflexTap }) => {
    const [overlayParticles, setOverlayParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

    // Spawn internal particles when feedback changes
    useEffect(() => {
        if (activeSkillCheck?.hitFeedback) {
            const newParticles = Array.from({ length: 12 }).map((_, i) => ({
                id: Date.now() + i,
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 100,
                color: activeSkillCheck.hitFeedback!.color.includes('emerald') ? '#10b981' : 
                       activeSkillCheck.hitFeedback!.color.includes('blue') ? '#3b82f6' : '#a855f7'
            }));
            setOverlayParticles(prev => [...prev, ...newParticles]);
            setTimeout(() => {
                setOverlayParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 800);
        }
    }, [activeSkillCheck?.hitFeedback?.id]);

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
                            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-900 shadow-2xl relative z-20 ${activeSkillCheck.stage === 2 ? 'border-purple-400' : 'border-slate-700'}`}>
                                <Zap size={40} className={activeSkillCheck.stage === 2 ? 'text-purple-400 animate-pulse' : 'text-slate-600'} />
                            </div>

                            {activeSkillCheck.stage === 1 && (
                                <div className="absolute w-[120px] h-[120px] rounded-full border-4 border-emerald-500/30 animate-pulse">
                                    <div className="absolute inset-0 border-4 border-emerald-500/50 blur-md rounded-full" />
                                </div>
                            )}

                            {activeSkillCheck.stage === 2 && (
                                <div className="absolute w-[98%] h-[98%] rounded-full border-[10px] border-purple-500/20">
                                    <div className="absolute inset-0 border-4 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)] rounded-full" />
                                </div>
                            )}

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
                    <div className="flex flex-col items-center w-full relative">
                        {/* Internal Particles */}
                        {overlayParticles.map(p => (
                            <motion.div 
                                key={p.id}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                                transition={{ duration: 0.6 }}
                                className="absolute w-2 h-2 rounded-full z-40 pointer-events-none"
                                style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
                            />
                        ))}

                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest text-center px-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] mb-8">
                            {activeSkillCheck.type === SkillCheckType.TIMING ? "TAP WHEN GREEN!" : 
                            activeSkillCheck.type === SkillCheckType.COMBO 
                            ? `COMBO HIT ${activeSkillCheck.stage}/3`
                            : "TAP FAST!"}
                        </div>

                        {/* Hit Feedback Text Area - Scaled down further to prevent clipping */}
                        <div className="h-16 flex items-center justify-center overflow-visible mb-4 relative w-full">
                            <AnimatePresence>
                                {activeSkillCheck.hitFeedback && (
                                    <motion.div
                                        key={activeSkillCheck.hitFeedback.id}
                                        initial={{ opacity: 0, scale: 0.2, y: 30, rotate: -5 }}
                                        animate={{ 
                                            opacity: 1, 
                                            scale: activeSkillCheck.hitFeedback.intensity >= 3 ? [1.1, 1.4, 1.3] : [0.9, 1.2, 1.1], 
                                            y: 0, 
                                            rotate: 0 
                                        }}
                                        exit={{ opacity: 0, scale: 2, y: -60, filter: "blur(8px)" }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 400, 
                                            damping: 18,
                                        }}
                                        className={`font-tech font-black text-2xl md:text-3xl italic tracking-tighter drop-shadow-[0_0_20px_black] pointer-events-none whitespace-nowrap z-50 flex items-center gap-3 ${activeSkillCheck.hitFeedback.color}`}
                                    >
                                        {activeSkillCheck.hitFeedback.intensity >= 3 && <Sparkles className="animate-pulse text-yellow-400" size={20} />}
                                        {activeSkillCheck.hitFeedback.text}
                                        {activeSkillCheck.hitFeedback.intensity >= 3 && <Sparkles className="animate-pulse text-yellow-400" size={20} />}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-[75%] h-24 border-4 border-slate-700 rounded-xl relative overflow-hidden bg-slate-900 shadow-2xl mb-4">
                            {activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO ? (
                                <>
                                    <motion.div 
                                        className={`absolute h-full border-x-2 shadow-[0_0_25px_rgba(16,185,129,0.5)] ${activeSkillCheck.isFlashing ? 'bg-white z-20' : 'bg-emerald-500/40 border-emerald-400'}`} 
                                        style={{ left: `${activeSkillCheck.targetZoneStart ?? 40}%`, width: `${activeSkillCheck.targetZoneWidth ?? 15}%` }}
                                        animate={activeSkillCheck.isFlashing ? { opacity: [1, 0.5, 1], scaleY: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 0.1, repeat: 1 }}
                                    />
                                    <AnimatePresence>
                                        {activeSkillCheck.hitMarkers?.map((marker) => (
                                            <motion.div 
                                                key={marker.id} 
                                                initial={{ opacity: 1, scaleX: 1 }}
                                                animate={{ opacity: 0, scaleX: 2.5 }}
                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                                className="absolute w-2 h-full bg-cyan-300 z-10 shadow-[0_0_30px_rgba(103,232,249,1)]"
                                                style={{ left: `${marker.progress}%` }}
                                            />
                                        ))}
                                    </AnimatePresence>
                                    <motion.div 
                                        className={`absolute w-3 h-full shadow-[0_0_15px_white] ${activeSkillCheck.type === SkillCheckType.COMBO ? 'bg-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.8)]' : 'bg-white'}`} 
                                        style={{left: `${activeSkillCheck.progress}%` }} 
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
                        
                        <div className="text-slate-400 font-mono text-sm text-center opacity-70">
                            {activeSkillCheck.type === SkillCheckType.MASH 
                                ? "Stop in GREEN zone for bonus,\nor fill to 100% for OVERCHARGE!" 
                                : "(Tap anywhere to hit the zone)"}
                        </div>
                    </div>
                )}
            </motion.div>
        )}
       </AnimatePresence>
    );
};