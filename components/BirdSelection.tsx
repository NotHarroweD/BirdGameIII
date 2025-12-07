import React, { useState } from 'react';
import { Bird, MoveType } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Zap, Heart, Wind, Crosshair, Star, ChevronRight } from 'lucide-react';
import { BIRDS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface BirdSelectionProps {
  onSelect: (bird: Bird) => void;
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
          <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest">Choose your combatant</p>
        </div>

        <div className="flex flex-col gap-4 md:flex-grow md:overflow-y-auto pr-2">
          {BIRDS.map((bird) => (
            <button
              key={bird.id}
              onClick={() => {
                setSelectedPreview(bird);
                // On mobile, smooth scroll to details
                if (window.innerWidth < 768) {
                    document.getElementById('detail-view')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`
                group relative flex items-center gap-4 p-4 transition-all duration-300
                clip-tech-sm border-l-4 
                ${selectedPreview.id === bird.id 
                  ? 'bg-slate-800 border-cyan-500 text-white' 
                  : 'bg-slate-900/50 border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'}
              `}
            >
              <div className="w-16 h-16 rounded overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                <img src={bird.imageUrl} alt={bird.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="font-tech font-bold text-lg uppercase">{bird.name}</div>
                <div className="text-xs tracking-wider text-cyan-500">{bird.species}</div>
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

      {/* Right Panel: Hero Detail View */}
      <div id="detail-view" className="flex-1 relative flex flex-col min-h-[600px] md:h-full">
        {/* Background Image with Overlay */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedPreview.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={selectedPreview.imageUrl} 
              className="w-full h-full object-cover opacity-40 grayscale-[30%] fixed md:absolute inset-0"
              alt="Background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />
            
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[length:40px_40px]" />
          </motion.div>
        </AnimatePresence>

        {/* Content Layer */}
        <div className="relative z-10 flex-1 flex flex-col justify-end p-6 md:p-12 max-w-4xl mx-auto w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={selectedPreview.id}
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: -20, opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="space-y-6 pb-8 md:pb-0"
             >
                <div className="pt-8 md:pt-0">
                  <h2 className="font-tech text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none break-words">
                    {selectedPreview.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded border border-cyan-500/30 text-xs font-bold uppercase tracking-widest">
                      {selectedPreview.species}
                    </span>
                    <div className="h-px bg-slate-700 flex-grow max-w-[100px]" />
                    <span className="text-slate-500 text-xs uppercase tracking-widest">
                      Ready for deployment
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-lg max-w-xl leading-relaxed border-l-2 border-cyan-500 pl-4 bg-gradient-to-r from-cyan-900/20 to-transparent py-2">
                  {selectedPreview.description}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
                  <StatBox label="Health" value={selectedPreview.baseHp} icon={<Heart size={16} />} color="text-emerald-400" />
                  <StatBox label="Energy" value={selectedPreview.baseEnergy} icon={<Zap size={16} />} color="text-yellow-400" />
                  <StatBox label="Attack" value={selectedPreview.baseAttack} icon={<Swords size={16} />} color="text-rose-400" />
                  <StatBox label="Speed" value={selectedPreview.baseSpeed} icon={<Wind size={16} />} color="text-cyan-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  {/* Passive Ability */}
                  <Card variant="glass" className="border-l-4 border-l-purple-500 p-4">
                      <div className="flex items-start gap-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                              <Crosshair className="text-purple-400" size={20} />
                          </div>
                          <div>
                              <div className="text-[10px] uppercase text-purple-400 font-bold tracking-widest mb-1">Passive Ability</div>
                              <div className="font-tech text-lg font-bold leading-none mb-1">{selectedPreview.passive.name}</div>
                              <div className="text-slate-400 text-xs">{selectedPreview.passive.description}</div>
                          </div>
                      </div>
                  </Card>

                   {/* Special Move */}
                   {specialMove && (
                    <Card variant="glass" className="border-l-4 border-l-amber-500 p-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                                <Star className="text-amber-400" size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-amber-400 font-bold tracking-widest mb-1">Signature Move</div>
                                <div className="font-tech text-lg font-bold leading-none mb-1">{specialMove.name}</div>
                                <div className="text-slate-400 text-xs">{specialMove.description}</div>
                            </div>
                        </div>
                    </Card>
                   )}
                </div>

                <div className="pt-8">
                  <Button 
                    size="xl" 
                    className="w-full md:w-auto min-w-[300px]" 
                    onClick={() => onSelect(selectedPreview)}
                  >
                    CONFIRM DEPLOYMENT <ChevronRight className="ml-2" />
                  </Button>
                </div>

             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-slate-900/50 border border-slate-700 p-3 rounded clip-tech-sm backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-1">
      <span className={color}>{icon}</span>
      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</span>
    </div>
    <div className="font-tech text-2xl font-bold">{value}</div>
  </div>
);