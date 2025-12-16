
import { useState, useEffect, useRef } from 'react';
import { PlayerState, BirdInstance, BattleResult, GearType, Gear, Rarity, UpgradeState, Gem, ConsumableType, Consumable, Bird, APShopState, UnlocksState, ZoneClearReward, StatType } from '../types';
import { INITIAL_PLAYER_STATE, XP_TABLE, UPGRADE_COSTS, generateCraftedGear, RARITY_CONFIG, UPGRADE_DEFINITIONS, generateCraftedGem, CONSUMABLE_STATS, rollRarity, BIRD_TEMPLATES, generateBird, ACHIEVEMENTS, AP_SHOP_ITEMS } from '../constants';
import { loadGame, saveGame, resetGame } from '../utils/persistence';

export const useGameLogic = () => {
  const [playerState, setPlayerState] = useState<PlayerState>(() => loadGame());

  // Helper to determine required rarities for current zone
  const getRequiredRarities = (zone: number): Rarity[] => {
      if (zone === 1) return [Rarity.COMMON, Rarity.UNCOMMON];
      if (zone === 2) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE];
      if (zone === 3) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC];
      if (zone === 4) return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY];
      return [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];
  };

  const RARITY_ORDER = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];

  // Calculate Global Boost Multiplier from AP Shop Level
  const getAPBoostMult = (level: number, perLevel = 2) => {
      return 1 + (level * (perLevel / 100));
  };

  // Passive Loop
  useEffect(() => {
    const interval = setInterval(() => {
       setPlayerState(prev => {
           const huntBuffIndex = prev.activeBuffs.findIndex(b => b.type === ConsumableType.HUNTING_SPEED);
           let multiplier = 1.0;
           let newActiveBuffs = [...prev.activeBuffs];

           if (huntBuffIndex !== -1) {
               multiplier = newActiveBuffs[huntBuffIndex].multiplier;
               newActiveBuffs[huntBuffIndex].remaining -= 1; 
               if (newActiveBuffs[huntBuffIndex].remaining <= 0) {
                   newActiveBuffs.splice(huntBuffIndex, 1);
               }
           }

           let totalIncome = 0;
           let totalDiamondChance = 0;
           let totalItemChance = 0;
           let totalGemChance = 0;
           let extraScrap = 0;
           let birdsUpdated = false;
           
           const updatedBirds = prev.birds.map(bird => {
               if (prev.huntingBirdIds.includes(bird.instanceId)) {
                   const rarityMult = RARITY_CONFIG[bird.rarity].minMult;
                   // Updated leveling bonus to 0.5 (50%) per level
                   let baseIncome = (bird.huntingConfig.baseRate * rarityMult) * (1 + (bird.level * 0.5));
                   baseIncome *= multiplier;

                   if (bird.id === 'hummingbird') {
                        if (Math.random() < 0.10) baseIncome *= 2;
                   } else if (bird.id === 'hawk') {
                        if (Math.random() < 0.05) extraScrap += 1;
                   } else if (bird.id === 'owl') {
                        baseIncome *= 1.1;
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
                                return { ...bird, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext };
                            }
                        }
                   }
                   
                   if (bird.id === 'vulture') {
                       totalItemChance += 0.02;
                   }

                   let bonusPct = 0;
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
           saveGame(newState);
           return newState;
       });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS ---

  const handleResetData = () => {
      resetGame();
      setPlayerState(JSON.parse(JSON.stringify(INITIAL_PLAYER_STATE)));
  };

  const handleReportCatchStats = (isPerfect: boolean) => {
      setPlayerState(ps => ({
          ...ps,
          lifetimeStats: {
              ...ps.lifetimeStats,
              maxPerfectCatchStreak: isPerfect 
                ? Math.max(ps.lifetimeStats.maxPerfectCatchStreak, (ps.lifetimeStats.maxPerfectCatchStreak || 0) + 1)
                : ps.lifetimeStats.maxPerfectCatchStreak
          }
      }));
  };

  const handleTestStart = (bird: Bird, mode: 'god' | 'standard' = 'god') => {
      const template = BIRD_TEMPLATES.find(t => t.id === bird.id);
      if (!template) return;
      
      const rarity = mode === 'standard' ? Rarity.UNCOMMON : Rarity.MYTHIC;
      const newBird = generateBird(template, rarity);
      
      setPlayerState(prev => {
          if (mode === 'standard') {
              return {
                  ...INITIAL_PLAYER_STATE, 
                  birds: [newBird],
                  selectedBirdId: newBird.instanceId,
                  feathers: 100, 
                  scrap: 10,
              };
          }

          const newConsumables = [...prev.inventory.consumables];
          const testItems = [
              { type: ConsumableType.HUNTING_SPEED, rarity: Rarity.COMMON },
              { type: ConsumableType.HUNTING_SPEED, rarity: Rarity.UNCOMMON },
              { type: ConsumableType.HUNTING_SPEED, rarity: Rarity.RARE },
              { type: ConsumableType.BATTLE_REWARD, rarity: Rarity.COMMON },
              { type: ConsumableType.BATTLE_REWARD, rarity: Rarity.UNCOMMON },
              { type: ConsumableType.BATTLE_REWARD, rarity: Rarity.RARE }
          ];
          testItems.forEach(item => {
              newConsumables.push({ type: item.type, rarity: item.rarity, count: 3 });
          });

          return {
              ...prev,
              birds: [...prev.birds, newBird],
              selectedBirdId: newBird.instanceId,
              feathers: prev.feathers + 5000, 
              scrap: prev.scrap + 1000,
              diamonds: prev.diamonds + 100,
              inventory: { ...prev.inventory, consumables: newConsumables },
              lifetimeStats: { ...prev.lifetimeStats, totalCatches: prev.lifetimeStats.totalCatches + 1 }
          };
      });
  };

  // Called when the "Zone Cleared" popup appears to grant rewards AND handle progression immediately
  const handleZoneSuccess = (reward: ZoneClearReward, clearedZoneNumber: number) => {
      setPlayerState(prev => {
          // Check if this is a new progression (avoid double increment if called multiple times)
          const isProgression = clearedZoneNumber === prev.highestZone;
          const newHighestZone = isProgression ? prev.highestZone + 1 : prev.highestZone;
          
          const newInventory = { ...prev.inventory };
          if (reward.consumable) {
              const existingIdx = newInventory.consumables.findIndex(c => c.type === reward.consumable!.type && c.rarity === reward.consumable!.rarity);
              if (existingIdx !== -1) {
                  newInventory.consumables[existingIdx].count += reward.consumable.count;
              } else {
                  newInventory.consumables.push(reward.consumable);
              }
          }

          return {
              ...prev,
              feathers: prev.feathers + reward.feathers,
              scrap: prev.scrap + reward.scrap,
              highestZone: newHighestZone,
              currentZoneProgress: isProgression ? [] : prev.currentZoneProgress, // Reset progress if advanced
              inventory: newInventory,
              lifetimeStats: {
                  ...prev.lifetimeStats,
                  totalFeathers: prev.lifetimeStats.totalFeathers + reward.feathers,
                  totalScrap: prev.lifetimeStats.totalScrap + reward.scrap,
                  highestZoneReached: Math.max(prev.lifetimeStats.highestZoneReached, newHighestZone)
              }
          };
      });
  };

  const handleBattleComplete = (result: BattleResult, selectedZone: number): { pendingZoneUnlock: number | null, shouldAdvanceZone: boolean } => {
      let newHighestZone = playerState.highestZone;
      let newZoneProgress = [...playerState.currentZoneProgress];
      let pendingZoneUnlock: number | null = null;
      let shouldAdvanceZone = false;

      if (result.winner === 'player') {
          // Only check for zone progression if the selected zone MATCHES the current highest zone.
          // If handleZoneSuccess already ran, highestZone will be selectedZone + 1, so this block safely skips.
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
                  newZoneProgress = [];
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

          let newFeathers = prev.feathers + result.rewards.feathers;
          let newScrap = prev.scrap + result.rewards.scrap;
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

      return { pendingZoneUnlock, shouldAdvanceZone };
  };

  const handleApplyLevelUpReward = (birdId: string, stat: StatType, value: number) => {
      setPlayerState(prev => {
          const birdIndex = prev.birds.findIndex(b => b.instanceId === birdId);
          if (birdIndex === -1) return prev;
          
          const bird = { ...prev.birds[birdIndex] };
          
          if (stat === 'HP') bird.baseHp += value;
          else if (stat === 'NRG') bird.baseEnergy += value;
          else if (stat === 'ATK') bird.baseAttack += value;
          else if (stat === 'DEF') bird.baseDefense += value;
          else if (stat === 'SPD') bird.baseSpeed += value;
          
          const newBirds = [...prev.birds];
          newBirds[birdIndex] = bird;
          
          return { ...prev, birds: newBirds };
      });
  };

  const handleUpgrade = (type: keyof UpgradeState | 'recruit'): boolean => {
      if (type === 'recruit') {
           setPlayerState(prev => {
               if (prev.feathers < UPGRADE_COSTS.RECRUIT) return prev;
               return { ...prev, feathers: prev.feathers - UPGRADE_COSTS.RECRUIT };
           });
           return playerState.feathers >= UPGRADE_COSTS.RECRUIT;
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
                  upgrades: { ...prev.upgrades, [type]: currentLevel + 1 }
              };
          });
      }
      return false;
  };

  const handleKeepBird = (newBird: BirdInstance) => {
      setPlayerState(prev => ({
          ...prev,
          birds: [...prev.birds, newBird],
          selectedBirdId: prev.birds.length === 0 ? newBird.instanceId : prev.selectedBirdId,
          lifetimeStats: { ...prev.lifetimeStats, totalCatches: prev.lifetimeStats.totalCatches + 1 }
      }));
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
  };

  const handleTryCraft = (type: GearType): Gear | null => {
      const featherCost = UPGRADE_COSTS.CRAFT_GEAR;
      const scrapCost = UPGRADE_COSTS.CRAFT_SCRAP;
      
      // Initial check for immediate feedback (though state setter is the source of truth)
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      let success = false;
      setPlayerState(prev => {
          if (prev.feathers < featherCost || prev.scrap < scrapCost) return prev;
          success = true;
          return {
              ...prev,
              feathers: prev.feathers - featherCost,
              scrap: prev.scrap - scrapCost,
              lifetimeStats: { ...prev.lifetimeStats, totalCrafts: prev.lifetimeStats.totalCrafts + 1 }
          };
      });

      return generateCraftedGear(type, playerState.upgrades.craftRarityLevel);
  };

  const handleTryCraftGem = (): Gem | null => {
      const featherCost = UPGRADE_COSTS.CRAFT_GEM;
      const scrapCost = UPGRADE_COSTS.CRAFT_GEM_SCRAP;
      if (playerState.feathers < featherCost || playerState.scrap < scrapCost) return null;

      setPlayerState(prev => {
          if (prev.feathers < featherCost || prev.scrap < scrapCost) return prev;
          return {
              ...prev,
              feathers: prev.feathers - featherCost,
              scrap: prev.scrap - scrapCost,
              lifetimeStats: { ...prev.lifetimeStats, totalCrafts: prev.lifetimeStats.totalCrafts + 1 }
          };
      });

      return generateCraftedGem(playerState.upgrades.gemRarityLevel);
  };

  const handleKeepGear = (gear: Gear) => {
      setPlayerState(prev => ({ ...prev, inventory: { ...prev.inventory, gear: [...prev.inventory.gear, gear] } }));
  };

  const handleKeepGem = (gem: Gem) => {
      setPlayerState(prev => ({ ...prev, inventory: { ...prev.inventory, gems: [...prev.inventory.gems, gem] } }));
  };

  const handleSalvageGear = (gear: Gear) => {
      const config = RARITY_CONFIG[gear.rarity];
      const refundFeathers = Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3);
      const refundScrap = Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult);

      setPlayerState(prev => {
          const invIndex = prev.inventory.gear.findIndex(g => g.id === gear.id);
          if (invIndex !== -1) {
              const newGear = [...prev.inventory.gear];
              newGear.splice(invIndex, 1);
              return {
                  ...prev,
                  feathers: prev.feathers + refundFeathers,
                  scrap: prev.scrap + refundScrap,
                  inventory: { ...prev.inventory, gear: newGear }
              };
          }
          let birdIndex = -1;
          let slot: 'beak' | 'claws' | null = null;
          for (let i = 0; i < prev.birds.length; i++) {
              if (prev.birds[i].gear.beak?.id === gear.id) { birdIndex = i; slot = 'beak'; break; }
              if (prev.birds[i].gear.claws?.id === gear.id) { birdIndex = i; slot = 'claws'; break; }
          }
          if (birdIndex !== -1 && slot) {
              const newBirds = [...prev.birds];
              newBirds[birdIndex] = {
                  ...newBirds[birdIndex],
                  gear: { ...newBirds[birdIndex].gear, [slot]: null }
              };
              return {
                  ...prev,
                  feathers: prev.feathers + refundFeathers,
                  scrap: prev.scrap + refundScrap,
                  birds: newBirds
              };
          }
          return { ...prev, feathers: prev.feathers + refundFeathers, scrap: prev.scrap + refundScrap };
      });
  };

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
                   inventory: { ...prev.inventory, gems: newGems }
               };
           }
           return prev;
      });
  };

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

  const handleSocketGem = (gearId: string, gemId: string, socketIndex: number) => {
      setPlayerState(prev => {
          let gearIndex = prev.inventory.gear.findIndex(g => g.id === gearId);
          let targetGear = gearIndex !== -1 ? prev.inventory.gear[gearIndex] : null;
          let birdIndex = -1;
          let gearSlot: 'beak' | 'claws' | null = null;

          if (!targetGear) {
              for (let i = 0; i < prev.birds.length; i++) {
                  if (prev.birds[i].gear.beak?.id === gearId) { birdIndex = i; gearSlot = 'beak'; targetGear = prev.birds[i].gear.beak; break; }
                  if (prev.birds[i].gear.claws?.id === gearId) { birdIndex = i; gearSlot = 'claws'; targetGear = prev.birds[i].gear.claws; break; }
              }
          }

          if (!targetGear) return prev;

          const gemIndex = prev.inventory.gems.findIndex(g => g.id === gemId);
          if (gemIndex === -1) return prev;
          const gem = prev.inventory.gems[gemIndex];

          const newGemInventory = [...prev.inventory.gems];
          newGemInventory.splice(gemIndex, 1);
          
          const newSockets = [...targetGear.sockets];
          if (newSockets[socketIndex]) newGemInventory.push(newSockets[socketIndex]!);
          newSockets[socketIndex] = gem;

          const newGear = { ...targetGear, sockets: newSockets };
          
          if (birdIndex !== -1 && gearSlot) {
              const newBirds = [...prev.birds];
              newBirds[birdIndex] = {
                  ...newBirds[birdIndex],
                  gear: { ...newBirds[birdIndex].gear, [gearSlot]: newGear }
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
      setPlayerState(prev => {
          let gearIndex = prev.inventory.gear.findIndex(g => g.id === gearId);
          let targetGear = gearIndex !== -1 ? prev.inventory.gear[gearIndex] : null;
          let birdIndex = -1;
          let gearSlot: 'beak' | 'claws' | null = null;

          if (!targetGear) {
              for (let i = 0; i < prev.birds.length; i++) {
                  if (prev.birds[i].gear.beak?.id === gearId) { birdIndex = i; gearSlot = 'beak'; targetGear = prev.birds[i].gear.beak; break; }
                  if (prev.birds[i].gear.claws?.id === gearId) { birdIndex = i; gearSlot = 'claws'; targetGear = prev.birds[i].gear.claws; break; }
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
               newBirds[birdIndex] = { ...newBirds[birdIndex], gear: { ...newBirds[birdIndex].gear, [gearSlot]: newGear } };
               return { ...prev, birds: newBirds, inventory: { ...prev.inventory, gems: newGemInventory } };
          } else {
              const newGearInventory = [...prev.inventory.gear];
              newGearInventory[gearIndex] = newGear;
              return { ...prev, inventory: { ...prev.inventory, gear: newGearInventory, gems: newGemInventory } };
          }
      });
  };

  const handleAssignHunter = (birdId: string) => {
      setPlayerState(prev => ({ ...prev, huntingBirdIds: [...prev.huntingBirdIds, birdId] }));
  };

  const handleRecallHunter = (birdId: string) => {
      setPlayerState(prev => ({ ...prev, huntingBirdIds: prev.huntingBirdIds.filter(id => id !== birdId) }));
  };

  const handleUseConsumable = (type: ConsumableType, rarity: Rarity) => {
      setPlayerState(prev => {
          const activeBuffIndex = prev.activeBuffs.findIndex(b => b.type === type);
          const activeBuff = activeBuffIndex !== -1 ? prev.activeBuffs[activeBuffIndex] : null;
          if (activeBuff && activeBuff.rarity !== rarity) return prev;

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
          
          if (activeBuff) {
              newActiveBuffs[activeBuffIndex] = { ...activeBuff, remaining: activeBuff.remaining + config.duration };
          } else {
              newActiveBuffs.push({ type, rarity, multiplier: config.mult, remaining: config.duration });
          }

          return {
              ...prev,
              inventory: { ...prev.inventory, consumables: newConsumables },
              activeBuffs: newActiveBuffs
          };
      });
  };

  const handleClaimAchievement = (id: string, stageIndex: number) => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (!achievement || !achievement.stages[stageIndex]) return;
      const stageId = `${id}_stage_${stageIndex}`;
      if (playerState.completedAchievementIds.includes(stageId)) return;

      const reward = achievement.stages[stageIndex].apReward;
      setPlayerState(prev => ({
          ...prev,
          ap: prev.ap + reward,
          completedAchievementIds: [...prev.completedAchievementIds, stageId]
      }));
  };

  const handleBuyAPUpgrade = (id: keyof APShopState) => {
      const item = AP_SHOP_ITEMS.find(i => i.id === id);
      if (!item) return;

      setPlayerState(prev => {
          const currentLevel = prev.apShop[id] || 0;
          const cost = item.baseCost + (currentLevel * item.costScale);
          // Atomic check prevents negative AP
          if (prev.ap < cost) return prev;

          return {
              ...prev,
              ap: prev.ap - cost,
              apShop: { ...prev.apShop, [id]: currentLevel + 1 }
          };
      });
  };

  const handleUnlockFeature = (feature: keyof UnlocksState) => {
      let costFeathers = 0;
      let costScrap = 0;

      if (feature === 'workshop') { costFeathers = 50; costScrap = 10; } 
      else if (feature === 'clawCrafting') { costFeathers = 100; costScrap = 25; } 
      else if (feature === 'gemCrafting') { costFeathers = 500; costScrap = 100; } 
      else if (feature === 'upgrades') { costFeathers = 1000; costScrap = 200; } 
      else if (feature === 'achievements') { costFeathers = 0; costScrap = 0; }

      // Initial check for immediate UI feedback
      if (playerState.feathers < costFeathers || playerState.scrap < costScrap) return false;

      setPlayerState(prev => {
          // Atomic check inside setter to prevent race conditions causing negative balance
          if (prev.feathers < costFeathers || prev.scrap < costScrap) return prev;
          // Prevent double unlock
          if (prev.unlocks[feature]) return prev;

          const newState = {
              ...prev,
              feathers: prev.feathers - costFeathers,
              scrap: prev.scrap - costScrap,
              unlocks: { ...prev.unlocks, [feature]: true }
          };
          if (feature === 'achievements') {
              newState.achievementBaselines = { ...prev.lifetimeStats };
              newState.lifetimeStats = { ...prev.lifetimeStats, systemUnlocked: 1 };
          }
          return newState;
      });
      return true;
  };

  return {
      playerState,
      setPlayerState,
      actions: {
          handleResetData,
          handleReportCatchStats,
          handleTestStart,
          handleZoneSuccess,
          handleBattleComplete,
          handleApplyLevelUpReward,
          handleUpgrade,
          handleKeepBird,
          handleReleaseBird,
          handleTryCraft,
          handleTryCraftGem,
          handleKeepGear,
          handleKeepGem,
          handleSalvageGear,
          handleSalvageGem,
          handleBatchSalvageGems,
          handleEquip,
          handleUnequip,
          handleSocketGem,
          handleUnsocketGem,
          handleAssignHunter,
          handleRecallHunter,
          handleUseConsumable,
          handleClaimAchievement,
          handleBuyAPUpgrade,
          handleUnlockFeature,
          getRequiredRarities
      }
  };
};
