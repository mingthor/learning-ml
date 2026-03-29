import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat } from "@google/genai";
import { ChatPane } from './components/ChatPane';
import { EditorPane } from './components/EditorPane';
import { questions, GEMINI_API_KEY } from './constants';
import { createChatSession, sendMessageToGemini } from './services/gemini';
import { Message } from './types';

export default function App() {
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState(() => questions[Math.floor(Math.random() * questions.length)]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<string>(selectedQuestion.initial_code);
  const chatRef = useRef<Chat | null>(null);

  // Initialize chat session
  useEffect(() => {
    if (!GEMINI_API_KEY) {
      setMessages([{
        role: 'bot',
        content: "### ⚠️ Configuration Required\n\nTo interact with Jeff Dean in the deployed application, you must provide a valid **Gemini API Key**.\n\n**How to fix this:**\n1. Go to the **Settings** menu (gear icon) in the bottom left of the AI Studio interface.\n2. Add a new environment variable:\n   - **Key:** `GEMINI_API_KEY`\n   - **Value:** Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n3. Re-deploy or restart the application.\n\n*Note: In the preview environment, this key is often provided automatically.*"
      }]);
      return;
    }

    chatRef.current = createChatSession(selectedQuestion.title, selectedQuestion.follow_up);

    // Start the interview automatically
    setMessages([{
      role: 'bot',
      content: selectedQuestion.initial_message || "I'm Jeff Dean. Let's start with the task in the workspace."
    }]);
  }, [selectedQuestion]);

  const processGeminiResponse = async (prompt: string) => {
    if (isLoading || !chatRef.current) return;

    setIsLoading(true);
    try {
      const response = await sendMessageToGemini(chatRef.current, prompt, code);

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

  const handleSkipQuestion = useCallback(() => {
    if (isLoading) return;
    
    const filteredQuestions = selectedTag === 'all' 
      ? questions 
      : questions.filter(q => q.tag === selectedTag);

    let nextQuestion;
    if (filteredQuestions.length > 1) {
      do {
        nextQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
      } while (nextQuestion.id === selectedQuestion.id);
    } else if (filteredQuestions.length === 1) {
      nextQuestion = filteredQuestions[0];
    } else {
      // Fallback if no questions match (shouldn't happen with current tags)
      nextQuestion = questions[Math.floor(Math.random() * questions.length)];
    }
    
    setSelectedQuestion(nextQuestion);
    setCode(nextQuestion.initial_code);
    setMessages([]);
  }, [selectedQuestion, isLoading, selectedTag]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <ChatPane 
        messages={messages}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isLoading={isLoading}
      />
      <EditorPane 
        code={code}
        setCode={setCode}
        onRequestSolution={handleRequestSolution}
        onSkipQuestion={handleSkipQuestion}
        isLoading={isLoading}
        question={selectedQuestion}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />
    </div>
  );
}
