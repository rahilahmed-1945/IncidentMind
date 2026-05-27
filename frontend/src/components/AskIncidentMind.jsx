import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Loader2, Database, BrainCircuit } from 'lucide-react';
import axios from 'axios';

export default function AskIncidentMind({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', content: 'IncidentMind Autonomous Reasoning Engine initialized.\nConnected to Coral Intelligence.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: query }];
    setMessages(newMsgs);
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3000/analyze", { query });
      
      const responseMsg = {
        role: 'assistant',
        sql: response.data.sql,
        coralData: response.data.coralData,
        analysis: response.data.analysis
      };

      setMessages([...newMsgs, responseMsg]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', analysis: 'Failed to connect to organizational reasoning layer.' }]);
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 right-8 w-[600px] h-[700px] bg-zinc-950 border border-zinc-800 rounded-3xl z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-cyan-400" />
                <h3 className="font-mono text-cyan-400 text-sm font-semibold tracking-wide">Ask IncidentMind</h3>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[95%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20' 
                      : msg.role === 'system'
                        ? 'bg-zinc-900 text-zinc-400 font-mono text-xs border border-zinc-800'
                        : 'bg-zinc-900/50 text-zinc-300 border border-zinc-800 w-full'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="flex flex-col gap-4">
                        {msg.sql && (
                          <div className="bg-black/50 border border-zinc-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                              <Database size={12} className="text-yellow-500" />
                              Generated Coral SQL
                            </div>
                            <code className="text-yellow-400/80 font-mono text-xs whitespace-pre-wrap">
                              {msg.sql}
                            </code>
                          </div>
                        )}
                        {msg.coralData && (
                          <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 overflow-x-auto custom-scrollbar">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                              <Terminal size={12} className="text-cyan-500" />
                              Raw Telemetry / Logs
                            </div>
                            <pre className="text-cyan-400/70 font-mono text-[10px]">
                              {msg.coralData}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">
                            <BrainCircuit size={12} className="text-purple-500" />
                            AI Operational Reasoning
                          </div>
                          <div className="whitespace-pre-wrap font-sans text-sm text-zinc-200">
                            {msg.analysis}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 text-zinc-400 flex gap-3 items-center">
                    <Loader2 size={16} className="animate-spin text-purple-500" />
                    <span className="font-mono text-xs text-purple-400/70 animate-pulse">Orchestrating NL to SQL pipeline...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g., Which engineer touched the failing systems?"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
