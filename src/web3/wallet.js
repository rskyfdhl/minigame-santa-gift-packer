// src/web3/wallet.js
import toast from "react-hot-toast";

const SOMNIA_MAINNET = {
  chainId: "0x13A7", // 5031
  chainName: "Somnia Mainnet",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: ["https://dream-rpc.somnia.network"],
  blockExplorerUrls: ["https://somnia.w3us.site"],
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
  if (!window.ethereum) throw new Error("Wallet not detected");

  try {
    // First check current chain
    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    console.log("Current chain:", currentChainId);
    console.log("Expected chain:", SOMNIA_MAINNET.chainId);

    // Convert both to lowercase for case-insensitive comparison
    if (currentChainId.toLowerCase() === SOMNIA_MAINNET.chainId.toLowerCase()) {
      console.log("Already on Somnia Mainnet");
      return;
    }

    // Try to switch
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_MAINNET.chainId }],
    });

    toast.success("Switched to Somnia Mainnet");
  } catch (err) {
    console.error("Switch chain error:", err);

    // If chain not added (error 4902), add it
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SOMNIA_MAINNET],
        });
        toast.success("Somnia Mainnet added!");
      } catch (addError) {
        console.error("Add chain error:", addError);
        throw new Error("Failed to add Somnia network");
      }
    } else if (err.code === 4001) {
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
  const { isMobile } = detectMobileWallet();

  // If mobile but no injected Ethereum → open dapp in in-app wallet
  if (isMobile && !window.ethereum) {
    openMobileWallet();
    return;
  }

  if (!window.ethereum) {
    throw new Error(
      "Wallet extension not found. Please install MetaMask or another Web3 wallet."
    );
  }

  try {
    // Step 1: Request accounts
    console.log("Requesting accounts...");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }

    console.log("Connected account:", accounts[0]);

    // Step 2: Ensure correct chain
    await ensureSomniaChain();

    // Step 3: Verify connection
    const finalChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (finalChainId.toLowerCase() !== SOMNIA_MAINNET.chainId.toLowerCase()) {
      throw new Error("Please switch to Somnia Mainnet");
    }

    return { address: accounts[0] };
  } catch (error) {
    console.error("Connect wallet error:", error);
    throw error;
  }
};

/* ============================================================
   🔎 CHECK CONNECTED WALLET
============================================================ */
export const getConnectedWallet = async () => {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts.length) return null;

    const chainId = await window.ethereum.request({ method: "eth_chainId" });

    if (chainId.toLowerCase() !== SOMNIA_MAINNET.chainId.toLowerCase()) {
      console.warn("Wrong chain – expected Somnia");
      return null;
    }

    return { address: accounts[0] };
  } catch (error) {
    console.error("Get connected wallet error:", error);
    return null;
  }
};

/* ============================================================
   🚪 DISCONNECT (JUST RELOAD)
============================================================ */
export const disconnectWallet = () => {
  window.location.reload();
};

/* ============================================================
   🔄 AUTO-LISTENERS
============================================================ */
export const initWalletListeners = () => {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", (accounts) => {
    console.log("Accounts changed:", accounts);
    toast("🔄 Wallet changed", { icon: "🔔" });
    setTimeout(() => window.location.reload(), 400);
  });

  window.ethereum.on("chainChanged", (chainId) => {
    console.log("Chain changed:", chainId);
    setTimeout(() => {
      if (chainId.toLowerCase() !== SOMNIA_MAINNET.chainId.toLowerCase()) {
        toast.error("❌ Wrong Network – Switch to Somnia Mainnet");
      }
      window.location.reload();
    }, 300);
  });
};
