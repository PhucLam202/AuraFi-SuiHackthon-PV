import axios from "axios";
import dotenv from "dotenv";
import { Aftermath } from "aftermath-ts-sdk";
import mainnet from "@cetusprotocol/cetus-sui-clmm-sdk";
import { CoinBalance, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
dotenv.config();
interface CoinData {
  coinType: string;
  totalBalance: string;
  priceChangeH24: number | null;
}
class ChatService {
  private OPENAI_API_KEY: string;

  constructor() {
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
  }

  public async processMessage(
    userAddress: string,
    message: string
  ): Promise<string> {
    console.log(`Received message: ${message}`);
    console.log(`Wallet address: ${userAddress}`);
    const intent = await this.detectIntent(message);
    console.log(`Detected intent: ${intent}`);

    let response = "";

    switch (intent) {
      case "greeting":
        response = await this.generateGreeting();
        break;
      case "analyze_portfolio_risk":
        response = await this.analyzePortfolioRisk(userAddress);
        break;
      default:
        response = await this.generateAIResponse(message);
        break;
    }

    console.log(`AI Response: ${response}`);
    return response;
  }

  private async detectIntent(message: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1-nano-2025-04-14",
          messages: [
            {
              role: "user",
              content: `What is the intent of the following message: "${message}"?. The categories are based on these parameters [greeting, analyze_portfolio_risk], you should return only one of them.`,
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
      return intent || "unknown";
    } catch (error) {
      console.error("Error calling AI API for intent detection:", error);
      return "unknown";
    }
  }
  private async analyzePortfolioRisk(userAddress: string): Promise<string> {
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
    try {
      const balance: CoinBalance[] = await client.getAllBalances({
        owner: userAddress,
      });
      const coinData: CoinData[] = balance.map((coin) => ({
        coinType: coin.coinType,
        totalBalance: coin.totalBalance,
        priceChangeH24: 0,
      }));

      const dexscreenerUrls = coinData.map(
        (coin) =>
          `https://api.dexscreener.com/token-pairs/v1/SUI/${coin.coinType}`
      );
      const dexscreenerResponses = await Promise.all(
        dexscreenerUrls.map((url) =>
          axios.get(url).catch((error) => {
            console.error(
              `Error fetching DEX Screener for ${url}:`,
              error.message
            );
            return { data: null }; // Xử lý lỗi cho từng yêu cầu
          })
        )
      );

      // Cập nhật coinData với priceChangeH24
      coinData.forEach((coin, index) => {
        const response = dexscreenerResponses[index].data;
        if (response && response[0]?.priceChange?.h24) {
          coin.priceChangeH24 = response[0].priceChange.h24;
        } else {
          coin.priceChangeH24 = 0;
        }
      });

      // Tính tổng giá trị danh mục (giả định giá USD từ DEX Screener)
      const totalValue = coinData.reduce((sum, coin) => {
        const priceUsd =
          dexscreenerResponses[coinData.indexOf(coin)]?.data?.[0]?.priceUsd ||
          0;
        return sum + Number(coin.totalBalance) * priceUsd;
      }, 0);

      // Tạo prompt cho AI
      const prompt = `
      Analyze the investment portfolio with the following tokens:
      ${coinData
        .map(
          (coin) =>
            `- ${coin.coinType}: Balance ${coin.totalBalance}, 24h Price Change: ${coin.priceChangeH24}%`
        )
        .join("\n")}
      Total portfolio value: ${totalValue} USD.
      Based on the 24h price changes, suggest how to allocate the investment portfolio to minimize risk and optimize profits. And  respons with markdown format. 
  `;
      const aiResponse = await this.generateAIResponse(prompt);

      return aiResponse;
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      return "Error fetching portfolio";
    }
  }
  private generateGreeting(): string {
    const greetings = [
      "I am your personal assistant specializing in financial management. How can I assist you today?",
      "Hello! I am your financial assistant. Is there anything I can help you with today?",
      "Hi there! I'm here to help you with financial matters. What do you need assistance with?",
      "Greetings! I am your assistant in the field of finance. Please let me know how I can help!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private async generateAIResponse(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1-nano-2025-04-14",
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

export default ChatService;
