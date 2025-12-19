import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield, Zap, Sparkles, MoveUp, MoveDown, MoveLeft, MoveRight, Fingerprint, Bone } from 'lucide-react';
import { ActiveSkillCheck } from './types';
import { getReflexColor } from './utils';

interface MinigameOverlayProps {
    activeSkillCheck: ActiveSkillCheck | null;
    onMash: (e: React.PointerEvent) => void;
    onRelease?: (e: React.PointerEvent) => void;
    onReflexTap: (e: React.PointerEvent, id: number) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
}

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ activeSkillCheck, onMash, onRelease, onReflexTap, onPointerMove }) => {
    const [overlayParticles, setOverlayParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);

    useEffect(() => {
        if (activeSkillCheck?.hitFeedback || activeSkillCheck?.hitResult) {
            const result = activeSkillCheck.hitResult || { 
                color: activeSkillCheck.hitFeedback!.color.includes('emerald') ? '#10b981' : 
                       activeSkillCheck.hitFeedback!.color.includes('blue') ? '#3b82f6' : '#a855f7',
                intensity: activeSkillCheck.hitFeedback!.intensity || 1
            };
            
            const count = 12 + (result.intensity * 8);
            const newParticles = Array.from({ length: count }).map((_, i) => ({
                id: Date.now() + i,
                x: (Math.random() - 0.5) * (150 + result.intensity * 50),
                y: (Math.random() - 0.5) * (80 + result.intensity * 30),
                color: result.color
            }));
            setOverlayParticles(prev => [...prev, ...newParticles]);
            setTimeout(() => {
                setOverlayParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 800);
        }
    }, [activeSkillCheck?.hitFeedback?.id, activeSkillCheck?.hitResult?.id]);

    const getFlickIcon = (angle: number, color?: string) => {
        const props = { size: 80, className: color ? "" : "text-cyan-400", style: color ? { color } : {} };
        if (angle === 0) return <MoveRight {...props} />;
        if (angle === 90) return <MoveDown {...props} />;
        if (angle === 180) return <MoveLeft {...props} />;
        if (angle === 270) return <MoveUp {...props} />;
        return <Zap {...props} />;
    };

    const getFlickProgress = () => {
        if (!activeSkillCheck?.flickStartPos || !activeSkillCheck?.flickCurrentPos) return 0;
        const dx = activeSkillCheck.flickCurrentPos.x - activeSkillCheck.flickStartPos.x;
        const dy = activeSkillCheck.flickCurrentPos.y - activeSkillCheck.flickStartPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.min(100, (dist / 180) * 100);
    };

    const getFlickColor = (p: number) => {
        if (p >= 100) return '#10b981';
        if (p >= 50) return '#facc15';
        return '#ef4444';
    };

    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} 
                animate={{opacity:1}} 
                exit={{opacity:0}}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={onMash}
                onPointerUp={onRelease}
                onPointerLeave={onRelease}
                onPointerMove={onPointerMove}
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
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden">
                         <div className="absolute top-12 w-full text-center z-10 px-6">
                            <h2 className="text-white font-tech text-4xl font-black italic animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                                {activeSkillCheck.stage === 1 ? "HOLD TO CONSUME" : "SWIPE TO FEAST"}
                            </h2>
                            <p className="text-purple-400 font-bold uppercase tracking-widest text-sm mt-2">
                                {activeSkillCheck.stage === 1 ? "Hold until full for max damage" : "Quickly drag over bones to heal!"}
                            </p>
                        </div>

                        {/* Bones Section Area */}
                        <div className="absolute inset-0 pointer-events-none">
                            {activeSkillCheck.drainBones?.map(h => (
                                <motion.div 
                                    key={h.id}
                                    className="absolute"
                                    animate={{ 
                                        scale: h.collected ? [1.2, 1.8, 0] : 1,
                                        opacity: h.collected ? [1, 1, 0] : (h.value / 100) * 0.9 + 0.1
                                    }}
                                    transition={{ duration: h.collected ? 0.3 : 0 }}
                                    style={{ 
                                        left: `${h.x}%`, 
                                        top: `${h.y}%`, 
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: h.collected ? 40 : 20
                                    }}
                                >
                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                        {!h.collected && (
                                            <div 
                                                className="absolute inset-0 rounded-full border-2 border-slate-700/50"
                                                style={{ background: `conic-gradient(#ffffff ${h.value}%, transparent 0)` }}
                                            />
                                        )}
                                        <Bone size={32} className={h.collected ? "text-emerald-400" : "text-slate-300 drop-shadow-lg"} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Central Button (Only visible/active in Phase 1) */}
                        {activeSkillCheck.stage === 1 && (
                            <div className="relative w-56 h-56 flex items-center justify-center z-30">
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1], rotate: -360 }}
                                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                                    className={`absolute inset-0 rounded-full border-4 border-dashed ${activeSkillCheck.progress >= 95 ? 'border-emerald-500/50' : 'border-purple-500/20'}`}
                                />
                                
                                <div className="absolute inset-[-12px] rounded-full border-[10px] border-slate-900 shadow-2xl">
                                    <div 
                                        className="absolute inset-[-4px] rounded-full transition-all duration-150"
                                        style={{ 
                                            background: `conic-gradient(${activeSkillCheck.progress >= 95 ? '#10b981' : '#a855f7'} ${activeSkillCheck.progress}%, #1e1b4b 0)`,
                                            boxShadow: activeSkillCheck.progress >= 95 ? '0 0 35px rgba(16,185,129,0.7)' : 'none'
                                        }}
                                    />
                                </div>

                                <motion.div 
                                    className="w-36 h-36 rounded-full bg-slate-900 border-4 border-purple-500/50 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.5)] relative"
                                >
                                    <Fingerprint size={56} className={activeSkillCheck.progress >= 95 ? "text-emerald-400" : "text-purple-400"} />
                                    <div className="text-[12px] font-black text-white uppercase mt-1 tracking-widest">
                                        {activeSkillCheck.progress >= 95 ? "FULL!" : "HOLD"}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                        
                        <div className="absolute bottom-12 w-full text-center">
                            {activeSkillCheck.stage === 2 && (
                                <motion.div 
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="inline-block bg-slate-900/80 border-2 border-purple-500/50 px-8 py-3 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                                >
                                    <div className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">HARVEST ACTIVE</div>
                                    <div className="text-3xl font-tech font-black text-white flex items-center justify-center gap-3">
                                        <Bone size={24} className="text-slate-400" />
                                        {activeSkillCheck.drainBones?.filter(h => h.collected).length || 0} / {activeSkillCheck.drainBones?.length || 0}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.FLICK ? (
                    <div className="flex flex-col items-center gap-12 w-full max-w-lg relative">
                        {overlayParticles.map(p => (
                            <motion.div 
                                key={p.id}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                                transition={{ duration: 0.6 }}
                                className="absolute w-3 h-3 rounded-full z-40 pointer-events-none"
                                style={{ backgroundColor: p.color, boxShadow: `0 0 15px ${p.color}`, left: '50%', top: '50%' }}
                            />
                        ))}

                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest text-center px-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                            SWIPE!
                        </div>

                        <div className={`relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-slate-800 bg-slate-900 shadow-2xl ${activeSkillCheck.isFlashing ? (activeSkillCheck.hitResult?.color === '#10b981' ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20') : ''}`}>
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
                             
                             <svg className="absolute inset-0 w-full h-full p-2 rotate-[-90deg]">
                                 <circle
                                    cx="50%" cy="50%" r="120"
                                    fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
                                 />
                                 <motion.circle
                                    cx="50%" cy="50%" r="120"
                                    fill="none" stroke={getFlickColor(getFlickProgress())}
                                    strokeWidth="12" strokeLinecap="round"
                                    strokeDasharray="753.98"
                                    animate={{ strokeDashoffset: 753.98 - (753.98 * getFlickProgress() / 100) }}
                                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                    style={{ filter: `drop-shadow(0 0 8px ${getFlickColor(getFlickProgress())})` }}
                                 />
                             </svg>

                             {getFlickIcon(activeSkillCheck.flickDirection || 0, getFlickProgress() >= 100 ? '#10b981' : undefined)}
                             
                             {activeSkillCheck.flickStartPos && activeSkillCheck.flickCurrentPos && (
                                 <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                     <line 
                                        x1="50%" y1="50%" 
                                        x2={`calc(50% + ${activeSkillCheck.flickCurrentPos.x - activeSkillCheck.flickStartPos.x}px)`} 
                                        y2={`calc(50% + ${activeSkillCheck.flickCurrentPos.y - activeSkillCheck.flickStartPos.y}px)`}
                                        stroke={getFlickColor(getFlickProgress())} strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" opacity="0.6"
                                     />
                                 </svg>
                             )}
                        </div>

                        <div className="text-slate-400 font-mono text-sm text-center bg-slate-900/60 px-6 py-2 rounded-full border border-slate-800">
                            EXTEND SWIPE TO TURN CIRCLE GREEN
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full relative">
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
                            {activeSkillCheck.type === SkillCheckType.TIMING ? "TAP AT GREEN!" : 
                            activeSkillCheck.type === SkillCheckType.COMBO 
                            ? `COMBO HIT ${activeSkillCheck.stage}/3`
                            : "TAP FAST!"}
                        </div>

                        <div className="h-16 flex items-center justify-center overflow-visible mb-4 relative w-full">
                            <AnimatePresence>
                                {activeSkillCheck.hitFeedback && (
                                    <motion.div
                                        key={activeSkillCheck.hitFeedback.id}
                                        initial={{ opacity: 0, scale: 0.2, y: 30 }}
                                        animate={{ opacity: 1, scale: activeSkillCheck.hitFeedback.intensity >= 3 ? [1.1, 1.4, 1.3] : [0.9, 1.2, 1.1], y: 0 }}
                                        exit={{ opacity: 0, scale: 1.5 }}
                                        className={`font-tech font-black text-2xl md:text-3xl italic tracking-tighter drop-shadow-[0_0_20px_black] z-50 whitespace-nowrap ${activeSkillCheck.hitFeedback.color}`}
                                    >
                                        {activeSkillCheck.hitFeedback.text}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className={`w-[85%] border-4 border-slate-700 rounded-xl relative overflow-hidden bg-slate-950 shadow-2xl mb-4 h-24`}>
                            {activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO ? (
                                <>
                                    <div 
                                        className={`absolute h-full ${activeSkillCheck.isFlashing ? (activeSkillCheck.flashColor === 'red' ? 'bg-rose-600/80 z-20' : 'bg-emerald-600/80 z-20') : 'bg-emerald-500/40'}`} 
                                        style={{ left: `${activeSkillCheck.targetZoneStart ?? 40}%`, width: `${activeSkillCheck.targetZoneWidth ?? 15}%` }}
                                    >
                                        {activeSkillCheck.type === SkillCheckType.COMBO && activeSkillCheck.isFlashing && (
                                            <div className={`absolute -inset-[3px] border-[3px] rounded shadow-[0_0_20px_rgba(255,255,255,0.5)] ${activeSkillCheck.flashColor === 'red' ? 'border-rose-500' : 'border-emerald-400'} z-30`} />
                                        )}
                                    </div>
                                    <motion.div className="absolute z-30 w-1.5 h-full bg-white shadow-[0_0_15px_white]" style={{ left: `${activeSkillCheck.progress}%`, transform: 'translateX(-50%)' }} />
                                </>
                            ) : (
                                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 relative z-10" style={{width: `${activeSkillCheck.progress}%`}} />
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        )}
       </AnimatePresence>
    );
};