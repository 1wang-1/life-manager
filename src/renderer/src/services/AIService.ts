
export interface AISummaryRequest {
  context: string; // Current data context (tasks, focus time, etc.)
  history: string; // Long-term memory or past summaries
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const AIService = {
  async generateSummary(): Promise<string> {
    throw new Error('AI 功能已禁用（API 设置已移除）');
  },

  async chat(): Promise<string> {
    throw new Error('AI 功能已禁用（API 设置已移除）');
  },

  async updateLongTermMemory(currentSummary: string, oldMemory: string): Promise<string> {
    void currentSummary;
    return oldMemory;
  }
};
