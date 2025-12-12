
import React, { useState, useEffect } from 'react';
import { Hub } from './components/Hub';
import { BattleArena } from './components/BattleArena';
import { CatchScreen } from './components/CatchScreen';
import { BirdSelection } from './components/BirdSelection';
import { PlayerState, GameScreen, BirdInstance, BattleResult, GearType, HubTab, Gear, Rarity, UpgradeState, GearBuff, Gem, ConsumableType, Consumable, Bird, APShopState, UnlocksState } from './types';
import { INITIAL_PLAYER_STATE, XP_TABLE, UPGRADE_COSTS, generateCraftedGear, RARITY_CONFIG, UPGRADE_DEFINITIONS, generateCraftedGem, CONSUMABLE_STATS, rollRarity, BIRD_TEMPLATES, generateBird, ACHIEVEMENTS, AP_SHOP_ITEMS } from './constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/Button';
import { Lock, Unlock, Database, Hammer, ArrowRight, Beaker } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
  const [initialHubTab, setInitialHubTab] = useState<HubTab>(HubTab.MAP);
  const [battleKey, setBattleKey] = useState(0);
  const [unlockModalZone, setUnlockModalZone] = useState<number | null>(null);

  // Persistence
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const saved = localStorage.getItem('bird_game_save_v7'); 
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
                // Migration for prefixes (v8)
                if (g.effectValue && !g.paramValue) {
                    g.paramValue = g.effectValue;
                }
                return g;
            };

            if (parsed.inventory) {
                if (parsed.inventory.gear) {
                    parsed.inventory.gear = parsed.inventory.gear.map(migrateGear).filter(Boolean);
                }
                if (!parsed.inventory.consumables) {
                    parsed.inventory.consumables = [];
                }
            }

            if (parsed.birds) {
                parsed.birds.forEach((b: any) => {
                    if (b.gear.beak) b.gear.beak = migrateGear(b.gear.beak);
                    if (b.gear.claws) b.gear.claws = migrateGear(b.gear.claws);
                    
                    // Refresh image URL from template to fix broken links
                    const template = BIRD_TEMPLATES.find(t => t.id === b.id);
                    if (template) {
                        b.imageUrl = template.imageUrl;
                    }
                });
            }
            // Ensure new fields exist
            if (!parsed.upgrades.gemRarityLevel) {
                parsed.upgrades.gemRarityLevel = 0;
            }
            if (!parsed.activeBuffs) {
                parsed.activeBuffs = [];
            }
            // Achievement Fields
            if (!parsed.ap) parsed.ap = 0;
            if (!parsed.completedAchievementIds) parsed.completedAchievementIds = [];
            if (!parsed.lifetimeStats) {
                parsed.lifetimeStats = {
                    totalFeathers: parsed.feathers || 0,
                    totalScrap: parsed.scrap || 0,
                    totalCrafts: 0,
                    totalCatches: parsed.birds?.length || 0,
                    battlesWon: 0, // Hard to retroactively know
                    highestZoneReached: parsed.highestZone || 1
                };
            }
            if (!parsed.apShop) {
                parsed.apShop = {
                    featherBoost: 0,
                    scrapBoost: 0,
                    diamondBoost: 0,
                    itemDropBoost: 0,
                    gemDropBoost: 0
                };
            }
            // Unlocks Field
            if (!parsed.unlocks) {
                parsed.unlocks = {
                    workshop: false,
                    clawCrafting: false,
                    gemCrafting: false,
                    upgrades: false,
                    achievements: false
                };
            } else {
                // Ensure new keys exist if migrating from partial unlocks
                if (parsed.unlocks.upgrades === undefined) parsed.unlocks.upgrades = false;
                if (parsed.unlocks.achievements === undefined) parsed.unlocks.achievements = false;
                if (parsed.unlocks.clawCrafting === undefined) parsed.unlocks.clawCrafting = false;
                // beakCrafting deprecated, ensure workshop covers it if migrated from old state
                if (parsed.unlocks.beakCrafting && !parsed.unlocks.workshop) parsed.unlocks.workshop = true;
            }
            
            // Ensure currentZoneProgress exists
            if (!parsed.currentZoneProgress) {
                parsed.currentZoneProgress = [];
            }

            return parsed;
        } catch (e) {
            console.error("Save file corrupted, resetting.", e);
            return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
        }
    }
    return JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE));
  });

  const [selectedZone, setSelectedZone] = useState<number>(playerState.highestZone);

  // Calculate Global Boost Multiplier from AP Shop Level
  const getAPBoostMult = (level: number, perLevel = 2) => {
      // Level 5 = +10% -> 1.10
      return 1 + (level * (perLevel / 100));
  };

  // Helper to determine required rarities for current zone
  const getRequiredRarities = (zone: number): Rarity[] => {
      if (zone === 1) return [Rarity.COMMON, Rarity.UNCOMMON];
      if (zone === 2) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE];
      if (zone === 3) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC];
      if (zone === 4) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY];
      return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];
  };

  // Rarity Hierarchy for comparison
  const RARITY_ORDER = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];

  // Auto-Save & Passive Hunting
  useEffect(() => {
    // ... (unchanged auto-save logic)
    const interval = setInterval(() => {
       setPlayerState(prev => {
           // Handle Hunting Buffs
           const huntBuffIndex = prev.activeBuffs.findIndex(b => b.type === ConsumableType.HUNTING_SPEED);
           let multiplier = 1.0;
           let newActiveBuffs = [...prev.activeBuffs];

           if (huntBuffIndex !== -1) {
               multiplier = newActiveBuffs[huntBuffIndex].multiplier;
               newActiveBuffs[huntBuffIndex].remaining -= 1; // Decrease by 1 second
               if (newActiveBuffs[huntBuffIndex].remaining <= 0) {
                   newActiveBuffs.splice(huntBuffIndex, 1);
               }
           }

           // --- Resource Calculation ---
           let totalIncome = 0;
           let totalDiamondChance = 0;
           let totalItemChance = 0;
           let totalGemChance = 0;
           let extraScrap = 0;
           
           let birdsUpdated = false;
           // Iterate birds to apply passive XP or other individual updates
           const updatedBirds = prev.birds.map(bird => {
               if (prev.huntingBirdIds.includes(bird.instanceId)) {
                   // Calculate Resource Yield (same as before but per bird)
                   const rarityMult = RARITY_CONFIG[bird.rarity].minMult;
                   let baseIncome = (bird.huntingConfig.baseRate * rarityMult) * (1 + (bird.level * 0.1));
                   
                   // Apply Hunting Speed Buff Multiplier directly to yield
                   baseIncome *= multiplier;

                   // Species-Specific Bonuses
                   if (bird.id === 'hummingbird') {
                        if (Math.random() < 0.10) baseIncome *= 2;
                   } else if (bird.id === 'hawk') {
                        if (Math.random() < 0.05) extraScrap += 1;
                   } else if (bird.id === 'owl') {
                        baseIncome *= 1.1;
                        
                        // Passive XP for Owls - 25% chance
                        if (Math.random() < 0.25) {
                            const xpGain = Math.max(1, Math.floor(bird.level * 0.5));
                            let newXp = bird.xp + xpGain;
                            let newLevel = bird.level;
                            let newXpToNext = bird.xpToNextLevel;

                            while (newXp >= newXpToNext) {
                                newXp -= newXpToNext;
                                newLevel++;
                                newXpToNext = Math.floor(XP_TABLE.BASE * Math.pow(newLevel, XP_TABLE.GROWTH_FACTOR));
                            }
                            
                            if (newXp !== bird.xp || newLevel !== bird.level) {
                                birdsUpdated = true;
                                // Only update bird stats if we leveled up, otherwise just XP
                                return { ...bird, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext };
                            }
                        }
                   }
                   
                   if (bird.id === 'vulture') {
                       totalItemChance += 0.02; // 2% chance per tick for items
                   }

                   let bonusPct = 0;
                   // Check Gems in Sockets for Utility Buffs
                   const addGemBuffs = (g: Gear | null) => {
                       g?.sockets.forEach(socket => {
                           if (socket) {
                               socket.buffs.forEach(b => {
                                   if (b.stat === 'HUNT_BONUS') bonusPct += b.value;
                                   if (b.stat === 'DIAMOND_HUNT_CHANCE') totalDiamondChance += (b.value / 100);
                                   if (b.stat === 'ITEM_FIND_CHANCE') totalItemChance += (b.value / 100);
                                   if (b.stat === 'GEM_FIND_CHANCE') totalGemChance += (b.value / 100);
                               });
                           }
                       });
                   };
                   addGemBuffs(bird.gear.beak);
                   addGemBuffs(bird.gear.claws);
                   
                   totalIncome += baseIncome * (1 + (bonusPct / 100));
               }
               return bird;
           });
           
           // APPLY AP SHOP BOOSTS
           const featherBoost = getAPBoostMult(prev.apShop.featherBoost);
           const scrapBoost = getAPBoostMult(prev.apShop.scrapBoost);
           const diamondBoost = getAPBoostMult(prev.apShop.diamondBoost);
           const itemBoost = getAPBoostMult(prev.apShop.itemDropBoost);
           const gemBoost = getAPBoostMult(prev.apShop.gemDropBoost);

           totalIncome *= featherBoost;
           extraScrap *= scrapBoost;
           totalDiamondChance *= diamondBoost;
           totalItemChance *= itemBoost;
           totalGemChance *= gemBoost;

           let diamondFound = 0;
           // Also apply multiplier to diamond chance for "faster ticks" simulation
           if (totalDiamondChance > 0 && Math.random() < (totalDiamondChance * multiplier)) {
               diamondFound = 1;
           }

           let itemFound: Consumable | null = null;
           if (totalItemChance > 0 && Math.random() < (totalItemChance * multiplier)) {
               const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
               const rarity = rollRarity(-1);
               itemFound = { type, rarity, count: 1 };
           }

           let gemFound: Gem | null = null;
           // Only drop gems if Gemforge is unlocked
           if (prev.unlocks.gemCrafting && totalGemChance > 0 && Math.random() < (totalGemChance * multiplier)) {
                gemFound = generateCraftedGem(0);
           }
           
           const newInventory = { ...prev.inventory };
           if (itemFound) {
               const existingIdx = newInventory.consumables.findIndex(c => c.type === itemFound!.type && c.rarity === itemFound!.rarity);
               if (existingIdx !== -1) {
                   newInventory.consumables[existingIdx].count += 1;
               } else {
                   newInventory.consumables.push(itemFound);
               }
           }
           if (gemFound) {
               newInventory.gems.push(gemFound);
           }

           const newState = {
               ...prev,
               feathers: prev.feathers + totalIncome,
               scrap: prev.scrap + extraScrap,
               diamonds: prev.diamonds + diamondFound,
               birds: birdsUpdated ? updatedBirds : prev.birds,
               inventory: newInventory,
               activeBuffs: newActiveBuffs,
               lifetimeStats: {
                   ...prev.lifetimeStats,
                   totalFeathers: prev.lifetimeStats.totalFeathers + totalIncome,
                   totalScrap: prev.lifetimeStats.totalScrap + extraScrap
               }
           };
           localStorage.setItem('bird_game_save_v7', JSON.stringify(newState));
           return newState;
       });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
     // Check if new player
     if (!playerState.birds || playerState.birds.length === 0) {
         setScreen(GameScreen.CATCH); // Direct to Catch Minigame
     } else {
         setScreen(GameScreen.HUB);
     }
  };

  const handleTestStart = (bird: Bird) => {
      // Find template to ensure we have the base stat ranges for generation
      const template = BIRD_TEMPLATES.find(t => t.id === bird.id);
      if (!template) return;

      const newBird = generateBird(template, Rarity.MYTHIC); // Adult Class
      
      setPlayerState(prev => ({
          ...prev,
          birds: [...prev.birds, newBird],
          selectedBirdId: newBird.instanceId,
          // Starter resources for testing
          feathers: prev.feathers + 1000, 
          scrap: prev.scrap + 200,
          lifetimeStats: {
              ...prev.lifetimeStats,
              totalCatches: prev.lifetimeStats.totalCatches + 1
          }
      }));
      setInitialHubTab(HubTab.MAP);
      setScreen(GameScreen.HUB);
  };

  const handleBattleComplete = (result: BattleResult, playAgain: boolean = false) => {
      // ... (unchanged battle completion logic)
      // Calculate Zone Progression Logic Synchronously before state update
      let newHighestZone = playerState.highestZone;
      let newZoneProgress = [...playerState.currentZoneProgress];
      let pendingZoneUnlock: number | null = null;
      let shouldAdvanceZone = false;

      if (result.winner === 'player') {
          // Only update progression if fighting in the highest unlocked zone
          if (selectedZone === playerState.highestZone) {
              const opponentRarityIdx = RARITY_ORDER.indexOf(result.opponentRarity);
              const required = getRequiredRarities(playerState.highestZone);
              let satisfiedRarity: Rarity | null = null;
              
              if (!newZoneProgress.includes(result.opponentRarity)) {
                  satisfiedRarity = result.opponentRarity;
              } else {
                  for (const reqRarity of required) {
                      if (!newZoneProgress.includes(reqRarity)) {
                          const reqIdx = RARITY_ORDER.indexOf(reqRarity);
                          if (opponentRarityIdx >= reqIdx) {
                              satisfiedRarity = reqRarity;
                              break;
                          }
                      }
                  }
              }

              if (satisfiedRarity && !newZoneProgress.includes(satisfiedRarity)) {
                  newZoneProgress.push(satisfiedRarity);
              }

              const isZoneCleared = required.every(r => newZoneProgress.includes(r));

              if (isZoneCleared) {
                  newHighestZone = playerState.highestZone + 1;
                  newZoneProgress = []; // Reset for next zone
                  pendingZoneUnlock = newHighestZone;
                  shouldAdvanceZone = true;
              }
          }
      }

      setPlayerState(prev => {
          const birdIndex = prev.birds.findIndex(b => b.instanceId === prev.selectedBirdId);
          if (birdIndex === -1) return prev; 
          
          const bird = { ...prev.birds[birdIndex] };
          
          let newActiveBuffs = [...prev.activeBuffs];
          const rewardBuffIndex = newActiveBuffs.findIndex(b => b.type === ConsumableType.BATTLE_REWARD);
          
          if (rewardBuffIndex !== -1 && result.winner === 'player') {
             newActiveBuffs[rewardBuffIndex].remaining -= 1;
             if (newActiveBuffs[rewardBuffIndex].remaining <= 0) {
                 newActiveBuffs.splice(rewardBuffIndex, 1);
             }
          }

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
          if (result.rewards.consumable) {
              const existingIdx = newInventory.consumables.findIndex(c => c.type === result.rewards.consumable!.type && c.rarity === result.rewards.consumable!.rarity);
              if (existingIdx !== -1) {
                  newInventory.consumables[existingIdx].count += result.rewards.consumable.count;
              } else {
                  newInventory.consumables.push(result.rewards.consumable);
              }
          }

          return {
              ...prev,
              feathers: newFeathers,
              scrap: newScrap,
              diamonds: newDiamonds,
              highestZone: newHighestZone, 
              currentZoneProgress: newZoneProgress,
              birds: updatedBirds,
              inventory: newInventory,
              activeBuffs: newActiveBuffs,
              lifetimeStats: {
                  ...prev.lifetimeStats,
                  battlesWon: prev.lifetimeStats.battlesWon + (result.winner === 'player' ? 1 : 0),
                  totalFeathers: prev.lifetimeStats.totalFeathers + result.rewards.feathers,
                  totalScrap: prev.lifetimeStats.totalScrap + result.rewards.scrap,
                  highestZoneReached: Math.max(prev.lifetimeStats.highestZoneReached, newHighestZone)
              }
          };
      });

      if (pendingZoneUnlock) {
          setUnlockModalZone(pendingZoneUnlock);
      }
      
      if (shouldAdvanceZone) {
          setSelectedZone(newHighestZone);
      }

      if (playAgain) {
          setBattleKey(prev => prev + 1);
          setScreen(GameScreen.BATTLE);
      } else {
          setInitialHubTab(HubTab.MAP);
          setScreen(GameScreen.HUB);
      }
  };

  const handleUpgrade = (type: keyof UpgradeState | 'recruit') => {
      // ... (unchanged)
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

  // ... (Other handlers like handleKeepBird, handleReleaseBird, etc. unchanged)
  
  const handleKeepBird = (newBird: BirdInstance) => {
      setPlayerState(prev => ({
          ...prev,
          birds: [...prev.birds, newBird],
          selectedBirdId: prev.birds.length === 0 ? newBird.instanceId : prev.selectedBirdId,
          lifetimeStats: {
              ...prev.lifetimeStats,
              totalCatches: prev.lifetimeStats.totalCatches + 1
          }
      }));
      setInitialHubTab(HubTab.ROSTER);
      setScreen(GameScreen.HUB);
  };

  const handleReleaseBird = (bird: BirdInstance) => {
      // ... (unchanged)
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

  const handleTryCraft = (type: GearType): Gear | null => {
      // ... (unchanged)
      const featherCost = UPGRADE_COSTS.CRAFT_GEAR;
      const scrapCost = UPGRADE_COSTS.CRAFT_SCRAP;
      
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      setPlayerState(prev => ({
          ...prev,
          feathers: prev.feathers - featherCost,
          scrap: prev.scrap - scrapCost,
          lifetimeStats: {
              ...prev.lifetimeStats,
              totalCrafts: prev.lifetimeStats.totalCrafts + 1
          }
      }));

      return generateCraftedGear(type, playerState.upgrades.craftRarityLevel);
  };

  const handleTryCraftGem = (): Gem | null => {
      // ... (unchanged)
      const featherCost = UPGRADE_COSTS.CRAFT_GEM;
      const scrapCost = UPGRADE_COSTS.CRAFT_GEM_SCRAP;
      
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      setPlayerState(prev => ({
          ...prev,
          feathers: prev.feathers - featherCost,
          scrap: prev.scrap - scrapCost,
          lifetimeStats: {
              ...prev.lifetimeStats,
              totalCrafts: prev.lifetimeStats.totalCrafts + 1
          }
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
      // ... (unchanged)
      const config = RARITY_CONFIG[gear.rarity];
      const refundFeathers = Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3);
      const refundScrap = Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult);

      setPlayerState(prev => {
          // Check Inventory First
          const invIndex = prev.inventory.gear.findIndex(g => g.id === gear.id);
          if (invIndex !== -1) {
              const newGear = [...prev.inventory.gear];
              newGear.splice(invIndex, 1);
              return {
                  ...prev,
                  feathers: prev.feathers + refundFeathers,
                  scrap: prev.scrap + refundScrap,
                  inventory: {
                      ...prev.inventory,
                      gear: newGear
                  }
              };
          }

          // Check Birds (Equipped)
          let birdIndex = -1;
          let slot: 'beak' | 'claws' | null = null;
          for (let i = 0; i < prev.birds.length; i++) {
              if (prev.birds[i].gear.beak?.id === gear.id) {
                  birdIndex = i; slot = 'beak'; break;
              }
              if (prev.birds[i].gear.claws?.id === gear.id) {
                  birdIndex = i; slot = 'claws'; break;
              }
          }

          if (birdIndex !== -1 && slot) {
              const newBirds = [...prev.birds];
              newBirds[birdIndex] = {
                  ...newBirds[birdIndex],
                  gear: {
                      ...newBirds[birdIndex].gear,
                      [slot]: null
                  }
              };
              return {
                  ...prev,
                  feathers: prev.feathers + refundFeathers,
                  scrap: prev.scrap + refundScrap,
                  birds: newBirds
              };
          }

          return {
              ...prev,
              feathers: prev.feathers + refundFeathers,
              scrap: prev.scrap + refundScrap
          };
      });
  };

  // Fixed Salvage Gem (Single)
  const handleSalvageGem = (gem: Gem) => {
      const config = RARITY_CONFIG[gem.rarity];
      const refundFeathers = Math.floor(UPGRADE_COSTS.CRAFT_GEM * 0.3);
      const refundScrap = Math.floor(UPGRADE_COSTS.CRAFT_GEM_SCRAP * 0.5 * config.minMult);

      setPlayerState(prev => {
           const gemIndex = prev.inventory.gems.findIndex(g => g.id === gem.id);
           if (gemIndex !== -1) {
               const newGems = [...prev.inventory.gems];
               newGems.splice(gemIndex, 1);
               return {
                   ...prev,
                   feathers: prev.feathers + refundFeathers,
                   scrap: prev.scrap + refundScrap,
                   inventory: {
                       ...prev.inventory,
                       gems: newGems
                   }
               };
           }
           return prev;
      });
  };

  // NEW: Batch Salvage Gems
  const handleBatchSalvageGems = (gemsToSalvage: Gem[]) => {
      setPlayerState(prev => {
          const idsToRemove = new Set(gemsToSalvage.map(g => g.id));
          const newGems = prev.inventory.gems.filter(g => !idsToRemove.has(g.id));
          
          let totalFeathers = 0;
          let totalScrap = 0;
          
          gemsToSalvage.forEach(gem => {
               const config = RARITY_CONFIG[gem.rarity];
               totalFeathers += Math.floor(UPGRADE_COSTS.CRAFT_GEM * 0.3);
               totalScrap += Math.floor(UPGRADE_COSTS.CRAFT_GEM_SCRAP * 0.5 * config.minMult);
          });

          return {
              ...prev,
              inventory: { ...prev.inventory, gems: newGems },
              feathers: prev.feathers + totalFeathers,
              scrap: prev.scrap + totalScrap
          };
      });
  };

  // ... (Equip/Unequip/Socket/etc handlers unchanged)
  
  const handleEquip = (birdId: string, gearId: string) => {
      // ... (unchanged)
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
      // ... (unchanged)
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

  const handleSocketGem = (gearId: string, gemId: string, socketIndex: number) => {
      // ... (unchanged)
      setPlayerState(prev => {
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

          const gemIndex = prev.inventory.gems.findIndex(g => g.id === gemId);
          if (gemIndex === -1) return prev;
          const gem = prev.inventory.gems[gemIndex];

          const newGemInventory = [...prev.inventory.gems];
          newGemInventory.splice(gemIndex, 1);
          
          const newSockets = [...targetGear.sockets];
          if (newSockets[socketIndex]) {
              newGemInventory.push(newSockets[socketIndex]!);
          }
          newSockets[socketIndex] = gem;

          const newGear = { ...targetGear, sockets: newSockets };
          
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

  const handleUnsocketGem = (gearId: string, socketIndex: number) => {
      // ... (unchanged)
      setPlayerState(prev => {
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

  const handleUseConsumable = (type: ConsumableType, rarity: Rarity) => {
      setPlayerState(prev => {
          const invIdx = prev.inventory.consumables.findIndex(c => c.type === type && c.rarity === rarity);
          if (invIdx === -1) return prev;
          
          const newConsumables = [...prev.inventory.consumables];
          if (newConsumables[invIdx].count > 1) {
              newConsumables[invIdx].count -= 1;
          } else {
              newConsumables.splice(invIdx, 1);
          }

          const config = CONSUMABLE_STATS[type].stats[rarity];
          const newActiveBuffs = [...prev.activeBuffs];
          const activeIdx = newActiveBuffs.findIndex(b => b.type === type);
          
          const buff = { type, rarity, multiplier: config.mult, remaining: config.duration };
          if (activeIdx !== -1) {
              newActiveBuffs[activeIdx] = buff; 
          } else {
              newActiveBuffs.push(buff);
          }

          return {
              ...prev,
              inventory: { ...prev.inventory, consumables: newConsumables },
              activeBuffs: newActiveBuffs
          };
      });
  };

  const handleClaimAchievement = (id: string) => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (!achievement || playerState.completedAchievementIds.includes(id)) return;

      setPlayerState(prev => ({
          ...prev,
          ap: prev.ap + achievement.apReward,
          completedAchievementIds: [...prev.completedAchievementIds, id]
      }));
  };

  const handleBuyAPUpgrade = (id: keyof APShopState) => {
      const item = AP_SHOP_ITEMS.find(i => i.id === id);
      if (!item) return;

      setPlayerState(prev => {
          const currentLevel = prev.apShop[id] || 0;
          const cost = item.baseCost + (currentLevel * item.costScale);
          
          if (prev.ap < cost) return prev;

          return {
              ...prev,
              ap: prev.ap - cost,
              apShop: {
                  ...prev.apShop,
                  [id]: currentLevel + 1
              }
          };
      });
  };

  const handleUnlockFeature = (feature: keyof UnlocksState) => {
      let costFeathers = 0;
      let costScrap = 0;

      if (feature === 'workshop') {
          costFeathers = 50; costScrap = 10;
      } else if (feature === 'clawCrafting') {
          costFeathers = 100; costScrap = 25;
      } else if (feature === 'gemCrafting') {
          costFeathers = 500; costScrap = 100;
      } else if (feature === 'upgrades') {
          costFeathers = 1000; costScrap = 200;
      } else if (feature === 'achievements') {
          costFeathers = 0; costScrap = 0;
      }

      if (playerState.feathers >= costFeathers && playerState.scrap >= costScrap) {
          setPlayerState(prev => ({
              ...prev,
              feathers: prev.feathers - costFeathers,
              scrap: prev.scrap - costScrap,
              unlocks: {
                  ...prev.unlocks,
                  [feature]: true
              }
          }));
          
          if (unlockModalZone !== null) {
              const featureMap: Record<string, HubTab> = {
                  'workshop': HubTab.LAB,
                  'clawCrafting': HubTab.LAB,
                  'gemCrafting': HubTab.LAB,
                  'upgrades': HubTab.UPGRADES,
                  'achievements': HubTab.ACHIEVEMENTS
              };
              if (featureMap[feature]) {
                  setInitialHubTab(featureMap[feature]);
                  setScreen(GameScreen.HUB);
              }
              setUnlockModalZone(null);
          }
      }
  };

  const getUnlockDetails = (zone: number) => {
      switch(zone) {
          case 2: return { feature: 'workshop' as keyof UnlocksState, title: 'GEAR WORKSHOP', desc: 'Craft Beak equipment to boost your birds.', cost: {f: 50, s: 10} };
          case 3: return { feature: 'clawCrafting' as keyof UnlocksState, title: 'ADVANCED WEAPONRY', desc: 'Unlocks advanced Claw crafting recipes.', cost: {f: 100, s: 25} };
          case 4: return { feature: 'gemCrafting' as keyof UnlocksState, title: 'GEMFORGE', desc: 'Synthesize powerful gems for gear sockets.', cost: {f: 500, s: 100} };
          case 5: return { feature: 'upgrades' as keyof UnlocksState, title: 'CYBERNETICS LAB', desc: 'Access system-wide efficiency upgrades.', cost: {f: 1000, s: 200} };
          case 6: return { feature: 'achievements' as keyof UnlocksState, title: 'HALL OF GLORY', desc: 'Track milestones and earn AP.', cost: {f: 0, s: 0} };
          default: return null;
      }
  };

  const unlockInfo = unlockModalZone ? getUnlockDetails(unlockModalZone) : null;

  return (
    <div className="bg-slate-950 text-white font-sans overflow-x-hidden relative">
      {screen === GameScreen.MENU && (
         <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden select-none touch-none">
             {/* ... Menu Content ... */}
             <div className="relative z-20 flex flex-col items-center justify-between h-full py-20 md:justify-center md:gap-16 w-full max-w-md px-6">
                 {/* Spacer for Mobile Vertical Balance */}
                 <div className="flex-1 md:hidden" />

                 {/* LOGO GROUP */}
                 <div className="flex flex-col items-center justify-center w-full">
                    {/* Title Container */}
                    <div className="relative mb-6">
                         <h1 className="text-7xl md:text-9xl font-tech font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 text-center leading-[0.8] drop-shadow-2xl">
                            BIRD<br/>GAME
                        </h1>
                    </div>

                    {/* Subtitle / Version */}
                    <motion.div 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex flex-col items-center gap-4 w-full"
                    >
                         <div className="flex items-center gap-4 w-full justify-center opacity-80">
                            <div className="h-[1px] bg-gradient-to-l from-cyan-500/50 to-transparent w-16" />
                            <span className="font-tech text-3xl md:text-4xl text-cyan-400 font-bold tracking-[0.2em] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">III</span>
                            <div className="h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent w-16" />
                         </div>

                         <p className="font-mono text-[10px] md:text-xs text-slate-400 tracking-[0.3em] uppercase">
                            Tactical Avian Combat
                         </p>
                    </motion.div>
                 </div>

                 <div className="flex-[0.5] md:hidden" />

                 <div className="w-full flex flex-col items-center gap-4 mb-12 md:mb-0">
                     <motion.button 
                        onClick={handleStart} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 1.2 }}
                        className="group relative w-full max-w-[280px] h-16 bg-transparent"
                     >
                         <svg className="absolute inset-0 w-full h-full text-slate-800 group-hover:text-cyan-900/40 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]" viewBox="0 0 280 64" fill="currentColor">
                             <path d="M20,0 L260,0 L280,20 L280,44 L260,64 L20,64 L0,44 L0,20 Z" fillOpacity="0.8" />
                             <path d="M20,2 L260,2 L278,20 L278,44 L260,62 L20,62 L2,44 L2,20 Z" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                         </svg>

                         <span className="relative z-10 font-tech font-black text-xl tracking-[0.15em] text-white group-hover:text-cyan-200 transition-colors flex items-center justify-center gap-3">
                             <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                             INITIALIZE
                             <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                         </span>
                     </motion.button>

                     <motion.button 
                        onClick={() => setScreen(GameScreen.SELECTION)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="text-slate-600 text-xs font-mono uppercase tracking-widest hover:text-cyan-500 transition-colors flex items-center gap-2"
                     >
                         <Beaker size={12} /> TEST DEPLOY
                     </motion.button>
                 </div>
             </div>
         </div>
      )}

      {screen === GameScreen.SELECTION && (
          <BirdSelection onSelect={handleTestStart} />
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
            onBatchSalvageGems={handleBatchSalvageGems}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onAssignHunter={handleAssignHunter}
            onRecallHunter={handleRecallHunter}
            onKeepBird={handleKeepBird}
            onReleaseBird={handleReleaseBird}
            initialTab={initialHubTab}
            onSocketGem={handleSocketGem}
            onUnsocketGem={handleUnsocketGem}
            onUseConsumable={handleUseConsumable}
            onClaimAchievement={handleClaimAchievement}
            onBuyAPUpgrade={handleBuyAPUpgrade}
            onUnlockFeature={handleUnlockFeature}
            currentZone={selectedZone}
            onSelectZone={setSelectedZone}
          />
      )}

      {/* Battle and Catch Screens - Unchanged */}
      {screen === GameScreen.BATTLE && (
          <BattleArena 
            key={battleKey}
            playerBirdInstance={playerState.birds.find(b => b.instanceId === playerState.selectedBirdId)!}
            enemyLevel={selectedZone}
            highestZone={playerState.highestZone}
            onBattleComplete={handleBattleComplete}
            activeBuffs={playerState.activeBuffs}
            apShop={playerState.apShop}
            currentZoneProgress={playerState.currentZoneProgress}
            requiredRarities={getRequiredRarities(playerState.highestZone)}
            gemUnlocked={playerState.unlocks.gemCrafting}
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

      {/* Unlock Modal - Unchanged */}
      <AnimatePresence>
          {unlockModalZone && unlockInfo && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
              >
                  <motion.div 
                    initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                    className="bg-slate-900 border-2 border-cyan-500/50 p-8 rounded-2xl max-w-md w-full relative flex flex-col items-center shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                  >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                      <Unlock size={48} className="text-cyan-400 mb-4 animate-pulse" />
                      <h2 className="font-tech text-3xl text-white mb-1 uppercase tracking-widest text-center">
                          ZONE {unlockModalZone} CLEARED
                      </h2>
                      <div className="text-cyan-500 font-bold text-sm mb-6 uppercase tracking-wider">New Protocols Available</div>
                      <div className="bg-slate-950/80 p-6 rounded-xl border border-slate-800 w-full mb-6">
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                              {unlockInfo.title}
                          </h3>
                          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                              {unlockInfo.desc}
                          </p>
                          <div className="flex gap-4 border-t border-slate-800 pt-4">
                              <div className={`flex items-center gap-2 font-mono font-bold ${playerState.feathers >= unlockInfo.cost.f ? 'text-white' : 'text-rose-500'}`}>
                                  <Database size={16} className="text-cyan-500" />
                                  {unlockInfo.cost.f}
                              </div>
                              <div className={`flex items-center gap-2 font-mono font-bold ${playerState.scrap >= unlockInfo.cost.s ? 'text-white' : 'text-rose-500'}`}>
                                  <Hammer size={16} className="text-slate-400" />
                                  {unlockInfo.cost.s}
                              </div>
                          </div>
                      </div>
                      <div className="flex flex-col gap-3 w-full">
                          <Button 
                              size="lg" 
                              fullWidth 
                              disabled={playerState.feathers < unlockInfo.cost.f || playerState.scrap < unlockInfo.cost.s}
                              onClick={() => handleUnlockFeature(unlockInfo.feature)}
                              className="animate-pulse"
                          >
                              PURCHASE UPGRADE <ArrowRight className="ml-2" size={18} />
                          </Button>
                          <Button 
                              size="md" 
                              variant="ghost" 
                              fullWidth 
                              onClick={() => setUnlockModalZone(null)}
                          >
                              CLOSE
                          </Button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
