
import React from 'react';
import { PlayerState } from '../types';
import { Button } from './Button';
import { Map, Swords, Lock, Skull, Target } from 'lucide-react';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

interface MapViewProps {
  playerState: PlayerState;
  onBattle: () => void;
}

export const MapView: React.FC<MapViewProps> = ({ playerState, onBattle }) => {
  const currentZone = playerState.highestZone;
  const isHunting = playerState.selectedBirdId && playerState.huntingBirdIds.includes(playerState.selectedBirdId);

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center py-8">
          <h2 className="font-tech text-4xl text-white mb-2">SECTOR MAP</h2>
          <p className="text-slate-400 text-sm">Select a combat zone to deploy your unit.</p>
      </div>

      <div className="space-y-4">
          <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-600 rounded-lg opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
              <button 
                onClick={onBattle}
                disabled={isHunting}
                className="relative w-full bg-slate-900 rounded-lg p-6 flex items-center justify-between border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-900/30 rounded-full flex items-center justify-center border border-rose-500/50">
                          <Swords className="text-rose-500" size={24} />
                      </div>
                      <div className="text-left">
                          <div className="text-rose-400 font-bold text-xs uppercase tracking-widest mb-1">Current Frontier</div>
                          <div className="font-tech text-2xl text-white">ZONE {currentZone}</div>
                          <div className="text-xs text-slate-500 mt-1">Difficulty: Adaptive</div>
                      </div>
                  </div>
                  
                  {isHunting ? (
                      <div className="flex flex-col items-end text-amber-500">
                          <Target size={20} className="mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">HUNTING</span>
                      </div>
                  ) : (
                      <div className="text-rose-500 animate-pulse font-bold tracking-widest">
                          DEPLOY
                      </div>
                  )}
              </button>
          </div>
          
          {isHunting && (
              <div className="text-center text-xs text-amber-500/80 font-mono bg-amber-900/20 p-2 rounded border border-amber-900/50">
                  ⚠️ Active unit is currently assigned to resource hunting. Recall unit from Roster to deploy.
              </div>
          )}

          {currentZone > 1 && (
             <div className="opacity-60">
                <div className="w-full bg-slate-900 rounded-lg p-4 flex items-center justify-between border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                            <CheckIcon />
                        </div>
                        <div className="text-left">
                            <div className="font-tech text-lg text-slate-400">ZONE {currentZone - 1}</div>
                            <div className="text-xs text-slate-600">Cleared</div>
                        </div>
                    </div>
                </div>
             </div>
          )}

          <div className="opacity-50">
               <div className="w-full bg-slate-950 rounded-lg p-6 flex items-center justify-between border border-slate-900 border-dashed">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
                          <Lock size={20} />
                      </div>
                      <div className="text-left">
                          <div className="text-slate-700 font-bold text-xs uppercase tracking-widest mb-1">Locked</div>
                          <div className="font-tech text-2xl text-slate-700">ZONE {currentZone + 1}</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
