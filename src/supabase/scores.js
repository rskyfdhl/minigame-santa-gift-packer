// src/supabase/scores.js
import { supabase } from "./client";

export const saveScoreDB = async (scoreData) => {
  const { data, error } = await supabase
    .from("scores")
    .insert({
      player_id: scoreData.player_id,
      username: scoreData.username,
      wallet_address: scoreData.wallet_address,
      score: scoreData.score,
      best_streak: scoreData.best_streak,
      tx_hash: scoreData.tx_hash,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("saveScoreDB error:", error);
    throw error;
  }

  return data;
};

export const updateBestScore = async ({
  playerId,
  username,
  walletAddress,
  score,
  bestStreak,
  txHash,
}) => {
  const { data, error } = await supabase
    .from("player_best_scores")
    .upsert(
      {
        player_id: playerId,
        username: username,
        wallet_address: walletAddress,
        highest_score: score, // ← FIX PENTING
        best_streak: bestStreak,
        tx_hash: txHash,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "player_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("updateBestScore error:", error);
    throw error;
  }

  return { updated: true, data };
};
