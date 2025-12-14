import React, { useState, useEffect, useRef } from 'react';
import { BirdInstance, BattleBird, Move, BattleLog, MoveType, Altitude, Weather, SkillCheckType, BattleResult, Rarity, Gear, StatType, Gem, ActiveBuff, ConsumableType, Consumable, APShopState, GearPrefix, EnemyPrefix } from '../types';
import { BIRD_TEMPLATES, RARITY_CONFIG, rollRarity, generateBird, XP_TABLE, BUFF_LABELS, generateGem } from '../constants';
import { Button } from './Button';
import { HealthBar } from './HealthBar';
import { BattleResultOverlay } from './BattleResultOverlay';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Activity, ArrowUp, ArrowDown, Cloud, CloudLightning, Wind, Crosshair, Zap, Award, ChevronsUp, ChevronRight, Shield, Heart, RotateCcw, Map, Hammer, Gem as GemIcon, Droplets, Skull, Hexagon, Eye, Moon, Flame, Briefcase, Check, AlertCircle, AlertTriangle, Star, Sparkles } from 'lucide-react';
import { getAITurn } from '../services/geminiService';

interface BattleArenaProps {
  playerBirdInstance: BirdInstance;
  enemyLevel: number;
  highestZone: number;
  onBattleComplete: (result: BattleResult, playAgain: boolean) => void;
  activeBuffs?: ActiveBuff[]; 
  apShop?: APShopState;
  currentZoneProgress?: Rarity[];
  requiredRarities?: Rarity[];
  gemUnlocked?: boolean;
}

const StatusBadge: React.FC<{ type: string }> = ({ type }) => {
    let icon = <Activity size={12} />;
    let color = "text-slate-400";
    let label = type;

    if (type === 'bleed') { icon = <Droplets size={12} />; color = "text-rose-500"; label = "BLEED"; }
    if (type === 'stun') { icon = <Zap size={12} />; color = "text-yellow-500"; label = "STUN"; }
    if (type === 'dodge') { icon = <Wind size={12} />; color = "text-cyan-500"; label = "EVASIVE"; }

    return (
        <motion.div 
           initial={{ scale: 0 }} animate={{ scale: 1 }}
           className={`flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 rounded border border-slate-700 ${color}`}
        >
            {icon} <span className="text-[9px] font-bold">{label}</span>
        </motion.div>
    );
 };

// Helper to scale stats based on level + Gear
const getScaledStats = (bird: BirdInstance, level: number, isEnemy: boolean = false) => {
    const growthRate = isEnemy ? 0.1 : 0.25;
    let scale = 1 + (level * growthRate);
    
    if (isEnemy) {
        const difficultyMult = 1 + ((level - 1) * 0.25); 
        scale *= difficultyMult;
    }
    
    let atkBonus = 0;
    let hpBonus = 0;
    let energyBonus = 0;
    let defBonus = 0;
    let spdBonus = 0;

    const applyGear = (gear: Gear | null) => {
        if (!gear) return;
        atkBonus += gear.attackBonus || 0;
        
        if (gear.prefix === GearPrefix.QUALITY && gear.paramValue) {
            atkBonus += gear.paramValue;
        }
        
        if (gear.statBonuses) {
            gear.statBonuses.forEach(b => {
                if (b.stat === 'HP') hpBonus += b.value;
                if (b.stat === 'NRG') energyBonus += b.value;
                if (b.stat === 'ATK') atkBonus += b.value;
                if (b.stat === 'DEF') defBonus += b.value;
                if (b.stat === 'SPD') spdBonus += b.value;
            });
        }
    };

    applyGear(bird.gear?.beak);
    applyGear(bird.gear?.claws);

    return {
        ...bird,
        maxHp: Math.floor(bird.baseHp * scale) + hpBonus,
        maxEnergy: Math.floor(bird.baseEnergy * scale) + energyBonus,
        attack: Math.floor(bird.baseAttack * scale) + atkBonus,
        defense: Math.floor(bird.baseDefense * scale) + defBonus,
        speed: Math.floor(bird.baseSpeed * scale) + spdBonus,
    };
};

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  target: 'player' | 'opponent';
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ 
    playerBirdInstance, 
    enemyLevel, 
    highestZone,
    onBattleComplete, 
    activeBuffs = [], 
    apShop,
    currentZoneProgress = [],
    requiredRarities = [],
    gemUnlocked = false
}) => {
  const playerStats = getScaledStats(playerBirdInstance, playerBirdInstance.level);
  
  // Initialize Player
  const [playerBird, setPlayerBird] = useState<BattleBird>({ 
    ...playerStats,
    currentHp: playerStats.maxHp, 
    currentEnergy: playerStats.maxEnergy, 
    isDefending: false, 
    statusEffects: [],
    altitude: Altitude.LOW
  });

  // Initialize Opponent
  const [opponentBird, setOpponentBird] = useState<BattleBird | null>(null);
  
  // Battle State
  const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
  const [turn, setTurn] = useState(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [weather, setWeather] = useState<Weather>(Weather.CLEAR);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    // Generate Opponent
    const template = BIRD_TEMPLATES[Math.floor(Math.random() * BIRD_TEMPLATES.length)];
    
    // Determine Rarity based on zone logic or random
    let rarity = rollRarity(enemyLevel * 25 + 10, 'CRAFT', 1);
    const missingRarities = requiredRarities.filter(r => !currentZoneProgress.includes(r));
    if (missingRarities.length > 0 && Math.random() < 0.20) {
          rarity = missingRarities[Math.floor(Math.random() * missingRarities.length)];
    }

    const instance = generateBird(template, rarity);
    instance.level = enemyLevel;
    const stats = getScaledStats(instance, enemyLevel, true);

    // Apply Enemy Prefix Logic
    let prefix = EnemyPrefix.NONE;
    if (Math.random() < 0.25) { 
        const types = [EnemyPrefix.MERCHANT, EnemyPrefix.HOARDER, EnemyPrefix.SCRAPOHOLIC, EnemyPrefix.GENIUS, EnemyPrefix.GEMFINDER];
        prefix = types[Math.floor(Math.random() * types.length)];
    }

    let finalMaxHp = stats.maxHp;
    let finalAttack = stats.attack;
    let finalDefense = stats.defense;
    let finalSpeed = stats.speed;

    if (prefix === EnemyPrefix.MERCHANT) {
          finalMaxHp = Math.floor(finalMaxHp * 1.5);
          finalAttack = Math.floor(finalAttack * 1.5);
    } else if (prefix === EnemyPrefix.HOARDER) {
          finalMaxHp = Math.floor(finalMaxHp * 2.0);
          finalDefense = Math.floor(finalDefense * 1.5);
    } else if (prefix === EnemyPrefix.GEMFINDER) {
          const roll = Math.random();
          if (roll < 0.25) finalMaxHp = Math.floor(finalMaxHp * 2.0);
          else if (roll < 0.5) finalAttack = Math.floor(finalAttack * 2.0);
          else if (roll < 0.75) finalDefense = Math.floor(finalDefense * 2.0);
          else finalSpeed = Math.floor(finalSpeed * 1.5);
    } else if (prefix === EnemyPrefix.SCRAPOHOLIC) {
          finalDefense = Math.floor(finalDefense * 2.0);
    } else if (prefix === EnemyPrefix.GENIUS) {
          finalAttack = Math.floor(finalAttack * 1.5);
          finalSpeed = Math.floor(finalSpeed * 1.5);
    }

    setOpponentBird({
        ...stats,
        maxHp: finalMaxHp,
        attack: finalAttack,
        defense: finalDefense,
        speed: finalSpeed,
        currentHp: finalMaxHp,
        currentEnergy: stats.maxEnergy,
        isDefending: false,
        statusEffects: [],
        altitude: Altitude.LOW,
        enemyPrefix: prefix
    });

    // Determine initial turn based on speed
    if (finalSpeed > playerStats.speed) {
        setIsPlayerTurn(false);
    }

    // Set Random Weather
    const weathers = [Weather.CLEAR, Weather.RAIN, Weather.WINDY, Weather.STORM];
    setWeather(weathers[Math.floor(Math.random() * weathers.length)]);

  }, []);

  // AI Turn Effect
  useEffect(() => {
      if (!isPlayerTurn && opponentBird && !battleResult && !aiThinking) {
          const runAI = async () => {
              setAiThinking(true);
              // Small delay for realism
              await new Promise(r => setTimeout(r, 1000));
              
              const aiDecision = await getAITurn(
                  opponentBird, 
                  playerBird, 
                  turn, 
                  weather, 
                  battleLog.map(l => l.message)
              );

              executeMove('opponent', aiDecision.moveId, aiDecision.desiredAltitude);
              setAiThinking(false);
          };
          runAI();
      }
  }, [isPlayerTurn, opponentBird, battleResult, aiThinking]);

  const addLog = (message: string, type: BattleLog['type'] = 'info') => {
      setBattleLog(prev => [...prev, { timestamp: Date.now(), message, type }].slice(-5));
  };

  const spawnFloatingText = (text: string, target: 'player' | 'opponent', color: string) => {
      const id = Math.random().toString();
      setFloatingTexts(prev => [...prev, {
          id, text, x: Math.random() * 40 - 20, y: 0, color, target
      }]);
      setTimeout(() => {
          setFloatingTexts(prev => prev.filter(p => p.id !== id));
      }, 1000);
  };

  const executeMove = (attacker: 'player' | 'opponent', moveId: string, desiredAltitude?: Altitude) => {
      const isPlayer = attacker === 'player';
      const source = isPlayer ? playerBird : opponentBird;
      const target = isPlayer ? opponentBird : playerBird;
      const setSource = isPlayer ? setPlayerBird : setOpponentBird;
      const setTarget = isPlayer ? setOpponentBird : setPlayerBird;

      if (!source || !target) return;

      const move = source.moves.find(m => m.id === moveId) || source.moves[0];

      // Cost check
      if (source.currentEnergy < move.cost) {
          addLog(`${source.name} is too tired!`, 'info');
          setIsPlayerTurn(!isPlayerTurn); // Skip turn if exhausted logic fails (AI shouldn't hit this ideally)
          return;
      }

      // 1. Pay Cost
      let newSource = { ...source, currentEnergy: source.currentEnergy - move.cost };
      
      // 2. Change Altitude if specified
      if (desiredAltitude !== undefined && desiredAltitude !== newSource.altitude) {
          newSource.altitude = desiredAltitude;
          addLog(`${source.name} changed altitude to ${Altitude[desiredAltitude]}`, 'info');
      }

      // 3. Move Logic
      let damage = 0;
      let heal = 0;
      let hit = true;
      let crit = false;

      // Accuracy Check
      if (Math.random() * 100 > move.accuracy) {
          hit = false;
          addLog(`${source.name} missed ${move.name}!`, 'info');
          spawnFloatingText("MISS", isPlayer ? 'opponent' : 'player', 'text-slate-400');
      }

      if (hit) {
          if (move.type === MoveType.ATTACK || move.type === MoveType.SPECIAL || move.type === MoveType.DRAIN) {
              // Damage Calc
              let baseDmg = (source.attack * move.power) / 50;
              
              // Height Advantage
              if (source.altitude > target.altitude) {
                  baseDmg *= 1.5;
                  addLog("Height Advantage!", 'info');
              } else if (source.altitude < target.altitude && move.type === MoveType.ATTACK) {
                  baseDmg *= 0.8; // Disadvantage
              }

              // Defense mitigation
              const reduction = target.isDefending ? 0.5 : (100 / (100 + target.defense));
              damage = Math.floor(baseDmg * reduction);

              // Crit Chance (5% base + 10% if High Altitude)
              let critChance = 0.05;
              if (source.altitude === Altitude.HIGH) critChance += 0.10;
              // Add Great Prefix Bonus from gear if player
              if (isPlayer) {
                  // Simplification: checking gear manually or assuming stats already applied elsewhere?
                  // Gear stats are in base attributes, but crit isn't a base stat. 
                  // Let's assume gear prefixes are applied in stats or handle here if needed.
                  // For simplicity, we stick to base logic + altitude.
              }

              if (Math.random() < critChance) {
                  damage = Math.floor(damage * 1.5);
                  crit = true;
              }

              // Weather Mods
              if (weather === Weather.RAIN) damage *= 0.9;
              
              const targetHp = Math.max(0, target.currentHp - damage);
              setTarget(prev => prev ? ({ ...prev, currentHp: targetHp }) : null);
              
              spawnFloatingText(damage.toString(), isPlayer ? 'opponent' : 'player', crit ? 'text-yellow-400' : 'text-white');
              addLog(`${source.name} used ${move.name} for ${damage} damage!`, 'damage');

              if (move.type === MoveType.DRAIN) {
                  const drainAmount = Math.floor(damage * 0.5);
                  heal = drainAmount;
              }

              // Check Death
              if (targetHp <= 0) {
                  handleMatchEnd(isPlayer ? 'player' : 'opponent', source, target);
                  return; // End
              }
          }

          if (move.type === MoveType.HEAL || heal > 0) {
              const healAmount = heal > 0 ? heal : Math.floor((source.maxHp * move.power) / 100);
              newSource.currentHp = Math.min(newSource.maxHp, newSource.currentHp + healAmount);
              addLog(`${source.name} healed for ${healAmount}`, 'heal');
              spawnFloatingText(`+${healAmount}`, isPlayer ? 'player' : 'opponent', 'text-emerald-400');
          }

          if (move.type === MoveType.DEFENSE) {
              newSource.isDefending = true;
              addLog(`${source.name} is defending`, 'buff');
          } else {
              newSource.isDefending = false;
          }
      }

      setSource(newSource);
      
      // End Turn
      setTurn(prev => prev + 1);
      setIsPlayerTurn(!isPlayerTurn);
  };

  const handleMatchEnd = (winner: 'player' | 'opponent', winnerBird: BattleBird, loserBird: BattleBird) => {
      // Calculate Rewards
      let xp = 0;
      let feathers = 0;
      let scrap = 0;
      let diamonds = 0;
      let lootGem: Gem | undefined;
      let lootConsumable: Consumable | undefined;

      if (winner === 'player') {
          // XP
          xp = Math.floor((loserBird.level * 50) * (1 + (opponentBird?.rarity ? RARITY_CONFIG[opponentBird.rarity].minMult : 1)));
          if (opponentBird?.enemyPrefix === EnemyPrefix.GENIUS) xp *= 3;

          // Feathers & Scrap
          feathers = Math.floor((loserBird.level * 100) * (Math.random() + 0.5));
          if (opponentBird?.enemyPrefix === EnemyPrefix.MERCHANT) feathers *= 5;

          scrap = Math.floor((loserBird.level * 10) * (Math.random() + 0.5));
          if (opponentBird?.enemyPrefix === EnemyPrefix.SCRAPOHOLIC) scrap *= 5;

          // Diamond Chance
          let diamondChance = 0.01;
          // Apply Bonuses
          // ... (activeBuffs, gear bonuses etc should be calculated here ideally)
          
          if (Math.random() < diamondChance) diamonds = Math.floor(Math.random() * 5) + 1;

          // Gem Drop (if unlocked)
          if (gemUnlocked && Math.random() < 0.1) {
             lootGem = generateGem(rollRarity(0, 'CATCH', 1));
          }
      }

      const result: BattleResult = {
          winner,
          opponentRarity: loserBird.rarity,
          rewards: {
              xp, feathers, scrap, diamonds, gem: lootGem, consumable: lootConsumable
          }
      };

      setBattleResult(result);
  };

  // Render Logic
  if (!playerBird || !opponentBird) return <div className="text-white">Loading Arena...</div>;

  return (
    <div className="relative h-full w-full bg-slate-900 flex flex-col overflow-hidden">
        {/* Battle Scene */}
        <div className="flex-1 relative">
            {/* Background based on zone/weather */}
            <div className={`absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 opacity-50`} />
            
            {/* Weather Overlay */}
            {weather === Weather.RAIN && <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] pointer-events-none" />}
            
            {/* HUD Top */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                {/* Opponent HUD */}
                <div className="w-1/2 max-w-[200px]">
                     <div className="flex items-center gap-2 mb-1">
                         <span className="font-bold text-rose-400 truncate">{opponentBird.name}</span>
                         <span className="text-xs bg-slate-800 px-1 rounded text-slate-400">Lvl {opponentBird.level}</span>
                     </div>
                     <HealthBar current={opponentBird.currentHp} max={opponentBird.maxHp} type="health" />
                     <div className="h-1" />
                     <HealthBar current={opponentBird.currentEnergy} max={opponentBird.maxEnergy} type="energy" />
                     
                     <div className="flex gap-1 mt-1">
                         {opponentBird.altitude === Altitude.HIGH && <ArrowUp size={12} className="text-cyan-400" />}
                         {opponentBird.altitude === Altitude.GROUND && <ArrowDown size={12} className="text-amber-600" />}
                     </div>
                </div>
            </div>

            {/* Sprites Area */}
            <div className="absolute inset-0 flex items-center justify-between px-8 md:px-20 mt-10">
                {/* Player Sprite */}
                <motion.div 
                    className="relative w-32 h-32 md:w-48 md:h-48"
                    animate={{ 
                        y: playerBird.altitude === Altitude.HIGH ? -50 : playerBird.altitude === Altitude.GROUND ? 50 : 0
                    }}
                >
                     <img src={playerBird.imageUrl} className="w-full h-full object-contain drop-shadow-2xl scale-x-[-1]" />
                     {/* Floating Texts */}
                     {floatingTexts.filter(t => t.target === 'player').map(t => (
                         <motion.div key={t.id} initial={{y:0, opacity:1}} animate={{y:-50, opacity:0}} className={`absolute top-0 left-1/2 -translate-x-1/2 font-black text-2xl ${t.color} stroke-black`}>
                             {t.text}
                         </motion.div>
                     ))}
                </motion.div>

                {/* Opponent Sprite */}
                <motion.div 
                    className="relative w-32 h-32 md:w-48 md:h-48"
                    animate={{ 
                        y: opponentBird.altitude === Altitude.HIGH ? -50 : opponentBird.altitude === Altitude.GROUND ? 50 : 0
                    }}
                >
                     <img src={opponentBird.imageUrl} className={`w-full h-full object-contain drop-shadow-2xl ${opponentBird.currentHp <= 0 ? 'grayscale opacity-50 blur-sm' : ''}`} />
                     {/* Floating Texts */}
                     {floatingTexts.filter(t => t.target === 'opponent').map(t => (
                         <motion.div key={t.id} initial={{y:0, opacity:1}} animate={{y:-50, opacity:0}} className={`absolute top-0 left-1/2 -translate-x-1/2 font-black text-2xl ${t.color} stroke-black`}>
                             {t.text}
                         </motion.div>
                     ))}
                </motion.div>
            </div>

            {/* Player HUD Bottom (above controls) */}
            <div className="absolute bottom-64 left-4 z-10 w-1/2 max-w-[200px]">
                 <div className="flex items-center gap-2 mb-1">
                     <span className="font-bold text-cyan-400 truncate">{playerBird.name}</span>
                     <span className="text-xs bg-slate-800 px-1 rounded text-slate-400">Lvl {playerBird.level}</span>
                 </div>
                 <HealthBar current={playerBird.currentHp} max={playerBird.maxHp} type="health" showValue />
                 <div className="h-1" />
                 <HealthBar current={playerBird.currentEnergy} max={playerBird.maxEnergy} type="energy" showValue />
                 
                 <div className="flex gap-1 mt-1">
                     {playerBird.altitude === Altitude.HIGH && <div className="text-xs text-cyan-400 flex items-center"><ArrowUp size={12}/> High</div>}
                     {playerBird.altitude === Altitude.GROUND && <div className="text-xs text-amber-600 flex items-center"><ArrowDown size={12}/> Ground</div>}
                 </div>
            </div>
        </div>

        {/* Controls Panel */}
        <div className="h-64 bg-slate-950 border-t border-slate-800 p-4 shrink-0 flex gap-4">
            
            {/* Move List */}
            <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto">
                {playerBird.moves.map(move => {
                    const isDisabled = !isPlayerTurn || playerBird.currentEnergy < move.cost || (move.requiresHeight && playerBird.altitude !== Altitude.HIGH);
                    
                    return (
                        <button
                            key={move.id}
                            onClick={() => executeMove('player', move.id)}
                            disabled={isDisabled}
                            className={`p-3 rounded border text-left flex flex-col justify-between transition-all ${isDisabled ? 'opacity-50 bg-slate-900 border-slate-800' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-cyan-500'}`}
                        >
                            <div className="flex justify-between w-full">
                                <span className={`font-bold font-tech ${isDisabled ? 'text-slate-500' : 'text-white'}`}>{move.name}</span>
                                <span className="text-xs font-mono text-cyan-400">{move.cost} E</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{move.description}</div>
                        </button>
                    );
                })}
                
                {/* Altitude Controls */}
                <div className="col-span-2 grid grid-cols-3 gap-2 mt-2">
                    <button 
                        onClick={() => executeMove('player', 'fly_high', Altitude.HIGH)} // Mock move ID, logic handled in executeMove
                        disabled={!isPlayerTurn || playerBird.altitude === Altitude.HIGH || playerBird.currentEnergy < 10}
                        className="p-2 bg-slate-900 border border-slate-700 rounded text-xs text-center hover:bg-slate-800"
                    >
                        Ascend (10E)
                    </button>
                    <button 
                         onClick={() => executeMove('player', 'fly_mid', Altitude.LOW)}
                         disabled={!isPlayerTurn || playerBird.altitude === Altitude.LOW || playerBird.currentEnergy < 5}
                         className="p-2 bg-slate-900 border border-slate-700 rounded text-xs text-center hover:bg-slate-800"
                    >
                        Stabilize (5E)
                    </button>
                    <button 
                         onClick={() => executeMove('player', 'land', Altitude.GROUND)}
                         disabled={!isPlayerTurn || playerBird.altitude === Altitude.GROUND}
                         className="p-2 bg-slate-900 border border-slate-700 rounded text-xs text-center hover:bg-slate-800"
                    >
                        Land (0E)
                    </button>
                </div>
            </div>

            {/* Battle Log */}
            <div className="w-1/3 bg-slate-900 rounded p-2 border border-slate-800 overflow-hidden font-mono text-[10px] text-slate-400">
                <div className="uppercase font-bold text-slate-600 mb-1 border-b border-slate-800">Battle Log</div>
                <div className="flex flex-col gap-1">
                    {battleLog.map((log, i) => (
                        <div key={log.timestamp + i} className={`truncate ${log.type === 'damage' ? 'text-rose-400' : log.type === 'heal' ? 'text-emerald-400' : ''}`}>
                            {log.message}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Result Overlay */}
        <AnimatePresence>
            {battleResult && opponentBird && (
                <BattleResultOverlay
                    winner={battleResult.winner}
                    rewards={battleResult.rewards}
                    initialBird={playerBirdInstance}
                    onContinue={(playAgain) => onBattleComplete(battleResult, playAgain)}
                    currentZoneProgress={currentZoneProgress}
                    requiredRarities={requiredRarities}
                    opponentRarity={battleResult.opponentRarity}
                    enemyPrefix={opponentBird.enemyPrefix}
                    isHighestZone={highestZone === enemyLevel}
                />
            )}
        </AnimatePresence>
    </div>
  );
};