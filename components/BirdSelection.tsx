
import React, { useState } from 'react';
import { Bird, MoveType } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Zap, Heart, Wind, Crosshair, Star, ChevronRight, Play, Info } from 'lucide-react';
import { BIRDS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface BirdSelectionProps {
  onSelect: (bird: Bird, mode: 'god' | 'standard') => void;
}

export const BirdSelection: React.FC<BirdSelectionProps> = ({ onSelect }) => {
  const [selectedPreview, setSelectedPreview] = useState<Bird>(BIRDS[0]);
  const specialMove = selectedPreview.moves.find(m => m.type === MoveType.SPECIAL);

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-950 md:overflow-hidden">
      
      {/* Left Panel: Roster List */}
      <div className="w-full md:w-1/3 flex flex-col p-6 z-10 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/90 backdrop-blur-sm shrink-0 md:h-full">
        <div className="mb-8">
          <h1 className="font-tech text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase font-black italic">
            Class Selection
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-2 uppercase tracking-widest leading-relaxed">
            Select from different kinds of birds that each specialize in unique combat tactics.
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-grow md:overflow-y-auto pr-2 custom-scrollbar">
          {BIRDS.map((bird) => (
            <button
              key={bird.id}
              onClick={() => {
                setSelectedPreview(bird);
              }}
              className={`
                group relative flex items-center gap-4 p-4 transition-all duration-300
                clip-tech-sm border-l-4 text-left
                ${selectedPreview.id === bird.id 
                  ? 'bg-slate-800 border-cyan-500 text-white' 
                  : 'bg-slate-900/50 border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'}
              `}
            >
              <div className="w-16 h-16 rounded overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                <img 
                    src={bird.imageUrl} 
                    alt={bird.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('placehold.co')) {
                            target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + bird.name;
                        }
                    }}
                />
              </div>
              <div className="flex-1">
                <div className="font-tech font-bold text-lg uppercase">{bird.name}</div>
                <div className="text-[10px] tracking-wider text-cyan-500 font-bold">{bird.species}</div>
              </div>
              
              {/* Active Indicator */}
              {selectedPreview.id === bird.id && (
                <motion.div 
                  layoutId="active-glow"
                  className="absolute inset-0 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] pointer-events-none"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Details */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-6 md:p-12 relative z-10 flex flex-col items-center">
              
              <div className="w-full max-w-3xl">
                  {/* Hero Image & Stats */}
                  <div className="flex flex-col md:flex-row gap-8 mb-8 items-center">
                      <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-950 relative group">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                          <img 
                              src={selectedPreview.imageUrl} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                          />
                      </div>
                      
                      <div className="flex-1 space-y-6">
                          <div>
                              <h2 className="text-5xl md:text-7xl font-tech font-black text-white leading-none tracking-tighter mb-2">
                                  {selectedPreview.name}
                              </h2>
                              <div className="text-cyan-400 font-bold text-lg uppercase tracking-widest mb-4">
                                  {selectedPreview.species}
                              </div>
                              <p className="text-slate-400 leading-relaxed border-l-2 border-slate-700 pl-4">
                                  {selectedPreview.description}
                              </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Base Health</div>
                                  <div className="text-2xl font-mono text-emerald-400 font-bold">{selectedPreview.baseHp}</div>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Base Attack</div>
                                  <div className="text-2xl font-mono text-rose-400 font-bold">{selectedPreview.baseAttack}</div>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Base Speed</div>
                                  <div className="text-2xl font-mono text-cyan-400 font-bold">{selectedPreview.baseSpeed}</div>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Max Energy</div>
                                  <div className="text-2xl font-mono text-yellow-400 font-bold">{selectedPreview.baseEnergy}</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Moves & Abilities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-4 text-white font-tech font-bold text-lg">
                              <Info size={20} className="text-purple-400" /> PASSIVE ABILITY
                          </div>
                          <div className="bg-slate-950 p-4 rounded border border-slate-800/50">
                              <div className="text-purple-400 font-bold mb-1">{selectedPreview.passive.name}</div>
                              <div className="text-sm text-slate-400">{selectedPreview.passive.description}</div>
                          </div>
                      </div>

                      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-4 text-white font-tech font-bold text-lg">
                              <Zap size={20} className="text-yellow-400" /> SIGNATURE MOVE
                          </div>
                          {specialMove && (
                              <div className="bg-slate-950 p-4 rounded border border-slate-800/50">
                                  <div className="flex justify-between items-start mb-1">
                                      <div className="text-yellow-400 font-bold">{specialMove.name}</div>
                                      <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">{specialMove.cost} NRG</div>
                                  </div>
                                  <div className="text-sm text-slate-400">{specialMove.description}</div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex flex-col md:flex-row items-center justify-between gap-4 z-20">
              <div className="text-xs text-slate-500 hidden md:block">
                  DEBUG MODE ACTIVE // UNLIMITED RESOURCES ENABLED FOR GOD MODE
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                  <Button 
                      variant="secondary" 
                      onClick={() => onSelect(selectedPreview, 'standard')}
                      className="flex-1 md:flex-none md:min-w-[200px]"
                  >
                      STANDARD START (GREEN)
                  </Button>
                  <Button 
                      onClick={() => onSelect(selectedPreview, 'god')}
                      className="flex-1 md:flex-none md:min-w-[200px] shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                      GOD MODE DEPLOY
                  </Button>
              </div>
          </div>
      </div>
    </div>
  );
};
