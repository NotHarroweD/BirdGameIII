import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield, Zap, MoveUp, MoveDown, MoveLeft, MoveRight, Bone } from 'lucide-react';
import { ActiveSkillCheck, BoneData } from './types';
import { getReflexColor } from './utils';

interface MinigameOverlayProps {
    activeSkillCheck: ActiveSkillCheck | null;
    onComplete: (multiplier: number, secondaryMultiplier?: number) => void;
}

export const MinigameOverlay: React.FC<MinigameOverlayProps> = ({ activeSkillCheck, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState(1);
    const [bones, setBones] = useState<BoneData[]>([]);
    const [reflexTargets, setReflexTargets] = useState<any[]>([]);
    const [hitFeedback, setHitFeedback] = useState<any>(null);
    const [targetZone, setTargetZone] = useState({ start: 40, width: 20 });
    const [overlayParticles, setOverlayParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
    const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const [completionRating, setCompletionRating] = useState<{ text: string, color: string, mult: number } | null>(null);

    const stateRef = useRef({
        progress: 0,
        direction: 1,
        stage: 1,
        accMult: 0,
        comboCount: 0,
        targetZone: { start: 40, width: 20 },
        startTime: Date.now(),
        isDone: false,
        cursorX: 0,
        cursorY: 0,
        isHolding: false
    });

    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (!activeSkillCheck) {
            stateRef.current.isDone = false;
            setCursorPos(null);
            setIsHolding(false);
            setCompletionRating(null);
            return;
        }

        const isSonic = activeSkillCheck.move.id === 'sonic_wave';
        const startWidth = activeSkillCheck.type === SkillCheckType.COMBO ? 38 : (isSonic ? 32 : 18);
        const startZone = activeSkillCheck.type === SkillCheckType.COMBO ? Math.random() * 62 : 40;

        stateRef.current = {
            progress: activeSkillCheck.progress || 20,
            direction: 1,
            stage: 1,
            accMult: 0,
            comboCount: 0,
            targetZone: { start: startZone, width: startWidth },
            startTime: Date.now(),
            isDone: false,
            cursorX: 0,
            cursorY: 0,
            isHolding: false
        };

        setProgress(stateRef.current.progress);
        setStage(1);
        setTargetZone(stateRef.current.targetZone);
        setHitFeedback(null);
        setIsHolding(false);
        setCompletionRating(null);

        if (activeSkillCheck.type === SkillCheckType.REFLEX) {
            setReflexTargets([
                { id: 1, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                { id: 2, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                { id: 3, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false }
            ]);
        }

        if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            const initialBones: BoneData[] = Array.from({ length: 18 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 5 + Math.random() * 5;
                return {
                    id: Date.now() + i,
                    x: 50,
                    y: 50,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    collected: false
                };
            });
            setBones(initialBones);
        }

        const update = () => {
            if (stateRef.current.isDone) return;
            const now = Date.now();

            if (activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO) {
                const speed = activeSkillCheck.type === SkillCheckType.COMBO ? (1.2 + stateRef.current.stage * 0.7) : 1.5;
                if (isSonic) {
                    let p = stateRef.current.targetZone.start + (speed) * stateRef.current.direction;
                    if (p >= (100 - stateRef.current.targetZone.width) || p <= 0) stateRef.current.direction *= -1;
                    stateRef.current.targetZone.start = Math.max(0, Math.min(100 - stateRef.current.targetZone.width, p));
                    setTargetZone({ ...stateRef.current.targetZone });
                } else {
                    let p = stateRef.current.progress + (speed) * stateRef.current.direction;
                    if (p >= 100 || p <= 0) stateRef.current.direction *= -1;
                    stateRef.current.progress = p;
                    setProgress(p);
                }
            } else if (activeSkillCheck.type === SkillCheckType.MASH) {
                stateRef.current.progress = Math.max(0, stateRef.current.progress - 0.15);
                setProgress(stateRef.current.progress);
                if (now - stateRef.current.startTime > 3000) resolve(stateRef.current.progress / 100);
            } else if (activeSkillCheck.type === SkillCheckType.REFLEX) {
                setReflexTargets(prev => prev.map(t => t.hit ? t : { ...t, value: Math.max(0, t.value - 0.4) }));
            } else if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
                setBones(prev => {
                    const isVacuuming = stateRef.current.isHolding;
                    const cx = stateRef.current.cursorX;
                    const cy = stateRef.current.cursorY;
                    
                    const updated = prev.map(h => {
                        if (h.collected) return h;
                        
                        let nx = h.x + h.vx * 0.12;
                        let ny = h.y + h.vy * 0.12;

                        if (isVacuuming) {
                            const dx = cx - nx;
                            const dy = cy - ny;
                            const distSq = dx * dx + dy * dy;
                            const vacuumRadiusSq = 450; 
                            const collectionRadiusSq = 60; 

                            if (distSq < vacuumRadiusSq) {
                                const force = 0.6;
                                h.vx += (dx / Math.sqrt(distSq)) * force;
                                h.vy += (dy / Math.sqrt(distSq)) * force;
                                
                                h.vx *= 0.90;
                                h.vy *= 0.90;
                            }

                            if (distSq < collectionRadiusSq) {
                                h.collected = true;
                                const count = prev.filter(x => x.collected).length + 1;
                                const ratio = count / prev.length;
                                const color = ratio >= 0.8 ? '#10b981' : ratio >= 0.4 ? '#facc15' : '#ffffff';
                                const container = document.querySelector('.minigame-container');
                                if (container) {
                                    const rect = container.getBoundingClientRect();
                                    const screenX = rect.left + (cx / 100) * rect.width;
                                    const screenY = rect.top + (cy / 100) * rect.height;
                                    spawnParticles(screenX, screenY, color);
                                }
                            }
                        }

                        if (nx <= 5 || nx >= 95) { h.vx *= -0.85; nx = nx <= 5 ? 5.1 : 94.9; }
                        if (ny <= 10 || ny >= 90) { h.vy *= -0.85; ny = ny <= 10 ? 10.1 : 89.9; }
                        
                        const speed = Math.sqrt(h.vx * h.vx + h.vy * h.vy);
                        if (speed > 5) {
                            h.vx = (h.vx / speed) * 5;
                            h.vy = (h.vy / speed) * 5;
                        }

                        return { ...h, x: nx, y: ny };
                    });

                    if (updated.every(b => b.collected)) {
                        const elapsed = (Date.now() - stateRef.current.startTime) / 1000;
                        let rating = { text: "Weak Snack", color: "text-slate-400", mult: 1.2 };
                        if (elapsed < 3.0) rating = { text: "Perfect Feast", color: "text-yellow-400", mult: 3.0 };
                        else if (elapsed < 6.0) rating = { text: "Good Meal", color: "text-emerald-400", mult: 2.0 };
                        
                        setCompletionRating(rating);
                        setTimeout(() => resolve(rating.mult, 1.0), 1200);
                    }

                    return updated;
                });
            }

            frameRef.current = requestAnimationFrame(update);
        };

        frameRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameRef.current);
    }, [activeSkillCheck]);

    const resolve = (mult: number, secMult: number = 0) => {
        if (stateRef.current.isDone) return;
        stateRef.current.isDone = true;
        onComplete(mult, secMult);
    };

    const handleInteraction = (e: React.PointerEvent) => {
        if (!activeSkillCheck || stateRef.current.isDone) return;
        e.preventDefault();

        if (activeSkillCheck.type === SkillCheckType.MASH) {
            stateRef.current.progress = Math.min(100, stateRef.current.progress + 8);
            setProgress(stateRef.current.progress);
            if (stateRef.current.progress >= 100) resolve(1.5);
        } else if (activeSkillCheck.type === SkillCheckType.TIMING) {
            const targetMid = stateRef.current.targetZone.start + stateRef.current.targetZone.width / 2;
            const diff = Math.abs((activeSkillCheck.move.id === 'sonic_wave' ? 50 : stateRef.current.progress) - targetMid);
            const halfWidth = stateRef.current.targetZone.width / 2;
            let m = 0.5;
            if (diff <= halfWidth / 6) m = 2.0;
            else if (diff <= halfWidth / 2) m = 1.5;
            else if (diff <= halfWidth) m = 1.2;
            resolve(m);
        } else if (activeSkillCheck.type === SkillCheckType.COMBO) {
            const targetMid = stateRef.current.targetZone.start + stateRef.current.targetZone.width / 2;
            const diff = Math.abs(stateRef.current.progress - targetMid);
            const isHit = diff <= stateRef.current.targetZone.width / 2;
            if (isHit) {
                stateRef.current.accMult += (diff <= stateRef.current.targetZone.width / 8 ? 0.8 : 0.4);
                stateRef.current.comboCount += 1;
                setHitFeedback({ id: Date.now(), text: `${stateRef.current.comboCount}x COMBO`, color: 'text-emerald-400' });
            } else {
                setHitFeedback({ id: Date.now(), text: `MISS`, color: 'text-rose-500' });
            }
            if (stateRef.current.stage < 3) {
                stateRef.current.stage += 1;
                setStage(stateRef.current.stage);
                stateRef.current.targetZone = { start: Math.random() * 70, width: stateRef.current.targetZone.width * 0.8 };
                setTargetZone(stateRef.current.targetZone);
            } else {
                resolve(Math.max(0.5, stateRef.current.accMult));
            }
        } else if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            setIsHolding(true);
            stateRef.current.isHolding = true;
            updateCursorCoords(e);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activeSkillCheck || stateRef.current.isDone || activeSkillCheck.type !== SkillCheckType.DRAIN_GAME) return;
        updateCursorCoords(e);
    };

    const handlePointerUp = () => {
        setIsHolding(false);
        stateRef.current.isHolding = false;
    };

    const updateCursorCoords = (e: React.PointerEvent) => {
        const container = document.querySelector('.minigame-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            stateRef.current.cursorX = xPct;
            stateRef.current.cursorY = yPct;
            setCursorPos({ x: xPct, y: yPct });
        }
    };

    const spawnParticles = (x: number, y: number, color: string) => {
        const id = Date.now() + Math.random();
        setOverlayParticles(prev => [...prev, { id, x, y, color }]);
        setTimeout(() => setOverlayParticles(prev => prev.filter(p => p.id !== id)), 600);
    };

    const getProgressionColor = () => {
        const collected = bones.filter(h => h.collected).length;
        const total = bones.length || 1;
        const ratio = collected / total;
        if (ratio >= 0.8) return '#10b981';
        if (ratio >= 0.4) return '#facc15';
        return '#cbd5e1';
    };

    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={handleInteraction}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {activeSkillCheck.type === SkillCheckType.REFLEX ? (
                    <div className="absolute inset-0 w-full h-full relative">
                        <div className="absolute top-16 w-full text-center text-white font-tech text-3xl animate-pulse tracking-widest pointer-events-none">TAP TARGETS!</div>
                        {reflexTargets.map((t) => !t.hit && (
                            <motion.button key={t.id} onPointerDown={(e) => { e.stopPropagation(); setReflexTargets(p => p.map(rt => rt.id === t.id ? { ...rt, hit: true } : rt)); if (reflexTargets.filter(rt => !rt.hit).length === 1) resolve(1.5); }}
                                className="absolute w-32 h-32 rounded-full border-[6px] shadow-2xl active:scale-95"
                                style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', borderColor: getReflexColor(activeSkillCheck.move.type, t.value), backgroundColor: 'rgba(0,0,0,0.7)' }}>
                                <div className="absolute inset-0 rounded-full opacity-40" style={{ background: `conic-gradient(${getReflexColor(activeSkillCheck.move.type, t.value)} ${t.value}%, transparent 0)` }} />
                                {activeSkillCheck.move.type === MoveType.HEAL ? <Heart size={56} fill="currentColor" /> : <Shield size={56} fill="currentColor" />}
                            </motion.button>
                        ))}
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.DRAIN_GAME ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden">
                        <AnimatePresence>
                            {!completionRating && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute top-12 w-full text-center z-10 px-6"
                                >
                                    <h2 className="text-white font-tech text-4xl font-black italic animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">CARRION FEAST</h2>
                                    <p className="text-purple-400 font-bold uppercase tracking-widest text-sm mt-2">Hold and vacuum souls into the core</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {cursorPos && !completionRating && (
                            <motion.div 
                                animate={{ 
                                    scale: isHolding ? [1, 1.15, 1] : 0.2,
                                    opacity: isHolding ? 0.9 : 0 
                                }}
                                transition={{
                                    scale: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
                                }}
                                className="absolute w-32 h-32 rounded-full bg-purple-600 pointer-events-none z-30 shadow-[0_0_40px_rgba(147,51,234,0.6)] flex items-center justify-center"
                                style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                                <div className="absolute inset-2 rounded-full border border-purple-300/30 animate-pulse" />
                                <div className="w-4 h-4 rounded-full bg-white/40 blur-sm" />
                            </motion.div>
                        )}

                        <div className="absolute inset-0 pointer-events-none">
                            {bones.map(h => (
                                <motion.div 
                                    key={h.id} 
                                    className="absolute" 
                                    animate={{ 
                                        scale: h.collected ? [1.2, 4, 0] : [1, 1.2, 1], 
                                        opacity: h.collected ? [1, 1, 0] : 0.9,
                                        rotate: h.collected ? 180 : 0
                                    }}
                                    transition={{
                                        duration: h.collected ? 0.3 : 2,
                                        repeat: h.collected ? 0 : Infinity,
                                        ease: "easeInOut"
                                    }}
                                    style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)', zIndex: h.collected ? 40 : 20 }}>
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <Bone size={h.collected ? 48 : 32} className={h.collected ? "text-emerald-400" : "text-white"} style={{ filter: h.collected ? 'none' : `drop-shadow(0 0 8px rgba(168,85,247,0.5))` }} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div 
                            className={`absolute w-full flex justify-center z-40 transition-all duration-700 ease-out`}
                            animate={{ 
                                bottom: completionRating ? "50%" : "3rem",
                                scale: completionRating ? 1.5 : 1,
                                translateY: completionRating ? "50%" : "0%"
                            }}
                        >
                            <div className="inline-block bg-slate-900/90 border-2 border-purple-500/50 px-8 py-4 rounded-full backdrop-blur-md shadow-2xl">
                                <div className="text-3xl font-tech font-black text-white flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-4">
                                        <Bone size={28} className="text-slate-400" />
                                        <span style={{ color: getProgressionColor() }} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                            {bones.filter(h => h.collected).length}
                                        </span>
                                        <span className="text-slate-600">/</span>
                                        <span>{bones.length}</span>
                                    </div>
                                    <AnimatePresence>
                                        {completionRating && (
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 0 }} 
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center gap-1"
                                            >
                                                <span className={`text-xl font-black uppercase tracking-tighter ${completionRating.color} animate-bounce`}>
                                                    {completionRating.text}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">x{completionRating.mult.toFixed(1)} POWER</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.FLICK ? (
                    <div className="flex flex-col items-center gap-12 w-full max-w-lg relative">
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest">SWIPE!</div>
                        <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-slate-800 bg-slate-900 shadow-2xl">
                             {activeSkillCheck.move.id === 'sonic_wave' ? <MoveUp size={80} className="text-cyan-400" /> : <Zap size={80} className="text-cyan-400" />}
                        </div>
                        <div className="text-slate-400 text-xs font-mono uppercase">Drag across screen to trigger</div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full relative">
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest mb-8">
                            {activeSkillCheck.type === SkillCheckType.TIMING ? "TAP AT GREEN!" : activeSkillCheck.type === SkillCheckType.COMBO ? `COMBO HIT ${stage}/3` : "TAP FAST!"}
                        </div>
                        <div className="h-16 mb-4 flex items-center justify-center">
                            <AnimatePresence>{hitFeedback && (<motion.div key={hitFeedback.id} initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.2}} exit={{opacity:0,scale:2}} className={`font-tech font-black text-3xl italic ${hitFeedback.color}`}>{hitFeedback.text}</motion.div>)}</AnimatePresence>
                        </div>
                        <div className="w-[85%] border-4 border-slate-700 rounded-xl relative overflow-hidden bg-slate-950 h-24 shadow-2xl">
                            {activeSkillCheck.type === SkillCheckType.MASH ? (<div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{width: `${progress}%`}} />) : (
                                <><div className="absolute h-full bg-emerald-500/40" style={{ left: `${targetZone.start}%`, width: `${targetZone.width}%` }} /><div className="absolute h-full w-1.5 bg-white shadow-[0_0_15px_white]" style={{ left: `${progress}%`, transform: 'translateX(-50%)', opacity: activeSkillCheck.move.id === 'sonic_wave' ? 0 : 1 }} />{activeSkillCheck.move.id === 'sonic_wave' && <div className="absolute h-full w-1.5 bg-cyan-400 shadow-[0_0_10px_cyan]" style={{ left: '50%', transform: 'translateX(-50%)' }} />}</>
                            )}
                        </div>
                    </div>
                )}
                {overlayParticles.map(p => (<motion.div key={p.id} initial={{scale:1,opacity:1}} animate={{scale:0,opacity:0}} className="fixed w-4 h-4 rounded-full pointer-events-none" style={{left:p.x,top:p.y,backgroundColor:p.color,boxShadow:`0 0 10px ${p.color}`}} />))}
            </motion.div>
        )}
       </AnimatePresence>
    );
};