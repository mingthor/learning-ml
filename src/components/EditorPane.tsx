import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Code2, Eraser, Lightbulb, Shuffle, Tag } from 'lucide-react';
import { Question } from '../types';

interface EditorPaneProps {
  code: string;
  setCode: (val: string) => void;
  onRequestSolution: () => void;
  onSkipQuestion: () => void;
  isLoading: boolean;
  question: Question;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ 
  code, 
  setCode, 
  onRequestSolution, 
  onSkipQuestion, 
  isLoading, 
  question,
  selectedTag,
  setSelectedTag
}) => {
  return (
    <div className="w-1/2 flex flex-col bg-zinc-950">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium text-zinc-300 tracking-tight">Workspace</span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
              <Tag className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-transparent text-[11px] font-bold uppercase tracking-wider text-zinc-400 outline-none cursor-pointer hover:text-zinc-200 transition-colors"
              >
                <option value="all" className="bg-zinc-900">All Tags</option>
                <option value="ml" className="bg-zinc-900">ML</option>
                <option value="algorithm" className="bg-zinc-900">Algorithm</option>
                <option value="system" className="bg-zinc-900">System</option>
              </select>
            </div>
          </div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-7">
            {question.title}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onSkipQuestion}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Skip Question"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Skip
          </button>
          <button
            onClick={onRequestSolution}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Request Solution"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Show Solution
          </button>
          <button
            onClick={() => setCode('')}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear Editor"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto bg-zinc-950/50 custom-scrollbar">
          <Editor
            value={code}
            onValueChange={code => setCode(code)}
            highlight={code => highlight(code, languages.python, 'python')}
            padding={24}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              minHeight: '100%',
              backgroundColor: 'transparent',
            }}
            className="outline-none"
          />
        </div>
      </div>
    </div>
  );
};
