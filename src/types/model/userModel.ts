import { Room } from "./roonModel";

export interface User {
    email?: string; 
    password?: string; 
    name: string;
    avatar?: string;
    suiAddress?: string;
    authType: 'email' | 'wallet'; 
    createdAt: Date;
    updatedAt: Date;
    refreshTokens: RefreshToken[];
    rooms: Room[];
  }
  
  export interface RefreshToken {
    userId: string;
    token: string;
    expiresAt: Date;
    isRevoked: boolean;
  }