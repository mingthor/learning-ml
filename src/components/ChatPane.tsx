import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles, Loader2, Send, LogOut, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageItem } from './MessageItem';
import { Message } from '../types';

interface ChatPaneProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  isLoading: boolean;
  onSignOut: () => void;
  statsActive: boolean;
  onOpenStats: () => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({ 
  messages, 
  input, 
  setInput, 
  handleSend, 
  isLoading,
  onSignOut,
  statsActive,
  onOpenStats
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-1/2 flex flex-col border-r border-zinc-800 bg-zinc-900/50">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-zinc-100">Jeff Dean</h1>
              <div className="flex items-center justify-center w-3.5 h-3.5 bg-blue-500 rounded-full">
                <svg viewBox="0 0 24 24" className="w-2 h-2 text-white fill-current">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest">Chief Scientist • Online</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statsActive && (
            <button 
              onClick={onOpenStats}
              className="hidden lg:flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
              title="View Detailed Statistics"
            >
              <BarChart3 className="w-3 h-3" />
              <span className="font-bold uppercase tracking-wider">Stats Active</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Interview Active</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={onSignOut}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-100"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4"
            >
              <div className="p-4 rounded-full bg-zinc-800/50">
                <Sparkles className="w-12 h-12 text-emerald-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-zinc-300">Ready for your ML Interview?</p>
                <p className="text-sm max-w-xs mx-auto">
                  I'll challenge your PyTorch/JAX skills with scenario-based coding tasks. No loops, no fluff.
                </p>
              </div>
              <button 
                onClick={() => {
                  setInput("I'm ready to start the interview. Please give me my first task.");
                  handleSend();
                }}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20"
              >
                Start Interview
              </button>
            </motion.div>
          )}
          {messages.map((msg, i) => (
            <MessageItem key={i} msg={msg} index={i} />
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
            <div className="p-3 rounded-2xl bg-zinc-800/50 text-zinc-400 text-sm italic border border-zinc-700/50">
              Critiquing your implementation...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your response or implementation..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-4 pl-4 pr-14 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-zinc-500 text-center uppercase tracking-widest">
          The interviewer sees your current code context automatically
        </p>
      </div>
    </div>
  );
};
