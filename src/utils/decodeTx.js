import { ethers } from "ethers";
import { SANTA_SCORES_ABI } from "../web3/contract";

export const decodeSubmitScore = async (txHash) => {
  const provider = new ethers.JsonRpcProvider(
    "https://api.infra.mainnet.somnia.network/"
  );
  const tx = await provider.getTransaction(txHash);

  const iface = new ethers.Interface(SANTA_SCORES_ABI);
  const decoded = iface.decodeFunctionData("submitScore", tx.data);

  console.log("Decoded TX:", decoded);

  return decoded;
};
