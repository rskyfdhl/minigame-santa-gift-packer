// src/web3/submitScore.js
import toast from "react-hot-toast";
import { getContract } from "./contract";
import { ensureSomniaChain } from "./wallet";

export const submitScoreOnChain = async (username, score, bestStreak) => {
  try {
    // Step 1: Verify we're on the correct chain
    console.log("[Submit] Verifying network...");
    await ensureSomniaChain();

    // Step 2: Get contract instance
    console.log("[Submit] Getting contract...");
    const contract = await getContract();

    // Step 2.5: Test read function first to verify contract is accessible
    console.log("[Submit] Testing contract read access...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Try to read player data (this should work even if player doesn't exist)
      console.log("[Submit] Checking player data for:", signerAddress);
      const playerData = await contract.players(signerAddress);
      console.log("[Submit] Player data:", playerData);
    } catch (readError) {
      console.warn(
        "[Submit] Could not read contract (might not have players mapping):",
        readError.message
      );
      // This is okay, contract might not have this function
    }

    // Step 3: Estimate gas first (to catch errors early)
    console.log("[Submit] Estimating gas...");
    toast.loading("Preparing transaction...", { id: "blockchain-submit" });

    try {
      const gasEstimate = await contract.submitScore.estimateGas(
        username,
        score,
        bestStreak
      );
      console.log("[Submit] Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.error("[Submit] ❌ Gas estimation failed:", gasError);

      // Parse the error to get more details
      let errorMessage = "Transaction would fail";

      if (gasError.message) {
        // Check for common revert reasons
        if (gasError.message.includes("Unauthorized")) {
          errorMessage =
            "Unauthorized: You may not have permission to submit scores";
        } else if (gasError.message.includes("execution reverted")) {
          errorMessage =
            "Contract rejected transaction: Check if contract owner has set permissions";
        } else if (gasError.message.includes("insufficient funds")) {
          errorMessage = "Insufficient STT for gas";
        }
      }

      // Log the full error for debugging
      console.error("[Submit] Full error:", {
        code: gasError.code,
        message: gasError.message,
        data: gasError.data,
        reason: gasError.reason,
      });

      throw new Error(errorMessage);
    }

    // Step 4: Send transaction
    console.log("Sending transaction...");
    toast.loading("Submitting to blockchain...", { id: "blockchain-submit" });

    const tx = await contract.submitScore(username, score, bestStreak, {
      gasLimit: 500000, // Set manual gas limit
    });

    console.log("Transaction sent:", tx.hash);
    toast.loading("Waiting for confirmation...", { id: "blockchain-submit" });

    // Step 5: Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);

    toast.dismiss("blockchain-submit");

    // Return receipt with hash
    return {
      hash: receipt.hash || receipt.transactionHash,
      transactionHash: receipt.transactionHash || receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    };
  } catch (err) {
    console.error("Blockchain submit error:", err);
    toast.dismiss("blockchain-submit");

    // Handle specific errors
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      toast.error("❌ Transaction rejected by user");
      throw new Error("Transaction rejected");
    } else if (err.code === "INSUFFICIENT_FUNDS") {
      toast.error("❌ Insufficient funds for gas");
      throw new Error("Insufficient funds");
    } else if (err.message?.includes("user rejected")) {
      toast.error("❌ Transaction rejected by user");
      throw new Error("Transaction rejected");
    } else if (err.message?.includes("execution reverted")) {
      toast.error("❌ Contract error - please try again");
      throw new Error("Contract execution failed");
    } else if (err.message?.includes("network")) {
      toast.error("❌ Network error - please check your connection");
      throw new Error("Network error");
    } else {
      toast.error("❌ Failed to submit to blockchain");
      throw err;
    }
  }
};
