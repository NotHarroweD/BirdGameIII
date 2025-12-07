
import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance } from '../types';
import { BIRD_TEMPLATES, generateBird, rollRarity, RARITY_CONFIG, UPGRADE_COSTS } from '../constants';
import { Button } from './Button';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Wifi, AlertTriangle, RefreshCw, Database, Crosshair, Trash2, Target, RotateCcw } from 'lucide-react';

interface CatchScreenProps {
  dropRateMultiplier: number;
  catchRarityLevel: number; 
  onKeepBird: (bird: BirdInstance) => void;
  onReleaseBird: (bird: BirdInstance) => void;
  isFirstCatch?: boolean;
}

export const CatchScreen: React.FC<CatchScreenProps> = ({ dropRateMultiplier, catchRarityLevel, onKeepBird, onReleaseBird, isFirstCatch = false }) => {
  const [phase, setPhase] = useState<'scanning' | 'detected' | 'catching' | 'revealed' | 'escaped'>('scanning');
  const [caughtBird, setCaughtBird] = useState<BirdInstance | null>(null);

  // Minigame State
  const LAYERS_TOTAL = 4;
  const [currentLayer, setCurrentLayer] = useState(0);
  const [battery, setBattery] = useState(3);
  
  const requestRef = useRef<number>();
  const gameState = useRef({
    angle: 0,
    speed: 2,
    direction: 1,
    targetAngle: 0,
    targetWidth: 60,
    isRunning: false
  });
  
  const [cursorAngle, setCursorAngle] = useState(0);
  const [targetZone, setTargetZone] = useState({ angle: 0, width: 60 });
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  
  const shakeControls = useAnimation();

  useEffect(() => {
    return () => stopLoop();
  }, []);

  const stopLoop = () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const handleScan = () => {
    setPhase('detected');
  };

  const initCatching = () => {
      setPhase('catching');
      setBattery(3);
      setCurrentLayer(0);
      setupLayer(0);
  };

  const setupLayer = (layerIndex: number) => {
      stopLoop();
      
      const baseSpeed = 2 + (layerIndex * 1.5);
      const baseWidth = Math.max(30, 60 - (layerIndex * 10));
      const direction = layerIndex % 2 === 0 ? 1 : -1;
      const randomAngle = Math.random() * 360;

      gameState.current = {
          angle: 0,
          speed: baseSpeed,
          direction: direction as 1 | -1,
          targetAngle: randomAngle,
          targetWidth: baseWidth,
          isRunning: true
      };

      setTargetZone({ angle: randomAngle, width: baseWidth });
      
      const loop = () => {
          if (!gameState.current.isRunning) return;
          gameState.current.angle = (gameState.current.angle + (gameState.current.speed * gameState.current.direction)) % 360;
          if (gameState.current.angle < 0) gameState.current.angle += 360;

          setCursorAngle(gameState.current.angle);
          requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
  };

  const handleTap = (e: React.PointerEvent) => {
      if (phase !== 'catching' || !gameState.current.isRunning) return;
      e.preventDefault();
      e.stopPropagation();

      const { angle, targetAngle, targetWidth } = gameState.current;
      let diff = Math.abs(angle - targetAngle);
      if (diff > 180) diff = 360 - diff;

      const hit = diff <= (targetWidth / 2) + 2;

      if (hit) {
          setFlash('hit');
          setTimeout(() => setFlash(null), 200);
          const nextLayer = currentLayer + 1;

          if (nextLayer >= LAYERS_TOTAL) {
              gameState.current.isRunning = false;
              stopLoop();
              revealBird();
          } else {
              setCurrentLayer(nextLayer);
              setupLayer(nextLayer);
          }
      } else {
          setFlash('miss');
          shakeScreen();
          setTimeout(() => setFlash(null), 200);

          const newBattery = battery - 1;
          setBattery(newBattery);

          if (newBattery <= 0) {
              gameState.current.isRunning = false;
              stopLoop();
              setPhase('escaped');
          }
      }
  };

  const shakeScreen = async () => {
      await shakeControls.start({ x: [-10, 10, -10, 10, 0], transition: { duration: 0.2 } });
  };

  const revealBird = () => {
        const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
        const rarity = rollRarity(catchRarityLevel);
        const newBird = generateBird(template, rarity);
        setCaughtBird(newBird);
        setTimeout(() => setPhase('revealed'), 500);
  };

  const resetEncounter = () => {
      setPhase('scanning');
      setCaughtBird(null);
  };

  const getSegmentPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(100, 100, radius, endAngle);
    const end = polarToCartesian(100, 100, radius, startAngle);
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

  const StatBlock = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="bg-slate-950 p-2 rounded border border-slate-800">
        <div className="text-[9px] text-slate-500 uppercase font-bold">{label}</div>
        <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
    </div>
  );

  // Dynamic scrolling behavior: Only allow scroll when in 'revealed' phase to reach buttons on small screens
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
                {/* Radar Sweep Effect */}
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
                className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 cursor-pointer"
                onPointerDown={handleTap}
            >
                <motion.div animate={shakeControls} className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none">
                    
                    {flash === 'hit' && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none z-50 border-[20px] border-emerald-500/50" />}
                    {flash === 'miss' && <div className="absolute inset-0 bg-rose-500/10 pointer-events-none z-50 border-[20px] border-rose-500/50" />}

                    {/* HUD Header */}
                    <div className="absolute top-12 left-6 right-6 flex justify-between items-start pointer-events-none">
                        <div>
                            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Signal Integrity</div>
                            <div className="flex gap-1">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={`w-8 h-3 skew-x-[-12deg] border border-emerald-900 ${i < battery ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-900/50'}`} />
                                ))}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1">Lock Progress</div>
                             <div className="flex gap-1 justify-end">
                                {[...Array(LAYERS_TOTAL)].map((_, i) => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${i < currentLayer ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-slate-800'}`} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Minigame */}
                    <div className="relative w-[340px] h-[340px]">
                        {/* Outer Glow */}
                        <div className="absolute inset-0 rounded-full border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/50" />
                        
                        <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
                            {/* Track */}
                            <circle cx="100" cy="100" r="90" fill="none" stroke="#0f172a" strokeWidth="20" />
                            <circle cx="100" cy="100" r="90" fill="none" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
                            
                            {/* Target Zone */}
                            <path 
                                d={getSegmentPath(targetZone.angle - (targetZone.width/2), targetZone.angle + (targetZone.width/2), 90)}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="20"
                                strokeLinecap="butt"
                                className="drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                            />
                            
                            {/* Cursor */}
                            <g style={{ transform: `rotate(${cursorAngle}deg)`, transformOrigin: '100px 100px' }}>
                                {/* Beam */}
                                <line x1="100" y1="100" x2="190" y2="100" stroke="url(#cursorGrad)" strokeWidth="2" />
                                <defs>
                                    <linearGradient id="cursorGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="transparent"/>
                                        <stop offset="100%" stopColor="#fff"/>
                                    </linearGradient>
                                </defs>
                                {/* Head */}
                                <circle cx="190" cy="100" r="6" fill="#fff" className="drop-shadow-[0_0_15px_white]" />
                                <circle cx="190" cy="100" r="12" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                            </g>
                        </svg>

                        {/* Center Info */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-32 h-32 rounded-full bg-slate-950 border border-slate-700 flex flex-col items-center justify-center shadow-inner">
                                <div className="text-[9px] text-cyan-500/70 font-bold uppercase mb-1 tracking-widest">Encryption</div>
                                <div className="text-5xl font-tech font-bold text-white leading-none mb-1">
                                    {Math.min(currentLayer + 1, LAYERS_TOTAL)}<span className="text-lg text-slate-600">/{LAYERS_TOTAL}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-12 text-slate-500 text-xs font-mono animate-pulse">
                        TAP TO LOCK
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
                        <img src={caughtBird.imageUrl} className="w-full h-full object-cover" />
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
                     
                     {/* Hunting Rate Display */}
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
