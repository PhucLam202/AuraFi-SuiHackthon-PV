import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { OpenAI } from "openai";
import Room from '../models/roomModel';
dotenv.config();

/**
 * Represents the categories of intents that can be detected by the AI model.
 * These categories are used to categorize the user's message into a specific action or response.
 */
export type IntentCategory =
  | "greeting"
  | "analyze_portfolio_risk"
  | "analyze_positions"
  | "get_coin_data"
  | "get_nft_data"
  | "get_transaction_history"
  | "sui_network_info"
  | "defi_operations"
  | "market_analysis"
  | "unknown"
  | "undefined";

/**
 * Represents the service for interacting with the AI model.
 * This class provides methods for detecting the intent of a user's message
 * and generating responses using the OpenAI API.
 */
export class AIService {
  private OPENAI_API_KEY: string;
  private OPENAI_MODEL: string;
  private openai: OpenAI;

  constructor() {
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
    // It's good practice to define the model as a configurable constant or env variable
    this.OPENAI_MODEL = "gpt-4.1-nano-2025-04-14";
    this.openai = new OpenAI({
      apiKey: this.OPENAI_API_KEY,
    });
  }

  /**
   * Detects the intent of a user's message using the OpenAI API.
   * This function sends a request to the OpenAI API with the given message
   * and returns the detected intent as a string.
   *
   * @param message The message to detect the intent of.
   */
  public async detectIntent(message: string): Promise<IntentCategory> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.OPENAI_MODEL,
          messages: [
            {
              role: "system",
              content: `You are an intent classifier for a Sui blockchain assistant. Your job is to classify user messages into specific categories. Always return ONLY the category name, nothing else.`
            },
            {
              role: "user",
              content: `Classify this message into ONE of these categories: "${message}"
  
  CATEGORIES WITH EXAMPLES:
  
  **greeting**
  - Examples: "hello", "hi there", "good morning", "hey", "what's up"
  - When: User initiates conversation or greets the assistant
  
  **analyze_portfolio_risk** 
  - Examples: "assess my portfolio risk", "how risky is my investment", "what's my risk exposure", "portfolio risk analysis"
  - When: User wants overall portfolio risk assessment, volatility analysis, or risk metrics
  
  **analyze_positions**
  - Examples: "check my positions", "am I at risk of liquidation", "analyze my DeFi positions", "review my lending positions", "position health check"
  - When: User wants to check specific positions for liquidation risk or position management advice
  
  **get_coin_data**
  - Examples: "SUI price", "my SUI balance", "show me USDC data", "what's the price of MOVE", "my token holdings"
  - When: User asks for price, balance, or data about specific cryptocurrencies
  
  **get_nft_data**
  - Examples: "show my NFTs", "NFT collection", "my digital collectibles", "NFT portfolio", "what NFTs do I own"
  - When: User wants to see their NFT assets or collections
  
  **get_transaction_history**
  - Examples: "transaction history", "my recent transactions", "show transactions", "payment history", "transfer history"
  - When: User wants to view their transaction records
  
  **sui_network_info**
  - Examples: "what is Sui", "Sui network status", "Sui ecosystem", "how does Sui work", "Sui vs Ethereum"
  - When: User asks about Sui blockchain, network information, or ecosystem
  
  **defi_operations**
  - Examples: "how to stake SUI", "provide liquidity", "yield farming", "lending protocols", "DEX trading"
  - When: User wants to perform DeFi operations or learn about DeFi on Sui

  **technical_support**
  - Examples: "transaction failed", "error message", "can't connect", "app not working", "troubleshooting"
  - When: User encounters technical problems or errors
  
  **market_analysis**
  - Examples: "market trends", "price prediction", "market analysis", "crypto outlook", "market sentiment"
  - When: User wants market insights or analysis beyond specific coin data
  
  **undefined**
  - Examples: "random question", "off-topic", "unclear request", "ambiguous message"
  - When: Message doesn't fit other categories or is unclear
  
  Return ONLY the category name.`
            }
          ],
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const intent = response.data.choices[0]?.message?.content
        ?.trim()
        .toLowerCase();

      const validIntents: IntentCategory[] = [
        "greeting",
        "analyze_portfolio_risk",
        "analyze_positions",
        "get_coin_data",
        "get_nft_data",
        "get_transaction_history",
        "sui_network_info",
        "defi_operations",
        "market_analysis",
        "undefined",
      ];

      if (intent && validIntents.includes(intent as IntentCategory)) {
        return intent as IntentCategory;
      }

      return "unknown";
    } catch (error) {
      console.error("Error calling AI API for intent detection:", error);
      return "unknown";
    }
  }
  /**
   * Generates a response from the AI model.
   * This function sends a request to the OpenAI API with the given prompt
   * and returns the response as a string.
   *
   * @param prompt The prompt to send to the AI model.
   */
  public async generateAIResponse(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
          {
            model: this.OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an AI assistant for the Sui blockchain. You are helpful and friendly."
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
          },
        {
          headers: {
            Authorization: `Bearer ${this.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return (
        response.data.choices[0]?.message?.content || "No response from AI."
      );
    } catch (error) {
      console.error("Error calling AI API:", error);
      return "Error generating response.";
    }
  }

  async createEmbeddings(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    
    return response.data[0].embedding;
  }
  
  async findSimilarMessages(roomId: string, query: string, limit = 5) {
    const queryEmbedding = await this.createEmbeddings(query);
    
    // Sử dụng vector similarity search
    const similarMessages = await this.findSimilar(roomId, queryEmbedding, limit);
    
    return similarMessages;
  }
  async findSimilar(roomId: string, queryEmbedding: number[], limit: number = 5): Promise<any[]> {
    // Note: Requires MongoDB Atlas với Vector Search setup
    return await Room.aggregate([
      {
        $vectorSearch: {
          index: 'message_embeddings_index',
          path: 'embeddings',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit,
          filter: {
            roomId: new mongoose.Types.ObjectId(roomId)
          }
        }
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]);
  }
}
