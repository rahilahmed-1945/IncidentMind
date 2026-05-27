import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, FastForward, PowerOff } from 'lucide-react';

export default function ReplayEngine({ isReplaying, setIsReplaying, replayCursor, setReplayCursor, maxSnapshots }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per frame
  const intervalRef = useRef(null);

  const startPlayback = () => {
    setIsPlaying(true);
    setIsReplaying(true);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
  };

  const stopReplay = () => {
    setIsPlaying(false);
    setIsReplaying(false);
    setReplayCursor(0);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setReplayCursor(prev => {
          if (prev >= maxSnapshots - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, maxSnapshots, setReplayCursor]);

  const handleScrub = (e) => {
    setIsReplaying(true);
    pausePlayback();
    setReplayCursor(Number(e.target.value));
  };

  const progressPct = maxSnapshots > 1 ? (replayCursor / (maxSnapshots - 1)) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-4 flex flex-col gap-4 shadow-xl transition-colors duration-500 ${isReplaying ? 'bg-purple-950/20 border-purple-500/50' : 'bg-zinc-900 border-zinc-800'}`}
    >
      <div className="flex justify-between items-center">
        <h3 className={`font-mono text-sm tracking-widest uppercase transition-colors ${isReplaying ? 'text-purple-400' : 'text-cyan-400'}`}>
          Incident Replay Engine
        </h3>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setSpeed(speed === 1000 ? 500 : speed === 500 ? 250 : 1000)}
            className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 hover:text-white"
          >
            Speed: {speed === 1000 ? '1x' : speed === 500 ? '2x' : '4x'}
          </button>
          <span className="text-zinc-500 text-xs font-mono">T-{maxSnapshots - 1 - replayCursor}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isReplaying ? (
          <button onClick={stopReplay} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Exit Replay">
            <PowerOff size={20} />
          </button>
        ) : (
          <button onClick={() => setReplayCursor(0)} className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors">
            <SkipBack size={20} />
          </button>
        )}
        
        <button 
          onClick={isPlaying ? pausePlayback : startPlayback}
          className={`p-3 border rounded-full transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
            isReplaying 
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' 
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
          }`}
        >
          {isPlaying ? (
            <Pause size={24} className={isReplaying ? 'fill-purple-400' : 'fill-cyan-400'} />
          ) : (
            <Play size={24} className={`${isReplaying ? 'fill-purple-400' : 'fill-cyan-400'} translate-x-[1px]`} />
          )}
        </button>

        <button onClick={() => setReplayCursor(maxSnapshots - 1)} className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors">
          <FastForward size={20} />
        </button>

        {/* Timeline Scrubber */}
        <div className="flex-1 relative h-6 flex items-center">
          <input 
            type="range"
            min="0"
            max={Math.max(0, maxSnapshots - 1)}
            value={replayCursor}
            onChange={handleScrub}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer z-10 opacity-0 absolute"
          />
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden relative border border-zinc-800">
            <motion.div 
              className={`absolute top-0 left-0 h-full ${isReplaying ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'}`}
              animate={{ width: `${progressPct}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
          {/* Ticks */}
          <div className="absolute w-full flex justify-between pointer-events-none px-1">
            {Array.from({ length: maxSnapshots }).map((_, i) => (
              <div key={i} className="w-1 h-3 bg-zinc-700 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
