import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GEMINI_API_KEY, SYSTEM_INSTRUCTION } from "../constants";

export const createChatSession = (questionTitle: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION(questionTitle),
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
};

export const sendMessageToGemini = async (chat: Chat, input: string, code: string) => {
  const promptWithContext = `User Message: ${input}\n\n[Current Code in Editor]:\n\`\`\`python\n${code}\n\`\`\``;
  return await chat.sendMessage({
    message: promptWithContext,
  });
};
