import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, AlertTriangle } from 'lucide-react';

export default function ParallelSimulator({ simulatorState, setSimulatorState }) {
  const isHealed = simulatorState === 'healed';

  const simulateRollback = () => {
    setSimulatorState('healed');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <GitBranch size={20} className="text-purple-400" />
          Parallel Universe Simulator
        </h2>
        <p className="text-zinc-400 text-sm mt-2">Test potential remediation strategies against the digital twin of your infrastructure.</p>
      </div>

      <div className="space-y-4">
        <div className={`p-4 border rounded-2xl transition-all duration-500 ${isHealed ? 'bg-cyan-950/30 border-cyan-500/30' : 'bg-zinc-950 border-zinc-800 hover:border-purple-500/50'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-zinc-200 font-medium">Rollback Deploy #882</h4>
              <p className="text-zinc-500 text-xs mt-1">Revert checkout service to previous stable hash.</p>
            </div>
            {!isHealed && (
              <button 
                onClick={simulateRollback}
                className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Simulate
              </button>
            )}
            {isHealed && (
              <span className="text-xs text-cyan-400 font-mono bg-cyan-950 px-2 py-1 rounded">SIMULATED</span>
            )}
          </div>
          
          {isHealed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 pt-4 border-t border-cyan-500/20 text-sm"
            >
              <div className="flex gap-2 items-center text-cyan-400 mb-2">
                <AlertTriangle size={14} />
                <span className="font-mono">Outcome: Success (99.8% Probability)</span>
              </div>
              <p className="text-zinc-400">Checkout latency returns to baseline &lt;15ms. Auth service connections stabilize.</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
