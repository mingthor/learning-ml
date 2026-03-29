export interface Message {
  role: 'user' | 'bot';
  content: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  initial_code: string;
  initial_message: string;
  tag: "ml" | "algorithm" | "system";
  follow_up: string[];
}
