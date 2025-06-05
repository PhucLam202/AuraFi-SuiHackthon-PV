export interface Message {
    id: string;
    roomId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    embeddings?: number[]; 
  }