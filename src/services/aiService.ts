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
              role: "user",
              content: `What is the intent of the following message: "${message}"? The categories are based on these parameters and you should return only one of them:
  - **undefined**: If the message is a general query, asks for information not covered by the other categories, or is not directly actionable within the defined intents.
  - **greeting**: A message that initiates a conversation or acknowledges the user.
  - **analyze_portfolio_risk**: A request to assess the risk associated with the user's investment portfolio, including factors like volatility, asset allocation, and potential losses.
  - **analyze_positions**: A request to evaluate specific pool portfolio user have on wallet and check it got any change to be liquidated or not, providing insights on individual assets. Give them advice to manage their positions.
  - **get_coin_data**: A request to retrieve specific data (e.g., price, balance, holdings) about cryptocurrencies *within the user's wallet* or for a *specific, named coin*.
  - **get_nft_data**: A request to get the nft data for the user's wallet.
  - **get_transaction_history**: A request to get the transaction history for the user's wallet.
  You should return only one of them.`,
            },
          ],
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
          messages: [{ role: "user", content: prompt }],
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
