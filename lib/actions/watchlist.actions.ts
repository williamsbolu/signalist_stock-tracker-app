"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";

/* Return a user's watchlist symbols by their email. If user not found or errors occur, return an empty array */
export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  try {
    if (!email || typeof email !== "string") return [];

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = user.id || (user._id ? String(user._id) : "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }).select("symbol -_id").lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("Error in getWatchlistSymbolsByEmail:", err);
    return [];
  }
}
