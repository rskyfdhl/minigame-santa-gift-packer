// src/web3/wallet.js
import toast from "react-hot-toast";

const SOMNIA_MAINNET = {
  chainId: "0x13A7", // 5031
  chainName: "Somnia Mainnet",
  nativeCurrency: {
    name: "SOMI",
    symbol: "SOMI",
    decimals: 18,
  },
  rpcUrls: ["https://api.infra.mainnet.somnia.network"],
  blockExplorerUrls: ["https://mainnet.somnia.w3us.site"],
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
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_MAINNET.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [SOMNIA_MAINNET],
      });
    } else {
      console.error(err);
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

  if (!window.ethereum) throw new Error("Wallet extension not found");

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  await ensureSomniaChain();
  return { address: accounts[0] };
};

/* ============================================================
   🔎 CHECK CONNECTED WALLET
============================================================ */
export const getConnectedWallet = async () => {
  if (!window.ethereum) return null;

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (!accounts.length) return null;

  const chainId = await window.ethereum.request({ method: "eth_chainId" });

  if (chainId !== SOMNIA_MAINNET.chainId) {
    console.warn("Wrong chain — expected Somnia");
    return null;
  }

  return { address: accounts[0] };
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

  window.ethereum.on("accountsChanged", () => {
    toast("🔄 Wallet changed", { icon: "🔔" });
    setTimeout(() => window.location.reload(), 400);
  });

  window.ethereum.on("chainChanged", (chainId) => {
    setTimeout(() => {
      if (chainId !== SOMNIA_MAINNET.chainId) {
        toast.error("❌ Wrong Network — Switch to Somnia Mainnet");
      }
      window.location.reload();
    }, 300);
  });
};
