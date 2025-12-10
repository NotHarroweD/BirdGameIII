
import React, { useState, useEffect } from 'react';
import { Hub } from './components/Hub';
import { BattleArena } from './components/BattleArena';
import { CatchScreen } from './components/CatchScreen';
import { PlayerState, GameScreen, BirdInstance, BattleResult, GearType, HubTab, Gear, Rarity, UpgradeState, GearBuff, Gem, ConsumableType, Consumable } from './types';
import { INITIAL_PLAYER_STATE, XP_TABLE, UPGRADE_COSTS, generateCraftedGear, RARITY_CONFIG, UPGRADE_DEFINITIONS, generateCraftedGem, CONSUMABLE_STATS, rollRarity } from './constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
  const [initialHubTab, setInitialHubTab] = useState<HubTab>(HubTab.MAP);
  const [battleKey, setBattleKey] = useState(0);

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
                });
            }
            // Ensure new fields exist
            if (!parsed.upgrades.gemRarityLevel) {
                parsed.upgrades.gemRarityLevel = 0;
            }
            if (!parsed.activeBuffs) {
                parsed.activeBuffs = [];
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
           if (totalGemChance > 0 && Math.random() < (totalGemChance * multiplier)) {
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
               activeBuffs: newActiveBuffs
           };
           localStorage.setItem('bird_game_save_v7', JSON.stringify(newState));
           return newState;
       });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
     // Safety check for invalid state (e.g. invalid bird reference)
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
          
          // Apply Battle Reward Buffs Logic handled in BattleArena calculation for display
          // Here we just accept the result values, but we need to decrement the buff duration
          let newActiveBuffs = [...prev.activeBuffs];
          const rewardBuffIndex = newActiveBuffs.findIndex(b => b.type === ConsumableType.BATTLE_REWARD);
          
          // Decrement Battle Reward buff if player won and had buff
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
              // Add consumable logic: check if exists, increment count, or push new
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
              highestZone: result.winner === 'player' ? Math.max(prev.highestZone, prev.highestZone) : prev.highestZone, 
              birds: updatedBirds,
              inventory: newInventory,
              activeBuffs: newActiveBuffs
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

          // Case: Item not in inventory or birds (e.g. Salvage from Lab/Loot directly)
          // Just refund the values
          return {
              ...prev,
              feathers: prev.feathers + refundFeathers,
              scrap: prev.scrap + refundScrap
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

  const handleUseConsumable = (type: ConsumableType, rarity: Rarity) => {
      setPlayerState(prev => {
          const invIdx = prev.inventory.consumables.findIndex(c => c.type === type && c.rarity === rarity);
          if (invIdx === -1) return prev;
          
          // Remove item
          const newConsumables = [...prev.inventory.consumables];
          if (newConsumables[invIdx].count > 1) {
              newConsumables[invIdx].count -= 1;
          } else {
              newConsumables.splice(invIdx, 1);
          }

          // Apply Buff
          const config = CONSUMABLE_STATS[type].stats[rarity];
          const newActiveBuffs = [...prev.activeBuffs];
          const activeIdx = newActiveBuffs.findIndex(b => b.type === type);
          
          // If buff exists, replace it (or extend? prompt implies 'makes ticks faster for next X ticks', usually replace)
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

  return (
    <div className="bg-slate-950 text-white font-sans overflow-x-hidden">
      {screen === GameScreen.MENU && (
         <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden select-none touch-none">
             
             {/* --- BACKGROUND DECOR --- */}
             <div className="absolute inset-0 z-0 pointer-events-none">
                 {/* Deep Space Gradient */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)] opacity-80" />
                 
                 {/* Hex Grid */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')] opacity-[0.03]" />
                 
                 {/* Rotating Rings */}
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(120vw,800px)] h-[min(120vw,800px)] opacity-30">
                     <motion.div 
                        className="w-full h-full rounded-full border border-cyan-500/10 border-dashed"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                     />
                 </div>
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,600px)] h-[min(90vw,600px)] opacity-40">
                    <motion.div 
                        className="w-full h-full rounded-full border border-cyan-500/20"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    />
                 </div>
                 
                 {/* Scanlines */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10 opacity-20" />
             </div>

             {/* --- MAIN CONTENT CENTERED --- */}
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
                        
                        {/* Glitch Effect Layer 1 */}
                        <motion.div 
                            className="absolute inset-0 text-7xl md:text-9xl font-tech font-black tracking-tighter text-cyan-500 text-center leading-[0.8] opacity-60 mix-blend-screen pointer-events-none z-[-1]"
                            animate={{ x: [-2, 3, -1, 0], opacity: [0, 0.8, 0] }}
                            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                        >
                            BIRD<br/>GAME
                        </motion.div>
                        
                         {/* Glitch Effect Layer 2 */}
                        <motion.div 
                            className="absolute inset-0 text-7xl md:text-9xl font-tech font-black tracking-tighter text-rose-500 text-center leading-[0.8] opacity-60 mix-blend-screen pointer-events-none z-[-1]"
                            animate={{ x: [2, -3, 1, 0], opacity: [0, 0.8, 0] }}
                            transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 4 }}
                        >
                            BIRD<br/>GAME
                        </motion.div>
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

                 {/* Spacer for Mobile */}
                 <div className="flex-[0.5] md:hidden" />

                 {/* BUTTON */}
                 <div className="w-full flex justify-center mb-12 md:mb-0">
                     <motion.button 
                        onClick={handleStart} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 1.2 }}
                        className="group relative w-full max-w-[280px] h-16 bg-transparent"
                     >
                         {/* High Tech Button Frame */}
                         <svg className="absolute inset-0 w-full h-full text-slate-800 group-hover:text-cyan-900/40 transition-colors duration-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]" viewBox="0 0 280 64" fill="currentColor">
                             <path d="M20,0 L260,0 L280,20 L280,44 L260,64 L20,64 L0,44 L0,20 Z" fillOpacity="0.8" />
                             <path d="M20,2 L260,2 L278,20 L278,44 L260,62 L20,62 L2,44 L2,20 Z" fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                         </svg>

                         <span className="relative z-10 font-tech font-black text-xl tracking-[0.15em] text-white group-hover:text-cyan-200 transition-colors flex items-center justify-center gap-3">
                             <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                             INITIALIZE
                             <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                         </span>
                         
                         {/* Moving Shine */}
                         <div className="absolute inset-0 overflow-hidden rounded-lg opacity-30 pointer-events-none">
                            <motion.div 
                                className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                                animate={{ left: ["-100%", "200%"] }}
                                transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }}
                            />
                         </div>
                     </motion.button>
                 </div>

             </div>

             {/* FOOTER STATUS */}
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-[9px] font-mono text-cyan-900 pointer-events-none"
             >
                <span>SYS.VER.3.1.2</span>
                <span className="animate-pulse text-emerald-900">ONLINE</span>
                <span>SECURE.CONN</span>
             </motion.div>

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
            onUseConsumable={handleUseConsumable}
          />
      )}

      {screen === GameScreen.BATTLE && (
          <BattleArena 
            key={battleKey}
            playerBirdInstance={playerState.birds.find(b => b.instanceId === playerState.selectedBirdId)!}
            enemyLevel={playerState.highestZone} 
            onBattleComplete={handleBattleComplete}
            activeBuffs={playerState.activeBuffs}
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
