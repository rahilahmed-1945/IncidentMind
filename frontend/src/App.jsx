import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Activity,
  Loader2
} from "lucide-react";
import { io } from "socket.io-client";
import axios from "axios";

import DependencyGraph from "./components/DependencyGraph";
import ReplayEngine from "./components/ReplayEngine";
import ParallelSimulator from "./components/ParallelSimulator";
import AskIncidentMind from "./components/AskIncidentMind";
import ExecutiveNarrative from "./components/ExecutiveNarrative";
import LiveFeed from "./components/LiveFeed";

export default function App() {

  const [simulatorState, setSimulatorState] =
    useState("incident");

  const [isChatOpen, setIsChatOpen] =
    useState(false);

  const [liveState, setLiveState] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // History State
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayCursor, setReplayCursor] = useState(0);

  // Fetch History on Mount
  useEffect(() => {
    axios.get("https://incidentmind-production.up.railway.app/history").then(res => {
      setHistoricalSnapshots(res.data);
    }).catch(err => console.error("Failed to fetch history", err));
  }, []);

  // Connect to WebSocket for live telemetry
  useEffect(() => {
    let isMounted = true;
    
    const socket = io("wss://incidentmind-production.up.railway.app");

    socket.on("connect", () => {
      console.log("Connected to Coral Intelligence Stream");
    });

    socket.on("live_state", (data) => {
      if (isMounted) {
        // Only update if not healed (to preserve simulation logic)
        if (simulatorState !== 'healed') {
          setLiveState(data);
          if (isConnecting) {
            setTimeout(() => setIsConnecting(false), 800); // Cinematic delay
          }
        }
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [simulatorState, isConnecting]);

  // Cinematic Boot Sequence
  const [bootPhase, setBootPhase] = useState(0);
  
  useEffect(() => {
    if (isConnecting) {
      const p1 = setTimeout(() => setBootPhase(1), 800);
      const p2 = setTimeout(() => setBootPhase(2), 1600);
      const p3 = setTimeout(() => setBootPhase(3), 2600);
      const p4 = setTimeout(() => setIsConnecting(false), 3500);
      return () => { clearTimeout(p1); clearTimeout(p2); clearTimeout(p3); clearTimeout(p4); };
    }
  }, [isConnecting]);

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans relative overflow-hidden bg-ambient-grid">
        <div className="radar-sweep-bg" />
        <div className="z-10 bg-zinc-950/80 p-8 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md min-w-[400px]">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="animate-spin text-cyan-500" size={24} />
            <span className="text-cyan-400 font-mono tracking-widest uppercase text-sm">IncidentMind Core Boot</span>
          </div>
          <div className="space-y-3 font-mono text-xs tracking-wider">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-zinc-500">
              [SYSTEM] Initializing IncidentMind Core...
            </motion.div>
            {bootPhase >= 1 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-zinc-400">
                [NETWORK] Establishing Coral WebSocket... <span className="text-green-400">OK</span>
              </motion.div>
            )}
            {bootPhase >= 2 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-cyan-400">
                [FABRIC] Syncing Multi-Source Connectors (GitHub, Datadog, Slack)... <span className="text-green-400">OK</span>
              </motion.div>
            )}
            {bootPhase >= 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-green-400 mt-4 pt-4 border-t border-zinc-800">
                [STATUS] Operational Intelligence Online
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Core Data Flow logic: Use history if replaying, else use live data
  const activeState = isReplaying && historicalSnapshots.length > 0 
    ? historicalSnapshots[replayCursor] 
    : liveState;

  const { metrics, nodes, edges, narrative, events, forecast } = activeState || {};

  return (

    <div className="
      min-h-screen
      w-full
      bg-black
      text-white
      p-6
      font-sans
      selection:bg-cyan-500/30
      relative
    ">
      
      {/* AMBIENT INTELLIGENCE LAYER */}
      <div className="absolute inset-0 bg-ambient-grid opacity-50 z-0 pointer-events-none" />
      <div className="absolute inset-0 radar-sweep-bg opacity-30 z-0 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col">
        {/* HEADER */}

      <nav className="
        flex
        justify-between
        items-center
        mb-6
      ">

        <div>

          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="
              text-3xl
              font-bold
              tracking-tight
              text-white
              flex
              items-center
              gap-2
            "
          >
            IncidentMind

            <span className={`
              ${isReplaying ? 'bg-purple-500' : 'bg-red-500'}
              text-white
              text-[10px]
              uppercase
              px-2
              py-0.5
              rounded-sm
              font-mono
              tracking-wider
              font-bold
            `}>
              {isReplaying ? 'Historical Replay' : 'Live Stream Active'}
            </span>

          </motion.h1>

          <div className="flex items-center gap-3 mt-1">
            <p className="
              text-zinc-500
              text-xs
              font-mono
              tracking-widest
            ">
              AI ORGANIZATIONAL CAUSALITY ENGINE
            </p>
            <span className="text-zinc-700">|</span>
            <span className="text-[9px] font-mono tracking-widest text-cyan-500/70 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">ENV: PRD-US-EAST</span>
            <span className="text-[9px] font-mono tracking-widest text-green-500/70 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50">CORAL: ONLINE</span>
          </div>

        </div>

        <div className="flex gap-4">

          <button
            onClick={() => setIsChatOpen(true)}
            className="
              flex
              items-center
              gap-2
              bg-zinc-900
              border
              border-zinc-700
              hover:border-cyan-500
              hover:text-cyan-400
              px-4
              py-2
              rounded-xl
              text-sm
              font-medium
              transition-colors
            "
          >
            <MessageSquare size={16} />
            Coral Investigative Reasoning Console
          </button>

        </div>
      </nav>

      {/* MAIN LAYOUT */}

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-12
        gap-8
        min-h-[calc(100vh-120px)]
      ">

        {/* LEFT PANEL */}

        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="
          col-span-1
          lg:col-span-8
          flex
          flex-col
          gap-8
        ">
          
          <div className="flex gap-6 flex-1 min-h-[500px]">
            {/* DEPENDENCY GRAPH */}
            <div className="
              flex-1
              rounded-3xl
              overflow-hidden
            ">
              <DependencyGraph
                simulatorState={simulatorState}
                nodes={nodes}
                edges={edges}
              />
            </div>
            
            {/* LIVE FEED */}
            <div className="w-[280px]">
              <LiveFeed events={events} />
            </div>
          </div>

          {/* REPLAY ENGINE */}

          <div className="
            h-[160px]
            shrink-0
            rounded-3xl
            overflow-hidden
          ">
            <ReplayEngine
              isReplaying={isReplaying}
              setIsReplaying={setIsReplaying}
              replayCursor={replayCursor}
              setReplayCursor={setReplayCursor}
              maxSnapshots={historicalSnapshots.length}
            />
          </div>

        </motion.div>

        {/* RIGHT SIDEBAR */}

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="
          col-span-1
          lg:col-span-4
          flex
          flex-col
          gap-8
        ">

          {/* EXECUTIVE NARRATIVE */}
          <ExecutiveNarrative narrative={narrative} metrics={metrics} forecast={forecast} />

          {/* PREDICTIVE RISK */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-3xl
              p-6
              shadow-xl
            "
          >

            <h3 className="
              text-sm
              font-semibold
              text-zinc-300
              uppercase
              tracking-widest
              mb-4
              flex
              items-center
              gap-2
            ">
              <Activity
                size={16}
                className="text-cyan-400"
              />

              Coral Predictive Intelligence Layer
            </h3>

            <div className="space-y-6">

              <div>

                <div className="
                  flex
                  justify-between
                  text-sm
                  mb-1
                ">
                  <span className="text-zinc-400">
                    Database Connection Pool
                  </span>

                  <span className="
                    text-yellow-400
                    font-mono
                  ">
                    <motion.span
                      key={metrics?.dbPool}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                    >
                      {metrics?.dbPool}%
                    </motion.span>
                  </span>
                </div>

                <div className="
                  h-1.5
                  bg-zinc-950
                  rounded-full
                  overflow-hidden
                  border
                  border-zinc-800
                  mb-2
                ">

                  <motion.div
                    className="h-full bg-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics?.dbPool}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 1 }}
                  />

                </div>
                
                {/* PREDICTIVE INDICATOR */}
                <motion.div 
                  className={`text-[10px] font-mono uppercase tracking-widest ${forecast?.dbSaturationEta !== 'Stable' ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}
                >
                  {forecast?.dbSaturationEta !== 'Stable' ? `⚠️ DB Saturation projected in: ${forecast?.dbSaturationEta}` : '✓ DB Connections Stable'}
                </motion.div>
              </div>

              <div>

                <div className="
                  flex
                  justify-between
                  text-sm
                  mb-1
                ">
                  <span className="text-zinc-400">
                    Auth Instability Probability
                  </span>

                  <span className="
                    text-cyan-400
                    font-mono
                  ">
                    <motion.span
                      key={forecast?.authInstabilityProbability}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                    >
                      {forecast?.authInstabilityProbability || 0}%
                    </motion.span>
                  </span>
                </div>

                <div className="
                  h-1.5
                  bg-zinc-950
                  rounded-full
                  overflow-hidden
                  border
                  border-zinc-800
                  mb-2
                ">

                  <motion.div
                    className="h-full bg-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${forecast?.authInstabilityProbability || 0}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 1 }}
                  />

                </div>
                
                {/* PREDICTIVE INDICATOR */}
                <motion.div 
                  className={`text-[10px] font-mono uppercase tracking-widest ${forecast?.authInstabilityProbability > 70 ? 'text-cyan-300 animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-zinc-500'}`}
                >
                  Velocity-derived risk trajectory
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* PARALLEL SIMULATOR */}

          <ParallelSimulator
            simulatorState={simulatorState}
            setSimulatorState={setSimulatorState}
          />

        </motion.div>
      </div>

      {/* CHAT OVERLAY */}

      <AskIncidentMind
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      </div>
    </div>
  );
}