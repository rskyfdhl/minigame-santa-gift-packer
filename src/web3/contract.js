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
];

export const getContract = async () => {
  if (!window.ethereum) throw new Error("Wallet not found");

  // ethers v6 wajib await provider.getSigner()
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(SANTA_SCORES_ADDRESS, SANTA_SCORES_ABI, signer);
};

export const submitScoreOnChain = async (username, score, bestStreak) => {
  const contract = await getContract();
  const tx = await contract.submitScore(username, score, bestStreak);
  return tx;
};
