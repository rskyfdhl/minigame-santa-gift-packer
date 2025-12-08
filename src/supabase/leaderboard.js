// src/supabase/leaderboard.js
import { supabase } from "./client";

export const getLeaderboard = async (limit = 10) => {
  const { data, error } = await supabase
    .from("player_best_scores")
    .select("*")
    .order("highest_score", { ascending: false })
    .order("best_streak", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Leaderboard error:", error);
    throw error;
  }

  return data;
};

// Realtime
export const subscribeToLeaderboard = (callback) => {
  return supabase
    .channel("leaderboard_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "player_best_scores",
      },
      callback
    )
    .subscribe();
};
