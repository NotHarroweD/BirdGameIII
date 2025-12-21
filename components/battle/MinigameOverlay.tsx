
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
    const [reflexParticles, setReflexParticles] = useState<any[]>([]);
    const [zoneBursts, setZoneBursts] = useState<{id: number, left: number, color: string}[]>([]);
    const [hitFeedback, setHitFeedback] = useState<any>(null);
    const [targetZone, setTargetZone] = useState({ start: 40, width: 20 });
    const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
    const [isHolding, setIsHolding] = useState(false);
    const [completionRating, setCompletionRating] = useState<{ text: string, color: string, mult: number, details?: string, drainStats?: { damage: number, heal: number } } | null>(null);
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
        if (p >= 90) return '#3b82f6'; // Perfect (Blue)
        if (p >= 40) return '#fbbf24'; // Good (Yellow)
        return '#ef4444'; // Weak (Red)
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
            setReflexParticles([]);
            setZoneBursts([]);
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
        setReflexParticles([]);
        setZoneBursts([]);

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
                { id: 1, x: 35 + Math.random() * 30, y: 35 + Math.random() * 30, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 1.0 },
                { id: 2, x: 35 + Math.random() * 30, y: 35 + Math.random() * 30, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 1.1 },
                { id: 3, x: 35 + Math.random() * 30, y: 35 + Math.random() * 30, value: 100, hit: false, rotation: (Math.random() - 0.5) * 30, baseScale: 0.9 }
            ]);
        }

        if (activeSkillCheck.type === SkillCheckType.DRAIN_GAME) {
            const boneCount = 16;
            const initialBones: BoneData[] = Array.from({ length: boneCount }).map((_, i) => {
                const angle = (i / boneCount) * 2 * Math.PI;
                const x = 50; 
                const y = 50; 
                
                // Explode outwards into a ring
                const speed = 7; 
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;

                return {
                    id: Date.now() + i,
                    x: x,
                    y: y,
                    vx: vx,
                    vy: vy,
                    collected: false
                };
            });
            setBones(initialBones);
        }

        const update = () => {
            if (!activeSkillCheck || stateRef.current.isDone) return;

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
                    
                    const timeElapsed = Date.now() - stateRef.current.startTime;
                    const allCollected = updated.every(b => b.collected);
                    const timeUp = timeElapsed > 5000;

                    if ((allCollected || timeUp) && !stateRef.current.isPaused) {
                        stateRef.current.isPaused = true;
                        
                        const collectedCount = updated.filter(b => b.collected).length;
                        
                        let multiplier = 1.0;
                        let totalDmg = 0;
                        let totalHeal = 0;
                        let text = "FEEDING COMPLETE";
                        let color = "text-slate-400";
                        let isSuperFast = false;

                        if (allCollected) {
                            // Speed based logic for full collection
                            if (timeElapsed < 2000) { // Super Fast - Made tougher from 2200
                                multiplier = 3.0; 
                                totalDmg = 350; 
                                totalHeal = 250;
                                text = "VORACIOUS HUNGER!";
                                color = "text-fuchsia-400";
                                isSuperFast = true;
                                spawnSuperBurst(50, 50);
                            } else if (timeElapsed < 3500) { // Fast
                                multiplier = 2.5;
                                totalDmg = 280;
                                totalHeal = 200;
                                text = "SWIFT FEAST";
                                color = "text-purple-400";
                            } else { // Normal
                                multiplier = 2.0;
                                totalDmg = 240; 
                                totalHeal = 160; 
                                text = "FULL BELLY";
                                color = "text-purple-300";
                            }
                        } else {
                            // Fallback based on count if time ran out
                            multiplier = 1 + (collectedCount * 0.1); 
                            totalDmg = collectedCount * 12;
                            totalHeal = collectedCount * 8;
                            text = collectedCount > 10 ? "GOOD MEAL" : "WEAK SNACK";
                            color = collectedCount > 10 ? "text-emerald-400" : "text-slate-400";
                        }

                        setCompletionRating({ 
                            text, 
                            color, 
                            mult: multiplier,
                            drainStats: { damage: totalDmg, heal: totalHeal }
                        });
                        setTimeout(() => resolve(multiplier, 1.0), isSuperFast ? 1200 : 700);
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

    const spawnSuperBurst = (x: number, y: number) => {
        const newPs: any[] = [];
        
        // Primary purple burst ring - cleaner, less massive
        newPs.push({
            id: Math.random(),
            x, y, tx: x, ty: y,
            color: '#d946ef', // Fuchsia-500
            scale: 4, 
            duration: 0.6,
            type: 'ring'
        });

        // Inner white clean ring
        newPs.push({
            id: Math.random(),
            x, y, tx: x, ty: y,
            color: '#ffffff',
            scale: 2,
            duration: 0.4,
            type: 'ring'
        });

        // Reduced Particle Explosion (Cleaner)
        for(let i=0; i<20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 60; // Slightly tighter spread
            newPs.push({
                id: Math.random(),
                x, y,
                tx: x + (Math.cos(angle) * dist),
                ty: y + (Math.sin(angle) * dist),
                color: Math.random() > 0.5 ? '#d946ef' : '#f0abfc',
                scale: 1.5 + Math.random() * 1.5,
                duration: 0.6 + Math.random() * 0.4,
                type: 'particle'
            });
        }

        setReflexParticles(prev => [...prev, ...newPs]);
        // Removed setScreenFlash(true) to reduce choppiness
    };

    const spawnPerfectBurst = (x: number, y: number, moveType: MoveType) => {
        const isHeal = moveType === MoveType.HEAL;
        const color = isHeal ? '#34d399' : '#38bdf8'; // Emerald-400 vs Sky-400
        const overrideColor = moveType === MoveType.DRAIN ? '#a855f7' : color;
        
        const newPs: any[] = [];
        
        // Big shockwave
        newPs.push({
            id: Math.random(),
            x, y, tx: x, ty: y,
            color: overrideColor,
            scale: 6,
            duration: 0.8,
            type: 'ring'
        });
        
        // Inner white burst
        newPs.push({
            id: Math.random(),
            x, y, tx: x, ty: y,
            color: '#ffffff',
            scale: 3,
            duration: 0.4,
            type: 'ring'
        });

        // Heavy particle count
        for(let i=0; i<40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 40;
            newPs.push({
                id: Math.random(),
                x, y,
                tx: x + (Math.cos(angle) * dist),
                ty: y + (Math.sin(angle) * dist),
                color: Math.random() > 0.5 ? overrideColor : '#ffffff',
                scale: 1.5 + Math.random() * 1.5,
                duration: 0.5 + Math.random() * 0.5,
                type: 'particle'
            });
        }

        setReflexParticles(prev => [...prev, ...newPs]);
        setTimeout(() => {
            setReflexParticles(prev => prev.filter(p => !newPs.find(np => np.id === p.id)));
        }, 1000);
    };

    const spawnReflexPop = (t: any, index: number) => {
        const color = getReflexColor(activeSkillCheck!.move.type, t.value);
        const intensity = 1 + (index * 0.5);
        
        const newPs: any[] = [];
        
        // Burst particles
        const particleCount = 12 + (index * 8);
        for(let i=0; i<particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() * 20 + 10) * intensity;
            newPs.push({
                id: Math.random(),
                x: t.x,
                y: t.y,
                tx: t.x + (Math.cos(angle) * dist),
                ty: t.y + (Math.sin(angle) * dist),
                color,
                scale: (Math.random() * 0.5 + 0.5) * intensity,
                duration: 0.4 + Math.random() * 0.2,
                type: 'particle'
            });
        }
        
        // Shockwave Ring
        newPs.push({
            id: Math.random(),
            x: t.x,
            y: t.y,
            tx: t.x,
            ty: t.y,
            color,
            scale: 2 * intensity,
            duration: 0.35,
            type: 'ring'
        });

        setReflexParticles(prev => [...prev, ...newPs]);
        setTimeout(() => {
            setReflexParticles(prev => prev.filter(p => !newPs.find(np => np.id === p.id)));
        }, 600);
    };

    const handleInteraction = (e: React.PointerEvent) => {
        if (!activeSkillCheck || stateRef.current.isDone || stateRef.current.isPaused) return;

        if (activeSkillCheck.type === SkillCheckType.REFLEX) return;
        
        if (activeSkillCheck.type === SkillCheckType.MASH) {
            e.preventDefault();
            // mashFlash state is not used in simplified render, skipping setMashFlash
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

            // Updated success color to light green with distinct outline
            const markerColor = isHit ? 'bg-emerald-300 border-2 border-emerald-950 shadow-[0_0_15px_#6ee7b7]' : 'bg-rose-500 border-2 border-rose-950 shadow-[0_0_15px_#f43f5e]';
            setResultColor(markerColor);
            setTapMarkers(prev => [...prev, { id: Date.now(), pos: markerPos, color: markerColor }]);
            
            // Add Burst Effect for Zone
            const burstColor = isHit ? '#10b981' : '#f43f5e';
            setZoneBursts(prev => [...prev, { id: Date.now(), left: markerPos, color: burstColor }]);
            setTimeout(() => setZoneBursts(prev => prev.slice(1)), 500);

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
            animate={isActive && pointerFlash ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.15 }}
        >
            {/* Main bone bar */}
            <div className={`h-full w-full ${isActive && pointerFlash ? color : 'bg-white'} shadow-[0_0_15px_rgba(255,255,255,0.6)] border-x border-slate-950/20`} />
            
            {/* Top circles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[45%] flex gap-[-2px] items-center justify-center">
                <div className={`w-5 h-5 rounded-full ${isActive && pointerFlash ? color : 'bg-white'} border border-slate-950 shadow-md`} />
                <div className={`w-5 h-5 rounded-full ${isActive && pointerFlash ? color : 'bg-white'} border border-slate-950 -ml-1 shadow-md`} />
            </div>
            
            {/* Bottom circles */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[45%] flex gap-[-2px] items-center justify-center">
                <div className={`w-5 h-5 rounded-full ${isActive && pointerFlash ? color : 'bg-white'} border border-slate-950 shadow-md`} />
                <div className={`w-5 h-5 rounded-full ${isActive && pointerFlash ? color : 'bg-white'} border border-slate-950 -ml-1 shadow-md`} />
            </div>
        </motion.div>
    );

    const radius = 150;
    const circumference = 2 * Math.PI * radius;
    const offset = Math.max(0, circumference - (flickProgress / 100) * circumference);

    return (
        <AnimatePresence>
        {activeSkillCheck && (
            <motion.div 
                ref={containerRef}
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-8 select-none touch-none"
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
                
                {/* Global Particle Rendering for all minigames that use them */}
                {reflexParticles.map(p => (
                    <motion.div 
                        key={p.id}
                        initial={{ 
                            left: `${p.x}%`, 
                            top: `${p.y}%`, 
                            opacity: 1, 
                            scale: p.type === 'ring' ? 0.5 : p.scale,
                            x: '-50%', 
                            y: '-50%' 
                        }}
                        animate={{ 
                            left: `${p.tx}%`, 
                            top: `${p.ty}%`, 
                            opacity: 0, 
                            scale: p.type === 'ring' ? p.scale * 2 : 0 
                        }}
                        transition={{ duration: p.duration, ease: "easeOut" }}
                        className={`absolute z-[110] pointer-events-none ${p.type === 'ring' ? 'rounded-full border-2 bg-transparent box-border' : 'rounded-full'}`}
                        style={{ 
                            backgroundColor: p.type === 'particle' ? p.color : 'transparent',
                            borderColor: p.type === 'ring' ? p.color : 'transparent',
                            boxShadow: p.type === 'particle' ? `0 0 10px ${p.color}` : 'none',
                            width: p.type === 'ring' ? '80px' : '16px',
                            height: p.type === 'ring' ? '80px' : '16px',
                        }}
                    />
                ))}

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
                                        
                                        const totalHits = stateRef.current.hitValues.length;
                                        const isLast = totalHits === reflexTargets.length;
                                        
                                        if (isLast) {
                                            const totalValue = stateRef.current.hitValues.reduce((a, b) => a + b, 0);
                                            const avg = totalValue / reflexTargets.length;
                                            if (avg > 75) {
                                                spawnPerfectBurst(t.x, t.y, activeSkillCheck.move.type);
                                            } else {
                                                spawnReflexPop(t, totalHits);
                                            }
                                        } else {
                                            spawnReflexPop(t, totalHits);
                                        }
                                    }}
                                    initial={{ scale: 0, opacity: 0, rotate: t.rotation }}
                                    animate={t.hit ? {
                                        scale: 1.8, 
                                        opacity: 0, 
                                        filter: "brightness(3)",
                                    } : { 
                                        scale: [t.baseScale, t.baseScale * 1.05, t.baseScale], 
                                        opacity: 1, 
                                        rotate: [t.rotation - 2, t.rotation + 2, t.rotation - 2],
                                    }}
                                    transition={{ 
                                        scale: t.hit ? { duration: 0.15, ease: "backOut" } : { repeat: Infinity, duration: 1.2, ease: "easeInOut" },
                                        opacity: { duration: 0.1 },
                                        rotate: t.hit ? { duration: 0.1 } : { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
                                        filter: { duration: 0.1 }
                                    }}
                                    className={`absolute w-[110px] h-[110px] flex items-center justify-center cursor-pointer active:scale-95 bg-transparent touch-none ${t.hit ? 'pointer-events-none' : 'pointer-events-auto'}`}
                                    style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', zIndex: 100 + idx }}
                                >
                                    <div className="relative pointer-events-none flex items-center justify-center">
                                        <div className="relative z-10 flex items-center justify-center">
                                            {activeSkillCheck.move.type === MoveType.HEAL ? (
                                                <Heart 
                                                    size={110} 
                                                    fill={getReflexColor(activeSkillCheck.move.type, t.value)} 
                                                    className="drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] text-white stroke-[2]" 
                                                />
                                            ) : (
                                                <Shield 
                                                    size={110} 
                                                    fill={getReflexColor(activeSkillCheck.move.type, t.value)} 
                                                    className="drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] text-white stroke-[2]" 
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
                        
                        {!completionRating && (
                            <div className="absolute bottom-12 z-30 flex flex-col items-center">
                                <div className="flex items-center gap-2 bg-purple-900/80 px-6 py-2 rounded-full border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] backdrop-blur-md">
                                    <Bone size={20} className="text-white fill-white" />
                                    <span className="font-tech text-white text-2xl font-black tracking-widest leading-none pt-1">
                                        {bones.filter(b => b.collected).length} / {bones.length}
                                    </span>
                                </div>
                                <div className="text-[10px] text-purple-300 font-bold uppercase tracking-widest mt-1 opacity-80">Souls Harvested</div>
                            </div>
                        )}

                        <AnimatePresence>
                            {completionRating && (
                                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1.5 }} className="absolute flex flex-col items-center gap-1 z-40 bg-slate-900/90 border-2 border-purple-500/50 px-8 py-4 rounded-3xl backdrop-blur-md shadow-2xl">
                                    <span className={`text-2xl font-tech font-black uppercase tracking-tighter ${completionRating.color} animate-bounce`}>{completionRating.text}</span>
                                    {completionRating.drainStats ? (
                                        <div className="flex items-center gap-8 mt-4">
                                             <motion.div 
                                                initial={{ scale: 0, x: -20 }} animate={{ scale: 1, x: 0 }} 
                                                className="text-6xl font-black text-rose-500 font-mono drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                                             >
                                                 -{completionRating.drainStats.damage}
                                             </motion.div>
                                             <motion.div 
                                                initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }}
                                                className="text-6xl font-black text-emerald-400 font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                                             >
                                                 +{completionRating.drainStats.heal}
                                             </motion.div>
                                        </div>
                                    ) : (
                                        completionRating.details ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-sm text-purple-200 font-mono font-bold tracking-wider">{completionRating.details}</div>
                                                <div className="text-[10px] text-purple-400 font-bold uppercase">Total Effect</div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-white font-mono">
                                                <Bone size={16} className="text-slate-400" />
                                                <span className="text-lg font-bold">x{completionRating.mult.toFixed(1)} POWER</span>
                                            </div>
                                        )
                                    )}
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
                                    {/* MASH Zones */}
                                    <div className="absolute inset-0 flex h-full w-full pointer-events-none z-0">
                                        <div className="h-full w-[40%] bg-slate-900 border-r border-slate-800 flex items-center justify-center">
                                            <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest opacity-50">Weak</span>
                                        </div>
                                        <div className="h-full w-[50%] bg-slate-800 border-r border-slate-700 flex items-center justify-center">
                                            <span className="text-[10px] text-yellow-900 font-black uppercase tracking-widest opacity-50">Good</span>
                                        </div>
                                        <div className="h-full w-[10%] bg-slate-700 flex items-center justify-center">
                                            <span className="text-[10px] text-blue-900 font-black uppercase tracking-widest opacity-50">Max</span>
                                        </div>
                                    </div>

                                    <motion.div 
                                        className={`h-full transition-all duration-75 ease-out relative z-10 opacity-80`} 
                                        style={{width: `${progress}%`, backgroundColor: getMashColor(progress)}} 
                                        animate={progress >= 100 ? { filter: ["brightness(1)", "brightness(2.5)", "brightness(1)"], x: [0, -6, 6, -6, 6, 0] } : {}}
                                        transition={progress >= 100 ? { repeat: Infinity, duration: 0.08 } : {}}
                                    />
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-400 animate-pulse shadow-[0_0_20px_#10b981] z-20" />
                                </div>
                            ) : (
                                <>
                                    <div 
                                        className={`absolute h-full transition-all duration-150 ${zoneFlash === 'success' ? 'bg-emerald-400 opacity-100 shadow-[0_0_50px_#10b981]' : zoneFlash === 'fail' ? 'bg-rose-500 opacity-100 shadow-[0_0_50px_#f43f5e]' : 'bg-emerald-500/40'} border-x-4 ${zoneFlash === 'success' ? 'border-emerald-200' : zoneFlash === 'fail' ? 'border-rose-200' : 'border-emerald-400/60'}`} 
                                        style={{ left: `${targetZone.start}%`, width: `${targetZone.width}%` }} 
                                    />
                                    {tapMarkers.map(m => (
                                        <motion.div key={m.id} initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 pointer-events-none">
                                            <BonePointer pos={m.pos} color={m.color} />
                                        </motion.div>
                                    ))}
                                    {zoneBursts.map(b => (
                                        <motion.div
                                            key={b.id}
                                            className="absolute top-0 bottom-0 w-4 z-50 pointer-events-none"
                                            style={{ left: `${b.left}%`, backgroundColor: b.color, transform: 'translateX(-50%)' }}
                                            initial={{ scaleX: 1, opacity: 0.8 }}
                                            animate={{ scaleX: 3, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        />
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
