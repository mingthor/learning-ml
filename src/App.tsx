import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat } from "@google/genai";
import { ChatPane } from './components/ChatPane';
import { EditorPane } from './components/EditorPane';
import { questions, GEMINI_API_KEY } from './constants';
import { createChatSession, sendMessageToGemini } from './services/gemini';
import { Message, Question } from './types';
import { auth, signIn, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { fetchAllStats, incrementViewCount, incrementSkipCount, updateMasteryScore, QuestionStats, testConnection } from './services/statsService';
import { LogIn, LogOut, Loader2, BarChart3 } from 'lucide-react';
import { StatsModal } from './components/StatsModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, QuestionStats>>({});
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<string>('');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const chatRef = useRef<Chat | null>(null);

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    testConnection();
    return () => unsubscribe();
  }, []);

  // Fetch Stats
  const refreshStats = useCallback(async () => {
    if (!user) return;
    const newStats = await fetchAllStats();
    setStats(newStats);
    return newStats;
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshStats();
    }
  }, [user, refreshStats]);

  // Sampling Logic: Pick question with least views
  const pickLeastShownQuestion = useCallback((tag: string, currentStats: Record<string, QuestionStats>, excludeId?: string) => {
    const filtered = tag === 'all' 
      ? questions 
      : questions.filter(q => q.tag === tag);
    
    if (filtered.length === 0) return questions[0];

    // Get view counts for filtered questions
    const viewCounts = filtered.map(q => ({
      question: q,
      views: currentStats[q.id]?.viewCount || 0
    })).filter(item => item.question.id !== excludeId);

    const candidates = viewCounts.length > 0 ? viewCounts : filtered.map(q => ({
      question: q,
      views: currentStats[q.id]?.viewCount || 0
    }));

    // Find min views
    const minViews = Math.min(...candidates.map(c => c.views));
    
    // Filter for those with min views
    const leastShown = candidates.filter(c => c.views === minViews);
    
    // Pick random from least shown
    return leastShown[Math.floor(Math.random() * leastShown.length)].question;
  }, []);

  // Initialize first question
  useEffect(() => {
    if (user && !selectedQuestion && Object.keys(stats).length >= 0) {
      const firstQuestion = pickLeastShownQuestion('all', stats);
      setSelectedQuestion(firstQuestion);
      setCode(firstQuestion.initial_code);
      incrementViewCount(firstQuestion.id);
    }
  }, [user, stats, selectedQuestion, pickLeastShownQuestion]);

  // Initialize chat session
  useEffect(() => {
    if (!selectedQuestion) return;

    if (!GEMINI_API_KEY) {
      setMessages([{
        role: 'bot',
        content: "### ⚠️ Configuration Required\n\nTo interact with Jeff Dean in the deployed application, you must provide a valid **Gemini API Key**.\n\n**How to fix this:**\n1. Go to the **Settings** menu (gear icon) in the bottom left of the AI Studio interface.\n2. Add a new environment variable:\n   - **Key:** `GEMINI_API_KEY`\n   - **Value:** Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n3. Re-deploy or restart the application.\n\n*Note: In the preview environment, this key is often provided automatically.*"
      }]);
      return;
    }

    chatRef.current = createChatSession(selectedQuestion.title, selectedQuestion.follow_up);

    const formattedInitialMessage = `${selectedQuestion.initial_message}\n\nPlease implement the missing logic in the workspace to the right.`;
    
    setMessages([{
      role: 'bot',
      content: formattedInitialMessage
    }]);
  }, [selectedQuestion]);

  const processGeminiResponse = async (prompt: string) => {
    if (isLoading || !chatRef.current) return;

    setIsLoading(true);
    try {
      const response = await sendMessageToGemini(chatRef.current, prompt, code);

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === 'set_editor_content') {
            const newCode = (call.args as any).code;
            if (newCode) setCode(newCode);
          }
          if (call.name === 'set_mastery_score' && selectedQuestion) {
            const score = (call.args as any).score;
            if (typeof score === 'number') {
              await updateMasteryScore(selectedQuestion.id, score);
              await refreshStats();
            }
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

  const handleSend = useCallback(async () => {
    const currentInput = input.trim();
    if (!currentInput || isLoading || !chatRef.current) return;

    const userMessage: Message = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await processGeminiResponse(currentInput);
  }, [input, isLoading, code]);

  const handleRequestSolution = useCallback(async () => {
    if (isLoading || !chatRef.current) return;

    const requestMessage = "I'm stuck. Please show me the best solution for this task.";
    const userMessage: Message = { role: 'user', content: requestMessage };
    setMessages(prev => [...prev, userMessage]);
    
    await processGeminiResponse(requestMessage);
  }, [isLoading, code]);

  const handleSkipQuestion = useCallback(async (tagOverride?: string) => {
    if (isLoading || !selectedQuestion) return;
    
    // Increment skip count for the current question
    await incrementSkipCount(selectedQuestion.id);

    const currentTag = tagOverride !== undefined ? tagOverride : selectedTag;
    
    // Refresh stats to get latest view counts
    const latestStats = await refreshStats() || stats;
    
    const nextQuestion = pickLeastShownQuestion(currentTag, latestStats, selectedQuestion.id);
    
    setSelectedQuestion(nextQuestion);
    setCode(nextQuestion.initial_code);
    
    // Increment view count for the new question
    await incrementViewCount(nextQuestion.id);
    
    const formattedInitialMessage = `${nextQuestion.initial_message}\n\nPlease implement the missing logic in the workspace to the right.`;
    setMessages([{
      role: 'bot',
      content: formattedInitialMessage
    }]);

    chatRef.current = createChatSession(nextQuestion.title, nextQuestion.follow_up);
  }, [selectedQuestion, isLoading, selectedTag, stats, refreshStats, pickLeastShownQuestion]);

  const handleTagChange = useCallback((newTag: string) => {
    setSelectedTag(newTag);
    handleSkipQuestion(newTag);
  }, [handleSkipQuestion]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Jeff Dean Interview</h1>
            <p className="text-zinc-400">Sign in to track your progress and start the interview.</p>
          </div>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!selectedQuestion) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <ChatPane 
        messages={messages}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isLoading={isLoading}
        onSignOut={signOut}
        statsActive={true}
        onOpenStats={() => {
          refreshStats();
          setIsStatsOpen(true);
        }}
      />
      <EditorPane 
        code={code}
        setCode={setCode}
        onRequestSolution={handleRequestSolution}
        onSkipQuestion={() => handleSkipQuestion()}
        isLoading={isLoading}
        question={selectedQuestion}
        selectedTag={selectedTag}
        setSelectedTag={handleTagChange}
      />
      <StatsModal 
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
      />
    </div>
  );
}
