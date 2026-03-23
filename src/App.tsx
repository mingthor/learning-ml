import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Send, Terminal, Code2, Bot, User, Loader2, Play, Sparkles, RefreshCw, Award, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `Persona:
You are a Principal ML Engineer and Technical Interviewer at a top-tier AI lab. You are an expert in writing clean, performant, and numerically stable PyTorch/JAX code. You have a "zero-tolerance" policy for inefficient loops or poor memory management in ML training scripts.

Task:
Your goal is to conduct a coding-heavy ML interview.

Scenario-Based Questions: Instead of asking "what is attention?", ask the candidate to implement it. (e.g., "Write a memory-efficient Multi-Head Attention block from scratch using PyTorch.")

Technical Constraints: Include constraints like "avoid for loops," "ensure numerical stability for FP16," or "optimize for KV-caching."

Iterative Review: Once the candidate provides code, you must perform a "Code Critique" before moving to the next question.

The "Critique" Protocol:
For every code snippet the candidate provides, analyze:
1. Correctness: Does the math match the implementation? (e.g., Are the dimensions $B, L, D$ handled correctly?)
2. Efficiency: Are they using vectorized operations? Is there unnecessary memory allocation?
3. Numerical Stability: Did they handle log-sum-exp or epsilon for divisions?
4. Readability: Is the code modular and idiomatic for the framework (PyTorch/JAX)?

Scoring & Evaluation:
After 3 coding tasks, provide a Seniority Assessment:
- Junior: Code works but is inefficient/clunky.
- Senior: Clean, vectorized code with basic stability.
- Principal/Staff: Handles edge cases, memory optimization, and hardware-aware constraints (e.g., Triton kernels or Flash Attention concepts).

Response Protocol:
- ONLY conversation goes to the chat (left pane).
- ALL code must be sent to the editor (right pane) using the 'set_editor_content' tool.
- DO NOT include large code blocks in your chat response. Use the chat to explain, critique, and guide.
- Use Markdown for text formatting in chat.
- Use LaTeX for math: $O(N^2 d)$ for complexity or $\text{Softmax}(Q K^T / \sqrt{d_k})$.

Coding Interface Protocol:
When presenting a coding task, use 'set_editor_content' to provide the structured Python code block.
Boilerplate: Include all necessary imports (torch, nn, einops) and class/function signatures.
Locked Areas: Wrap sections that the candidate should NOT change in comments like # --- FIXED STRUCTURE: DO NOT MODIFY ---.
Editable Zones: Clearly mark the implementation areas with:
# >>> START YOUR IMPLEMENTATION <<<
pass # Your code here
# >>> END YOUR IMPLEMENTATION <<<

Instructions: Explicitly tell the candidate to fill in the missing logic in the editor to the right.
Never provide the solution immediately. Give hints if the candidate is stuck, then ask them to try again.

Context:
The user has a code editor to the right. When the user sends a message, the current code in their editor is provided to you as context. Use it to evaluate their progress.`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<string>('# Your ML code will appear here\nimport torch\nimport torch.nn as nn\n\n');
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  // Initialize chat session
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          { codeExecution: {} },
          {
            functionDeclarations: [
              {
                name: "set_editor_content",
                description: "Updates the code editor on the right with new content. Use this for providing boilerplates, tasks, or corrected code.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    code: {
                      type: Type.STRING,
                      description: "The Python code to display in the editor."
                    }
                  },
                  required: ["code"]
                }
              }
            ]
          }
        ],
        toolConfig: {
          includeServerSideToolInvocations: true
        } as any
      },
    });
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const promptWithContext = `User Message: ${input}\n\n[Current Code in Editor]:\n\`\`\`python\n${code}\n\`\`\``;
      
      const response = await chatRef.current.sendMessage({
        message: promptWithContext,
      });

      // Handle function calls (set_editor_content)
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === 'set_editor_content') {
            const newCode = (call.args as any).code;
            if (newCode) setCode(newCode);
          }
        }
      }

      // Handle executable code from codeExecution tool
      if (response.executableCode) {
        setCode(response.executableCode);
      }
      if (response.codeExecutionResult) {
        setExecutionResult(response.codeExecutionResult);
      }

      const botMessage: Message = {
        role: 'bot',
        content: response.text || (functionCalls ? "I've updated the editor with the task." : "I've processed your request."),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: `Sorry, I encountered an error while processing your request: ${errorMessage}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = async () => {
    if (isExecuting || !chatRef.current) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please execute the following code and provide the result:\n\n\`\`\`python\n${code}\n\`\`\``,
        config: {
          tools: [{ codeExecution: {} }],
        },
      });

      if (response.codeExecutionResult) {
        setExecutionResult(response.codeExecutionResult);
      } else {
        setExecutionResult("Execution finished with no output.");
      }
    } catch (error) {
      console.error("Execution Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionResult(`Error during execution: ${errorMessage}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Left Pane: Chat Box */}
      <div className="w-1/2 flex flex-col border-r border-zinc-800 bg-zinc-900/50">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-500" />
            <h1 className="text-lg font-semibold tracking-tight">Principal ML Interviewer</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Interview Mode</span>
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
              <motion.div
                key={i}
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
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-emerald-600/10 text-emerald-50 border border-emerald-600/20" 
                    : "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50"
                )}>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </motion.div>
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-4 pl-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
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

      {/* Right Pane: Code Editor */}
      <div className="w-1/2 flex flex-col bg-zinc-950">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-300 tracking-tight">Implementation Workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCode('')}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Clear Editor"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              onClick={handleRunCode}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20"
            >
              {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              RUN CODE
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
          
          <AnimatePresence>
            {executionResult && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-sm"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Terminal className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Execution Output</span>
                    </div>
                    <button 
                      onClick={() => setExecutionResult(null)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-emerald-400 bg-black/40 p-4 rounded-xl border border-zinc-800/50 overflow-x-auto max-h-48 custom-scrollbar">
                    {executionResult}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
