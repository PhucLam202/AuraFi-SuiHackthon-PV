import axios from "axios";
import { CoinBalance, getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getAllWalletPositions } from "@kunalabs-io/kai";
import { NFTAsset } from "../types/NFTs";
import { Transaction, TransactionType } from "../types/transactionHistory";

interface MessageData {
  id: string;
  from: string;
  content: string;
  avatar: string;
  name: string;
  timestamp: string;
  codeBlocks: any[];
}

interface UserMessage {
  message: string;
}

interface TransactionSummary {
  totalTransactions: number;
  timeRange: {
    start: Date;
    end: Date;
    duration: string;
  };
  gasSpending: {
    total: number;
    average: number;
    currency: string;
  };
  insights: string[];
  recommendations: string[];
}

interface CoinData {
  coinType: string;
  totalBalance: string;
  priceChangeH24: number | null;
  symbol: string;
  decimals: number;
}

export class SuiDataService {
  private client: SuiClient;

  constructor() {
    this.client = new SuiClient({ url: getFullnodeUrl("mainnet") });
  }
  public async getCoinData(userAddress: string): Promise<CoinData[]> {
    try {
      const balances = await this.client.getAllBalances({
        owner: userAddress,
      });

      const coinDataPromises = balances.map(async (coin) => {
        let symbol = "UNKNOWN";
        let decimals = 9;
        let priceChangeH24: number | null = null;

        try {
          const metadata = await this.client.getCoinMetadata({
            coinType: coin.coinType,
          });
          symbol = metadata?.symbol || "UNKNOWN";
          decimals = metadata?.decimals || 9;
        } catch (metaError) {
          console.warn(`Could not fetch metadata for ${coin.coinType}:`, metaError);
        }

        try {
          const tokenSymbol = symbol.toLowerCase();
          if (tokenSymbol !== "unknown" && tokenSymbol !== "sui") {
            const dexScreenerResponse = await axios.get(
              `https://api.dexscreener.com/latest/dex/tokens/${tokenSymbol}`
            );
            const pairs = dexScreenerResponse.data.pairs;
            if (pairs && pairs.length > 0) {
              const relevantPair = pairs.find((p: any) => 
                p.quoteToken.symbol === 'USDT' || 
                p.quoteToken.symbol === 'USDC' || 
                p.quoteToken.symbol === 'SUI'
              );
              if (relevantPair) {
                priceChangeH24 = relevantPair.priceChange.h24;
              }
            }
          } else if (tokenSymbol === "sui") {
            priceChangeH24 = null; 
          }
        } catch (priceError) {
          console.warn(`Could not fetch price data for ${symbol}:`, priceError);
          priceChangeH24 = null;
        }

        return {
          coinType: coin.coinType,
          totalBalance: coin.totalBalance.toString(),
          symbol,
          decimals,
          priceChangeH24,
        };
      });

      return Promise.all(coinDataPromises);
    } catch (error) {
      console.error("Error fetching coin data:", error);
      return [];
    }
  }

  public async getNFTs(address: string): Promise<NFTAsset[]> {
    try {
      // Lấy tất cả objects trước, sau đó filter NFTs
      const allObjects = await this.client.getOwnedObjects({
        owner: address,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
          showOwner: true,
        },
      });

      // Filter NFTs dựa trên các đặc điểm của NFT trên Sui
      const nftObjects = allObjects.data.filter((obj) => {
        if (!obj.data?.type) return false;
        
        const type = obj.data.type;
        
        // NFTs thường có display metadata hoặc thuộc các collection cụ thể
        const hasDisplay = obj.data.display && Object.keys(obj.data.display.data || {}).length > 0;
        
        // Loại bỏ các system objects và coins
        const isSystemObject = type.startsWith('0x2::coin::Coin') || 
                              type.startsWith('0x3::staking_pool::') ||
                              type.startsWith('0x2::dynamic_field::') ||
                              type === '0x2::package::UpgradeCap';
        
        // Check xem có phải NFT collection phổ biến
        const isKnownNFTCollection = this.isKnownNFTCollection(type);
        
        return !isSystemObject && (hasDisplay || isKnownNFTCollection);
      });
      // Parse NFT data
      const nfts = await Promise.all(
        nftObjects.map(async (obj) => {
          try {
            const display = obj.data?.display?.data || {};
            const rawContent = obj.data?.content; // Lấy raw content

            // Khởi tạo contentFields rỗng, sau đó gán nếu rawContent là MoveObject
            let contentFields: Record<string, any> = {};
            if (rawContent && 'dataType' in rawContent && rawContent.dataType === 'moveObject') {
              contentFields = rawContent.fields;
            }
            
            // Extract name từ display hoặc contentFields
            const name = display.name || 
                        contentFields.name || 
                        this.extractNameFromType(obj.data?.type || '') ||
                        'Unknown NFT';

            // Extract description
            const description = display.description || 
                              contentFields.description || 
                              '';

            // Extract image URL
            const imageUrl = display.image_url || 
                           display.img_url ||
                           contentFields.image_url ||
                           contentFields.url ||
                           '';

            // Extract collection info
            const collection = this.extractCollectionInfo(obj.data?.type || '');

            // Thêm metadata khác nếu có
            const attributes = this.extractAttributes(contentFields); // Truyền contentFields vào extractAttributes
            
            return {
              objectId: obj.data?.objectId || '',
              name,
              description,
              imageUrl,
              collection: collection.name,
              collectionAddress: collection.address,
              type: obj.data?.type || '',
              attributes,
              rawData: obj.data, 
            };
          } catch (error) {
            console.error('Error parsing NFT:', obj.data?.objectId, error);
            return {
              objectId: obj.data?.objectId || '',
              name: 'Parse Error NFT',
              description: 'Failed to parse NFT data',
              imageUrl: '',
              collection: 'Unknown',
              collectionAddress: '',
              type: obj.data?.type || '',
              attributes: [],
            };
          }
        })
      );
      return nfts.filter(nft => nft !== null);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  }

  public async getTransactionHistory(address: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const txs = await this.client.queryTransactionBlocks({
        filter: {
          FromAddress: address,
        },
        limit,
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
        },
      });

      return txs.data.map((tx) => ({
        digest: tx.digest,
        timestamp: parseInt(tx.timestampMs || '0'),
        type: this.parseTransactionType(tx),
        gasFee: this.calculateGasFee(tx),
        status: tx.effects?.status?.status === 'success' ? 'success' : 'failed',
        details: tx,
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Fetches and processes portfolio data for a given user address,
   * including coin balances and 24h price changes from DexScreener.
   * @param userAddress The address of the user's wallet.
   * @returns An object containing coin data and total portfolio value.
   */
  public async getPortfolioData(
    userAddress: string
  ): Promise<{ coinData: CoinData[]; totalValue: number }> {
    try {
      const balance: CoinBalance[] = await this.client.getAllBalances({
        owner: userAddress,
      });
      const coinData: CoinData[] = balance.map((coin) => ({
        coinType: coin.coinType,
        totalBalance: coin.totalBalance,
        priceChangeH24: 0, // Initialize to 0, will be updated
        symbol: '',
        decimals: 0,
      }));

      const dexscreenerUrls = coinData.map(
        (coin) =>
          `https://api.dexscreener.com/latest/dex/tokens/${coin.coinType}` // Corrected DexScreener API path
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
        // DexScreener API returns an array of pairs, we might need to pick the most relevant one
        // For simplicity, let's assume the first pair is relevant or check for 'pairs' array
        if (response && response.pairs && response.pairs.length > 0) {
          coin.priceChangeH24 = response.pairs[0].priceChange.h24;
        } else {
          coin.priceChangeH24 = 0;
        }
      });

      const totalValue = coinData.reduce((sum, coin) => {
        const response =
          dexscreenerResponses[coinData.indexOf(coin)]?.data?.pairs;
        const priceUsd =
          response && response.length > 0
            ? parseFloat(response[0].priceUsd)
            : 0;
        return sum + Number(coin.totalBalance) * priceUsd;
      }, 0);

      return { coinData, totalValue };
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      return { coinData: [], totalValue: 0 };
    }
  }

  /**
   * Retrieves detailed position information for a given wallet address.
   * @param walletAddress The address of the user's wallet.
   * @returns An array of detailed position objects.
   */
  public async getPositionInfo(walletAddress: string) {
    try {
      const positions = await getAllWalletPositions(this.client, walletAddress);

      const positionDetails = await Promise.all(
        positions.data.map(async (position) => {
          const pool = await position.position.configInfo.fetchPool(
            this.client
          );
          const [supplyPoolX, supplyPoolY] = await Promise.all([
            position.position.configInfo.supplyPoolXInfo.fetch(this.client),
            position.position.configInfo.supplyPoolYInfo.fetch(this.client),
          ]);
          const configData = await position.position.configInfo.fetchConfig(
            this.client
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
          // Corrected DexScreener API path
          const dexscreenerUrlX = `https://api.dexscreener.com/latest/dex/tokens/${configData.X.typeName}`;
          const dexscreenerUrlY = `https://api.dexscreener.com/latest/dex/tokens/${configData.Y.typeName}`;
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

          // Access priceChange from the 'pairs' array
          const priceChangeX = responseX.data?.pairs?.[0]?.priceChange?.h6 || 0;
          const priceChangeY = responseY.data?.pairs?.[0]?.priceChange?.h6 || 0;

          // The comparison `priceChangeX > equity.x` seems incorrect as equity.x is a BigNumber and priceChangeX is a percentage.
          // This warning might need re-evaluation based on what you intend to compare.
          // For now, I'll keep the original logic but add a comment.
          if (priceChangeX > equity.x.toNumber()) {
            // Assuming equity.x can be converted to number for comparison
            console.warn(`Alert: Price change for token X exceeds equity!`);
          }
          if (priceChangeY > equity.y.toNumber()) {
            // Assuming equity.y can be converted to number for comparison
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
  private extractCollectionInfo(type: string): { name: string; address: string } {
    const parts = type.split('::');
    if (parts.length >= 2) {
      return {
        address: parts[0],
        name: parts[1].replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
      };
    }
    return { name: 'Unknown Collection', address: '' };
  }
  private extractNameFromType(type: string): string {
    // Extract tên từ type string
    const parts = type.split('::');
    if (parts.length >= 3) {
      return parts[2].replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    }
    return 'NFT';
  }
  private extractAttributes(content: any): Array<{ trait_type: string; value: any }> {
    const attributes: Array<{ trait_type: string; value: any }> = [];
    
    if (!content) return attributes;
    
    // Check for standard attributes field
    if (content.attributes && Array.isArray(content.attributes)) {
      return content.attributes;
    }
    
    // Extract other properties as attributes
    Object.entries(content).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'description' && key !== 'image_url' && key !== 'url') {
        attributes.push({
          trait_type: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
          value: value
        });
      }
    });
    
    return attributes;
  }
  private isKnownNFTCollection(type: string): boolean {
    const knownCollections = [
      'sui_frens', 'suins', 'cosmocadia', 'clutchy', 'capy',
      'bluemove', 'tocen', 'aftermath', 'kriya', 'cetus','StakedWal'
    ];
    
    return knownCollections.some(collection => 
      type.toLowerCase().includes(collection.toLowerCase())
    );  
  }

  private parseTransactionType(tx: any): TransactionType {
    // Logic to parse transaction type based on transaction data
    const kind = tx.transaction?.data?.transaction;
    if (this.isSwapTransaction(tx)) {
      return TransactionType.SWAP;
    }

    // Check for staking transactions
    if (this.isStakingTransaction(tx)) {
      return TransactionType.STAKING;
    }

    // Check for reward claims
    if (this.isRewardClaimTransaction(tx)) {
      return TransactionType.CLAIM_REWARD;
    }

    // Check for transfers
    if (this.isTransferTransaction(tx)) {
      return TransactionType.TRANSFER;
    }

    // Check for NFT minting
    if (this.isNFTMintTransaction(tx)) {
      return TransactionType.MINT_NFT;
    }

    return TransactionType.OTHER;
  }
  private isSwapTransaction(txData: any): boolean {
    // Check for common DEX package IDs on Sui
    const dexPackages = [
      '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb', // Cetus
      '0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1', // Turbos
      // Add more DEX package IDs
    ];

    return txData.transaction?.kind === 'ProgrammableTransaction' &&
           dexPackages.some(pkg => JSON.stringify(txData).includes(pkg));
  }
  private isStakingTransaction(tx: any): boolean {
    // Check for staking system calls
    return JSON.stringify(tx).includes('0x3::sui_system') ||
           JSON.stringify(tx).includes('request_add_stake') ||
           JSON.stringify(tx).includes('request_withdraw_stake');
  }

  private isRewardClaimTransaction(tx: any): boolean {
    return JSON.stringify(tx).includes('claim') ||
           JSON.stringify(tx).includes('harvest') ||
           JSON.stringify(tx).includes('collect_reward');
  }

  private isTransferTransaction(tx: any): boolean {
    return tx.transaction?.kind === 'ProgrammableTransaction' &&
           JSON.stringify(tx).includes('transfer');
  }

  private isNFTMintTransaction(tx: any): boolean {
    return JSON.stringify(tx).includes('mint') &&
           (JSON.stringify(tx).includes('nft') || 
            JSON.stringify(tx).includes('collection'));
  }

  /**
   * Calculate gas fee in SUI from transaction data
   */
  private calculateGasFee(rawTx: any): number {
    const gasUsed = rawTx.effects?.gasUsed;
    if (!gasUsed) return 0;

    const totalGas = (gasUsed.computationCost || 0) + 
                    (gasUsed.storageCost || 0) - 
                    (gasUsed.storageRebate || 0);
    
    // Convert from MIST to SUI (1 SUI = 10^9 MIST)
    return totalGas / 1_000_000_000;
  }
  // private calculateGasFee(tx: any): number {
  //   const gasBudget = tx.transaction?.data?.gasData?.budget || 0;
  //   const gasUsed = tx.effects?.gasUsed?.computationCost || 0;
  //   return Number(gasUsed) / 1e9; // Convert to SUI
  // }
}

class MessageAnalyzer {
  /**
   * Parse and format the message data for better AI understanding
   */
  static formatMessageForAI(messageData: MessageData[], userMessage: UserMessage): {
    conversation: any;
    userIntent: string;
    context: any;
  } {
    // Parse the conversation
    const conversation = messageData.map(msg => ({
      role: msg.from === 'assistant' ? 'assistant' : 'user',
      timestamp: new Date(msg.timestamp),
      content: this.extractKeyInfo(msg.content),
      hasCodeBlocks: msg.codeBlocks.length > 0
    }));

    // Analyze user intent
    const userIntent = this.analyzeUserIntent(userMessage.message);

    // Extract context from previous conversation
    const context = this.extractContext(messageData);

    return {
      conversation: {
        messages: conversation,
        totalMessages: conversation.length,
        hasTransactionAnalysis: context.hasTransactionData,
        lastActivity: conversation[conversation.length - 1]?.timestamp
      },
      userIntent,
      context
    };
  }

  /**
   * Extract key information from message content
   */
  private static extractKeyInfo(content: string): any {
    // Check if content contains transaction analysis
    if (content.includes('Transaction Analysis Report')) {
      return this.parseTransactionReport(content);
    }

    // Check for other structured data
    if (content.includes('Total Transactions:')) {
      return this.parseSimpleStats(content);
    }

    return {
      type: 'text',
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      fullContent: content
    };
  }

  /**
   * Parse transaction report from content
   */
  private static parseTransactionReport(content: string): any {
    const lines = content.split('\n');
    const report = {
      type: 'transaction_analysis',
      totalTransactions: 0,
      transactionTypes: {} as Record<string, number>,
      timeframe: '',
      gasInfo: '',
      recommendations: [] as string[]
    };

    lines.forEach(line => {
      // Extract total transactions
      if (line.includes('Total Transactions:')) {
        const match = line.match(/\*\*(\d+)\*\*/);
        if (match) report.totalTransactions = parseInt(match[1]);
      }

      // Extract timeframe
      if (line.includes('Date:') && line.includes('June')) {
        report.timeframe = line.trim();
      }

      // Extract recommendations
      if (line.includes('**') && (line.includes('Clarify') || line.includes('Monitor') || line.includes('Set'))) {
        report.recommendations.push(line.replace(/\*\*/g, '').trim());
      }
    });

    return report;
  }

  /**
   * Analyze user intent from their message
   */
  private static analyzeUserIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('gas') && lowerMessage.includes('spend')) {
      return 'gas_analysis';
    }
    if (lowerMessage.includes('transaction') && lowerMessage.includes('read')) {
      return 'transaction_review';
    }
    if (lowerMessage.includes('app') && lowerMessage.includes('most')) {
      return 'app_usage_analysis';
    }
    if (lowerMessage.includes('analysis') || lowerMessage.includes('report')) {
      return 'detailed_analysis';
    }

    return 'general_inquiry';
  }

  /**
   * Extract context from message history
   */
  private static extractContext(messageData: MessageData[]): any {
    const context = {
      hasTransactionData: false,
      previousAnalysis: null as any,
      userConcerns: [] as string[],
      timeframe: null as string | null
    };

    messageData.forEach(msg => {
      if (msg.content.includes('Transaction Analysis Report')) {
        context.hasTransactionData = true;
        context.previousAnalysis = this.parseTransactionReport(msg.content);
      }
      
      if (msg.from !== 'assistant' && msg.content.includes('gas')) {
        context.userConcerns.push('gas_costs');
      }
    });

    return context;
  }

  /**
   * Generate improved response structure for AI
   */
  static generateImprovedResponse(
    userIntent: string, 
    context: any, 
    transactionData?: any[]
  ): {
    responseType: string;
    focusAreas: string[];
    suggestedFormat: string;
    dataPoints: string[];
  } {
    const response = {
      responseType: 'structured_analysis',
      focusAreas: [] as string[],
      suggestedFormat: 'markdown_report',
      dataPoints: [] as string[]
    };

    switch (userIntent) {
      case 'gas_analysis':
        response.focusAreas = [
          'Total gas spent across all transactions',
          'Average gas cost per transaction',
          'Most expensive transactions (by gas)',
          'Gas efficiency by app/protocol',
          'Recommendations for gas optimization'
        ];
        response.dataPoints = [
          'Total SUI spent on gas',
          'USD equivalent of gas costs',
          'Gas cost distribution (low/medium/high)',
          'Most gas-expensive apps',
          'Time-based gas spending patterns'
        ];
        break;

      case 'transaction_review':
        response.focusAreas = [
          'Transaction frequency and patterns',
          'Success vs failed transactions',
          'Types of activities performed',
          'Apps and protocols used',
          'Timeline of activities'
        ];
        response.dataPoints = [
          'Total transaction count',
          'Transaction success rate',
          'Most used protocols',
          'Transaction types distribution',
          'Activity timeline'
        ];
        break;

      case 'app_usage_analysis':
        response.focusAreas = [
          'Most frequently used applications',
          'Gas cost per application',
          'Transaction success rate per app',
          'Value/utility analysis',
          'Usage pattern recommendations'
        ];
        response.dataPoints = [
          'App usage frequency ranking',
          'Gas cost per app comparison',
          'Transaction volume per app',
          'User activity patterns',
          'Cost-effectiveness analysis'
        ];
        break;
    }

    return response;
  }

  /**
   * Format transaction data for better readability
   */
  static formatTransactionData(transactions: any[]): {
    summary: TransactionSummary;
    readableFormat: string;
    insights: string[];
  } {
    if (!transactions || transactions.length === 0) {
      return {
        summary: {
          totalTransactions: 0,
          timeRange: { start: new Date(), end: new Date(), duration: '0 days' },
          gasSpending: { total: 0, average: 0, currency: 'SUI' },
          insights: ['No transaction data available'],
          recommendations: ['Please provide transaction data for analysis']
        },
        readableFormat: 'No transactions to display',
        insights: ['No data available for analysis']
      };
    }

    const timestamps = transactions.map(tx => tx.timestamp).sort();
    const startDate = new Date(timestamps[0]);
    const endDate = new Date(timestamps[timestamps.length - 1]);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const totalGas = transactions.reduce((sum, tx) => sum + (tx.gasFee || 0), 0);
    const averageGas = totalGas / transactions.length;

    const summary: TransactionSummary = {
      totalTransactions: transactions.length,
      timeRange: {
        start: startDate,
        end: endDate,
        duration: `${durationDays} days`
      },
      gasSpending: {
        total: totalGas,
        average: averageGas,
        currency: 'SUI'
      },
      insights: this.generateInsights(transactions),
      recommendations: this.generateRecommendations(transactions)
    };

    const readableFormat = this.createReadableFormat(transactions, summary);

    return {
      summary,
      readableFormat,
      insights: summary.insights
    };
  }

  private static generateInsights(transactions: any[]): string[] {
    const insights: string[] = [];
    
    // Transaction frequency
    if (transactions.length > 20) {
      insights.push('High transaction activity - you are an active user');
    } else if (transactions.length > 5) {
      insights.push('Moderate transaction activity');
    } else {
      insights.push('Low transaction activity - consider exploring more DeFi opportunities');
    }

    // Gas efficiency
    const totalGas = transactions.reduce((sum, tx) => sum + (tx.gasFee || 0), 0);
    const avgGas = totalGas / transactions.length;
    
    if (avgGas > 0.01) {
      insights.push('Gas costs are relatively high - consider optimizing transaction timing');
    } else if (avgGas > 0.005) {
      insights.push('Gas costs are moderate - good transaction efficiency');
    } else {
      insights.push('Excellent gas efficiency - you are making cost-effective transactions');
    }

    return insights;
  }

  private static generateRecommendations(transactions: any[]): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Monitor gas prices and transact during low-fee periods');
    recommendations.push('Consider batching multiple operations into single transactions');
    recommendations.push('Review transaction patterns to identify optimization opportunities');
    recommendations.push('Set up alerts for unusual transaction activity');
    
    return recommendations;
  }

  private static createReadableFormat(transactions: any[], summary: TransactionSummary): string {
    return `
# 📊 Your Sui Wallet Transaction Summary

## 🔍 Overview
- **Total Transactions**: ${summary.totalTransactions}
- **Time Period**: ${summary.timeRange.start.toLocaleDateString()} to ${summary.timeRange.end.toLocaleDateString()}
- **Duration**: ${summary.timeRange.duration}

## 💰 Gas Spending Analysis
- **Total Gas Spent**: ${summary.gasSpending.total.toFixed(4)} ${summary.gasSpending.currency}
- **Average per Transaction**: ${summary.gasSpending.average.toFixed(4)} ${summary.gasSpending.currency}

## 📈 Key Insights
${summary.insights.map(insight => `- ${insight}`).join('\n')}

## 💡 Recommendations
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}
`;
  }

  private static parseSimpleStats(content: string): any {
    const stats: Record<string, any> = { type: 'simple_stats' };
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.includes('Total Transactions:')) {
        const match = line.match(/Total Transactions: (\d+)/);
        if (match) stats.totalTransactions = parseInt(match[1]);
      }
      // Add more parsing logic for other simple stats if needed
    });
    return stats;
  }
}
