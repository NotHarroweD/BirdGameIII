
import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance } from '../types';
import { BIRD_TEMPLATES, generateBird, rollRarity, RARITY_CONFIG, UPGRADE_COSTS } from '../constants';
import { Button } from './Button';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Wifi, AlertTriangle, RefreshCw, Database, Crosshair, Trash2, Target, RotateCcw, Zap } from 'lucide-react';

interface CatchScreenProps {
  dropRateMultiplier: number;
  catchRarityLevel: number; 
  onKeepBird: (bird: BirdInstance) => void;
  onReleaseBird: (bird: BirdInstance) => void;
  isFirstCatch?: boolean;
  onReportCatchStats: (isPerfect: boolean) => void;
}

interface VisualPopup {
  id: string;
  text: string;
  subText?: string;
  color: string;
  glowColor: string;
  scale: number;
  rotation: number;
  x: number;
  y: number;
}

interface VisualParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'spark' | 'debris';
  angle: number; // For spark rotation
}

// Geometric Constants for SVG to prevent clipping
const VIEWBOX_SIZE = 200;
const CENTER_COORD = 100;
const STROKE_WIDTH = 24;
const MAIN_RADIUS = 86; 

export const CatchScreen: React.FC<CatchScreenProps> = ({ dropRateMultiplier, catchRarityLevel, onKeepBird, onReleaseBird, isFirstCatch = false, onReportCatchStats }) => {
  const [phase, setPhase] = useState<'scanning' | 'detected' | 'catching' | 'revealed' | 'escaped'>('scanning');
  const [caughtBird, setCaughtBird] = useState<BirdInstance | null>(null);

  // Minigame State
  const LAYERS_TOTAL = 4;
  const [currentLayer, setCurrentLayer] = useState(0);
  const [battery, setBattery] = useState(3);
  const [catchMultiplier, setCatchMultiplier] = useState(1); // Starts at x1
  const [streak, setStreak] = useState(0);
  const [bonusAvailable, setBonusAvailable] = useState(true); 
  
  // Visual Effects State
  const [visualPopups, setVisualPopups] = useState<VisualPopup[]>([]);
  const [visualParticles, setVisualParticles] = useState<VisualParticle[]>([]);
  
  const requestRef = useRef<number | null>(null);
  const gameState = useRef({
    angle: 0,
    speed: 2,
    direction: 1,
    targetAngle: 0,
    targetWidth: 60,
    isRunning: false
  });
  
  const wasInZoneRef = useRef(false);
  const bonusAvailableRef = useRef(true); 

  const [cursorAngle, setCursorAngle] = useState(0);
  const [targetZone, setTargetZone] = useState({ angle: 0, width: 60 });
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  
  const shakeControls = useAnimation();

  const stopLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  // Particle Animation Loop
  useEffect(() => {
    let frameId: number;
    const updateParticles = () => {
        setVisualParticles(prev => {
            if (prev.length === 0) return prev;
            return prev.map(p => {
                let newVx = p.vx;
                let newVy = p.vy;
                let newLife = p.life;

                if (p.type === 'debris') {
                    newVy += 0.4; // Gravity
                    newLife -= 0.04;
                } else if (p.type === 'spark') {
                    newVx *= 0.90; // Air resistance
                    newVy *= 0.90;
                    newLife -= 0.06; // Fast decay
                }

                return {
                    ...p,
                    x: p.x + newVx,
                    y: p.y + newVy,
                    vx: newVx,
                    vy: newVy,
                    life: newLife,
                    // Update angle for sparks to follow velocity
                    angle: Math.atan2(newVy, newVx)
                };
            }).filter(p => p.life > 0);
        });
        frameId = requestAnimationFrame(updateParticles);
    };
    frameId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => stopLoop();
  }, []);

  const handleScan = () => {
    setPhase('detected');
  };

  const initCatching = () => {
      setPhase('catching');
      setBattery(3);
      setCurrentLayer(0);
      setCatchMultiplier(1);
      setStreak(0);
      setupLayer(0);
  };

  const setupLayer = (layerIndex: number) => {
      stopLoop();
      
      const baseSpeed = 2 + (layerIndex * 1.5);
      const baseWidth = Math.max(30, 60 - (layerIndex * 10));
      const direction = layerIndex % 2 === 0 ? 1 : -1;
      
      const targetAngle = Math.random() * 360;
      const startAngle = (targetAngle + 180) % 360;

      gameState.current = {
          angle: startAngle,
          speed: baseSpeed,
          direction: direction as 1 | -1,
          targetAngle: targetAngle,
          targetWidth: baseWidth,
          isRunning: true
      };

      setTargetZone({ angle: targetAngle, width: baseWidth });
      setCursorAngle(startAngle);
      
      setBonusAvailable(true);
      bonusAvailableRef.current = true;
      wasInZoneRef.current = false;
      
      const loop = () => {
          if (!gameState.current.isRunning) return;
          
          gameState.current.angle = (gameState.current.angle + (gameState.current.speed * gameState.current.direction)) % 360;
          if (gameState.current.angle < 0) gameState.current.angle += 360;

          setCursorAngle(gameState.current.angle);

          const dist = Math.abs(gameState.current.angle - gameState.current.targetAngle);
          const normalizedDist = dist > 180 ? 360 - dist : dist;
          const inZone = normalizedDist <= (gameState.current.targetWidth / 2) + 5; 

          if (wasInZoneRef.current && !inZone && bonusAvailableRef.current) {
               setBonusAvailable(false);
               bonusAvailableRef.current = false;
          }
          wasInZoneRef.current = inZone;

          requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
  };

  const spawnPopup = (text: string, type: 'good' | 'bad' | 'bonus' | 'neutral', subText?: string, overrideColor?: string, overrideGlow?: string, overrideScale?: number, customX?: number, customY?: number) => {
    const id = Math.random().toString();
    
    let color = 'text-white';
    let glow = 'rgba(255,255,255,0.3)';
    let scale = 1.0;

    if (type === 'good') {
        color = 'text-emerald-400';
        glow = 'rgba(52, 211, 153, 0.5)';
        scale = 1.1;
    } else if (type === 'bonus') {
        color = 'text-yellow-400';
        glow = 'rgba(250, 204, 21, 0.5)';
        scale = 1.3;
    } else if (type === 'bad') {
        color = 'text-rose-500';
        glow = 'rgba(244, 63, 94, 0.5)';
        scale = 1.0;
    } else if (type === 'neutral') {
        color = 'text-slate-400';
        glow = 'rgba(148, 163, 184, 0.3)';
        scale = 0.9;
    }

    if (overrideColor) color = overrideColor;
    if (overrideGlow) glow = overrideGlow;
    if (overrideScale) scale = overrideScale;
    
    // Position Logic: Default roughly centered if not provided
    let x = customX;
    let y = customY;

    if (x === undefined || y === undefined) {
        x = 0;
        y = -80;
    }

    setVisualPopups(prev => [...prev, { id, text, subText, color, glowColor: glow, scale, rotation: (Math.random() - 0.5) * 10, x: x!, y: y! }]);
    setTimeout(() => setVisualPopups(prev => prev.filter(p => p.id !== id)), 500); // Fast duration
  };

  const spawnExplosion = (x: number, y: number, color: string, intensity: number) => {
     const count = 10 + (intensity * 6); 
     const newParticles: VisualParticle[] = [];
     
     for(let i=0; i<count; i++) {
         const angle = Math.random() * Math.PI * 2;
         const speed = (Math.random() * 6 + 4) * (1 + intensity * 0.2); 
         
         newParticles.push({
             id: Math.random().toString(),
             x, 
             y, 
             vx: Math.cos(angle) * speed,
             vy: Math.sin(angle) * speed,
             life: 1.0,
             color: color,
             size: Math.random() * 2 + 1 + (intensity * 0.5), 
             type: Math.random() > 0.3 ? 'spark' : 'debris',
             angle: angle
         });
     }
     setVisualParticles(prev => [...prev, ...newParticles]);
  };

  const spawnMultiplierPopup = (mult: number) => {
      // Position Logic
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 20; 
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;

      let color = 'text-slate-300';
      let glow = 'rgba(203, 213, 225, 0.2)';
      let particleColor = '#cbd5e1'; 
      let scale = 1.0;
      let intensity = 1;
      let sub = undefined;

      if (mult === 1) { 
          color = 'text-slate-300'; 
          glow = 'rgba(203, 213, 225, 0.1)';
          particleColor = '#e2e8f0';
          scale = 1.0; 
          intensity = 1;
      }
      else if (mult === 2) { 
          color = 'text-emerald-400'; 
          glow = 'rgba(52, 211, 153, 0.3)';
          particleColor = '#34d399'; 
          scale = 1.2; 
          sub = "NICE";
          intensity = 2;
      }
      else if (mult === 3) { 
          color = 'text-blue-400'; 
          glow = 'rgba(96, 165, 250, 0.4)';
          particleColor = '#60a5fa'; 
          scale = 1.4; 
          sub = "GREAT";
          intensity = 3;
      }
      else if (mult === 4) { 
          color = 'text-purple-400'; 
          glow = 'rgba(192, 132, 252, 0.5)';
          particleColor = '#c084fc'; 
          scale = 1.6; 
          sub = "EPIC!";
          intensity = 4;
      }
      else if (mult >= 5) { 
          color = 'text-yellow-400'; 
          glow = 'rgba(250, 204, 21, 0.6)';
          particleColor = '#facc15'; 
          scale = 1.8; 
          sub = "MAX!";
          intensity = 5;
      }

      spawnPopup(`x${mult}`, 'good', sub, color, glow, scale, x, y);
      spawnExplosion(x, y, particleColor, intensity);
  };

  const handleTap = (e: React.PointerEvent) => {
      if (phase !== 'catching' || !gameState.current.isRunning) return;
      e.preventDefault();
      e.stopPropagation();

      const { angle, targetAngle, targetWidth } = gameState.current;
      let diff = Math.abs(angle - targetAngle);
      if (diff > 180) diff = 360 - diff;

      const hit = diff <= (targetWidth / 2) + 4; 

      if (hit) {
          setFlash('hit');
          setTimeout(() => setFlash(null), 150);
          
          const nextLayer = currentLayer + 1;
          
          if (bonusAvailableRef.current) {
              const newStreak = streak + 1;
              const newMult = catchMultiplier + 1;
              
              setStreak(newStreak);
              setCatchMultiplier(newMult);
              
              // Perfect Streak Check
              if (nextLayer >= LAYERS_TOTAL && newStreak === LAYERS_TOTAL) {
                  setVisualPopups([]);
                  setTimeout(() => {
                      spawnPopup("PERFECT!", 'bonus', "x5 BONUS!", 'text-yellow-400', 'rgba(250, 204, 21, 0.8)', 2.0, 0, 0);
                      spawnExplosion(0, 0, '#facc15', 6); 
                      setCatchMultiplier(5); 
                  }, 50);
              } else {
                  spawnMultiplierPopup(newMult);
              }

          } else {
              setStreak(0); 
              spawnPopup("HIT", 'neutral', "Too Slow");
          }

          if (nextLayer >= LAYERS_TOTAL) {
              setCurrentLayer(nextLayer);
              gameState.current.isRunning = false;
              stopLoop();
              const finalMult = bonusAvailableRef.current && streak === 3 ? 5 : catchMultiplier; // streak === 3 at this point implies layer 0,1,2 were hits, and this tap makes layer 3 hit.
              
              // Correct logic: If we hit last layer and streak was perfect so far (which means current streak + 1 == total layers)
              // Actually simpler: if finalMult >= 5, it's perfect.
              if (finalMult >= 5) {
                  onReportCatchStats(true); // Perfect catch
              } else {
                  onReportCatchStats(false); // Successful catch but not perfect
              }

              setTimeout(() => revealBird(finalMult), 1000);
          } else {
              setCurrentLayer(nextLayer);
              setupLayer(nextLayer);
          }
      } else {
          setFlash('miss');
          setStreak(0);
          setBonusAvailable(false);
          bonusAvailableRef.current = false;
          
          shakeScreen();
          setTimeout(() => setFlash(null), 150);
          spawnPopup("MISS", 'bad');

          const newBattery = battery - 1;
          setBattery(newBattery);

          if (newBattery <= 0) {
              gameState.current.isRunning = false;
              stopLoop();
              onReportCatchStats(false); // Failed
              setPhase('escaped');
          }
      }
  };

  const shakeScreen = async () => {
      await shakeControls.start({ x: [-8, 8, -8, 8, 0], transition: { duration: 0.3 } });
  };

  const revealBird = (finalMult: number) => {
        const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
        // Use new rollRarity signature with 'CATCH' context
        const rarity = rollRarity(catchRarityLevel, 'CATCH', finalMult);
        const newBird = generateBird(template, rarity);
        setCaughtBird(newBird);
        setPhase('revealed');
  };

  const resetEncounter = () => {
      setPhase('scanning');
      setCaughtBird(null);
  };

  const getSegmentPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(CENTER_COORD, CENTER_COORD, radius, endAngle);
    const end = polarToCartesian(CENTER_COORD, CENTER_COORD, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const getSalvageValue = (bird: BirdInstance) => {
     const config = RARITY_CONFIG[bird.rarity];
     return Math.floor(UPGRADE_COSTS.RECRUIT * (0.2 + (config.minMult * 0.1)));
  };
  
  const getMultColor = (m: number) => {
    if (m >= 5) return 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]';
    if (m === 4) return 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]';
    if (m === 3) return 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]';
    if (m === 2) return 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    if (m === 1) return 'text-slate-300 drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]';
    return 'text-slate-600';
  }

  const StatBlock = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="bg-slate-950 p-2 rounded border border-slate-800">
        <div className="text-[9px] text-slate-500 uppercase font-bold">{label}</div>
        <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
    </div>
  );

  const isScrollable = phase === 'revealed';

  return (
    <div className={`h-[100dvh] w-full bg-slate-950 flex flex-col items-center relative ${isScrollable ? 'overflow-y-auto' : 'overflow-hidden select-none touch-none'}`}>
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />

      <div className={`w-full max-w-md p-6 flex flex-col items-center justify-center flex-grow z-10 ${isScrollable ? 'min-h-min py-12' : 'h-full'}`}>
      
      <AnimatePresence mode="wait">
        
        {phase === 'scanning' && (
          <motion.div 
            key="scanning"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
             <div className="relative mb-8 group">
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-transparent animate-spin duration-[3s]" />
                </div>
                <div className="absolute inset-0 bg-cyan-500/5 rounded-full animate-ping" />
                <Button 
                    className="w-56 h-56 rounded-full border-4 border-cyan-500/50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur shadow-[0_0_50px_rgba(6,182,212,0.2)] hover:scale-105 transition-transform group-hover:border-cyan-400 group-hover:shadow-[0_0_70px_rgba(6,182,212,0.4)]"
                    onClick={handleScan}
                >
                    <Wifi size={64} className="text-cyan-400 mb-4 animate-pulse" />
                    <span className="font-tech text-2xl text-white tracking-widest">SCAN</span>
                    <span className="text-xs text-cyan-500/70 font-mono mt-1">INITIATE RADAR</span>
                </Button>
            </div>
            <div className="font-mono text-cyan-500/50 text-xs bg-slate-900/50 px-4 py-1 rounded border border-cyan-900/50">
                AWAITING INPUT...
            </div>
          </motion.div>
        )}

        {/* ... (Previous states unchanged) ... */}
        {phase === 'detected' && (
           <motion.div 
             key="detected"
             initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }}
             className="flex flex-col items-center"
           >
              <div className="w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                  <AlertTriangle size={40} className="text-rose-500" />
              </div>
              <h2 className="text-6xl font-tech text-white mb-2 font-black tracking-tighter drop-shadow-lg text-center leading-none">
                  SIGNAL<br/><span className="text-rose-500">DETECTED</span>
              </h2>
              <div className="text-rose-400/80 font-mono text-sm mb-12 tracking-widest">UNKNOWN BIOLOGICAL ENTITY</div>
              
              <Button size="xl" onClick={initCatching} className="min-w-[280px] bg-rose-600 hover:bg-rose-500 border-rose-800 shadow-[0_0_20px_rgba(225,29,72,0.4)]">
                  <Crosshair className="mr-2" /> LOCK ON TARGET
              </Button>
           </motion.div>
        )}

        {phase === 'catching' && (
            <motion.div
                key="catching"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 cursor-pointer overflow-hidden"
                onPointerDown={handleTap}
            >
                <motion.div animate={shakeControls} className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none">
                    
                    {flash === 'hit' && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none z-50 border-[20px] border-emerald-500/50" />}
                    {flash === 'miss' && <div className="absolute inset-0 bg-rose-500/10 pointer-events-none z-50 border-[20px] border-rose-500/50" />}

                    {/* HUD Header */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-30">
                        {/* Battery Left */}
                        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700 backdrop-blur-sm shadow-lg">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Signal Integrity</div>
                            <div className="flex gap-1.5">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={`w-8 h-3 skew-x-[-12deg] border border-emerald-900/50 transition-colors duration-300 ${i < battery ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-800/50'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Multiplier Right */}
                        <div className="flex flex-col items-end gap-1">
                             <div className="flex gap-1 mb-1 bg-slate-900/60 p-1 rounded-full border border-slate-800/50">
                                 {[1,2,3,4,5].map(lvl => (
                                     <div key={lvl} className={`w-2 h-2 rounded-full border border-slate-700 transition-all ${
                                         lvl <= catchMultiplier 
                                            ? lvl === 1 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                                            : lvl === 2 ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                                            : lvl === 3 ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]'
                                            : lvl === 4 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                                            : 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                                            : 'bg-slate-900'
                                     }`} />
                                 ))}
                             </div>
                             
                             <motion.div 
                                className="bg-slate-900/90 border-2 border-slate-700 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md min-w-[70px]"
                                key={catchMultiplier}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                             >
                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest text-center mb-0.5">MULTIPLIER</div>
                                <div className={`text-3xl font-tech font-black leading-none text-center ${getMultColor(catchMultiplier)}`} style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}>
                                    x{Math.max(0, catchMultiplier)}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Main Minigame Scaled Container */}
                    <div 
                        className="relative flex items-center justify-center p-4 aspect-square shrink-0"
                        style={{ 
                            width: 'min(90vw, 55vh)', 
                            maxWidth: '380px' 
                        }}
                    >
                        
                        {/* Particles Layer (Electric Sparks) */}
                        {visualParticles.map(p => (
                            <div 
                                key={p.id}
                                className="absolute pointer-events-none z-40 mix-blend-screen"
                                style={{
                                    width: p.type === 'spark' ? `${p.size * 3}px` : `${p.size}px`, 
                                    height: `${p.size}px`,
                                    backgroundColor: p.color,
                                    left: `calc(50% + ${p.x}px)`,
                                    top: `calc(50% + ${p.y}px)`,
                                    opacity: p.life * 0.8,
                                    transform: `translate(-50%, -50%) rotate(${p.angle}rad)`, // Rotate based on velocity
                                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`
                                }}
                            />
                        ))}

                        {/* Arcade Popups Layer (Transparent Ghost Text) */}
                        <AnimatePresence>
                            {visualPopups.map(p => (
                                <motion.div
                                    key={p.id}
                                    initial={{ scale: 0, opacity: 0, x: p.x, y: p.y, rotate: p.rotation }}
                                    animate={{ scale: p.scale, opacity: 0.7, x: p.x, y: p.y }}
                                    exit={{ scale: p.scale * 1.1, opacity: 0, x: p.x * 1.1, y: p.y * 1.1 }}
                                    transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                                    className={`absolute pointer-events-none flex flex-col items-center z-50 whitespace-nowrap mix-blend-screen`}
                                    style={{ transform: 'translate(-50%, -50%)' }}
                                >
                                    <span 
                                        className={`font-black ${p.color} font-tech`}
                                        style={{ 
                                            fontSize: `${1.5 + (p.scale * 0.4)}rem`,
                                            textShadow: `0 0 ${10 * p.scale}px ${p.glowColor}`
                                        }}
                                    >
                                        {p.text}
                                    </span>
                                    {p.subText && (
                                        <motion.span 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="text-white font-bold bg-black/60 px-2 py-0.5 rounded border border-white/20 mt-1 uppercase tracking-widest shadow-lg backdrop-blur-sm"
                                            style={{ fontSize: '0.6rem' }}
                                        >
                                            {p.subText}
                                        </motion.span>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Outer Ring */}
                        <div className="absolute inset-2 rounded-full border-2 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/50 backdrop-blur-sm" />
                        
                        <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full relative z-10 overflow-visible">
                            {/* Track */}
                            <circle cx={CENTER_COORD} cy={CENTER_COORD} r={MAIN_RADIUS} fill="none" stroke="#0f172a" strokeWidth={STROKE_WIDTH} />
                            <circle cx={CENTER_COORD} cy={CENTER_COORD} r={MAIN_RADIUS} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
                            
                            {/* Target Zone */}
                            <path 
                                d={getSegmentPath(targetZone.angle - (targetZone.width/2), targetZone.angle + (targetZone.width/2), MAIN_RADIUS)}
                                fill="none"
                                stroke={bonusAvailable ? "#10b981" : "#64748b"} 
                                strokeWidth={STROKE_WIDTH}
                                strokeLinecap="butt"
                                className={`transition-colors duration-300 ${bonusAvailable ? "drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" : ""}`}
                            />
                            
                            {/* Cursor */}
                            <g style={{ transform: `rotate(${cursorAngle}deg)`, transformOrigin: `${CENTER_COORD}px ${CENTER_COORD}px` }}>
                                <line x1={CENTER_COORD} y1={CENTER_COORD} x2={CENTER_COORD + MAIN_RADIUS} y2={CENTER_COORD} stroke="url(#cursorGrad)" strokeWidth="4" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="cursorGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="transparent"/>
                                        <stop offset="50%" stopColor="#fff"/>
                                        <stop offset="100%" stopColor="#fff"/>
                                    </linearGradient>
                                </defs>
                                <circle cx={CENTER_COORD + MAIN_RADIUS} cy={CENTER_COORD} r="8" fill="#fff" className="drop-shadow-[0_0_15px_white]" />
                                <circle cx={CENTER_COORD + MAIN_RADIUS} cy={CENTER_COORD} r="14" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                            </g>
                        </svg>

                        {/* Center Info - Sequence Progress */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-[32%] h-[32%] rounded-full bg-slate-950 border-4 border-slate-800 flex flex-col items-center justify-center shadow-[inset_0_0_20px_black]">
                                <div className="text-[7px] md:text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-widest">SEQUENCE</div>
                                <div className="text-3xl md:text-5xl font-tech font-black leading-none text-white mb-0.5">
                                    {currentLayer}
                                </div>
                                <div className="text-[8px] md:text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                    OF {LAYERS_TOTAL}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-10 text-slate-500 text-xs font-mono animate-pulse tracking-widest bg-black/60 px-6 py-2 rounded-full border border-slate-800 pointer-events-none backdrop-blur-md">
                        TAP GREEN ZONE
                    </div>

                </motion.div>
            </motion.div>
        )}

        {phase === 'escaped' && (
            <motion.div
                key="escaped"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center z-10 text-center"
            >
                <div className="w-24 h-24 bg-rose-900/20 rounded-full flex items-center justify-center mb-6 border border-rose-900">
                     <AlertTriangle size={48} className="text-rose-500" />
                </div>
                <h2 className="text-5xl font-tech text-white mb-2 font-bold">SIGNAL LOST</h2>
                <div className="text-rose-500 font-mono text-sm mb-8">TARGET ESCAPED</div>
                <Button onClick={resetEncounter} variant="secondary" size="lg" className="border-slate-700">
                    <RefreshCw className="mr-2" size={18} /> RECALIBRATE SCANNER
                </Button>
            </motion.div>
        )}

        {phase === 'revealed' && caughtBird && (
            <motion.div
                key="revealed"
                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center z-10 w-full"
            >
                <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="mb-8 relative group"
                >
                    <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-1000 ${RARITY_CONFIG[caughtBird.rarity].glowColor.replace('shadow-', 'bg-')}`} />
                    <div className={`w-56 h-56 rounded-full border-4 overflow-hidden bg-slate-900 shadow-2xl ${RARITY_CONFIG[caughtBird.rarity].borderColor} relative z-10`}>
                        <img 
                            src={caughtBird.imageUrl} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.includes('placehold.co')) {
                                    target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + caughtBird.name;
                                }
                            }}
                        />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-12 h-12 bg-slate-900 rounded-full border-2 flex items-center justify-center z-20 ${RARITY_CONFIG[caughtBird.rarity].borderColor}`}>
                         <Database size={20} className={RARITY_CONFIG[caughtBird.rarity].color} />
                    </div>
                </motion.div>
                
                <h2 className={`text-5xl font-tech font-bold mb-1 text-center leading-none ${RARITY_CONFIG[caughtBird.rarity].color} drop-shadow-md`}>
                    {caughtBird.name}
                </h2>
                <div className={`text-lg font-bold uppercase tracking-[0.2em] mb-8 bg-slate-900/80 px-4 py-1 rounded border border-slate-800 ${RARITY_CONFIG[caughtBird.rarity].color}`}>
                    {RARITY_CONFIG[caughtBird.rarity].name} CLASS
                </div>

                <div className="w-full bg-slate-900/90 p-6 rounded-xl border border-slate-800 mb-6 shadow-xl backdrop-blur-sm">
                     <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center mb-6">
                         <StatBlock label="HP" value={caughtBird.baseHp} color="text-emerald-400" />
                         <StatBlock label="ATK" value={caughtBird.baseAttack} color="text-rose-400" />
                         <StatBlock label="SPD" value={caughtBird.baseSpeed} color="text-cyan-400" />
                         <StatBlock label="DEF" value={caughtBird.baseDefense} color="text-blue-400" />
                         <StatBlock label="NRG" value={caughtBird.baseEnergy} color="text-yellow-400" />
                     </div>
                     
                     <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Target size={16} className="text-amber-500" />
                            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Passive Yield</span>
                         </div>
                         <span className="font-mono text-amber-400 font-bold text-lg">
                             {(caughtBird.huntingConfig.baseRate * RARITY_CONFIG[caughtBird.rarity].minMult).toFixed(1)} <span className="text-xs text-amber-500/70">/SEC</span>
                         </span>
                     </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <Button fullWidth onClick={() => isFirstCatch ? resetEncounter() : onReleaseBird(caughtBird)} variant="secondary" className="border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 h-14">
                        {isFirstCatch ? (
                            <>
                                <RotateCcw className="mr-2" size={18} /> TRY AGAIN
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2" size={18} /> RELEASE (+{getSalvageValue(caughtBird)})
                            </>
                        )}
                    </Button>
                    <Button fullWidth onClick={() => onKeepBird(caughtBird)} className="shadow-[0_0_20px_rgba(6,182,212,0.3)] h-14">
                        <Database className="mr-2" size={18} /> KEEP UNIT
                    </Button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
