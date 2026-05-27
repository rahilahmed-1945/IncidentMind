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
    axios.get("http://localhost:3000/history").then(res => {
      setHistoricalSnapshots(res.data);
    }).catch(err => console.error("Failed to fetch history", err));
  }, []);

  // Connect to WebSocket for live telemetry
  useEffect(() => {
    let isMounted = true;
    
    const socket = io("http://localhost:3000");

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

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-cyan-500 mb-4" size={40} />
        <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase animate-pulse">
          Establishing WebSocket Stream to Coral Intelligence...
        </p>
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
      overflow-hidden
      selection:bg-cyan-500/30
    ">

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

          <p className="
            text-zinc-500
            text-xs
            font-mono
            tracking-widest
            mt-1
          ">
            AI ORGANIZATIONAL CAUSALITY ENGINE
          </p>

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
            Ask IncidentMind
          </button>

        </div>
      </nav>

      {/* MAIN LAYOUT */}

      <div className="
        grid
        grid-cols-12
        gap-6
        h-[calc(100vh-120px)]
      ">

        {/* LEFT PANEL */}

        <div className="
          col-span-8
          flex
          flex-col
          gap-6
          h-full
        ">
          
          <div className="flex gap-6 h-[460px]">
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
            <div className="w-[300px]">
              <LiveFeed events={events} />
            </div>
          </div>

          {/* REPLAY ENGINE */}

          <div className="
            h-[120px]
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

        </div>

        {/* RIGHT SIDEBAR */}

        <div className="
          col-span-4
          flex
          flex-col
          gap-6
          h-full
          overflow-y-auto
          pr-2
          custom-scrollbar
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

              Predictive Risk Engine
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

        </div>
      </div>

      {/* CHAT OVERLAY */}

      <AskIncidentMind
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

    </div>
  );
}