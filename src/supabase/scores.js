// src/supabase/scores.js
import { supabase } from "./client";

export const saveScoreDB = async (scoreData) => {
  const { data, error } = await supabase
    .from("scores")
    .insert({
      player_id: scoreData.player_id,
      username: scoreData.username,
      wallet_address: scoreData.wallet_address.toLowerCase(),
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
  walletAddress = walletAddress.toLowerCase();

  // 1. Ambil best score sebelumnya
  const { data: bestData, error: fetchErr } = await supabase
    .from("player_best_scores")
    .select("highest_score, best_streak")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  // 2. Jika belum ada → buat baru
  if (!bestData) {
    const { error: insertErr } = await supabase
      .from("player_best_scores")
      .insert([
        {
          player_id: playerId,
          username,
          wallet_address: walletAddress,
          highest_score: score,
          best_streak: bestStreak,
          tx_hash: txHash,
          last_updated: new Date().toISOString(),
        },
      ]);

    if (insertErr) throw insertErr;

    return { updated: true };
  }

  // 3. Hitung best terbaru
  const newBest = {
    highest_score: Math.max(bestData.highest_score, score),
    best_streak: Math.max(bestData.best_streak, bestStreak),
  };

  // 4. Update hanya jika berubah
  const { error: updateErr } = await supabase
    .from("player_best_scores")
    .update({
      ...newBest,
      tx_hash: txHash,
      last_updated: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress);

  if (updateErr) throw updateErr;

  return { updated: true };
};
