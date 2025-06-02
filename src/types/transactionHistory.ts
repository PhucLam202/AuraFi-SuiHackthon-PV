export interface Transaction {
  digest: string;
  timestamp: number;
  type: "swap" | "stake" | "unstake" | "claim" | "transfer";
  gasFee: number;
  status: "success" | "failed";
  details: any;
  profitLoss?: number;
}
