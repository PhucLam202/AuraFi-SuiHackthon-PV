import axios from "axios";
import dotenv from "dotenv";
import { CoinBalance, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getAllWalletPositions } from "@kunalabs-io/kai";
import { Message } from "../types/chat";
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
  ): Promise<Message> {
    const intent = await this.detectIntent(message);

    let aiContent = "";

    switch (intent) {
      case "greeting":
        aiContent = await this.generateGreeting();
        break;
      case "analyze_portfolio_risk":
        aiContent = await this.analyzePortfolioRisk(userAddress);
        break;
      case "analyze_positions":
        aiContent = await this.analyzePositions(userAddress);
        break;
      default:
        aiContent = await this.generateAIResponse(message);
        break;
    }

    const responseMessage: Message = {
      id: Date.now().toString(),
      from: "assistant",
      content: aiContent,
      avatar: "https://github.com/openai.png",
      name: "AI Assistant",
      timestamp: new Date().toISOString(),
      codeBlocks: [],
    };

    return responseMessage;
  }

  /**
   * Detects the intent of a user's message using the OpenAI API.
   * This function sends a request to the OpenAI API with the given message
   * and returns the detected intent as a string.
   * 
   * @param message The message to detect the intent of.
   */
  private async detectIntent(message: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1-nano-2025-04-14",
          messages: [
            {
              role: "user",
              content: `What is the intent of the following message: "${message}"? The categories are based on these parameters:
- **greeting**: A message that initiates a conversation or acknowledges the user.
- **analyze_portfolio_risk**: A request to assess the risk associated with the user's investment portfolio, including factors like volatility, asset allocation, and potential losses.
- **analyze_positions**: A request to evaluate specific pool portfolio user have on wallet and check it got any change to be liquidated or not, providing insights on individual assets. Give them advice to manage their positions.

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
      return intent || "unknown";
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

  /**
   * Analyzes the risk associated with the user's investment portfolio.
   * This function calculates the total value of the user's portfolio
   * and uses AI to suggest how to allocate the investment portfolio
   * to minimize risk and optimize profits based on the 24h price changes.
   */
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
            return { data: null };
          })
        )
      );

      coinData.forEach((coin, index) => {
        const response = dexscreenerResponses[index].data;
        if (response && response[0]?.priceChange?.h24) {
          coin.priceChangeH24 = response[0].priceChange.h24;
        } else {
          coin.priceChangeH24 = 0;
        }
      });

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

  /**
   * Generates a random greeting message for the user.
   * This function selects a greeting from a predefined list of messages
   * and returns it as a string. It is used to initiate a conversation
   * with the user in a friendly manner.
   */
  private generateGreeting(): string {
    const greetings = [
      "I am your personal assistant specializing in financial management. How can I assist you today?",
      "Hello! I am your financial assistant. Is there anything I can help you with today?",
      "Hi there! I'm here to help you with financial matters. What do you need assistance with?",
      "Greetings! I am your assistant in the field of finance. Please let me know how I can help!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private async getPositionInfo(client: SuiClient, walletAddress: string) {
    try {
      const positions = await getAllWalletPositions(client, walletAddress);

      const positionDetails = await Promise.all(
        positions.data.map(async (position) => {
          const pool = await position.position.configInfo.fetchPool(client);
          const [supplyPoolX, supplyPoolY] = await Promise.all([
            position.position.configInfo.supplyPoolXInfo.fetch(client),
            position.position.configInfo.supplyPoolYInfo.fetch(client),
          ]);
          const configData = await position.position.configInfo.fetchConfig(
            client
          );
          const inRange = position.position.inRange(pool.currentTick());
          const equity = position.position.calcEquityAmountsHuman({
            poolPrice: pool.currentPrice(),
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          const initialPriceX =
            parseFloat(pool.currentPrice().toString()) * 0.3; 
          const initialPriceY =
            parseFloat(pool.currentPrice().toString()) * 0.3;
          if (
            equity.x.greaterThan(initialPriceX) ||
            equity.y.greaterThan(initialPriceY)
          ) {
            console.warn(
              `Alert: Equity for Position ID ${position.positionCapId} exceeds 30% of initial price!`
            );
          }
          const dexscreenerUrlX = `https://api.dexscreener.com/token-pairs/v1/SUI/${configData.X.typeName}`;
          const dexscreenerUrlY = `https://api.dexscreener.com/token-pairs/v1/SUI/${configData.Y.typeName}`;
          const [responseX, responseY] = await Promise.all([
            axios.get(dexscreenerUrlX).catch((error) => {
              console.error(
                `Error fetching DexScreener for ${dexscreenerUrlX}:`,
                error.message
              );
              return { data: null };
            }),
            axios.get(dexscreenerUrlY).catch((error) => {
              console.error(
                `Error fetching DexScreener for ${dexscreenerUrlY}:`,
                error.message
              );
              return { data: null };
            }),
          ]);

          const priceChangeX = responseX.data?.[0]?.priceChange?.h6 || 0;
          const priceChangeY = responseY.data?.[0]?.priceChange?.h6 || 0;
          if (priceChangeX > equity.x) {
            console.warn(`Alert: Price change for token X exceeds equity!`);
          }
          if (priceChangeY > equity.y) {
            console.warn(`Alert: Price change for token Y exceeds equity!`);
          }
          const debt = position.position.calcDebtAmounts({
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          const lpAmounts = position.position.calcLpAmounts(
            pool.currentPrice()
          );
          const marginLevel = position.position.calcMarginLevel({
            currentPrice: pool.currentPrice(),
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          const liquidationPrices = position.position.calcLiquidationPrices({
            config: configData,
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          const deleveragePrices = position.position.calcDeleveragePrices({
            config: configData,
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          const interestRates = position.position.getInterestRates({
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          return {
            poolName: pool.data.$fullTypeName,
            typeName: pool.data.$typeName,
            positionId: position.positionCapId,
            priceChangeX,
            priceChangeY,
            inRange,
            equity,
            debt: {
              x: debt.x.toString(),
              y: debt.y.toString(),
            },
            lpAmounts: {
              x: lpAmounts.x.toString(),
              y: lpAmounts.y.toString(),
            },
            marginLevel: marginLevel.toDP(4).toString(),
            liquidationPrices: {
              low: liquidationPrices[0].toString(),
              high: liquidationPrices[1].toString(),
            },
            deleveragePrices: {
              low: deleveragePrices[0].toString(),
              high: deleveragePrices[1].toString(),
            },
            interestRates: {
              x: interestRates.x.toString(),
              y: interestRates.y.toString(),
            },
          };
        })
      );

      return positionDetails;
    } catch (error) {
      console.error("Error fetching position info:", error);
      return [];
    }
  }

  /**
   * Analyzes the positions of a user's wallet.
   * This function retrieves the position information for a user's wallet
   * and uses AI to provide recommendations on how to manage their positions.
   * 
   * @param userAddress The address of the user's wallet. 
   */
  public async analyzePositions(userAddress: string): Promise<string> {
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

    try {
      const positionDetails = await this.getPositionInfo(client, userAddress);

      const prompt = `
        Analyze the following positions for the wallet ${userAddress}:
        ${positionDetails
          .map(
            (position: any) => `
              - Position ID: ${position.positionId}
              - In Range: ${position.inRange}
              - Equity: ${JSON.stringify(position.equity)}
              - Price Change X: ${position.priceChangeX}
              - Price Change Y: ${position.priceChangeY}
              - Debt: ${JSON.stringify(position.debt)}
              - LP Amounts: ${JSON.stringify(position.lpAmounts)}
              - Margin Level: ${position.marginLevel}
              - Liquidation Prices: ${JSON.stringify(
                position.liquidationPrices
              )}
              - Deleverage Prices: ${JSON.stringify(position.deleveragePrices)}
              - Interest Rates: ${JSON.stringify(position.interestRates)}
            `
          )
          .join("\n")}
        Based on this information, provide recommendations on how to manage these positions to minimize risk and optimize returns. And with price change at 6h, you should give advice to manage their positions.
      `;

      const analysis = await this.generateAIResponse(prompt);

      return analysis; 
    } catch (error) {
      console.error("Error analyzing positions:", error);
      return "Error analyzing positions"; 
    }
  }
}

export default ChatService;
