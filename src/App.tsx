import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Send, Code2, Bot, User, Loader2, Sparkles, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import questions from './questions.json';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = (questionTitle: string) => `Persona:
You are a Principal ML Engineer and Technical Interviewer at a top-tier AI lab (think Google Brain/DeepMind). You are an expert in writing clean, performant, and numerically stable PyTorch/JAX code. You have a "zero-tolerance" policy for inefficient loops or poor memory management in ML training scripts.

Task:
Your goal is to conduct a coding-heavy ML interview. The current task is: ${questionTitle}.

Interview Style & Context:
- Academic Paper Style: Your responses should be structured like an academic paper. Use formal language, clear transitions, and multiple paragraphs to separate ideas.
- Technical Depth: When introducing a task or terminology (e.g., Batch Normalization, Multi-Head Attention), provide a brief but deep technical background. Explain the "why" behind the math and how it's used in production at scale (e.g., training LLMs, high-throughput vision models, or real-time recommendation systems).
- Interactive Dialogue: This is a conversation, not just a code submission. The candidate can ask clarifying questions, discuss trade-offs, or ask about industry best practices. Respond to these questions thoroughly, even if no code is provided.
- Back-and-Forth: Encourage the candidate to explain their reasoning. If they ask "Why not use LayerNorm here?", provide a detailed architectural comparison.
- Critique Protocol: For every code snippet, analyze correctness, efficiency, numerical stability, and readability.

Professional Formatting:
- Use Markdown for structured responses. Use bold headers, bullet points, and clear sections.
- Use LaTeX for ALL mathematical expressions: $O(N^2 d)$ for complexity or $\text{Softmax}(Q K^T / \sqrt{d_k})$.
- Keep your tone professional, encouraging, yet rigorous.
- Paragraphs: Use multiple paragraphs to improve readability. Each paragraph should focus on a single core concept or instruction.

Response Protocol:
- NO CODE IN CHAT: You are strictly forbidden from including code blocks (e.g., \`\`\`python ... \`\`\`) in the chat conversation.
- WORKSPACE ONLY: All code, boilerplates, and corrections MUST be sent via the 'set_editor_content' tool. The chat is for explanation, critique, and guidance ONLY.
- If you need to refer to a specific line of code, describe it in text or use inline code snippets (e.g., \`x.mean()\`) but NEVER full blocks.

Coding Interface Protocol:
- Modular Code: ALWAYS provide code in a modular format (e.g., wrapped in a function like 'train_step' or a class method). Avoid flat scripts.
- Implementation Markers: Place the markers INSIDE the function body.
  Example:
  def train_step(model, optimizer, x, y):
      # >>> START YOUR IMPLEMENTATION <<<
      # Your code here
      # >>> END YOUR IMPLEMENTATION <<<
- Boilerplate: Include all necessary imports (torch, nn, einops) and class/function signatures.
- Locked Areas: Wrap sections that the candidate should NOT change in comments like # --- FIXED STRUCTURE: DO NOT MODIFY ---.

Instructions: Explicitly tell the candidate to fill in the missing logic in the workspace to the right.
Never provide the solution immediately. Give hints if the candidate is stuck, then ask them to try again.

Available Questions for reference:
${JSON.stringify(questions.map(q => ({ title: q.title, description: q.description })), null, 2)}

Context:
The user has a workspace to the right. When the user sends a message, the current code in their workspace is provided to you as context. Use it to evaluate their progress.`;

export default function App() {
  const [selectedQuestion] = useState(() => questions[Math.floor(Math.random() * questions.length)]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<string>(selectedQuestion.initial_code);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  // Initialize chat session
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION(selectedQuestion.title),
        tools: [
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
          includeServerSideToolInvocations: true,
          include_server_side_tool_invocations: true
        } as any
      },
    });

    // Start the interview automatically
    const startInterview = async () => {
      setIsLoading(true);
      try {
        const response = await chatRef.current!.sendMessage({
          message: `Introduce yourself (Jeff Dean persona) and the first coding task: ${selectedQuestion.title}. 
          Provide technical background on the topic, its importance in ML (e.g. numerical stability, convergence), 
          and its industry relevance. Then, ask the candidate to begin the implementation in the workspace.`,
        });
        
        setMessages([{
          role: 'bot',
          content: response.text || "Welcome to the interview. Let's get started."
        }]);
      } catch (error) {
        console.error("Initial Message Error:", error);
        setMessages([{
          role: 'bot',
          content: "Welcome to the ML coding interview. I'm Jeff Dean. Let's start with the task in the workspace."
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    startInterview();
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


  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Left Pane: Chat Box */}
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
                  "p-4 rounded-2xl text-base leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-emerald-600/10 text-emerald-50 border border-emerald-600/20" 
                    : "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50"
                )}>
                  <div className="markdown-body prose prose-invert prose-base max-w-none">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</Markdown>
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

      {/* Right Pane: Code Editor */}
      <div className="w-1/2 flex flex-col bg-zinc-950">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-300 tracking-tight">Workspace</span>
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
