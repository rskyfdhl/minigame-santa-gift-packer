// src/web3/submitScore.js
import toast from "react-hot-toast";
import { getContract } from "./contract";

export const submitScoreOnChain = async (username, score, bestStreak) => {
  try {
    const contract = await getContract();

    toast.loading("Submitting to blockchain...", { id: "blockchain-submit" });

    // Kirim transaksi
    const tx = await contract.submitScore(username, score, bestStreak);

    console.log("Transaction sent:", tx.hash); // Debug

    toast.loading("Waiting for confirmation...", { id: "blockchain-submit" });

    // Tunggu konfirmasi
    const receipt = await tx.wait();

    console.log("Transaction confirmed:", receipt); // Debug

    toast.dismiss("blockchain-submit");

    // Return receipt yang sudah punya hash
    return receipt;
  } catch (err) {
    toast.dismiss("blockchain-submit");

    if (err.code === 4001) {
      toast.error("❌ Transaction rejected by user");
    } else if (err.code === "INSUFFICIENT_FUNDS") {
      toast.error("❌ Insufficient funds for gas");
    } else {
      toast.error("❌ Failed to submit to blockchain");
    }

    console.error("Blockchain submit error:", err);
    throw err;
  }
};
