
import React, { useState, useEffect } from 'react';
import { Hub } from './components/Hub';
import { BattleArena } from './components/BattleArena';
import { CatchScreen } from './components/CatchScreen';
import { PlayerState, GameScreen, BirdInstance, BattleResult, GearType, HubTab, Gear, Rarity, UpgradeState, GearBuff, Gem } from './types';
import { INITIAL_PLAYER_STATE, XP_TABLE, UPGRADE_COSTS, generateCraftedGear, RARITY_CONFIG, UPGRADE_DEFINITIONS, generateCraftedGem } from './constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
  const [initialHubTab, setInitialHubTab] = useState<HubTab>(HubTab.MAP);
  const [battleKey, setBattleKey] = useState(0);

  // Persistence
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const saved = localStorage.getItem('bird_game_save_v6'); 
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // Migration Logic
            const migrateGear = (g: any) => {
                if (!g) return null;
                if (!g.statBonuses) {
                    g.statBonuses = []; 
                }
                if (!g.sockets) {
                    g.sockets = []; 
                }
                return g;
            };

            if (parsed.inventory && parsed.inventory.gear) {
                parsed.inventory.gear = parsed.inventory.gear.map(migrateGear).filter(Boolean);
            }
            if (parsed.birds) {
                parsed.birds.forEach((b: any) => {
                    if (b.gear.beak) b.gear.beak = migrateGear(b.gear.beak);
                    if (b.gear.claws) b.gear.claws = migrateGear(b.gear.claws);
                });
            }
            // Ensure new upgrades exist
            if (!parsed.upgrades.gemRarityLevel) {
                parsed.upgrades.gemRarityLevel = 0;
            }
            
            return parsed;
        } catch (e) {
            console.error("Save file corrupted, resetting.", e);
            return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
        }
    }
    return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
  });

  // Auto-Save & Passive Hunting
  useEffect(() => {
    const interval = setInterval(() => {
       setPlayerState(prev => {
           let totalIncome = 0;
           let totalDiamondChance = 0;
           let extraScrap = 0;

           // Iterate over all hunting birds
           prev.huntingBirdIds.forEach(id => {
               const hunter = prev.birds.find(b => b.instanceId === id);
               if (hunter) {
                   const rarityMult = RARITY_CONFIG[hunter.rarity].minMult;
                   let baseIncome = (hunter.huntingConfig.baseRate * rarityMult) * (1 + (hunter.level * 0.1));
                   
                   // Species-Specific Bonuses
                   if (hunter.id === 'hummingbird') {
                        if (Math.random() < 0.10) baseIncome *= 2;
                   } else if (hunter.id === 'hawk') {
                        if (Math.random() < 0.05) extraScrap += 1;
                   } else if (hunter.id === 'owl') {
                        baseIncome *= 1.1;
                   }
                   
                   let diamondChance = 0;
                   if (hunter.id === 'vulture') {
                       diamondChance += 0.005; 
                   }

                   let bonusPct = 0;
                   // Check Gems in Sockets for Utility Buffs
                   const addGemBuffs = (g: Gear | null) => {
                       g?.sockets.forEach(socket => {
                           if (socket) {
                               socket.buffs.forEach(b => {
                                   if (b.stat === 'HUNT_BONUS') bonusPct += b.value;
                                   if (b.stat === 'DIAMOND_HUNT_CHANCE') diamondChance += (b.value / 100);
                               });
                           }
                       });
                   };
                   addGemBuffs(hunter.gear.beak);
                   addGemBuffs(hunter.gear.claws);
                   
                   totalIncome += baseIncome * (1 + (bonusPct / 100));
                   totalDiamondChance += diamondChance;
               }
           });
           
           let diamondFound = 0;
           if (totalDiamondChance > 0 && Math.random() < totalDiamondChance) {
               diamondFound = 1;
           }
           
           const newState = {
               ...prev,
               feathers: prev.feathers + totalIncome,
               scrap: prev.scrap + extraScrap,
               diamonds: prev.diamonds + diamondFound
           };
           localStorage.setItem('bird_game_save_v6', JSON.stringify(newState));
           return newState;
       });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
     if (!playerState.birds || playerState.birds.length === 0) {
         setScreen(GameScreen.CATCH);
     } else {
         setScreen(GameScreen.HUB);
     }
  };

  const handleBattleComplete = (result: BattleResult, playAgain: boolean = false) => {
      setPlayerState(prev => {
          const birdIndex = prev.birds.findIndex(b => b.instanceId === prev.selectedBirdId);
          if (birdIndex === -1) return prev; 
          
          const bird = { ...prev.birds[birdIndex] };
          const newFeathers = prev.feathers + result.rewards.feathers;
          const newScrap = prev.scrap + result.rewards.scrap;
          const newDiamonds = prev.diamonds + result.rewards.diamonds;
          
          let newXp = bird.xp + result.rewards.xp;
          let newLevel = bird.level;
          let newXpToNext = bird.xpToNextLevel;

          while (newXp >= newXpToNext) {
              newXp -= newXpToNext;
              newLevel++;
              newXpToNext = Math.floor(XP_TABLE.BASE * Math.pow(newLevel, XP_TABLE.GROWTH_FACTOR));
          }

          const updatedBirds = [...prev.birds];
          updatedBirds[birdIndex] = { ...bird, level: newLevel, xp: newXp, xpToNextLevel: newXpToNext };
          
          const newInventory = { ...prev.inventory };
          if (result.rewards.gem) {
              newInventory.gems = [...newInventory.gems, result.rewards.gem];
          }

          return {
              ...prev,
              feathers: newFeathers,
              scrap: newScrap,
              diamonds: newDiamonds,
              highestZone: result.winner === 'player' ? Math.max(prev.highestZone, prev.highestZone) : prev.highestZone, 
              birds: updatedBirds,
              inventory: newInventory
          };
      });

      if (playAgain) {
          setBattleKey(prev => prev + 1);
          setScreen(GameScreen.BATTLE);
      } else {
          setInitialHubTab(HubTab.MAP);
          setScreen(GameScreen.HUB);
      }
  };

  const handleUpgrade = (type: keyof UpgradeState | 'recruit') => {
      if (type === 'recruit') {
           if (playerState.feathers < UPGRADE_COSTS.RECRUIT) return;
           setPlayerState(prev => ({ ...prev, feathers: prev.feathers - UPGRADE_COSTS.RECRUIT }));
           setScreen(GameScreen.CATCH);
           return;
      }

      const def = UPGRADE_DEFINITIONS.find(u => u.id === type);
      if (def) {
          setPlayerState(prev => {
              const currentLevel = prev.upgrades[type] || 0;
              if (currentLevel >= def.maxLevel) return prev;
              
              const featherCost = Math.floor(def.baseCost.feathers * Math.pow(def.costMultiplier, currentLevel));
              const scrapCost = Math.floor(def.baseCost.scrap * Math.pow(def.costMultiplier, currentLevel));
              const diamondCost = Math.floor(def.baseCost.diamonds * Math.pow(def.costMultiplier, currentLevel));
              
              if (prev.feathers < featherCost || prev.scrap < scrapCost || prev.diamonds < diamondCost) return prev;
              
              return {
                  ...prev,
                  feathers: prev.feathers - featherCost,
                  scrap: prev.scrap - scrapCost,
                  diamonds: prev.diamonds - diamondCost,
                  upgrades: {
                      ...prev.upgrades,
                      [type]: currentLevel + 1
                  }
              };
          });
      }
  };

  // --- Catching Logic ---
  const handleKeepBird = (newBird: BirdInstance) => {
      setPlayerState(prev => ({
          ...prev,
          birds: [...prev.birds, newBird],
          selectedBirdId: prev.birds.length === 0 ? newBird.instanceId : prev.selectedBirdId
      }));
      setInitialHubTab(HubTab.ROSTER);
      setScreen(GameScreen.HUB);
  };

  const handleReleaseBird = (bird: BirdInstance) => {
      const config = RARITY_CONFIG[bird.rarity];
      const levelFactor = 1 + (bird.level * 0.1); 
      const birdRefund = Math.floor(UPGRADE_COSTS.RECRUIT * (0.2 + (config.minMult * 0.1)) * levelFactor);
      
      let gearRefundFeathers = 0;
      let gearRefundScrap = 0;

      const salvageGear = (g: Gear | null) => {
          if (!g) return;
          const gConfig = RARITY_CONFIG[g.rarity];
          gearRefundFeathers += Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3);
          gearRefundScrap += Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * gConfig.minMult);
      };

      salvageGear(bird.gear.beak);
      salvageGear(bird.gear.claws);

      setPlayerState(prev => {
          const inRoster = prev.birds.find(b => b.instanceId === bird.instanceId);
          
          let newBirds = prev.birds;
          let newSelectedId = prev.selectedBirdId;
          let newHuntingIds = prev.huntingBirdIds;

          if (inRoster) {
              newBirds = prev.birds.filter(b => b.instanceId !== bird.instanceId);
              newHuntingIds = prev.huntingBirdIds.filter(id => id !== bird.instanceId);
              if (prev.selectedBirdId === bird.instanceId) {
                  newSelectedId = newBirds.length > 0 ? newBirds[0].instanceId : '';
              }
          }

          return {
              ...prev,
              feathers: prev.feathers + birdRefund + gearRefundFeathers,
              scrap: prev.scrap + gearRefundScrap,
              birds: newBirds,
              selectedBirdId: newSelectedId,
              huntingBirdIds: newHuntingIds
          };
      });

      if (screen === GameScreen.CATCH) {
          setInitialHubTab(HubTab.LAB);
          setScreen(GameScreen.HUB);
      }
  };

  // --- Crafting Logic ---
  const handleTryCraft = (type: GearType): Gear | null => {
      const featherCost = UPGRADE_COSTS.CRAFT_GEAR;
      const scrapCost = UPGRADE_COSTS.CRAFT_SCRAP;
      
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      setPlayerState(prev => ({
          ...prev,
          feathers: prev.feathers - featherCost,
          scrap: prev.scrap - scrapCost
      }));

      return generateCraftedGear(type, playerState.upgrades.craftRarityLevel);
  };

  const handleTryCraftGem = (): Gem | null => {
      const featherCost = UPGRADE_COSTS.CRAFT_GEM;
      const scrapCost = UPGRADE_COSTS.CRAFT_GEM_SCRAP;
      
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      setPlayerState(prev => ({
          ...prev,
          feathers: prev.feathers - featherCost,
          scrap: prev.scrap - scrapCost
      }));

      return generateCraftedGem(playerState.upgrades.gemRarityLevel);
  };

  const handleKeepGear = (gear: Gear) => {
      setPlayerState(prev => ({
          ...prev,
          inventory: {
              ...prev.inventory,
              gear: [...prev.inventory.gear, gear]
          }
      }));
  };

  const handleKeepGem = (gem: Gem) => {
      setPlayerState(prev => ({
          ...prev,
          inventory: {
              ...prev.inventory,
              gems: [...prev.inventory.gems, gem]
          }
      }));
  };

  const handleSalvageGear = (gear: Gear) => {
      const config = RARITY_CONFIG[gear.rarity];
      const refundFeathers = Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3);
      const refundScrap = Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult);

      setPlayerState(prev => {
          const exists = prev.inventory.gear.find(g => g.id === gear.id);
          const newGear = exists ? prev.inventory.gear.filter(g => g.id !== gear.id) : prev.inventory.gear;

          return {
              ...prev,
              feathers: prev.feathers + refundFeathers,
              scrap: prev.scrap + refundScrap,
              inventory: {
                  ...prev.inventory,
                  gear: newGear
              }
          };
      });
  };

  const handleSalvageGem = (gem: Gem) => {
      const config = RARITY_CONFIG[gem.rarity];
      const refundFeathers = Math.floor(UPGRADE_COSTS.CRAFT_GEM * 0.3);
      const refundScrap = Math.floor(UPGRADE_COSTS.CRAFT_GEM_SCRAP * 0.5 * config.minMult);

      setPlayerState(prev => {
           return {
               ...prev,
               feathers: prev.feathers + refundFeathers,
               scrap: prev.scrap + refundScrap
               // If it was from preview, it's not in inventory, so no removal logic needed unless we support scrapping from inventory directly (which we do for gear)
               // For now this is only called from Lab preview.
           };
      });
  };

  const handleEquip = (birdId: string, gearId: string) => {
      setPlayerState(prev => {
          const birdIndex = prev.birds.findIndex(b => b.instanceId === birdId);
          const gearIndex = prev.inventory.gear.findIndex(g => g.id === gearId);
          if (birdIndex === -1 || gearIndex === -1) return prev;

          const bird = { ...prev.birds[birdIndex] };
          const gear = prev.inventory.gear[gearIndex];
          
          const currentGear = gear.type === GearType.BEAK ? bird.gear.beak : bird.gear.claws;
          let newInventory = [...prev.inventory.gear];
          newInventory.splice(gearIndex, 1); 
          if (currentGear) newInventory.push(currentGear); 

          const newGearSlots = { ...bird.gear };
          if (gear.type === GearType.BEAK) newGearSlots.beak = gear;
          else newGearSlots.claws = gear;

          const updatedBirds = [...prev.birds];
          updatedBirds[birdIndex] = { ...bird, gear: newGearSlots };

          return { ...prev, birds: updatedBirds, inventory: { ...prev.inventory, gear: newInventory } };
      });
  };

  const handleUnequip = (birdId: string, slot: 'beak' | 'claws') => {
      setPlayerState(prev => {
          const birdIndex = prev.birds.findIndex(b => b.instanceId === birdId);
          if (birdIndex === -1) return prev;
          
          const bird = { ...prev.birds[birdIndex] };
          const gearToRemove = slot === 'beak' ? bird.gear.beak : bird.gear.claws;
          if (!gearToRemove) return prev;

          const updatedBirds = [...prev.birds];
          updatedBirds[birdIndex] = {
              ...bird,
              gear: { ...bird.gear, [slot]: null }
          };

          return {
              ...prev,
              birds: updatedBirds,
              inventory: { ...prev.inventory, gear: [...prev.inventory.gear, gearToRemove] }
          };
      });
  };

  // --- Socketing Logic ---
  const handleSocketGem = (gearId: string, gemId: string, socketIndex: number) => {
      setPlayerState(prev => {
          // Check inventory gear first
          let gearIndex = prev.inventory.gear.findIndex(g => g.id === gearId);
          let targetGear = gearIndex !== -1 ? prev.inventory.gear[gearIndex] : null;
          let birdIndex = -1;
          let gearSlot: 'beak' | 'claws' | null = null;

          // If not in inventory, check all birds' equipped gear
          if (!targetGear) {
              for (let i = 0; i < prev.birds.length; i++) {
                  if (prev.birds[i].gear.beak?.id === gearId) {
                      birdIndex = i;
                      gearSlot = 'beak';
                      targetGear = prev.birds[i].gear.beak;
                      break;
                  }
                  if (prev.birds[i].gear.claws?.id === gearId) {
                      birdIndex = i;
                      gearSlot = 'claws';
                      targetGear = prev.birds[i].gear.claws;
                      break;
                  }
              }
          }

          if (!targetGear) return prev;

          const gemIndex = prev.inventory.gems.findIndex(g => g.id === gemId);
          if (gemIndex === -1) return prev;
          const gem = prev.inventory.gems[gemIndex];

          // Create copies
          const newGemInventory = [...prev.inventory.gems];
          newGemInventory.splice(gemIndex, 1);
          
          const newSockets = [...targetGear.sockets];
          // If socket has gem, return to inventory
          if (newSockets[socketIndex]) {
              newGemInventory.push(newSockets[socketIndex]!);
          }
          newSockets[socketIndex] = gem;

          const newGear = { ...targetGear, sockets: newSockets };
          
          if (birdIndex !== -1 && gearSlot) {
              // Update equipped gear
              const newBirds = [...prev.birds];
              newBirds[birdIndex] = {
                  ...newBirds[birdIndex],
                  gear: {
                      ...newBirds[birdIndex].gear,
                      [gearSlot]: newGear
                  }
              };
              return { ...prev, birds: newBirds, inventory: { ...prev.inventory, gems: newGemInventory } };
          } else {
              // Update inventory gear
              const newGearInventory = [...prev.inventory.gear];
              newGearInventory[gearIndex] = newGear;
              return { ...prev, inventory: { ...prev.inventory, gear: newGearInventory, gems: newGemInventory } };
          }
      });
  };

  const handleUnsocketGem = (gearId: string, socketIndex: number) => {
      setPlayerState(prev => {
          // Logic same as above but just removing
          let gearIndex = prev.inventory.gear.findIndex(g => g.id === gearId);
          let targetGear = gearIndex !== -1 ? prev.inventory.gear[gearIndex] : null;
          let birdIndex = -1;
          let gearSlot: 'beak' | 'claws' | null = null;

          if (!targetGear) {
              for (let i = 0; i < prev.birds.length; i++) {
                  if (prev.birds[i].gear.beak?.id === gearId) {
                      birdIndex = i;
                      gearSlot = 'beak';
                      targetGear = prev.birds[i].gear.beak;
                      break;
                  }
                  if (prev.birds[i].gear.claws?.id === gearId) {
                      birdIndex = i;
                      gearSlot = 'claws';
                      targetGear = prev.birds[i].gear.claws;
                      break;
                  }
              }
          }

          if (!targetGear) return prev;

          const gem = targetGear.sockets[socketIndex];
          if (!gem) return prev;

          const newSockets = [...targetGear.sockets];
          newSockets[socketIndex] = null;
          const newGear = { ...targetGear, sockets: newSockets };
          
          const newGemInventory = [...prev.inventory.gems, gem];

          if (birdIndex !== -1 && gearSlot) {
               const newBirds = [...prev.birds];
               newBirds[birdIndex] = {
                   ...newBirds[birdIndex],
                   gear: {
                       ...newBirds[birdIndex].gear,
                       [gearSlot]: newGear
                   }
               };
               return { ...prev, birds: newBirds, inventory: { ...prev.inventory, gems: newGemInventory } };
          } else {
              const newGearInventory = [...prev.inventory.gear];
              newGearInventory[gearIndex] = newGear;
              return { ...prev, inventory: { ...prev.inventory, gear: newGearInventory, gems: newGemInventory } };
          }
      });
  };

  const handleAssignHunter = (birdId: string) => {
      setPlayerState(prev => ({
          ...prev,
          huntingBirdIds: [...prev.huntingBirdIds, birdId]
      }));
  };

  const handleRecallHunter = (birdId: string) => {
      setPlayerState(prev => ({
          ...prev,
          huntingBirdIds: prev.huntingBirdIds.filter(id => id !== birdId)
      }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {screen === GameScreen.MENU && (
         <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-slate-950">
             {/* Dynamic Background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0f172a_0%,#020617_100%)] z-0" />
             
             {/* Hexagon Grid Pattern */}
             <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')] z-0 pointer-events-none" />

             {/* Rotating Ring Container - Centered explicitly */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <motion.div 
                    className="w-[600px] h-[600px] rounded-full border border-cyan-500/10 border-dashed"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                 />
             </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                    className="w-[400px] h-[400px] rounded-full border border-cyan-500/20"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                />
             </div>

             {/* Animated Grid Floor (Perspective) */}
             <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-cyan-900/20 to-transparent perspective-[1000px] overflow-hidden opacity-30 pointer-events-none">
                 <motion.div 
                    className="w-[200%] h-[200%] -ml-[50%] bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.3)_25%,rgba(6,182,212,0.3)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.3)_75%,rgba(6,182,212,0.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.3)_25%,rgba(6,182,212,0.3)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.3)_75%,rgba(6,182,212,0.3)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"
                    style={{ transform: "rotateX(60deg)" }}
                    animate={{ translateY: [0, 50] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 />
             </div>

             {/* Particles */}
             {[...Array(30)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-cyan-400 rounded-full"
                    initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0 }}
                    animate={{ 
                        y: [null, Math.random() * -100], 
                        opacity: [0, 0.8, 0],
                    }}
                    transition={{ 
                        duration: 2 + Math.random() * 4, 
                        repeat: Infinity, 
                        delay: Math.random() * 2,
                    }}
                />
             ))}

             {/* Content Container */}
             <div className="z-10 text-center relative max-w-4xl px-4 flex flex-col items-center justify-center pb-24 md:pb-0">
                 
                 {/* Main Title Group */}
                 <div className="mb-12 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative z-10"
                    >
                        {/* Glitch Effect Layers */}
                        <h1 className="text-6xl md:text-9xl font-tech font-black tracking-tighter text-white relative z-10 mix-blend-screen">
                            BIRD GAME
                        </h1>
                        <motion.h1 
                            className="text-6xl md:text-9xl font-tech font-black tracking-tighter text-cyan-500 absolute top-0 left-0 z-0 opacity-50 mix-blend-screen"
                            animate={{ x: [-2, 2, -1, 0], opacity: [0.5, 0.3, 0.5] }}
                            transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 3 }}
                        >
                            BIRD GAME
                        </motion.h1>
                        <motion.h1 
                            className="text-6xl md:text-9xl font-tech font-black tracking-tighter text-rose-500 absolute top-0 left-0 z-0 opacity-50 mix-blend-screen"
                            animate={{ x: [2, -2, 1, 0], opacity: [0.5, 0.3, 0.5] }}
                            transition={{ repeat: Infinity, duration: 0.2, repeatDelay: 4 }}
                        >
                            BIRD GAME
                        </motion.h1>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex items-center justify-center gap-4 mt-2"
                    >
                        <div className="h-px bg-cyan-500 w-12 md:w-24" />
                        <span className="text-3xl md:text-5xl font-tech font-bold text-cyan-400 tracking-[0.2em]">III</span>
                        <div className="h-px bg-cyan-500 w-12 md:w-24" />
                    </motion.div>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-slate-400 font-mono text-sm tracking-[0.5em] mt-4 uppercase"
                    >
                        Tactical Avian Combat
                    </motion.p>
                 </div>

                 {/* Start Button */}
                 <motion.button 
                    onClick={handleStart} 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: 1.2 }}
                    className="group relative px-20 py-6 bg-transparent overflow-hidden cursor-pointer z-50"
                 >
                     {/* Tech Border SVG */}
                     <svg className="absolute inset-0 w-full h-full text-cyan-500/50 group-hover:text-cyan-400 transition-colors" viewBox="0 0 300 80" preserveAspectRatio="none">
                         <path d="M0,0 L20,0 L30,10 L270,10 L280,0 L300,0 L300,60 L280,60 L270,70 L30,70 L20,60 L0,60 Z" fill="rgba(8,145,178,0.1)" stroke="currentColor" strokeWidth="1" />
                     </svg>

                     <div className="relative z-10 flex flex-col items-center">
                        <span className="font-black font-tech text-2xl text-white tracking-widest group-hover:text-cyan-200 transition-colors">INITIALIZE</span>
                     </div>
                     
                     {/* Animated shine */}
                     <motion.div 
                        className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                        animate={{ left: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }}
                     />
                 </motion.button>
             </div>
             
             {/* Footer Status - Positioned at bottom of screen, safe distance */}
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-cyan-900 font-mono flex gap-4 md:gap-8 justify-center pointer-events-none"
             >
                <span>SYS.VER.3.1.2</span>
                <span>ONLINE</span>
                <span>SECURE.CONN</span>
             </motion.div>
             
             {/* Scanlines */}
             <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%] pointer-events-none" />
             <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/80 z-40" />
         </div>
      )}

      {screen === GameScreen.HUB && (
          <Hub 
            playerState={playerState} 
            onBattle={() => setScreen(GameScreen.BATTLE)}
            onUpgrade={handleUpgrade}
            onSelectBird={(id) => setPlayerState(prev => ({...prev, selectedBirdId: id}))}
            onTryCraft={handleTryCraft}
            onTryCraftGem={handleTryCraftGem}
            onKeepGear={handleKeepGear}
            onSalvageGear={handleSalvageGear}
            onKeepGem={handleKeepGem}
            onSalvageGem={handleSalvageGem}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onAssignHunter={handleAssignHunter}
            onRecallHunter={handleRecallHunter}
            onKeepBird={handleKeepBird}
            onReleaseBird={handleReleaseBird}
            initialTab={initialHubTab}
            onSocketGem={handleSocketGem}
            onUnsocketGem={handleUnsocketGem}
          />
      )}

      {screen === GameScreen.BATTLE && (
          <BattleArena 
            key={battleKey}
            playerBirdInstance={playerState.birds.find(b => b.instanceId === playerState.selectedBirdId)!}
            enemyLevel={playerState.highestZone} 
            onBattleComplete={handleBattleComplete}
          />
      )}

      {screen === GameScreen.CATCH && (
          <CatchScreen 
              dropRateMultiplier={playerState.upgrades.dropRate}
              catchRarityLevel={playerState.upgrades.catchRarityLevel}
              onKeepBird={handleKeepBird}
              onReleaseBird={handleReleaseBird}
              isFirstCatch={playerState.birds.length === 0}
          />
      )}
    </div>
  );
}
