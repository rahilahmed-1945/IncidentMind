import React, { useMemo } from 'react';

import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
  Database,
  CloudRain,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

import { motion } from 'framer-motion';

const iconMap = {
  CloudRain: <CloudRain size={20} />,
  ShieldAlert: <ShieldAlert size={20} />,
  Cpu: <Cpu size={20} />,
  Database: <Database size={20} />
};

const CustomNode = ({ data, isConnectable }) => {

  const isFailing =
    data.state === 'critical';

  const isDegraded =
    data.state === 'degraded';
    
  const influence = data.influenceScore || 0;
  const isHighImpact = influence > 80;
  const isMediumImpact = influence > 50 && influence <= 80;

  let bgClass = 'bg-zinc-900 border-cyan-500/30';
  let textClass = 'text-cyan-400';
  let glow = '';

  if (isHighImpact) {
    bgClass = 'bg-red-950 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)]';
    textClass = 'text-red-400';
  } else if (isMediumImpact || isFailing) {
    bgClass = 'bg-yellow-950 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
    textClass = 'text-yellow-400';
  } else if (isDegraded) {
    bgClass = 'bg-yellow-950/50 border-yellow-500/50';
    textClass = 'text-yellow-400/80';
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring' }}
      className={`
        px-4 py-3
        rounded-xl
        border-2
        ${bgClass}
        ${isHighImpact ? 'animate-pulse' : ''}
        flex items-center gap-3
        backdrop-blur-md
        relative
        min-w-[220px]
      `}
    >

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="
          w-3
          h-3
          border-none
          bg-zinc-700
        "
      />

      <div className={textClass}>
        {iconMap[data.iconName] || data.icon}
      </div>

      <div>

        <div className="
          font-bold
          text-gray-200
          text-sm
        ">
          {data.label}
        </div>

        <div className={`
          text-xs
          ${textClass}
        `}>
          {data.subLabel}
        </div>

      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="
          w-3
          h-3
          border-none
          bg-zinc-700
        "
      />

    </motion.div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function DependencyGraph({
  simulatorState,
  nodes: initialNodes,
  edges: initialEdges
}) {

  const nodes = useMemo(() => {
    if (!initialNodes) return [];

    if (simulatorState === 'healed') {
      return initialNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          state: 'healthy',
          subLabel:
            node.data.subLabel.includes('Latency')
              ? 'Latency: 10ms'
              : 'Connections: OK',
        },
      }));
    }

    return initialNodes;

  }, [simulatorState, initialNodes]);

  const edges = useMemo(() => {
    if (!initialEdges) return [];

    if (simulatorState === 'healed') {
      return initialEdges.map((edge) => ({
        ...edge,
        style: {
          stroke: '#06b6d4',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#06b6d4',
        },
      }));
    }

    return initialEdges;

  }, [simulatorState, initialEdges]);

  return (

    <div
      style={{
        width: '100%',
        height: '700px',
      }}

      className="
        bg-black
        rounded-3xl
        border
        border-zinc-800
        overflow-hidden
        relative
        shadow-2xl
        shadow-cyan-900/10
      "
    >

      {/* LIVE BADGE */}

      <div className="
        absolute
        top-4
        left-4
        z-10
        flex
        items-center
        gap-2
        bg-zinc-900/80
        px-3
        py-1.5
        rounded-full
        border
        border-zinc-800
        backdrop-blur-md
      ">

        <div className="
          w-2
          h-2
          rounded-full
          bg-cyan-500
          animate-pulse
        " />

        <span className="
          text-cyan-400
          font-mono
          text-[10px]
          tracking-widest
          uppercase
        ">
          Live Telemetry
        </span>

      </div>

      {/* REACT FLOW */}

      <div
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{
            hideAttribution: true,
          }}
          style={{
            width: '100%',
            height: '100%',
            background: '#09090b',
          }}
        >
          <Background
            color="#3f3f46"
            gap={16}
            size={1}
          />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}