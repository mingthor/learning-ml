import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GEMINI_API_KEY, SYSTEM_INSTRUCTION } from "../constants";

export const createChatSession = (questionTitle: string, followUp: string[]): Chat => {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION(questionTitle, followUp),
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
            },
            {
              name: "set_mastery_score",
              description: "Sets the user's mastery score for the current question. Call this whenever you observe the user demonstrating a certain level of skill or knowledge. The score should be between 0 and 10.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  score: {
                    type: Type.NUMBER,
                    description: "The mastery score (0-10)."
                  }
                },
                required: ["score"]
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
};

export const sendMessageToGemini = async (chat: Chat, input: string, code: string) => {
  const promptWithContext = `User Message: ${input}\n\n[Current Code in Editor]:\n\`\`\`python\n${code}\n\`\`\``;
  return await chat.sendMessage({
    message: promptWithContext,
  });
};
