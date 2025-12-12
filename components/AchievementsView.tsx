
import React, { useState } from 'react';
import { PlayerState, APShopState, UnlocksState } from '../types';
import { ACHIEVEMENTS, AP_SHOP_ITEMS } from '../constants';
import { Button } from './Button';
import { Trophy, Award, Lock, CheckCircle, Database, Hammer, Gem, Briefcase, Hexagon, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementsViewProps {
  playerState: PlayerState;
  onClaimAchievement: (id: string) => void;
  onBuyAPUpgrade: (id: keyof APShopState) => void;
  onUnlockFeature?: (feature: keyof UnlocksState) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ playerState, onClaimAchievement, onBuyAPUpgrade }) => {
  const [activeTab, setActiveTab] = useState<'milestones' | 'shop'>('milestones');

  const completedSet = new Set(playerState.completedAchievementIds);

  const getProgress = (statKey: string) => {
      // @ts-ignore
      return playerState.lifetimeStats[statKey] || 0;
  };

  const getShopCost = (item: typeof AP_SHOP_ITEMS[0], currentLevel: number) => {
      return item.baseCost + (currentLevel * item.costScale);
  };

  // Sort: Claimable first, then Incomplete, then Claimed
  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
      const aProgress = getProgress(a.statKey);
      const bProgress = getProgress(b.statKey);
      const aComplete = completedSet.has(a.id);
      const bComplete = completedSet.has(b.id);
      const aReady = !aComplete && aProgress >= a.targetValue;
      const bReady = !bComplete && bProgress >= b.targetValue;

      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      if (!aComplete && bComplete) return -1;
      if (aComplete && !bComplete) return 1;
      return 0;
  });

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">
      <div className="text-center py-6">
          <h2 className="font-tech text-3xl text-white mb-2 drop-shadow-md">HALL OF GLORY</h2>
          <div className="flex justify-center items-center gap-2 mb-4">
              <div className="bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/50 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" />
                  <span className="font-mono font-bold text-amber-100">{playerState.ap} AP</span>
              </div>
          </div>

          <div className="flex justify-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800 inline-flex backdrop-blur-sm">
              <button 
                onClick={() => setActiveTab('milestones')} 
                className={`px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'milestones' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  Milestones
              </button>
              <button 
                onClick={() => setActiveTab('shop')} 
                className={`px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  AP Shop
              </button>
          </div>
      </div>

      {activeTab === 'milestones' && (
          <div className="space-y-3">
              {sortedAchievements.map(ach => {
                  const isCompleted = completedSet.has(ach.id);
                  const progress = getProgress(ach.statKey);
                  const isReady = !isCompleted && progress >= ach.targetValue;
                  const percentage = Math.min(100, (progress / ach.targetValue) * 100);

                  return (
                      <motion.div 
                        key={ach.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-slate-900 border ${isReady ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-slate-800'} p-4 rounded-lg flex items-center justify-between relative overflow-hidden`}
                      >
                          {isReady && <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />}
                          
                          <div className="flex-1 min-w-0 z-10 mr-4">
                              <div className="flex items-center gap-2 mb-1">
                                  {isCompleted ? <CheckCircle size={16} className="text-emerald-500" /> : <Lock size={16} className="text-slate-600" />}
                                  <div className={`font-bold font-tech text-sm ${isCompleted ? 'text-emerald-400' : isReady ? 'text-amber-100' : 'text-slate-300'}`}>
                                      {ach.name}
                                  </div>
                              </div>
                              <div className="text-xs text-slate-400 mb-2">{ach.description}</div>
                              
                              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                  <motion.div 
                                    className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${percentage}%` }} 
                                  />
                              </div>
                              <div className="flex justify-between mt-1">
                                  <div className="text-[9px] text-slate-500 font-mono">{progress} / {ach.targetValue}</div>
                                  <div className="text-[9px] text-amber-500 font-bold">{ach.apReward} AP</div>
                              </div>
                          </div>

                          <div className="z-10 shrink-0">
                              {isCompleted ? (
                                  <div className="px-4 py-2 bg-slate-950/50 rounded border border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                      Claimed
                                  </div>
                              ) : (
                                  <Button 
                                    size="sm" 
                                    className={`${isReady ? 'bg-amber-600 hover:bg-amber-500 border-amber-800' : 'opacity-50 grayscale'}`}
                                    disabled={!isReady}
                                    onClick={() => onClaimAchievement(ach.id)}
                                  >
                                      Claim
                                  </Button>
                              )}
                          </div>
                      </motion.div>
                  );
              })}
          </div>
      )}

      {activeTab === 'shop' && (
          <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex items-start gap-3">
                  <div className="p-2 bg-amber-900/20 rounded border border-amber-700/30">
                      <Award className="text-amber-400" size={24} />
                  </div>
                  <div>
                      <h3 className="font-tech text-white font-bold">Global Enhancements</h3>
                      <p className="text-xs text-slate-400">Spend AP to permanently boost resource acquisition rates across all game modes (Hunting & Battle).</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                  {AP_SHOP_ITEMS.map(item => {
                      const currentLevel = playerState.apShop[item.id] || 0;
                      const cost = getShopCost(item, currentLevel);
                      const canAfford = playerState.ap >= cost;
                      
                      let icon = <ArrowUpCircle size={20} />;
                      let color = "text-white";
                      if (item.id === 'featherBoost') { icon = <Database size={20} />; color = "text-cyan-400"; }
                      if (item.id === 'scrapBoost') { icon = <Hammer size={20} />; color = "text-slate-300"; }
                      if (item.id === 'diamondBoost') { icon = <Gem size={20} />; color = "text-blue-400"; }
                      if (item.id === 'itemDropBoost') { icon = <Briefcase size={20} />; color = "text-purple-400"; }
                      if (item.id === 'gemDropBoost') { icon = <Hexagon size={20} />; color = "text-rose-400"; }

                      return (
                          <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                  <div className="w-12 h-12 bg-slate-950 rounded flex items-center justify-center border border-slate-800">
                                      <div className={color}>{icon}</div>
                                  </div>
                                  <div>
                                      <div className="font-tech font-bold text-white text-lg flex items-center gap-2">
                                          {item.name} <span className="text-xs font-mono text-slate-500 bg-slate-950 px-1.5 rounded">LVL {currentLevel}</span>
                                      </div>
                                      <div className="text-xs text-slate-400 mb-1">{item.description}</div>
                                      <div className={`text-xs font-bold ${color}`}>
                                          Total Bonus: +{(currentLevel * item.boostPerLevel)}%
                                      </div>
                                  </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                                  <div className="text-right">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Next Level</div>
                                      <div className="text-xs font-bold text-emerald-400">+{item.boostPerLevel}% Boost</div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    disabled={!canAfford}
                                    onClick={() => onBuyAPUpgrade(item.id)}
                                    className={`min-w-[100px] ${canAfford ? 'bg-amber-700 hover:bg-amber-600 border-amber-900' : 'opacity-50'}`}
                                  >
                                      <div className="flex items-center gap-2">
                                          <Trophy size={14} className="text-amber-200" />
                                          <span>{cost} AP</span>
                                      </div>
                                  </Button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}
    </div>
  );
};
