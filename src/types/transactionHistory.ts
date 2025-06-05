export interface Transaction {
  digest: string;
  timestamp: number;
  type: TransactionType;
  gasFee: number;
  status: "success" | "failed";
  details: any;
  profitLoss?: number;
}

export enum TransactionType {
  SWAP = 'swap',
  STAKING = 'staking',
  CLAIM_REWARD = 'claim_reward',
  TRANSFER = 'transfer',
  MINT_NFT = 'mint_nft',
  CONTRACT_CALL = 'contract_call',
  OTHER = 'other'
}