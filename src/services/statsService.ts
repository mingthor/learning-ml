export interface QuestionStats {
  viewCount: number;
  skipCount: number;
  mastery: number;
  updatedAt: any;
}

export const incrementViewCount = async (questionId: string) => {
  try {
    const response = await fetch(`/api/stats/${questionId}/view`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to increment view count');
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
};

export const incrementSkipCount = async (questionId: string) => {
  try {
    const response = await fetch(`/api/stats/${questionId}/skip`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to increment skip count');
  } catch (error) {
    console.error('Error incrementing skip count:', error);
  }
};

export const updateMasteryScore = async (questionId: string, score: number) => {
  try {
    const response = await fetch(`/api/stats/${questionId}/mastery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: Math.max(0, Math.min(10, score)) }),
    });
    if (!response.ok) throw new Error('Failed to update mastery score');
  } catch (error) {
    console.error('Error updating mastery score:', error);
  }
};

export const fetchAllStats = async (): Promise<Record<string, QuestionStats>> => {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {};
  }
};

export const testConnection = async () => {
  // SQLite connection is handled by the server
  return true;
}
