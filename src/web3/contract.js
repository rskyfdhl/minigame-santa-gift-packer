// src/web3/contract.js
import { ethers } from "ethers";

export const SANTA_SCORES_ADDRESS =
  "0x232eA20eDb71867504aCa3d6D3E18d65EA562e90";

export const SANTA_SCORES_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_username", type: "string" },
      { internalType: "uint256", name: "_score", type: "uint256" },
      { internalType: "uint256", name: "_bestStreak", type: "uint256" },
    ],
    name: "submitScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Add read-only functions to test contract connectivity
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "players",
    outputs: [
      { internalType: "string", name: "username", type: "string" },
      { internalType: "uint256", name: "highestScore", type: "uint256" },
      { internalType: "uint256", name: "bestStreak", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("Wallet not found");
  }

  try {
    // Create provider
    console.log("[Contract] Creating provider...");
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Verify network
    const network = await provider.getNetwork();
    console.log("[Contract] Connected to network:", network.chainId.toString());

    const expectedChainId = 5031; // Somnia Mainnet
    if (network.chainId !== BigInt(expectedChainId)) {
      throw new Error(
        `Wrong network. Expected chain ID ${expectedChainId}, got ${network.chainId}`
      );
    }

    // Get signer
    console.log("[Contract] Getting signer...");
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("[Contract] Signer address:", signerAddress);

    // Check balance
    const balance = await provider.getBalance(signerAddress);
    console.log("[Contract] Balance:", ethers.formatEther(balance), "SOMI");

    if (balance === 0n) {
      throw new Error("Insufficient balance. You need SOMI tokens for gas.");
    }

    // Create contract instance
    console.log("[Contract] Creating contract instance...");
    const contract = new ethers.Contract(
      SANTA_SCORES_ADDRESS,
      SANTA_SCORES_ABI,
      signer
    );

    // Verify contract exists by checking code
    const code = await provider.getCode(SANTA_SCORES_ADDRESS);
    if (code === "0x") {
      throw new Error("Contract not found at the specified address");
    }
    console.log("[Contract] ✅ Contract verified at:", SANTA_SCORES_ADDRESS);

    return contract;
  } catch (error) {
    console.error("[Contract] Error creating contract instance:", error);
    throw error;
  }
};

// Helper function to check if contract is working
export const testContractConnection = async () => {
  try {
    const contract = await getContract();
    console.log("Contract connection successful");
    return true;
  } catch (error) {
    console.error("Contract connection test failed:", error);
    return false;
  }
};
