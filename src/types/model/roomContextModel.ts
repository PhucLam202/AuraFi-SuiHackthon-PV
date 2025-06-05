export interface RoomContext {
    id: string;
    roomId: string;
    summary: string;
    keywords: string[];
    userPreferences: Record<string, any>;
    conversationStyle: string;
    lastUpdated: Date;
  }
