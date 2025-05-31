import axios from "axios";
import dotenv from "dotenv";
import { Aftermath } from "aftermath-ts-sdk";
import mainnet from "@cetusprotocol/cetus-sui-clmm-sdk";
import { CoinBalance, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import {
  FindMaxPositionLiquidityArgs,
  Position,
  getAllWalletPositions,
  POSITION_CONFIG_INFOS,
} from "@kunalabs-io/kai";
import { constrainedMemory } from "process";
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
      case "analyze_positions":
        response = await this.analyzePositions(userAddress);
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

  private async getPositionInfo(client: SuiClient, walletAddress: string) {
    try {
      // Lấy tất cả các vị trí thanh khoản của ví
      const positions = await getAllWalletPositions(client, walletAddress);

      // Xử lý từng vị trí
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
          console.log("equity", equity);
          const debt = position.position.calcDebtAmounts({
            supplyPoolX,
            supplyPoolY,
            timestampMs: Date.now(),
          });
          console.log("debt", debt);
          const lpAmounts = position.position.calcLpAmounts(
            pool.currentPrice()
          );
          console.log("lpAmounts", lpAmounts);
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

  public async analyzePositions(userAddress: string): Promise<string> {
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

    try {
      const positionDetails = await this.getPositionInfo(client, userAddress);

      // Tạo prompt cho AI
      const prompt = `
        Analyze the following positions for the wallet ${userAddress}:
        ${positionDetails
          .map(
            (position: any) => `
              - Position ID: ${position.positionId}
              - In Range: ${position.inRange}
              - Equity: ${JSON.stringify(position.equity)}
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
        Based on this information, provide recommendations on how to manage these positions to minimize risk and optimize returns.
      `;

      // Gọi hàm generateAIResponse
      const analysis = await this.generateAIResponse(prompt);

      return analysis; // Trả về kết quả phân tích
    } catch (error) {
      console.error("Error analyzing positions:", error);
      return "Error analyzing positions"; // Trả về chuỗi thông báo lỗi
    }
  }
}

export default ChatService;
