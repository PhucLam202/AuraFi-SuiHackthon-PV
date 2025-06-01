export interface Message {
  id: string;
  from: "user" | "assistant";
  content: string;
  avatar: string;
  name: string;
  timestamp: string;
  codeBlocks: any[]; // Bạn có thể định nghĩa kiểu chi tiết hơn cho codeBlocks nếu cần
} 