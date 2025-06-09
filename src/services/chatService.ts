import { Message } from "../types/chat";
import { AIService } from "./aiService";
import { SuiDataService } from "./suiDataService";
import { ErrorMessages } from "@middlewares/e/ErrorMessages";
import { ErrorCode } from "@middlewares/e/ErrorCode";
import { RoomRepository } from "../repository/RoomRepository";
import mongoose from "mongoose";
import { MessageRepository } from "../repository/MessageRepository";
import Room from "../models/roomModel";
import { v7 as uuidv7 } from 'uuid';

class ChatService {
  private aiService: AIService;
  private suiDataService: SuiDataService;
  constructor() {
    this.aiService = new AIService();
    this.suiDataService = new SuiDataService();
  }

  public async processMessage(
    userAddress: string,
    message: string,
    roomId: string,
    userId: string
  ): Promise<Message> {
    // 1. Validate room exists
    const room = await Room.findById(roomId);
    if (!room) {
      throw new Error(ErrorMessages[ErrorCode.ROOM_NOT_FOUND]);
    }
    
    // 2. Get recent messages for context from EMBEDDED messages
    const recentMessages = room.messages ? room.messages.slice(-10) : [];
    
    // 3. Prepare user message object (DO NOT save separately if schema is embedded)
    const userMessageObject = {
      _id: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(roomId),
      role: "user" as const,
      content: message,
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
     console.log("userMessageObject", userMessageObject);

    // 4. Build conversation context (include new user message)
    const conversationContext = [
      ...recentMessages.map(msg => msg.content),
      message
    ].join("\n");

    // 5. Generate AI response based on intent
    let aiContent = "";
    const intent = await this.aiService.detectIntent(message);

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
      case "sui_network_info":
        aiContent = await this.suiNetworkInfo();
        break;
      case "defi_operations":
        aiContent = await this.defiOperations();
        break;
      case "market_analysis":
        aiContent = await this.marketAnalysis();
        break;
      case "undefined":
      default:
        // Use conversation context for better AI response
        aiContent = await this.aiService.generateAIResponse(conversationContext);
        break;
    }
    console.log("aiContent", aiContent);

    // 6. Prepare AI message object (DO NOT save separately)
    const aiMessageObject = {
      _id: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(roomId),
      role: "assistant" as const,
      content: aiContent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    console.log("aiMessageObject", aiMessageObject);

    // 7. Update room with new messages - Push EMBEDDED objects
    await Room.findByIdAndUpdate(roomId, {
      $push: {
        messages: {
          $each: [userMessageObject, aiMessageObject],
          $position: -1
        }
      },
      $set: {
        updatedAt: new Date()
      }
    });
    
    // 8. Update room context AFTER processing (optional - only if needed)
    const updatedRoom = await Room.findById(roomId);
    const allMessagesInRoom = updatedRoom?.messages || [];
    const shouldUpdateContext = allMessagesInRoom.length > 5;

    if (shouldUpdateContext) {
        const messagesTextForContext = allMessagesInRoom.map(m => m.content).join("\n");
        console.log("messagesTextForContext", messagesTextForContext);
        this.updateRoomContextAsync(roomId, messagesTextForContext);
    }

    // 9. Return response message using the actual AI message content and generated ID for client
    return {
      id: uuidv7(),
      from: "assistant",
      content: aiContent,
      avatar: "https://github.com/openai.png",
      name: "AI Assistant",
      timestamp: aiMessageObject.createdAt.toISOString(),
      codeBlocks: [],
    };
  }
  
  // Helper method for async context update
  private async updateRoomContextAsync(roomId: string, messagesText: string) {
    try {
      const summary = await this.aiService.generateAIResponse(
        `Summarize the following conversation context: ${messagesText}`
      );
      
      // Extract keywords (you can implement this logic)
      const keywords = await this.extractKeywordsFromText(messagesText);
      
      await Room.findByIdAndUpdate(roomId, {
        $set: {
          "context.summary": summary,
          "context.keywords": keywords,
          "context.lastUpdated": new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating room context:", error);
      // Don't throw error - this is background operation
    }
  }
  
  private async extractKeywordsFromText(text: string): Promise<string[]> {
    // Simple keyword extraction - you can make this more sophisticated
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const keywords = words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
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
            `- ${coin.coinType}: Balance ${coin.totalBalance}, Value: $${
              coin.totalBalance || "N/A"
            }, 24h Change: ${coin.priceChangeH24 || "N/A"}%`
        )
        .join("\n")}
      First of all you show how many coins you have in your wallet and then you show the coinType.
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
            `${index + 1}. ${nft.name || "Unnamed NFT"} - Collection: ${
              nft.collection || "Unknown"
            }, Type: ${nft.type || "N/A"}`
        )
        .join("\n")}
      First of all you show how many NFTs you have in your wallet and then you show the NFT collection.
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
  private async analyzeTransactionHistory(
    userAddress: string
  ): Promise<string> {
    try {
      const transactionHistory =
        await this.suiDataService.getTransactionHistory(userAddress);

      if (!transactionHistory || transactionHistory.length === 0) {
        return "📝 **Transaction History**: No recent transactions found for your wallet.";
      }

      const prompt = `
You are a virtual financial assistant reviewing a user's recent on-chain transaction activity.

Here is the user's 10 most recent transactions:
${transactionHistory
  .slice(0, 10)
  .map(
    (tx, index) =>
      `${index + 1}. Type: ${tx.type || "Unknown"}, Status: ${
        tx.status || "N/A"
      }, Date: ${tx.timestamp || "N/A"}`
  )
  .join("\n")}

Please provide a concise and insightful analysis from the perspective of a senior virtual assistant. Keep the tone natural, helpful, and experienced — like you're assisting someone with both practical and security concerns.

Your analysis should include:

### 1. 🔍 Recent Activity Overview
- What patterns or notable timing do you observe?
- Does the activity suggest high engagement, automation, or typical usage?

### 2. 💡 Smart Recommendations
- What actions would you suggest to optimize or protect this wallet's transaction behavior?
- Mention anything odd or repetitive worth flagging.

### 3. 🔒 Security Insights
- Do you spot any red flags (e.g., repetitive transactions, time clustering)?
- Suggest best practices for wallet security and gas efficiency.

Keep the formatting clean using Markdown with emojis. Respond as if you're part of a smart wallet assistant app helping the user understand their blockchain footprint and make informed next steps.
`;

      const analysis = await this.aiService.generateAIResponse(prompt);
      return analysis;
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      return "❌ **Error**: Unable to fetch transaction history. Please check your wallet address and try again.";
    }
  }

  /**
   * Provides information about the Sui network
   */
  private async suiNetworkInfo(): Promise<string> {
    try {
      
      const prompt = `
      Provide comprehensive information about the Sui blockchain network based on the following data
      Please include:
      1. 🌐 **Network Overview** - Current status, performance metrics
      2. 📊 **Key Statistics** - Transaction volume, active validators, etc.
      3. 🔧 **Technical Details** - Block time, consensus mechanism
      4. 💡 **For Developers** - Key features and capabilities
      5. 🚀 **Recent Updates** - Any notable network improvements
      
      Format in markdown with emojis for better readability.
      `;

      const analysis = await this.aiService.generateAIResponse(prompt);
      return analysis;
    } catch (error) {
      console.error("Error fetching Sui network info:", error);
      return `
🌐 **Sui Network Information**

Sui is a high-performance blockchain designed for the next billion users. Here are the key highlights:

### 🔥 **Core Features**
- **Instant Finality**: Transactions are confirmed immediately
- **Parallel Execution**: Multiple transactions processed simultaneously
- **Object-Centric Model**: Unique approach to data storage and processing
- **Move Programming Language**: Safe and expressive smart contract language

### 📊 **Network Capabilities**
- **High Throughput**: Capable of processing thousands of TPS
- **Low Latency**: Sub-second transaction confirmation
- **Scalable Architecture**: Designed to grow with demand

### 💡 **Use Cases**
- DeFi protocols and applications
- Gaming and NFT platforms
- Social applications
- Enterprise solutions

For real-time network statistics, please check the official Sui explorer or try again later.
      `;
    }
  }

   /**
   * Provides information about DeFi operations and opportunities
   */
   private async defiOperations(): Promise<string> {
    try {
      // You can extend this to get actual DeFi data if available
      const prompt = `
      Provide comprehensive information about DeFi operations available on the Sui blockchain.
      
      Please include:
      1. 🏦 **Available DeFi Protocols** - Major DEXs, lending platforms, yield farming
      2. 💰 **Yield Opportunities** - Staking, liquidity provision, farming strategies
      3. ⚠️ **Risk Assessment** - Common risks and how to mitigate them
      4. 📚 **Getting Started Guide** - Step-by-step for beginners
      5. 🔄 **Popular Strategies** - Common DeFi strategies on Sui
      
      Format in markdown with emojis and make it educational and actionable.
      `;

      const analysis = await this.aiService.generateAIResponse(prompt);
      return analysis;
    } catch (error) {
      console.error("Error generating DeFi operations info:", error);
      return `
🏦 **DeFi Operations on Sui**

### 🌟 **Popular DeFi Protocols**
- **Cetus Protocol**: Leading DEX for token swaps and liquidity provision
- **Kriya DEX**: Automated market maker with competitive fees
- **Turbos Finance**: Concentrated liquidity protocol
- **Scallop**: Lending and borrowing platform

### 💰 **Earning Opportunities**
1. **Liquidity Provision**: Earn fees by providing liquidity to DEX pools
2. **Staking**: Stake SUI tokens to earn rewards
3. **Yield Farming**: Participate in incentivized pools
4. **Lending**: Lend assets to earn interest

### ⚠️ **Risk Management**
- **Impermanent Loss**: Understand LP risks before providing liquidity
- **Smart Contract Risk**: Only use audited and established protocols
- **Market Risk**: DeFi yields can be volatile
- **Slippage**: Set appropriate slippage tolerance for trades

### 🚀 **Getting Started**
1. Connect your wallet to supported DeFi platforms
2. Start with small amounts to learn
3. Research protocols thoroughly before investing
4. Keep some SUI for transaction fees
5. Monitor your positions regularly

Always DYOR (Do Your Own Research) before participating in any DeFi protocol!
      `;
    }
  }
  private async marketAnalysis(): Promise<string> {
    try {
      // You can extend this to include real market data
      const prompt = `
      Provide a comprehensive market analysis for the Sui ecosystem and broader crypto market.
      
      Please include:
      1. 📈 **Market Overview** - Current trends and sentiment
      2. 🪙 **SUI Token Analysis** - Price action, key levels, catalysts
      3. 🏗️ **Ecosystem Growth** - Protocol adoption, TVL trends
      4. 📊 **Technical Analysis** - Support/resistance levels if applicable
      5. 🔮 **Market Outlook** - Potential opportunities and risks
      6. 💡 **Investment Considerations** - Key factors to watch
      
      Format in markdown with emojis. Keep analysis objective and educational.
      `;

      const analysis = await this.aiService.generateAIResponse(prompt);
      return analysis;
    } catch (error) {
      console.error("Error generating market analysis:", error);
      return `
📊 **Market Analysis - Sui Ecosystem**

### 🌟 **Sui Ecosystem Overview**
The Sui blockchain continues to show strong development momentum with growing adoption across DeFi, gaming, and NFT sectors.

#### 📈 **Key Metrics to Watch**
- **Total Value Locked (TVL)**: Monitor DeFi protocol growth
- **Daily Active Users**: Measure ecosystem adoption
- **Transaction Volume**: Network utilization trends
- **Developer Activity**: GitHub commits and new projects

### 🪙 **SUI Token Fundamentals**
- **Utility**: Gas fees, staking, governance participation
- **Tokenomics**: Capped supply with deflationary mechanisms
- **Staking Rewards**: Currently earning rewards for validators

### 🏗️ **Ecosystem Catalysts**
1. **New Protocol Launches**: Major DeFi and gaming projects
2. **Partnership Announcements**: Enterprise and institutional adoption
3. **Technical Upgrades**: Network improvements and new features
4. **Market Sentiment**: Overall crypto market conditions

### ⚠️ **Risk Factors**
- Market volatility and macro conditions
- Competition from other Layer 1 blockchains
- Regulatory changes affecting crypto markets
- Technical risks and smart contract vulnerabilities

### 💡 **Investment Considerations**
- **DYOR**: Always research before making investment decisions
- **Diversification**: Don't put all funds in one asset or protocol
- **Risk Management**: Only invest what you can afford to lose
- **Long-term View**: Consider the technology's long-term potential

*This is educational content and not financial advice. Please consult with financial professionals for investment decisions.*
      `;
    }
  }

}

export default ChatService;
