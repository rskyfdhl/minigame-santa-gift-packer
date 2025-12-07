// src/web3/wallet.js
import toast from "react-hot-toast";

// Somnia Mainnet configuration
const SOMNIA_MAINNET = {
  chainId: "0x13A7", // 5031 decimal
  chainName: "Somnia Mainnet",
  nativeCurrency: {
    name: "SOMI",
    symbol: "SOMI",
    decimals: 18,
  },
  rpcUrls: ["https://api.infra.mainnet.somnia.network/"],
  blockExplorerUrls: ["https://explorer.somnia.network"],
};

/**
 * Force switch to Somnia Mainnet
 */
export const ensureSomniaChain = async () => {
  if (!window.ethereum) throw new Error("Wallet not detected");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SOMNIA_MAINNET.chainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      // Network not added, add it
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [SOMNIA_MAINNET],
      });
    } else {
      console.error("Switch error:", err);
      throw err;
    }
  }
};

/**
 * Connect wallet + force chain
 */
export const connectWallet = async () => {
  if (!window.ethereum) throw new Error("MetaMask not found");

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    await ensureSomniaChain();

    // Add delay to let chain switch settle
    await new Promise((r) => setTimeout(r, 300));

    return { address: accounts[0] };
  } catch (err) {
    console.error("Wallet connection error:", err);
    throw err;
  }
};

/**
 * Check connected wallet
 */
export const getConnectedWallet = async () => {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) return null;

    // Wait for chain to settle
    await new Promise((r) => setTimeout(r, 200));

    const chainId = await window.ethereum.request({ method: "eth_chainId" });

    // Check if on correct network
    if (chainId.toLowerCase() !== SOMNIA_MAINNET.chainId.toLowerCase()) {
      console.log(
        "Wrong network, expected:",
        SOMNIA_MAINNET.chainId,
        "got:",
        chainId
      );
      return null;
    }

    return { address: accounts[0] };
  } catch (err) {
    console.error("Get wallet error:", err);
    return null;
  }
};

/**
 * Simply reload app (clean disconnect)
 */
export const disconnectWallet = () => {
  window.location.reload();
};

/**
 * Auto-handling whenever user switches network or account manually
 */
export const initWalletListeners = () => {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", (accounts) => {
    // Reload when account changes
    setTimeout(() => window.location.reload(), 300);
  });

  window.ethereum.on("chainChanged", (chainId) => {
    // Give time for MetaMask to update chainId internally
    setTimeout(() => {
      if (chainId.toLowerCase() !== SOMNIA_MAINNET.chainId.toLowerCase()) {
        toast.error("Wrong network — switch to Somnia Mainnet");
      }
      window.location.reload();
    }, 300);
  });
};
