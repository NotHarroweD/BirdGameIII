
import React, { useState, useRef, useEffect } from 'react';
import { Hub } from './Hub';
import { BattleArena } from './BattleArena';
import { CatchScreen } from './CatchScreen';
import { BirdSelection } from './BirdSelection';
import { GameScreen, HubTab, UpgradeState, Bird, UnlocksState, ZoneClearReward, ConsumableType } from '../types';
import { INITIAL_PLAYER_STATE, UPGRADE_COSTS, RARITY_CONFIG, CONSUMABLE_STATS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Lock, Unlock, Database, Hammer, ArrowRight, Beaker, Trash2, AlertTriangle, Swords, Wind, Clock, Award, Map, Zap, User } from 'lucide-react';
import { useGameLogic } from '../hooks/useGameLogic';
import { getSlotPreview, SlotPreview } from '../utils/persistence';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
  const [initialHubTab, setInitialHubTab] = useState<HubTab>(HubTab.MAP);
  const [battleKey, setBattleKey] = useState(0);
  const [unlockModalZone, setUnlockModalZone] = useState<number | null>(null);
  const [zoneReward, setZoneReward] = useState<ZoneClearReward | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTestButton, setShowTestButton] = useState(false);
  const resetBtnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Custom Hook
  const { playerState, setPlayerState, activeSlot, loadSlot, actions } = useGameLogic();
  const [selectedZone, setSelectedZone] = useState<number>(playerState.highestZone);
  const [previews, setPreviews] = useState<Record<number, SlotPreview | null>>({ 1: null, 2: null });

  // Load previews whenever returning to menu or updating slot
  useEffect(() => {
    if (screen === GameScreen.MENU) {
        setPreviews({
            1: getSlotPreview(1),
            2: getSlotPreview(2)
        });
    }
  }, [screen]);

  // Sync selected zone if highest zone increases or resets
  useEffect(() => {
      if (selectedZone > playerState.highestZone) {
          setSelectedZone(playerState.highestZone);
      }
  }, [playerState.highestZone, selectedZone]);

  const handleStart = (slot: number) => {
     loadSlot(slot);
     const slotData = getSlotPreview(slot);
     if (!slotData || slotData.birds.length === 0) {
         setScreen(GameScreen.CATCH); 
     } else {
         setScreen(GameScreen.HUB);
     }
  };

  const handleResetData = () => {
      actions.handleResetData();
      setShowResetConfirm(false);
      // Refresh previews
      setPreviews(prev => ({ ...prev, [activeSlot]: null }));
  };

  const handleTestStart = (bird: Bird, mode: 'god' | 'standard') => {
      actions.handleTestStart(bird, mode);
      setInitialHubTab(HubTab.MAP);
      setScreen(GameScreen.HUB);
  };

  const handleReportBattleResults = (result: any) => {
      const outcome = actions.handleBattleComplete(result, selectedZone);
      if (outcome.pendingZoneUnlock) {
          setSelectedZone(outcome.pendingZoneUnlock);
      }
  };

  const handleBattleExit = (playAgain: boolean) => {
      if (playAgain) {
          setBattleKey(prev => prev + 1);
          setScreen(GameScreen.BATTLE);
      } else {
          setInitialHubTab(HubTab.MAP);
          setScreen(GameScreen.HUB);
      }
  };

  const handleZoneCleared = (reward: ZoneClearReward) => {
      setZoneReward(reward);
      actions.handleZoneSuccess(reward, selectedZone);
      setUnlockModalZone(selectedZone + 1);
  };

  const handleUpgrade = (type: keyof UpgradeState | 'recruit') => {
      const success = actions.handleUpgrade(type);
      if (success && type === 'recruit') {
           setScreen(GameScreen.CATCH);
      }
  };

  const handleUnlockFeature = (feature: keyof UnlocksState) => {
      const success = actions.handleUnlockFeature(feature);
      if (success && unlockModalZone !== null) {
          const featureMap: Partial<Record<keyof UnlocksState, HubTab>> = {
              'workshop': HubTab.LAB,
              'clawCrafting': HubTab.LAB,
              'gemCrafting': HubTab.LAB,
              'upgrades': HubTab.UPGRADES,
              'achievements': HubTab.ACHIEVEMENTS
          };
          const targetTab = featureMap[feature];
          if (targetTab) {
              setInitialHubTab(targetTab);
              setScreen(GameScreen.HUB);
          }
          if (unlockModalZone > selectedZone) {
              setSelectedZone(unlockModalZone);
          }
          setUnlockModalZone(null);
          setZoneReward(null);
      }
  };

  const handleKeepBird = (bird: any) => {
      actions.handleKeepBird(bird);
      setInitialHubTab(HubTab.ROSTER);
      setScreen(GameScreen.HUB);
  };

  const handleReleaseBird = (bird: any) => {
      actions.handleReleaseBird(bird);
      if (screen === GameScreen.CATCH) {
          setInitialHubTab(HubTab.LAB);
          setScreen(GameScreen.HUB);
      }
  };

  const handleCloseUnlockModal = () => {
      if (unlockModalZone && unlockModalZone > selectedZone) {
          setSelectedZone(unlockModalZone);
      }
      setUnlockModalZone(null);
      setZoneReward(null);
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

  const handleResetDown = () => {
      resetBtnTimerRef.current = setTimeout(() => {
          setShowTestButton(true);
          if (navigator.vibrate) navigator.vibrate(100);
      }, 2000);
  };

  const handleResetUp = () => {
      if (resetBtnTimerRef.current) {
          clearTimeout(resetBtnTimerRef.current);
          resetBtnTimerRef.current = null;
      }
  };

  const hasAnySave = previews[1] !== null || previews[2] !== null;

  return (
    <div className="bg-slate-900 text-white font-sans overflow-x-hidden relative">
      {screen === GameScreen.MENU && (
         <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden select-none">
             {/* Background Particles Decor */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
             <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />

             <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-lg px-6 gap-8 md:gap-12">
                 {/* LOGO GROUP */}
                 <div className="flex flex-col items-center justify-center w-full">
                    <div className="relative mb-4 md:mb-6">
                         <h1 className="text-7xl md:text-8xl font-tech font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 text-center leading-[0.8] drop-shadow-2xl">
                            BIRD<br/>GAME
                        </h1>
                    </div>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-4 w-full"
                    >
                         <div className="flex items-center gap-4 w-full justify-center opacity-80">
                            <div className="h-[1px] bg-gradient-to-l from-cyan-500/50 to-transparent w-16" />
                            <span className="font-tech text-3xl text-cyan-400 font-bold tracking-[0.2em] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">III</span>
                            <div className="h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent w-16" />
                         </div>
                         <p className="font-mono text-[10px] text-slate-400 tracking-[0.3em] uppercase">Tactical Avian Combat</p>
                    </motion.div>
                 </div>

                 {/* SAVE SLOTS UI */}
                 {!hasAnySave ? (
                    <div className="w-full flex flex-col items-center gap-6">
                        <Button 
                            size="xl" 
                            onClick={() => handleStart(1)} 
                            className="w-full max-w-[320px] h-20 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-in fade-in zoom-in duration-700 delay-700"
                        >
                            <span className="text-xl tracking-widest flex items-center gap-3">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                INITIALIZE
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                            </span>
                        </Button>
                        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase opacity-50">System Offline // Create Data Profile</p>
                    </div>
                 ) : (
                    <div className="w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] text-center mb-2">Select Command Profile</div>
                        
                        {[1, 2].map(slot => {
                            const preview = previews[slot];
                            return (
                                <motion.div 
                                    key={slot}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleStart(slot)}
                                    className={`
                                        w-full p-4 md:p-5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group
                                        ${preview ? 'bg-slate-900 border-slate-700 hover:border-cyan-500 hover:shadow-cyan-500/20 shadow-xl' : 'bg-slate-950 border-slate-800 border-dashed hover:border-slate-600'}
                                    `}
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                                <div className={`w-8 h-8 rounded bg-slate-800 flex items-center justify-center border ${preview ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-700 text-slate-600'}`}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Slot {slot}</div>
                                                    <div className={`font-tech text-lg font-bold leading-none ${preview ? 'text-white' : 'text-slate-700 italic'}`}>
                                                        {preview ? `COMMANDER` : 'EMPTY PROFILE'}
                                                    </div>
                                                </div>
                                            </div>

                                            {preview && (
                                                <div className="flex gap-2 flex-wrap mt-3 md:mt-4">
                                                    {preview.birds.map((b, i) => (
                                                        <div key={i} className={`flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded border ${RARITY_CONFIG[b.rarity].borderColor} group-hover:scale-105 transition-transform`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${RARITY_CONFIG[b.rarity].color.replace('text-', 'bg-')}`} />
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black uppercase leading-none text-white">{b.species.split(' ')[0]}</span>
                                                                <span className="text-[8px] font-mono text-slate-500 leading-none">LVL {b.level}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            {preview ? (
                                                <>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Status</div>
                                                    <div className="font-mono text-emerald-400 text-xs font-bold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">ONLINE</div>
                                                    <div className="mt-3 md:mt-4 flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1.5 text-cyan-500">
                                                            <Database size={10} /> <span className="text-[10px] font-mono font-bold">{preview.feathers.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-rose-500">
                                                            <Map size={10} /> <span className="text-[10px] font-mono font-bold">Z-{preview.highestZone}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-slate-900 group-hover:bg-cyan-900/30 text-slate-700 group-hover:text-cyan-400 text-[10px] font-black tracking-widest p-2 rounded-lg transition-colors border border-slate-800 group-hover:border-cyan-500/50 mt-1">
                                                    NEW START
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Slot Background Decoration */}
                                    {preview && (
                                        <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                            <Zap size={100} />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                 )}

                 <div className="w-full flex flex-col items-center gap-4">
                     <AnimatePresence>
                         {showTestButton && (
                             <motion.button 
                                onClick={() => setScreen(GameScreen.SELECTION)}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-slate-600 text-xs font-mono uppercase tracking-widest hover:text-cyan-500 transition-colors flex items-center gap-2"
                             >
                                 <Beaker size={12} /> TEST DEPLOY
                             </motion.button>
                         )}
                     </AnimatePresence>

                     <motion.button 
                        onClick={() => setShowResetConfirm(true)}
                        onPointerDown={handleResetDown}
                        onPointerUp={handleResetUp}
                        onPointerLeave={handleResetUp}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.6 }}
                        className="text-slate-800 text-[10px] font-mono uppercase tracking-[0.2em] hover:text-rose-700 transition-colors flex items-center gap-2 mt-2 select-none"
                     >
                         <Trash2 size={10} /> {hasAnySave ? "ERASE ACTIVE SLOT" : "PURGE SYSTEM CACHE"}
                     </motion.button>
                 </div>
             </div>
         </div>
      )}

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
          {showResetConfirm && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
              >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="bg-slate-900 border-2 border-rose-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl"
                  >
                      <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-tech text-white mb-2 uppercase">TERMINATE DATA?</h3>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                          This will permanently wipe all progress for <strong className="text-white">SLOT {activeSlot}</strong>. This operation is irreversible.
                      </p>
                      <div className="flex flex-col gap-3">
                          <Button fullWidth variant="danger" onClick={handleResetData}>CONFIRM WIPE</Button>
                          <Button fullWidth variant="ghost" onClick={() => setShowResetConfirm(false)}>CANCEL</Button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {screen === GameScreen.SELECTION && (
          <BirdSelection onSelect={handleTestStart} />
      )}

      {screen === GameScreen.HUB && (
          <Hub 
            playerState={playerState} 
            onBattle={() => setScreen(GameScreen.BATTLE)}
            onUpgrade={handleUpgrade}
            onSelectBird={(id) => setPlayerState(prev => ({...prev, selectedBirdId: id}))}
            onTryCraft={actions.handleTryCraft}
            onTryCraftGem={actions.handleTryCraftGem}
            onKeepGear={actions.handleKeepGear}
            onSalvageGear={actions.handleSalvageGear}
            onKeepGem={actions.handleKeepGem}
            onSalvageGem={actions.handleSalvageGem}
            onBatchSalvageGems={actions.handleBatchSalvageGems}
            onEquip={actions.handleEquip}
            onUnequip={actions.handleUnequip}
            onAssignHunter={actions.handleAssignHunter}
            onRecallHunter={actions.handleRecallHunter}
            onKeepBird={handleKeepBird}
            onReleaseBird={handleReleaseBird}
            initialTab={initialHubTab}
            onSocketGem={actions.handleSocketGem}
            onUnsocketGem={actions.handleUnsocketGem}
            onUseConsumable={actions.handleUseConsumable}
            onClaimAchievement={actions.handleClaimAchievement}
            onBuyAPUpgrade={actions.handleBuyAPUpgrade}
            onUnlockFeature={handleUnlockFeature}
            onApplyLevelUpReward={actions.handleApplyLevelUpReward}
            currentZone={selectedZone}
            onSelectZone={setSelectedZone}
          />
      )}

      {screen === GameScreen.BATTLE && (
          <BattleArena 
            key={battleKey}
            playerBirdInstance={playerState.birds.find(b => b.instanceId === playerState.selectedBirdId)!}
            enemyLevel={selectedZone}
            highestZone={playerState.highestZone}
            onReportResults={handleReportBattleResults}
            onBattleExit={handleBattleExit}
            onZoneCleared={handleZoneCleared}
            onApplyLevelUpReward={actions.handleApplyLevelUpReward}
            activeBuffs={playerState.activeBuffs}
            apShop={playerState.apShop}
            currentZoneProgress={playerState.currentZoneProgress}
            requiredRarities={actions.getRequiredRarities(playerState.highestZone)}
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
              onReportCatchStats={actions.handleReportCatchStats}
          />
      )}

      <AnimatePresence>
          {unlockModalZone && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
              >
                  <motion.div 
                    initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                    className="bg-slate-900 border-2 border-cyan-500/50 p-8 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                  >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                      <Unlock size={48} className="text-cyan-400 mb-4 animate-pulse" />
                      <h2 className="font-tech text-3xl text-white mb-1 uppercase tracking-widest text-center">
                          ZONE {unlockModalZone - 1} CLEARED
                      </h2>
                      
                      {zoneReward && (
                          <>
                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-full mb-4 flex justify-around">
                                  <div className="flex flex-col items-center">
                                      <div className="text-2xl font-mono text-cyan-400 font-bold">+{zoneReward.feathers}</div>
                                      <div className="text-[9px] text-slate-500 uppercase font-bold">Feathers</div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                      <div className="text-2xl font-mono text-slate-300 font-bold">+{zoneReward.scrap}</div>
                                      <div className="text-[9px] text-slate-500 uppercase font-bold">Scrap</div>
                                  </div>
                              </div>
                              
                              {zoneReward.consumable && (
                                  <div className={`w-full p-3 rounded-lg border-2 flex items-center gap-4 bg-slate-950/50 ${RARITY_CONFIG[zoneReward.consumable.rarity].borderColor} relative overflow-hidden mb-4 shadow-lg group`}>
                                      <div className={`absolute inset-0 bg-gradient-to-r ${RARITY_CONFIG[zoneReward.consumable.rarity].glowColor.replace('shadow-', 'from-')}/10 to-transparent pointer-events-none`} />
                                      <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-slate-900 rounded-full border border-white/10 shadow-inner">
                                           {zoneReward.consumable.type === ConsumableType.HUNTING_SPEED ? <Clock className={RARITY_CONFIG[zoneReward.consumable.rarity].color} size={20} /> : <Award className={RARITY_CONFIG[zoneReward.consumable.rarity].color} size={20} />}
                                      </div>
                                      <div className="relative z-10 flex-1 min-w-0">
                                          <div className={`font-bold font-tech text-sm truncate ${RARITY_CONFIG[zoneReward.consumable.rarity].color}`}>{CONSUMABLE_STATS[zoneReward.consumable.type].name}</div>
                                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Zone Reward</div>
                                      </div>
                                  </div>
                              )}
                          </>
                      )}

                      {unlockInfo && (
                          <>
                              <div className="text-cyan-500 font-bold text-sm mb-6 uppercase tracking-wider">New Protocols Available</div>
                              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 w-full mb-6">
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
                              </div>
                          </>
                      )}
                      
                      <div className="w-full mt-4">
                          <Button 
                              size="md" 
                              variant="ghost" 
                              fullWidth 
                              onClick={handleCloseUnlockModal}
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
