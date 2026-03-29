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
  tag: string[];
  follow_up: string[];
}
