import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, Eye, Shuffle, Trophy } from 'lucide-react';
import { QuestionStats } from '../services/statsService';
import { questions } from '../constants';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Record<string, QuestionStats>;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  const totalViews = Object.values(stats).reduce((acc, s) => acc + (s.viewCount || 0), 0);
  const totalSkips = Object.values(stats).reduce((acc, s) => acc + (s.skipCount || 0), 0);
  
  const sortedQuestions = [...questions].sort((a, b) => {
    const viewsA = stats[a.id]?.viewCount || 0;
    const viewsB = stats[b.id]?.viewCount || 0;
    return viewsB - viewsA;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <header className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-100">Interview Statistics</h2>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Global Progress Tracking</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 grid grid-cols-3 gap-4 bg-zinc-950/30">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Eye className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{totalViews}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Shuffle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Skips</span>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{totalSkips}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Trophy className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Questions</span>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{questions.length}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                    <th className="pb-3 font-bold">Question</th>
                    <th className="pb-3 font-bold text-center">Views</th>
                    <th className="pb-3 font-bold text-center">Skips</th>
                    <th className="pb-3 font-bold text-center">Mastery</th>
                    <th className="pb-3 font-bold text-right">Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {sortedQuestions.map((q) => {
                    const qStats = stats[q.id] || { viewCount: 0, skipCount: 0, mastery: 0 };
                    return (
                      <tr key={q.id} className="group hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 pr-4">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">
                            {q.title}
                          </p>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-sm font-mono text-zinc-400">{qStats.viewCount}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-sm font-mono text-zinc-400">{qStats.skipCount}</span>
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-500" 
                                style={{ width: `${(qStats.mastery || 0) * 10}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-emerald-500/80 w-4">{qStats.mastery || 0}</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                            {q.tag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
