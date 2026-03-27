import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageItem } from './MessageItem';
import { Message } from '../types';

interface ChatPaneProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  isLoading: boolean;
}

export const ChatPane: React.FC<ChatPaneProps> = ({ 
  messages, 
  input, 
  setInput, 
  handleSend, 
  isLoading 
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
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-emerald-500" />
          <h1 className="text-lg font-semibold tracking-tight">Jeff Dean</h1>
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
