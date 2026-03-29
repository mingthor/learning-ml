import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MessageItem } from '../components/MessageItem';
import { Message } from '../types';

// Mock dependencies that might cause issues in test environment
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>
}));

vi.mock('lucide-react', () => ({
  Bot: () => <div data-testid="bot-icon" />,
  User: () => <div data-testid="user-icon" />
}));

describe('MessageItem', () => {
  const userMsg: Message = {
    role: 'user',
    content: 'Hello Jeff'
  };

  const botMsg: Message = {
    role: 'bot',
    content: 'Hello! I am Jeff Dean.'
  };

  it('renders user message correctly', () => {
    render(<MessageItem msg={userMsg} index={0} />);
    expect(screen.getByText('Hello Jeff')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders bot message correctly with badge', () => {
    render(<MessageItem msg={botMsg} index={1} />);
    expect(screen.getByText('Hello! I am Jeff Dean.')).toBeInTheDocument();
    expect(screen.getByText('Jeff Dean')).toBeInTheDocument();
    expect(screen.getByText('Chief Scientist')).toBeInTheDocument();
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });
});
