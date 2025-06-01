export interface Message {
  id: string;
  from: "user" | "assistant";
  content: string;
  avatar: string;
  name: string;
  timestamp: string;
  codeBlocks: any[];
} 