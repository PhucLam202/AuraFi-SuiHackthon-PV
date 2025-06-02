import axios from "axios";
import dotenv from "dotenv";

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
  | "unknown";

/**
 * Represents the service for interacting with the AI model.
 * This class provides methods for detecting the intent of a user's message
 * and generating responses using the OpenAI API.
 */
export class AIService {
  private OPENAI_API_KEY: string;
  private OPENAI_MODEL: string;

  constructor() {
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
    // It's good practice to define the model as a configurable constant or env variable
    this.OPENAI_MODEL = "gpt-4.1-nano-2025-04-14";
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
              content: `What is the intent of the following message: "${message}"? The categories are based on these parameters:
  - **greeting**: A message that initiates a conversation or acknowledges the user.
  - **analyze_portfolio_risk**: A request to assess the risk associated with the user's investment portfolio, including factors like volatility, asset allocation, and potential losses.
  - **analyze_positions**: A request to evaluate specific pool portfolio user have on wallet and check it got any change to be liquidated or not, providing insights on individual assets. Give them advice to manage their positions.
  - **get_coin_data**: A request to get the coin data for the user's wallet.
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
}
