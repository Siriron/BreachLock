import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT_ADDRESSES, RECEIPT_CONFIG, type NetworkKey } from "@/config/chains";
import { ensureChain } from "@/lib/ensureChain";

// Confirmed working genlayer-js subpaths (project knowledge section 7):
// "genlayer-js" (root), "genlayer-js/chains", "genlayer-js/types". There
// is NO "genlayer-js/utils" subpath — it does not exist. Any Viem-shaped
// helper (parseEther, formatEther, etc.) is imported directly from
// "viem" instead, which is declared as an explicit package.json
// dependency, never assumed as a hoisted transitive one.
import { parseEther, formatEther } from "viem";

const CHAIN_OBJECTS = {
  studionet,
  bradbury: testnetBradbury,
};

export function useGenLayer(network: NetworkKey) {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Silently reconnect on mount if already authorized — eth_accounts,
  // never eth_requestAccounts, which would prompt unexpectedly.
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts[0]) setAccount(accounts[0]);
      })
      .catch(() => {});

    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts[0] || null);
    if (eth.on) eth.on("accountsChanged", handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      throw new Error("No wallet found. Install a wallet extension to continue.");
    }
    setConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) setAccount(accounts[0]);
    } finally {
      setConnecting(false);
    }
  }, []);

  const readClient = useMemo(() => {
    return createClient({ chain: CHAIN_OBJECTS[network] });
  }, [network]);

  const getWriteClient = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No wallet found.");
    if (!account) throw new Error("Wallet not connected.");

    await ensureChain(network);

    const client = createClient({
      chain: CHAIN_OBJECTS[network],
      account,
      provider: eth, // required — confirmed in Sigil's working code, section 7
    });

    // Defensive: not in any official example, but present in Sigil's
    // actual working code. Guarded so contracts built on SDK versions
    // without this method don't throw.
    if (typeof (client as any).connect === "function") {
      try {
        await (client as any).connect(network === "studionet" ? "studionet" : "testnetBradbury");
      } catch {
        // non-fatal — proceed without it
      }
    }

    return client;
  }, [account, network]);

  const contractAddress = CONTRACT_ADDRESSES[network];

  const readContractMethod = useCallback(
    async (method: string, args: any[] = []) => {
      const raw = await readClient.readContract({
        address: contractAddress as `0x${string}`,
        functionName: method,
        args,
      });
      // readContract returns a JSON string — always parse it.
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    },
    [readClient, contractAddress]
  );

  const writeContractMethod = useCallback(
    async (method: string, args: any[] = [], valueGen: string | number = 0) => {
      const client = await getWriteClient();
      const value = valueGen ? parseEther(String(valueGen)) : BigInt(0);

      const txHash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: method,
        args,
        value, // required even when unused
      });

      const receiptCfg = RECEIPT_CONFIG[network];
      try {
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash,
          status: TransactionStatus.ACCEPTED,
          retries: receiptCfg.retries,
          interval: receiptCfg.interval,
        });
        return { txHash, receipt, timedOut: false };
      } catch {
        // Consensus (propose -> commit -> reveal -> accept, potentially
        // across multiple leader-rotation rounds) genuinely takes real
        // minutes for any write triggering an LLM judgment — every write
        // here does. A timeout here does not mean the transaction
        // failed; surface the explorer link rather than a bare error.
        return { txHash, receipt: null, timedOut: true };
      }
    },
    [getWriteClient, contractAddress, network]
  );

  return {
    account,
    connecting,
    connect,
    readContractMethod,
    writeContractMethod,
    contractAddress,
  };
}

export { formatEther };
