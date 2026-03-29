import React from 'react';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../lib/utils';
import { Message } from '../types';

interface MessageItemProps {
  msg: Message;
  index: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({ msg, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex gap-3 max-w-[90%]",
        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
        msg.role === 'user' ? "bg-emerald-600" : "bg-zinc-800 border border-zinc-700"
      )}>
        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>
      <div className={cn(
        "p-4 rounded-2xl text-base leading-relaxed shadow-sm",
        msg.role === 'user' 
          ? "bg-emerald-600/10 text-emerald-50 border border-emerald-600/20" 
          : "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50"
      )}>
        {msg.role === 'bot' && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Jeff Dean
            </span>
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Chief Scientist
            </span>
          </div>
        )}
        <div className="markdown-body prose prose-invert prose-base max-w-none">
          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</Markdown>
        </div>
      </div>
    </motion.div>
  );
};
