import { describe, it, expect, vi } from 'vitest';
import { createChatSession, sendMessageToGemini } from '../services/gemini';

// Mock @google/genai
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    chats = {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockResolvedValue({
          text: 'Mocked response'
        })
      })
    };
  }
  return {
    GoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING'
    }
  };
});

describe('Gemini Service', () => {
  it('creates a chat session', () => {
    const chat = createChatSession('Test Question', ['Follow up 1']);
    expect(chat).toBeDefined();
  });

  it('sends a message to Gemini', async () => {
    const mockChat = {
      sendMessage: vi.fn().mockResolvedValue({ text: 'Mocked response' })
    } as any;

    const response = await sendMessageToGemini(mockChat, 'Hello', 'print("test")');
    expect(response.text).toBe('Mocked response');
    expect(mockChat.sendMessage).toHaveBeenCalledWith({
      message: expect.stringContaining('Hello')
    });
    expect(mockChat.sendMessage).toHaveBeenCalledWith({
      message: expect.stringContaining('print("test")')
    });
  });
});
