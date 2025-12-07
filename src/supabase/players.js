// src/supabase/players.js
import { supabase } from "./client";

export const getPlayerByWallet = async (wallet) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const checkUsernameExists = async (username) => {
  const { data, error } = await supabase
    .from("players")
    .select("username")
    .ilike("username", username)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
};

export const createPlayer = async (username, wallet) => {
  const { data, error } = await supabase
    .from("players")
    .insert([
      {
        username,
        wallet_address: wallet.toLowerCase(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};
