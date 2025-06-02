import { WalletBalance } from "../types/getcoin";
import { Message } from "../types/chat";
import { AIService } from "./aiService";
import { SuiDataService } from "./suiDataService";
import { NFTAsset } from "../types/NFTs";
import { Transaction } from "../types/transactionHistory";
class ChatService {
  private aiService: AIService;
  private suiDataService: SuiDataService;

  constructor() {
    this.aiService = new AIService();
    this.suiDataService = new SuiDataService();
  }

  public async processMessage(
    userAddress: string,
    message: string
  ): Promise<Message> {
    const intent = await this.aiService.detectIntent(message);

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
      case "get_coin_data":
        aiContent = await this.analyzeCoinData(userAddress);
        break;
      case "get_nft_data":
        aiContent = await this.analyzeNFTData(userAddress);
        break;
      case "get_transaction_history":
        aiContent = await this.analyzeTransactionHistory(userAddress);
        break;
      default:
        aiContent = await this.aiService.generateAIResponse(message);
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
   * Analyzes the risk associated with the user's investment portfolio.
   * This function calculates the total value of the user's portfolio
   * and uses AI to suggest how to allocate the investment portfolio
   * to minimize risk and optimize profits based on the 24h price changes.
   */
  private async analyzePortfolioRisk(userAddress: string): Promise<string> {
    try {
      const { coinData, totalValue } =
        await this.suiDataService.getPortfolioData(userAddress);

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
      const aiResponse = await this.aiService.generateAIResponse(prompt);

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

  /**
   * Analyzes the positions of a user's wallet.
   * This function retrieves the position information for a user's wallet
   * and uses AI to provide recommendations on how to manage their positions.
   *
   * @param userAddress The address of the user's wallet.
   */
  private async analyzePositions(userAddress: string): Promise<string> {
    try {
      const positionDetails = await this.suiDataService.getPositionInfo(
        userAddress
      );

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

      const analysis = await this.aiService.generateAIResponse(prompt);

      return analysis;
    } catch (error) {
      console.error("Error analyzing positions:", error);
      return "Error analyzing positions";
    }
  }
/**
   * Analyzes and presents coin data in a user-friendly format
   */
private async analyzeCoinData(userAddress: string): Promise<string> {
  try {
    const coinData = await this.suiDataService.getCoinData(userAddress);
    
    if (!coinData || coinData.length === 0) {
      return "📊 **Portfolio Overview**: No coin holdings found in your wallet.";
    }

    const prompt = `
      Analyze the following coin holdings and provide insights:
      ${coinData
        .map(
          (coin) =>
            `- ${coin.coinType}: Balance ${coin.totalBalance}, Value: $${coin.totalBalance || 'N/A'}, 24h Change: ${coin.priceChangeH24 || 'N/A'}%`
        )
        .join("\n")}
      
      Please provide:
      1. A summary of the portfolio composition
      2. Performance highlights (best and worst performers)
      3. Any notable observations or recommendations
      4. Risk assessment based on the holdings
      
      Format the response in markdown with clear sections and use emojis for better readability.
    `;

    const analysis = await this.aiService.generateAIResponse(prompt);
    return analysis;
  } catch (error) {
    console.error("Error fetching coin data:", error);
    return "❌ **Error**: Unable to fetch coin data. Please check your wallet address and try again.";
  }
}

/**
   * Analyzes and presents NFT data in a user-friendly format
   */
private async analyzeNFTData(userAddress: string): Promise<string> {
  try {
    const nftData = await this.suiDataService.getNFTs(userAddress);
    
    if (!nftData || nftData.length === 0) {
      return "🖼️ **NFT Collection**: No NFTs found in your wallet.";
    }

    const prompt = `
      Analyze the following NFT collection:
      ${nftData
        .map(
          (nft, index) =>
            `${index + 1}. ${nft.name || 'Unnamed NFT'} - Collection: ${nft.collection || 'Unknown'}, Type: ${nft.type || 'N/A'}`
        )
        .join("\n")}
      
      Please provide:
      1. Overview of the NFT collection (total count, variety)
      2. Collection analysis (which collections are represented)
      3. Any notable or valuable pieces (if identifiable)
      4. General insights about the NFT portfolio
      
      Format the response in markdown with clear sections and use emojis for better readability.
    `;

    const analysis = await this.aiService.generateAIResponse(prompt);
    return analysis;
  } catch (error) {
    console.error("Error fetching NFT data:", error);
    return "❌ **Error**: Unable to fetch NFT data. Please check your wallet address and try again.";
  }
}

    /**
   * Analyzes and presents transaction history in a user-friendly format
   */
    private async analyzeTransactionHistory(userAddress: string): Promise<string> {
      try {
        const transactionHistory = await this.suiDataService.getTransactionHistory(userAddress);
        console.log("transactionHistory", transactionHistory);
        
        if (!transactionHistory || transactionHistory.length === 0) {
          return "📝 **Transaction History**: No recent transactions found for your wallet.";
        }
  
        const prompt = `
          Analyze the following recent transaction history:
          ${transactionHistory
            .slice(0, 10) // Limit to recent 10 transactions for analysis
            .map(
              (tx, index) =>
                `${index + 1}. Type: ${tx.type || 'Unknown'}, Status: ${tx.status || 'N/A'}, Date: ${tx.timestamp || 'N/A'}`
            )
            .join("\n")}
          
          Please provide:
          1. Transaction activity summary (frequency, types)
          2. Spending/earning patterns analysis
          3. Recent activity highlights
          4. Any recommendations based on transaction patterns
          5. Security observations (if any unusual activity)
          
          Format the response in markdown with clear sections and use emojis for better readability.
        `;
  
        const analysis = await this.aiService.generateAIResponse(prompt);
        return analysis;
      } catch (error) {
        console.error("Error fetching transaction history:", error);
        return "❌ **Error**: Unable to fetch transaction history. Please check your wallet address and try again.";
      }
    }
  
}

export default ChatService;
