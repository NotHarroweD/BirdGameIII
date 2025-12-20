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
    const [tapMarkers, setTapMarkers] = useState<{ id: number, pos: number, color: string }[]>([]);
    const [screenFlash, setScreenFlash] = useState(false);
    const [zoneFlash, setZoneFlash] = useState<'success' | 'fail' | null>(null);
    const [mashFlash, setMashFlash] = useState(false);
    const [pointerFlash, setPointerFlash] = useState(false);
    const [resultColor, setResultColor] = useState('bg-white');

    const ratio = bones.length > 0 ? bones.filter(h => h.collected).length / bones.length : 0;

    const stateRef = useRef({
        progress: 0,
        direction: 1,
        stage: 1,
        accMult: 0,
        comboCount: 0,
        targetZone: { start: 40, width: 20 },
        startTime: Date.now(),
        isDone: false,
        isPaused: false,
        cursorX: 0,
        cursorY: 0,
        isHolding: false
    });

    const frameRef = useRef<number>(0);

    const getMashColor = (p: number) => {
        const hue = (p * 1.2); 
        return `hsl(${hue}, 85%, 45%)`;
    };

    useEffect(() => {
        if (!activeSkillCheck) {
            stateRef.current.isDone = false;
            stateRef.current.isPaused = false;
            setCursorPos(null);
            setIsHolding(false);
            setCompletionRating(null);
            setTapMarkers([]);
            setScreenFlash(false);
            setZoneFlash(null);
            setMashFlash(false);
            setPointerFlash(false);
            setResultColor('bg-white');
            return;
        }

        const isSonic = activeSkillCheck.move.id === 'sonic_wave';
        const startWidth = activeSkillCheck.type === SkillCheckType.COMBO ? 36 : (isSonic ? 32 : 18);
        const startZone = activeSkillCheck.type === SkillCheckType.COMBO ? Math.random() * 60 : 40;

        stateRef.current = {
            progress: 0,
            direction: 1,
            stage: 1,
            accMult: 0,
            comboCount: 0,
            targetZone: { start: startZone, width: startWidth },
            startTime: Date.now(),
            isDone: false,
            isPaused: false,
            cursorX: 0,
            cursorY: 0,
            isHolding: false
        };

        setProgress(0);
        setStage(1);
        setTargetZone(stateRef.current.targetZone);
        setHitFeedback(null);
        setIsHolding(false);
        setCompletionRating(null);
        setTapMarkers([]);

        if (activeSkillCheck.type === SkillCheckType.REFLEX) {
            setReflexTargets([
                { id: 1, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                { id: 2, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false },
                { id: 3, x: 20 + Math.random() * 60, y: 20 + Math.random() * 60, value: 100, hit: false }
            ]);
        }

        if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            const boneCount = 12;
            const initialBones: BoneData[] = Array.from({ length: boneCount }).map((_, i) => {
                const angle = (i / boneCount) * Math.PI * 2;
                const speed = 5 + Math.random() * 2;
                return {
                    id: Date.now() + i,
                    x: 50 + Math.cos(angle) * 2,
                    y: 50 + Math.sin(angle) * 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    collected: false
                };
            });
            setBones(initialBones);
        }

        const update = () => {
            if (stateRef.current.isDone || stateRef.current.isPaused) {
                frameRef.current = requestAnimationFrame(update);
                return;
            }
            const now = Date.now();

            if (activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO) {
                const speed = activeSkillCheck.type === SkillCheckType.COMBO ? (2.8 + stateRef.current.stage * 1.0) : 3.5;
                
                let nextP = stateRef.current.progress + (speed * stateRef.current.direction);
                if (nextP >= 100) {
                    nextP = 100;
                    stateRef.current.direction = -1;
                } else if (nextP <= 0) {
                    nextP = 0;
                    stateRef.current.direction = 1;
                }
                
                stateRef.current.progress = nextP;
                setProgress(nextP);

                if (activeSkillCheck.move.id === 'sonic_wave') {
                    let zp = stateRef.current.targetZone.start + (speed * 0.8 * stateRef.current.direction);
                    if (zp >= (100 - stateRef.current.targetZone.width)) zp = 100 - stateRef.current.targetZone.width;
                    if (zp <= 0) zp = 0;
                    stateRef.current.targetZone.start = zp;
                    setTargetZone({ ...stateRef.current.targetZone });
                }
            } else if (activeSkillCheck.type === SkillCheckType.MASH) {
                stateRef.current.progress = Math.max(0, stateRef.current.progress - 0.05);
                setProgress(stateRef.current.progress);
                if (now - stateRef.current.startTime > 3000) resolve(stateRef.current.progress / 100);
            } else if (activeSkillCheck.type === SkillCheckType.REFLEX) {
                setReflexTargets(prev => prev.map(t => t.hit ? t : { ...t, value: Math.max(0, t.value - 0.45) }));
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
                            if (distSq < 600) {
                                const force = 0.85;
                                h.vx += (dx / Math.sqrt(distSq)) * force;
                                h.vy += (dy / Math.sqrt(distSq)) * force;
                                h.vx *= 0.85;
                                h.vy *= 0.85;
                            }
                            if (distSq < 100) h.collected = true;
                        }
                        if (nx <= 5 || nx >= 95) { h.vx *= -0.85; nx = nx <= 5 ? 5.1 : 94.9; }
                        if (ny <= 10 || ny >= 90) { h.vy *= -0.85; ny = ny <= 10 ? 10.1 : 89.9; }
                        return { ...h, x: nx, y: ny };
                    });
                    
                    if (updated.every(b => b.collected) && !stateRef.current.isPaused) {
                        stateRef.current.isPaused = true;
                        const elapsed = (Date.now() - stateRef.current.startTime) / 1000;
                        let rating = { text: "Weak Snack", color: "text-slate-400", mult: 1.2 };
                        if (elapsed < 1.3) rating = { text: "Perfect Feast", color: "text-yellow-400", mult: 3.0 };
                        else if (elapsed < 2.2) rating = { text: "Good Meal", color: "text-emerald-400", mult: 2.0 };
                        setCompletionRating(rating);
                        setTimeout(() => resolve(rating.mult, 1.0), 800);
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
        if (!activeSkillCheck || stateRef.current.isDone || stateRef.current.isPaused) return;
        e.preventDefault();
        
        if (activeSkillCheck.type === SkillCheckType.MASH) {
            setMashFlash(true);
            setTimeout(() => setMashFlash(false), 50);
            stateRef.current.progress = Math.min(100, stateRef.current.progress + 7.5);
            setProgress(stateRef.current.progress);
            if (stateRef.current.progress >= 100) {
                setTimeout(() => resolve(1.5), 250);
            }
        } else if (activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO) {
            stateRef.current.isPaused = true;
            const markerPos = activeSkillCheck.move.id === 'sonic_wave' ? 50 : stateRef.current.progress;
            
            setProgress(markerPos);

            const targetMid = stateRef.current.targetZone.start + stateRef.current.targetZone.width / 2;
            const diff = Math.abs(markerPos - targetMid);
            const halfWidth = stateRef.current.targetZone.width / 2;
            const isHit = diff <= halfWidth;

            const markerColor = isHit ? 'bg-emerald-400' : 'bg-rose-500';
            setResultColor(markerColor);
            setTapMarkers(prev => [...prev, { id: Date.now(), pos: markerPos, color: markerColor }]);
            
            setScreenFlash(true);
            setTimeout(() => setScreenFlash(false), 100);
            setZoneFlash(isHit ? 'success' : 'fail');
            setPointerFlash(true);

            if (activeSkillCheck.type === SkillCheckType.TIMING) {
                let m = 0.5;
                if (diff <= halfWidth / 6) m = 2.0;
                else if (diff <= halfWidth / 2) m = 1.5;
                else if (diff <= halfWidth) m = 1.2;
                setTimeout(() => resolve(m), 250);
            } else {
                if (isHit) {
                    stateRef.current.accMult += (diff <= halfWidth / 4 ? 0.8 : 0.4);
                    stateRef.current.comboCount += 1;
                    setHitFeedback({ id: Date.now(), text: `${stateRef.current.comboCount}x COMBO`, color: 'text-emerald-400' });
                } else {
                    setHitFeedback({ id: Date.now(), text: `MISS`, color: 'text-rose-500' });
                }
                
                if (stateRef.current.stage < 3) {
                    setTimeout(() => {
                        stateRef.current.isPaused = false;
                        stateRef.current.stage += 1;
                        setStage(stateRef.current.stage);
                        stateRef.current.targetZone = { 
                            start: Math.random() * (100 - stateRef.current.targetZone.width * 0.8), 
                            width: stateRef.current.targetZone.width * 0.85 
                        };
                        setTargetZone(stateRef.current.targetZone);
                        setZoneFlash(null);
                        setPointerFlash(false);
                        setResultColor('bg-white');
                    }, 200);
                } else {
                    setTimeout(() => resolve(Math.max(0.5, stateRef.current.accMult)), 250);
                }
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

    const BonePointer = ({ pos, color, isActive = false }: { pos: number, color: string, isActive?: boolean }) => (
        <motion.div 
            className="absolute h-full w-4 z-40 pointer-events-none"
            style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            animate={isActive && pointerFlash ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.2 }}
        >
            <div className={`h-full w-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)] border-x border-slate-950/20`} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[45%] flex gap-[-2px] items-center justify-center">
                <div className={`w-5 h-5 rounded-full bg-white border border-slate-950 shadow-md`} />
                <div className={`w-5 h-5 rounded-full bg-white border border-slate-950 -ml-1 shadow-md`} />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[45%] flex gap-[-2px] items-center justify-center">
                <div className={`w-5 h-5 rounded-full bg-white border border-slate-950 shadow-md`} />
                <div className={`w-5 h-5 rounded-full bg-white border border-slate-950 -ml-1 shadow-md`} />
            </div>
        </motion.div>
    );

    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-lg flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={handleInteraction}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <AnimatePresence>
                    {screenFlash && activeSkillCheck.type !== SkillCheckType.MASH && (
                        <motion.div 
                            initial={{opacity: 0.8}} 
                            animate={{opacity: 0}} 
                            className="absolute inset-0 z-[60] pointer-events-none bg-white" 
                        />
                    )}
                </AnimatePresence>
                
                {activeSkillCheck.type === SkillCheckType.REFLEX ? (
                    <div className="absolute inset-0 w-full h-full relative">
                        <div className="absolute top-16 w-full text-center text-white font-tech text-3xl animate-pulse tracking-widest pointer-events-none">TAP TARGETS!</div>
                        {reflexTargets.map((t) => !t.hit && (
                            <motion.button key={t.id} onPointerDown={(e) => { e.stopPropagation(); setReflexTargets(p => p.map(rt => rt.id === t.id ? { ...rt, hit: true } : rt)); if (reflexTargets.filter(rt => !rt.hit).length === 1) resolve(1.5); }}
                                className="absolute w-32 h-32 rounded-full border-[6px] shadow-2xl active:scale-95 flex items-center justify-center"
                                style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', borderColor: getReflexColor(activeSkillCheck.move.type, t.value), backgroundColor: 'rgba(0,0,0,0.7)', color: getReflexColor(activeSkillCheck.move.type, t.value) }}>
                                <div className="absolute inset-0 rounded-full opacity-40" style={{ background: `conic-gradient(${getReflexColor(activeSkillCheck.move.type, t.value)} ${t.value}%, transparent 0)` }} />
                                {activeSkillCheck.move.type === MoveType.HEAL ? <Heart size={56} fill="currentColor" /> : <Shield size={56} fill="currentColor" />}
                            </motion.button>
                        ))}
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.DRAIN_GAME ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden">
                        <AnimatePresence>
                            {!completionRating && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-12 w-full text-center z-10 px-6">
                                    <h2 className="text-white font-tech text-4xl font-black italic animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] uppercase">CARRION FEAST</h2>
                                    <p className="text-purple-400 font-bold uppercase tracking-widest text-sm mt-2">Hold and vacuum souls into the core</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {cursorPos && !completionRating && (
                            <motion.div animate={{ scale: isHolding ? [1, 1.15, 1] : 0.2, opacity: isHolding ? 0.9 : 0 }} transition={{ scale: { repeat: Infinity, duration: 0.8, ease: "easeInOut" } }} className="absolute w-32 h-32 rounded-full bg-purple-600 pointer-events-none z-30 shadow-[0_0_40px_rgba(147,51,234,0.6)] flex items-center justify-center" style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transform: 'translate(-50%, -50%)' }}>
                                <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                                <div className="w-4 h-4 rounded-full bg-white/40 blur-sm" />
                            </motion.div>
                        )}
                        <div className="absolute inset-0 pointer-events-none">
                            {bones.map(h => (
                                <motion.div key={h.id} className="absolute" animate={{ scale: h.collected ? [1.2, 4, 0] : [1, 1.2, 1], opacity: h.collected ? [1, 1, 0] : 0.9, rotate: h.collected ? 180 : 0 }} transition={{ duration: h.collected ? 0.3 : 2, repeat: h.collected ? 0 : Infinity, ease: "easeInOut" }} style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)', zIndex: h.collected ? 40 : 20 }}>
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <Bone size={h.collected ? 64 : 44} className={h.collected ? "text-emerald-400" : "text-white"} style={{ filter: h.collected ? 'none' : `drop-shadow(0 0 10px rgba(168,85,247,0.7))` }} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <AnimatePresence>
                            {completionRating && (
                                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1.5 }} className="absolute flex flex-col items-center gap-1 z-40 bg-slate-900/90 border-2 border-purple-500/50 px-8 py-4 rounded-3xl backdrop-blur-md shadow-2xl">
                                    <span className={`text-2xl font-tech font-black uppercase tracking-tighter ${completionRating.color} animate-bounce`}>{completionRating.text}</span>
                                    <div className="flex items-center gap-2 text-white font-mono">
                                        <Bone size={16} className="text-slate-400" />
                                        <span className="text-lg font-bold">x{completionRating.mult.toFixed(1)} POWER</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : activeSkillCheck.type === SkillCheckType.FLICK ? (
                    <div className="flex flex-col items-center gap-12 w-full max-w-lg relative">
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest">SWIPE!</div>
                        <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-slate-800 bg-slate-900 shadow-2xl">
                             {activeSkillCheck.move.id === 'sonic_wave' ? <MoveUp size={80} className="text-cyan-400" /> : <Zap size={80} className="text-cyan-400" />}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full relative">
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest mb-8">
                            {activeSkillCheck.type === SkillCheckType.TIMING ? "HIT THE ZONE!" : activeSkillCheck.type === SkillCheckType.COMBO ? `COMBO HIT ${stage}/3` : "TAP FAST!"}
                        </div>
                        <div className="h-16 mb-4 flex items-center justify-center">
                            <AnimatePresence>
                                {hitFeedback && (
                                    <motion.div 
                                        key={hitFeedback.id} 
                                        initial={hitFeedback.isStable ? { opacity: 0, scale: 0.5 } : { opacity: 0, scale: 0.5, y: 0 }} 
                                        animate={hitFeedback.isStable ? { opacity: 1, scale: 1.8 } : { opacity: 1, scale: 1.2, y: -20 }} 
                                        exit={hitFeedback.isStable ? { opacity: 0, scale: 3 } : { opacity: 0, scale: 2 }} 
                                        className={`font-tech font-black text-3xl italic ${hitFeedback.color} ${hitFeedback.isStable ? 'drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]' : ''}`}
                                    >
                                        {hitFeedback.text}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <motion.div 
                            className={`w-[85%] border-4 transition-all duration-150 rounded-2xl relative overflow-visible bg-slate-950 h-28 shadow-2xl ${zoneFlash === 'success' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : zoneFlash === 'fail' ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]' : 'border-slate-700'}`}
                            animate={activeSkillCheck.type === SkillCheckType.MASH && progress >= 100 ? { scale: [1, 1.05, 1], shadow: "0 0 50px rgba(34,211,238,0.5)" } : {}}
                            transition={activeSkillCheck.type === SkillCheckType.MASH && progress >= 100 ? { repeat: Infinity, duration: 0.15 } : {}}
                        >
                            {activeSkillCheck.type === SkillCheckType.MASH ? (
                                <div className="h-full relative overflow-hidden">
                                    <motion.div 
                                        className={`h-full transition-all duration-75 ease-out shadow-[inset_-10px_0_30px_rgba(255,255,255,0.2)]`} 
                                        style={{width: `${progress}%`, backgroundColor: getMashColor(progress)}} 
                                        animate={progress >= 100 ? { filter: ["brightness(1)", "brightness(2)", "brightness(1)"], x: [0, -4, 4, -4, 4, 0] } : {}}
                                        transition={progress >= 100 ? { repeat: Infinity, duration: 0.1 } : {}}
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-400 animate-pulse shadow-[0_0_20px_#10b981]" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-tech font-black text-sm tracking-widest opacity-50">MAX</div>
                                    
                                    {/* Burst Effect */}
                                    <AnimatePresence>
                                        {progress >= 100 && (
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 1 }}
                                                animate={{ scale: 2, opacity: 0 }}
                                                transition={{ duration: 0.5, repeat: Infinity }}
                                                className="absolute inset-0 bg-white/20 z-[30] pointer-events-none"
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        className={`absolute h-full transition-all duration-150 ${zoneFlash === 'success' ? 'bg-emerald-400 opacity-100 shadow-[0_0_50px_#10b981]' : zoneFlash === 'fail' ? 'bg-rose-500 opacity-100 shadow-[0_0_50px_#f43f5e]' : 'bg-emerald-500/40'} border-x-4 ${zoneFlash === 'success' ? 'border-emerald-200' : zoneFlash === 'fail' ? 'border-rose-200' : 'border-emerald-400/60'}`} 
                                        style={{ left: `${targetZone.start}%`, width: `${targetZone.width}%` }} 
                                    />
                                    
                                    {tapMarkers.map(m => (
                                        <motion.div 
                                            key={m.id} 
                                            initial={{ opacity: 1, scale: 1 }} 
                                            animate={{ opacity: 0, scale: 1.1 }} 
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="absolute inset-0 pointer-events-none"
                                        >
                                            <BonePointer pos={m.pos} color={m.color} />
                                        </motion.div>
                                    ))}
                                    
                                    {activeSkillCheck.move.id !== 'sonic_wave' && (
                                        <BonePointer pos={progress} color={pointerFlash ? resultColor : 'bg-white'} isActive={true} />
                                    )}
                                    
                                    {activeSkillCheck.move.id === 'sonic_wave' && <div className="absolute h-full w-3 bg-cyan-400 shadow-[0_0_20px_cyan]" style={{ left: '50%', transform: 'translateX(-50%)' }} />}
                                </>
                            )}
                        </motion.div>
                        <div className="mt-8 text-slate-500 font-tech text-xs tracking-[0.3em] animate-pulse">TAP ANYWHERE TO HIT</div>
                    </div>
                )}
            </motion.div>
        )}
       </AnimatePresence>
    );
};