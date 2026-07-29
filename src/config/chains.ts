// Confirmed network config — see project knowledge section 7. Never
// hardcode these values anywhere else in the app; import from here.

export type NetworkKey = "studionet" | "bradbury";

export interface ChainConfig {
  chainId: string; // hex, for wallet_switchEthereumChain / wallet_addEthereumChain
  chainIdDecimal: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls: string[];
}

export const CHAIN_CONFIGS: Record<NetworkKey, ChainConfig> = {
  bradbury: {
    chainId: "0x107D", // 4221
    chainIdDecimal: 4221,
    chainName: "GenLayer Bradbury",
    rpcUrls: ["https://rpc-bradbury.genlayer.com"],
    nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
    blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
  },
  studionet: {
    chainId: "0xF22F", // 61999
    chainIdDecimal: 61999,
    chainName: "GenLayer StudioNet",
    rpcUrls: ["https://studio.genlayer.com/api"],
    nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
    blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
  },
};

// Contract addresses — populated once deployed to each network. Read
// from environment variables, never hardcoded, per section 7/9.
export const CONTRACT_ADDRESSES: Record<NetworkKey, string> = {
  studionet: import.meta.env.VITE_CONTRACT_ADDRESS_STUDIONET || "",
  bradbury: import.meta.env.VITE_CONTRACT_ADDRESS_BRADBURY || "",
};

// Receipt-wait config — GenLayer consensus genuinely takes real minutes,
// especially for any write that triggers an LLM judgment (every write in
// this contract does). Confirmed reasonable values per section 7.
export const RECEIPT_CONFIG: Record<NetworkKey, { retries: number; interval: number }> = {
  studionet: { retries: 120, interval: 4000 },
  bradbury: { retries: 240, interval: 6000 },
};

export const FAUCET_URL = "https://testnet-faucet.genlayer.foundation";
