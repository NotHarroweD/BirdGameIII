import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillCheckType, MoveType } from '../../types';
import { Heart, Shield, Zap, MoveUp, MoveDown, MoveLeft, MoveRight, Bone, Swords } from 'lucide-react';
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
    const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const [completionRating, setCompletionRating] = useState<{ text: string, color: string, mult: number } | null>(null);
    const [tapMarkers, setTapMarkers] = useState<{ id: number, pos: number, color: string }[]>([]);
    const [screenFlash, setScreenFlash] = useState(false);
    const [zoneFlash, setZoneFlash] = useState<'success' | 'fail' | null>(null);
    const [mashFlash, setMashFlash] = useState(false);
    const [pointerFlash, setPointerFlash] = useState(false);
    const [resultColor, setResultColor] = useState('bg-white');

    const [swipeData, setSwipeData] = useState<{ start: {x: number, y: number}, current: {x: number, y: number} } | null>(null);
    const [flickProgress, setFlickProgress] = useState(0);
    const [isFlickSuccess, setIsFlickSuccess] = useState(false);
    const [targetDirection, setTargetDirection] = useState<{ x: number, y: number, angle: number } | null>(null);
    const [pastSlashes, setPastSlashes] = useState<{ start: {x: number, y: number}, end: {x: number, y: number}, id: number }[]>([]);
    
    const frameRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

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
        stopMovement: false,
        cursorX: 0,
        cursorY: 0,
        isHolding: false,
        activeMoveId: '',
        hitValues: [] as number[]
    });

    const getMashColor = (p: number) => {
        const hue = (p * 1.2); 
        return `hsl(${hue}, 85%, 45%)`;
    };

    useEffect(() => {
        if (!activeSkillCheck) {
            stateRef.current.isDone = false;
            stateRef.current.isPaused = false;
            stateRef.current.stopMovement = false;
            stateRef.current.activeMoveId = '';
            stateRef.current.hitValues = [];
            setCursorPos(null);
            setIsHolding(false);
            setCompletionRating(null);
            setTapMarkers([]);
            setScreenFlash(false);
            setZoneFlash(null);
            setMashFlash(false);
            setPointerFlash(false);
            setResultColor('bg-white');
            setSwipeData(null);
            setFlickProgress(0);
            setIsFlickSuccess(false);
            setTargetDirection(null);
            setPastSlashes([]);
            setReflexTargets([]);
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
            stopMovement: false,
            cursorX: 0,
            cursorY: 0,
            isHolding: false,
            activeMoveId: activeSkillCheck.move.id,
            hitValues: []
        };

        setProgress(0);
        setStage(1);
        setTargetZone(stateRef.current.targetZone);
        setHitFeedback(null);
        setIsHolding(false);
        setCompletionRating(null);
        setTapMarkers([]);
        setFlickProgress(0);
        setIsFlickSuccess(false);
        setPastSlashes([]);
        setReflexTargets([]); 

        if (activeSkillCheck.type === SkillCheckType.FLICK) {
            const dirs = [
                { x: 0, y: -1, angle: 0 },    
                { x: 1, y: 0, angle: 90 },   
                { x: 0, y: 1, angle: 180 },  
                { x: -1, y: 0, angle: 270 }  
            ];
            setTargetDirection(dirs[Math.floor(Math.random() * dirs.length)]);
        }

        if (activeSkillCheck.type === SkillCheckType.REFLEX) {
            setReflexTargets([
                { id: 1, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 1.0 },
                { id: 2, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 1.1 },
                { id: 3, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 0.9 }
            ]);
        }

        if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            const boneCount = 12;
            const initialBones: BoneData[] = Array.from({ length: boneCount }).map((_, i) => {
                const angle = (i / boneCount) * Math.PI * 2;
                const speed = 10 + Math.random() * 4;
                return {
                    id: Date.now() + i,
                    x: 50 + Math.cos(angle) * 3,
                    y: 50 + Math.pow(Math.random(), 0.5) * 40,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    collected: false
                };
            });
            setBones(initialBones);
        }

        const update = () => {
            if (stateRef.current.isDone) {
                frameRef.current = requestAnimationFrame(update);
                return;
            }

            const isLocked = stateRef.current.isPaused;
            const now = Date.now();

            if (activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO) {
                if (!stateRef.current.stopMovement) {
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
                }
            } else if (isLocked) {
                frameRef.current = requestAnimationFrame(update);
                return;
            } else if (activeSkillCheck.type === SkillCheckType.MASH) {
                stateRef.current.progress = Math.max(0, stateRef.current.progress - 0.05);
                setProgress(stateRef.current.progress);
                if (now - stateRef.current.startTime > 3000) resolve(stateRef.current.progress / 100);
            } else if (activeSkillCheck.type === SkillCheckType.REFLEX) {
                setReflexTargets(prev => prev.map(t => t.hit ? t : { ...t, value: Math.max(0, t.value - 0.75) }));
                if (now - stateRef.current.startTime > 5000 && !stateRef.current.isDone) {
                    resolve(0.5);
                }
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
                                const force = 0.95;
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

    useEffect(() => {
        if (activeSkillCheck?.type === SkillCheckType.REFLEX && reflexTargets.length > 0) {
            const allHit = reflexTargets.every(t => t.hit);
            if (allHit && !stateRef.current.isDone) {
                const totalValue = stateRef.current.hitValues.reduce((a, b) => a + b, 0);
                const avg = totalValue / 3;
                let finalMult = 1.0;
                if (avg > 75) finalMult = 1.5;
                else if (avg > 40) finalMult = 1.2;
                setTimeout(() => resolve(finalMult), 200);
            }
        }
    }, [reflexTargets, activeSkillCheck]);

    const resolve = (mult: number, secMult: number = 0) => {
        if (stateRef.current.isDone) return;
        stateRef.current.isDone = true;
        onComplete(mult, secMult);
    };

    const handleInteraction = (e: React.PointerEvent) => {
        if (!activeSkillCheck || stateRef.current.isDone || stateRef.current.isPaused) return;

        if (activeSkillCheck.type === SkillCheckType.REFLEX) return;
        
        if (activeSkillCheck.type === SkillCheckType.MASH) {
            e.preventDefault();
            setMashFlash(true);
            setTimeout(() => setMashFlash(false), 50);
            stateRef.current.progress = Math.min(100, stateRef.current.progress + 7.5);
            setProgress(stateRef.current.progress);
            if (stateRef.current.progress >= 100) {
                setTimeout(() => resolve(1.5), 250);
            }
        } else if (activeSkillCheck.type === SkillCheckType.TIMING || activeSkillCheck.type === SkillCheckType.COMBO) {
            e.preventDefault();
            stateRef.current.isPaused = true;
            
            if (activeSkillCheck.type === SkillCheckType.TIMING || stateRef.current.stage === 3) {
                stateRef.current.stopMovement = true;
            }
            
            const markerPos = stateRef.current.progress;
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
            e.preventDefault();
            setIsHolding(true);
            stateRef.current.isHolding = true;
            updateCursorCoords(e);
        } else if (activeSkillCheck.type === SkillCheckType.FLICK) {
            e.preventDefault();
            setSwipeData({ start: { x: e.clientX, y: e.clientY }, current: { x: e.clientX, y: e.clientY } });
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activeSkillCheck || stateRef.current.isDone) return;
        
        if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            updateCursorCoords(e);
        } else if (activeSkillCheck.type === SkillCheckType.FLICK && swipeData && targetDirection && !isFlickSuccess) {
            const dx = e.clientX - swipeData.start.x;
            const dy = e.clientY - swipeData.start.y;
            
            const dotProduct = (dx * targetDirection.x) + (dy * targetDirection.y);
            const progress = Math.min(100, Math.max(0, (dotProduct / 250) * 100));
            setFlickProgress(progress);
            setSwipeData({ ...swipeData, current: { x: e.clientX, y: e.clientY } });
            
            if (progress >= 100) {
                if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
                setIsFlickSuccess(true);
                setScreenFlash(true);
                setTimeout(() => resolve(2.2), 500);
            }
        }
    };

    const handlePointerUp = () => {
        setIsHolding(false);
        stateRef.current.isHolding = false;
        if (activeSkillCheck?.type === SkillCheckType.FLICK && swipeData) {
            const newSlash = { start: swipeData.start, end: swipeData.current, id: Date.now() };
            setPastSlashes(prev => [...prev, newSlash]);
            setTimeout(() => {
                setPastSlashes(p => p.filter(s => s.id !== newSlash.id));
            }, 400);
        }
        setSwipeData(null);
        if (!stateRef.current.isDone && !isFlickSuccess) {
            setFlickProgress(0);
        }
    };

    const updateCursorCoords = (e: React.PointerEvent) => {
        const container = containerRef.current;
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

    const radius = 150;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (flickProgress / 100) * circumference;

    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                ref={containerRef}
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/70 backdrop-blur-lg flex flex-col items-center justify-center gap-8 select-none touch-none"
                onPointerDown={handleInteraction}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <AnimatePresence>
                    {screenFlash && (
                        <motion.div 
                            initial={{opacity: 0.4}} 
                            animate={{opacity: 0}} 
                            className="absolute inset-0 z-[60] pointer-events-none bg-white" 
                        />
                    )}
                </AnimatePresence>
                
                {activeSkillCheck.type === SkillCheckType.REFLEX ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute top-16 w-full text-center text-white font-tech text-3xl animate-pulse tracking-widest pointer-events-none uppercase drop-shadow-lg">
                            {activeSkillCheck.move.type === MoveType.HEAL ? "RESTORE VITALITY!" : "STRENGTHEN ARMOR!"}
                        </div>
                        <AnimatePresence mode="popLayout">
                            {reflexTargets.map((t, idx) => (
                                <motion.div 
                                    key={`${stateRef.current.activeMoveId}-${t.id}`} 
                                    onPointerDown={(e) => { 
                                        if (t.hit || stateRef.current.isDone) return;
                                        e.stopPropagation(); 
                                        e.preventDefault();
                                        stateRef.current.hitValues.push(t.value);
                                        setReflexTargets(p => p.map(rt => rt.id === t.id ? { ...rt, hit: true } : rt)); 
                                    }}
                                    initial={{ scale: 0, opacity: 0, rotate: t.rotation - 15 }}
                                    animate={t.hit ? {
                                        scale: [t.baseScale * 1.2, t.baseScale * 3.0], 
                                        opacity: 0, 
                                        rotate: t.rotation + (activeSkillCheck.move.type === MoveType.HEAL ? 30 : -15),
                                    } : { 
                                        scale: [t.baseScale, t.baseScale * 1.05, t.baseScale], 
                                        opacity: 1, 
                                        rotate: t.rotation,
                                    }}
                                    transition={{ 
                                        scale: t.hit ? { duration: 0.3, ease: "easeOut" } : { repeat: Infinity, duration: 0.8, ease: "easeInOut" },
                                        opacity: { duration: 0.3 },
                                        rotate: { duration: 0.3 }
                                    }}
                                    className={`absolute w-[180px] h-[180px] flex items-center justify-center cursor-pointer active:scale-90 bg-transparent touch-none ${t.hit ? 'pointer-events-none' : 'pointer-events-auto'}`}
                                    style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', zIndex: 100 + idx }}
                                >
                                    <div className="relative pointer-events-none flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {t.hit && (
                                                <motion.div 
                                                    initial={{ scale: 0.2, opacity: 0.8 }}
                                                    animate={{ scale: 2.5, opacity: 0 }}
                                                    className="w-full h-full bg-white rounded-full blur-xl mix-blend-screen"
                                                />
                                            )}
                                        </div>
                                        <div className="relative z-10 flex items-center justify-center">
                                            {activeSkillCheck.move.type === MoveType.HEAL ? (
                                                <Heart 
                                                    size={128} 
                                                    fill={getReflexColor(activeSkillCheck.move.type, t.value)} 
                                                    className="drop-shadow-[0_0_25px_rgba(255,255,255,0.8)] text-white stroke-[2.5]" 
                                                />
                                            ) : (
                                                <Shield 
                                                    size={128} 
                                                    fill={getReflexColor(activeSkillCheck.move.type, t.value)} 
                                                    className="drop-shadow-[0_0_25px_rgba(255,255,255,0.8)] text-white stroke-[2.5]" 
                                                />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
                        <div className="text-white font-tech text-4xl font-black animate-pulse uppercase tracking-widest">SONIC SLASH</div>
                        <div className="relative w-80 h-80 flex items-center justify-center">
                             <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="160" cy="160" r={radius} stroke="#1e293b" strokeWidth="16" fill="none" />
                                <motion.circle 
                                    cx="160" cy="160" r={radius} 
                                    stroke={isFlickSuccess ? "#10b981" : "#10b981"} 
                                    strokeWidth="16" fill="none"
                                    strokeDasharray={circumference}
                                    animate={{ 
                                        strokeDashoffset: isFlickSuccess ? 0 : offset,
                                        scale: isFlickSuccess ? [1, 1.05, 1] : 1
                                    }}
                                    transition={{ duration: 0.1 }}
                                    strokeLinecap="round"
                                    className={isFlickSuccess ? "drop-shadow-[0_0_20px_#10b981]" : ""}
                                />
                             </svg>
                             
                             <div className="relative w-64 h-64 rounded-full flex items-center justify-center bg-slate-900/90 border-4 border-slate-800 shadow-2xl z-10 overflow-hidden">
                                <motion.div
                                    animate={isFlickSuccess ? { scale: [1, 1.4, 1], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] } : { scale: 1 }}
                                    style={{ rotate: targetDirection?.angle || 0 }}
                                >
                                    <MoveUp size={120} className={`transition-all duration-300 ${flickProgress >= 100 ? 'text-emerald-400 drop-shadow-[0_0_30px_#10b981]' : 'text-cyan-400'}`} />
                                </motion.div>
                             </div>

                             <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-[100] overflow-visible">
                                <defs>
                                    <filter id="slash-glow">
                                        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <linearGradient id="slash-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#fff" stopOpacity="1" />
                                    </linearGradient>
                                </defs>
                                
                                <AnimatePresence>
                                    {[...pastSlashes, ...(swipeData ? [{ ...swipeData, id: -1, isCurrent: true }] : [])].map((s: any) => (
                                        <motion.g 
                                            key={s.id}
                                            initial={{ opacity: 1 }}
                                            animate={{ opacity: s.isCurrent ? 1 : 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: s.isCurrent ? 0 : 0.4 }}
                                        >
                                            {[ -16, 0, 16 ].map((offsetVal, idx) => (
                                                <g key={idx}>
                                                    <motion.line 
                                                        x1={s.start.x + offsetVal} y1={s.start.y} 
                                                        x2={s.current ? s.current.x + offsetVal : s.end.x + offsetVal} 
                                                        y2={s.current ? s.current.y + offsetVal : s.end.y + offsetVal} 
                                                        stroke="url(#slash-grad)" 
                                                        strokeWidth={idx === 1 ? "12" : "8"} 
                                                        strokeLinecap="round"
                                                        filter="url(#slash-glow)"
                                                    />
                                                </g>
                                            ))}
                                        </motion.g>
                                    ))}
                                </AnimatePresence>
                             </svg>
                        </div>
                        <div className="mt-4 text-slate-500 font-tech text-xs tracking-[0.3em] animate-pulse uppercase">SLASH IN THE INDICATED DIRECTION</div>
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
                            animate={activeSkillCheck.type === SkillCheckType.MASH && progress >= 100 ? { scale: [1, 1.15, 1], boxShadow: "0 0 70px rgba(255,255,255,0.8)" } : {}}
                            transition={activeSkillCheck.type === SkillCheckType.MASH && progress >= 100 ? { repeat: Infinity, duration: 0.1 } : {}}
                        >
                            {activeSkillCheck.type === SkillCheckType.MASH ? (
                                <div className="h-full relative overflow-hidden">
                                    <motion.div 
                                        className={`h-full transition-all duration-75 ease-out shadow-[inset_-10px_0_30px_rgba(255,255,255,0.2)]`} 
                                        style={{width: `${progress}%`, backgroundColor: getMashColor(progress)}} 
                                        animate={progress >= 100 ? { filter: ["brightness(1)", "brightness(2.5)", "brightness(1)"], x: [0, -6, 6, -6, 6, 0] } : {}}
                                        transition={progress >= 100 ? { repeat: Infinity, duration: 0.08 } : {}}
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-400 animate-pulse shadow-[0_0_20px_#10b981]" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-tech font-black text-sm tracking-widest opacity-50">MAX</div>
                                    
                                    <AnimatePresence>
                                        {progress >= 100 && (
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 1 }}
                                                animate={{ scale: 3, opacity: 0 }}
                                                transition={{ duration: 0.4, repeat: Infinity }}
                                                className="absolute inset-0 bg-white z-[30] pointer-events-none"
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
                                    
                                    <BonePointer pos={progress} color={pointerFlash ? resultColor : 'bg-white'} isActive={true} />
                                </>
                            )}
                        </motion.div>
                        <div className="mt-8 text-slate-500 font-tech text-xs tracking-[0.3em] animate-pulse uppercase">TAP ANYWHERE TO HIT</div>
                    </div>
                )}
            </motion.div>
        )}
       </AnimatePresence>
    );
};
