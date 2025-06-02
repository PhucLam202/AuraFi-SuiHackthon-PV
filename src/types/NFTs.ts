export interface NFTAsset {
  objectId: string;
  name: string;
  description: string;
  imageUrl: string;
  collection: string;
  collectionAddress: string;
  type: string;
  attributes: Array<{ trait_type: string; value: any }>;
  rawData?: any; // For debugging
}
