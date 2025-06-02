export interface WalletBalance {
  coinType: string;
  balance: bigint;
  symbol: string;
  decimals: number;
  priceUsd?: number;
  valueUsd?: number;
  percentage?: number;
}
