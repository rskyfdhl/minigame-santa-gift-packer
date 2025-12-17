// src/web3/wallet.js
import toast from "react-hot-toast";

const SOMNIA_MAINNET = {
  chainId: "0x13A7", // 5031 - keeping uppercase as canonical
  chainName: "Somnia Mainnet",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: ["https://dream-rpc.somnia.network"],
  blockExplorerUrls: ["https://somnia.w3us.site"],
};

// Helper function to normalize chain ID comparison
const normalizeChainId = (chainId) => {
  if (typeof chainId === "string") {
    return chainId.toLowerCase();
  }
  if (typeof chainId === "number") {
    return `0x${chainId.toString(16)}`.toLowerCase();
  }
  return chainId;
};

const isCorrectChain = (chainId) => {
  const normalized = normalizeChainId(chainId);
  const expected = normalizeChainId(SOMNIA_MAINNET.chainId);
  console.log(
    `[Chain Check] Current: ${normalized}, Expected: ${expected}, Match: ${
      normalized === expected
    }`
  );
  return normalized === expected;
};

/* ============================================================
   🔍 WALLET DETECTION (Desktop / Mobile)
============================================================ */
export const detectMobileWallet = () => {
  const ua = navigator.userAgent;

  return {
    isMobile: /iPhone|iPad|iPod|Android/i.test(ua),
    metaMask: /MetaMask/i.test(ua),
    okx: /OKX|OKXWallet/i.test(ua),
    bitget: /Bitget|BitKeep/i.test(ua),
    tokenPocket: /TokenPocket/i.test(ua),
    kucoin: /KuCoin/i.test(ua),
    trust: /Trust/i.test(ua),
    coinbase: /Coinbase/i.test(ua),
  };
};

/* ============================================================
   📱 MOBILE DEEP-LINK REDIRECTOR
============================================================ */
export const openMobileWallet = () => {
  const url = encodeURIComponent(window.location.href);
  const w = detectMobileWallet();

  if (w.metaMask) {
    window.location.href = `https://metamask.app.link/dapp/${url}`;
    return;
  }

  if (w.okx) {
    window.location.href = `okx://wallet/dapp/url?url=${url}`;
    return;
  }

  if (w.bitget) {
    window.location.href = `bitkeep://dapp?url=${url}`;
    return;
  }

  if (w.tokenPocket) {
    window.location.href = `tpbrowser://open?url=${url}`;
    return;
  }

  if (w.kucoin) {
    window.location.href = `kuwallet://open?url=${url}`;
    return;
  }

  if (w.trust) {
    window.location.href = `trust://browser_open?url=${url}`;
    return;
  }

  if (w.coinbase) {
    window.location.href = `https://go.cb-w.com/dapp?cb_url=${url}`;
    return;
  }

  // fallback → MetaMask
  window.location.href = `https://metamask.app.link/dapp/${url}`;
};

/* ============================================================
   🔗 ENSURE CHAIN = SOMNIA MAINNET
============================================================ */
export const ensureSomniaChain = async () => {
  if (!window.ethereum) {
    console.error("[Wallet] No ethereum provider detected");
    throw new Error("Wallet not detected");
  }

  try {
    // First check current chain
    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    console.log("[Chain] Current chain ID:", currentChainId);
    console.log("[Chain] Expected chain ID:", SOMNIA_MAINNET.chainId);

    // Use helper function for comparison
    if (isCorrectChain(currentChainId)) {
      console.log("[Chain] ✅ Already on Somnia Mainnet");
      return true;
    }

    console.log("[Chain] ⚠️ Wrong chain, attempting to switch...");

    // Try to switch
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_MAINNET.chainId }],
    });

    console.log("[Chain] ✅ Successfully switched to Somnia Mainnet");
    toast.success("Switched to Somnia Mainnet");
    return true;
  } catch (err) {
    console.error("[Chain] Switch error:", err);

    // If chain not added (error 4902), add it
    if (err.code === 4902) {
      console.log("[Chain] Network not found, adding Somnia Mainnet...");
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SOMNIA_MAINNET],
        });
        console.log("[Chain] ✅ Somnia Mainnet added successfully");
        toast.success("Somnia Mainnet added!");
        return true;
      } catch (addError) {
        console.error("[Chain] Failed to add network:", addError);
        throw new Error("Failed to add Somnia network");
      }
    } else if (err.code === 4001) {
      console.log("[Chain] ❌ User rejected network switch");
      throw new Error("User rejected network switch");
    } else {
      throw err;
    }
  }
};

/* ============================================================
   🔌 CONNECT WALLET + FORCED CHAIN
============================================================ */
export const connectWallet = async () => {
  console.log("[Wallet] Starting connection process...");
  const { isMobile } = detectMobileWallet();

  // If mobile but no injected Ethereum → open dapp in in-app wallet
  if (isMobile && !window.ethereum) {
    console.log("[Wallet] Mobile detected, no injected wallet, redirecting...");
    openMobileWallet();
    return;
  }

  if (!window.ethereum) {
    console.error("[Wallet] No wallet extension found");
    throw new Error(
      "Wallet extension not found. Please install MetaMask or another Web3 wallet."
    );
  }

  try {
    // Step 1: Request accounts
    console.log("[Wallet] Requesting accounts...");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      console.error("[Wallet] No accounts returned");
      throw new Error("No accounts found");
    }

    console.log("[Wallet] ✅ Connected account:", accounts[0]);

    // Step 2: Ensure correct chain
    console.log("[Wallet] Verifying chain...");
    await ensureSomniaChain();

    // Step 3: Final verification
    const finalChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    console.log("[Wallet] Final chain check:", finalChainId);

    if (!isCorrectChain(finalChainId)) {
      console.error("[Wallet] ❌ Still on wrong chain after switch");
      throw new Error("Please switch to Somnia Mainnet");
    }

    console.log("[Wallet] ✅ Connection successful");
    return { address: accounts[0] };
  } catch (error) {
    console.error("[Wallet] Connection failed:", error);
    throw error;
  }
};

/* ============================================================
   🔎 CHECK CONNECTED WALLET
============================================================ */
export const getConnectedWallet = async () => {
  if (!window.ethereum) {
    console.log("[Wallet] No ethereum provider");
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts.length) {
      console.log("[Wallet] No accounts connected");
      return null;
    }

    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log("[Wallet] Current chain:", chainId, "Account:", accounts[0]);

    if (!isCorrectChain(chainId)) {
      console.warn("[Wallet] ⚠️ Wrong chain detected");
      return null;
    }

    console.log("[Wallet] ✅ Wallet connected and on correct chain");
    return { address: accounts[0] };
  } catch (error) {
    console.error("[Wallet] Error getting connected wallet:", error);
    return null;
  }
};

/* ============================================================
   🚪 DISCONNECT (JUST RELOAD)
============================================================ */
export const disconnectWallet = () => {
  console.log("[Wallet] Disconnecting...");
  window.location.reload();
};

/* ============================================================
   🔄 AUTO-LISTENERS
============================================================ */
export const initWalletListeners = () => {
  if (!window.ethereum) {
    console.log("[Listeners] No ethereum provider, skipping listeners");
    return;
  }

  console.log("[Listeners] Initializing wallet event listeners");

  window.ethereum.on("accountsChanged", (accounts) => {
    console.log("[Listeners] Accounts changed:", accounts);
    toast("🔄 Wallet changed", { icon: "🔔" });
    setTimeout(() => window.location.reload(), 400);
  });

  window.ethereum.on("chainChanged", (chainId) => {
    console.log("[Listeners] Chain changed:", chainId);
    setTimeout(() => {
      if (!isCorrectChain(chainId)) {
        console.warn("[Listeners] ⚠️ Changed to wrong network");
        toast.error("❌ Wrong Network – Switch to Somnia Mainnet");
      }
      window.location.reload();
    }, 300);
  });

  console.log("[Listeners] ✅ Event listeners initialized");
};
