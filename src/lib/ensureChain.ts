import { CHAIN_CONFIGS, type NetworkKey } from "@/config/chains";

/**
 * Confirmed working pattern (project knowledge section 7, adapted from
 * Sigil's ensureChain). Call this immediately before every write — never
 * on every network-toggle click, since switching the wallet's chain just
 * from glancing at a different network's page would trigger an unwanted
 * wallet popup. The network toggle in the UI is only display state; the
 * actual chain switch happens here, at write time.
 */
export async function ensureChain(network: NetworkKey): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) return;
  const cfg = CHAIN_CONFIGS[network];
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: cfg.chainId }],
    });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: cfg.chainId,
            chainName: cfg.chainName,
            rpcUrls: cfg.rpcUrls,
            nativeCurrency: cfg.nativeCurrency,
            blockExplorerUrls: cfg.blockExplorerUrls,
          },
        ],
      });
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cfg.chainId }],
      });
    } else if (err && err.code === -32002) {
      // A wallet_switchEthereumChain request is already pending — wait
      // rather than stack a second prompt.
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}
