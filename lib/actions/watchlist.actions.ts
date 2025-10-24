"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { auth } from "../better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStocksDetails } from "./finnhub.actions";

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

// Add stock to watchlist
export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    // Check if stock already exists in watchlist
    const existingItem = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (existingItem) {
      return { success: false, message: "Stock already in watchlist" };
    }

    // Validate the symbol by trying to fetch its data
    try {
      const stockData = await getStocksDetails(symbol);
      if (!stockData) {
        return {
          success: false,
          message: "This stock symbol is not supported or invalid",
        };
      }
    } catch (error) {
      console.error("Error validating stock symbol:", error);
      return {
        success: false,
        message: "Unable to validate stock symbol. Please try again later.",
      };
    }

    // Add to watchlist
    const newItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
    });

    await newItem.save();
    revalidatePath("/watchlist");

    return { success: true, message: "Stock added to watchlist" };
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw new Error("Failed to add stock to watchlist");
  }
};

// Remove stock from watchlist
export const removeFromWatchlist = async (symbol: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    // Remove from watchlist
    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });
    revalidatePath("/watchlist");

    return { success: true, message: "Stock removed from watchlist" };
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw new Error("Failed to remove stock from watchlist");
  }
};

// Get user's watchlist
export const getUserWatchlist = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(watchlist));
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    throw new Error("Failed to fetch watchlist");
  }
};

// Get user's watchlist with stock data
export const getWatchlistWithData = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect("/sign-in");

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (watchlist.length === 0) return [];

    // Use Promise.allSettled to handle individual stock fetch failures gracefully
    const stocksDataResults = await Promise.allSettled(
      watchlist.map((item) => getStocksDetails(item.symbol))
    );

    // Map results with original watchlist items and filter out failed fetches
    const stocksWithData = watchlist
      .map((item, index) => {
        const result = stocksDataResults[index];

        // Handle rejected promises or null returns
        if (result.status === "rejected" || result.value === null) {
          console.warn(
            `Failed to fetch data for ${item.symbol} - symbol may not be supported`
          );
          return null;
        }

        const stockData = result.value;
        return {
          company: stockData.company,
          symbol: stockData.symbol,
          currentPrice: stockData.currentPrice,
          priceFormatted: stockData.priceFormatted,
          changeFormatted: stockData.changeFormatted,
          changePercent: stockData.changePercent,
          marketCap: stockData.marketCapFormatted,
          peRatio: stockData.peRatio,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return JSON.parse(JSON.stringify(stocksWithData));
  } catch (error) {
    console.error("Error loading watchlist:", error);
    throw new Error("Failed to fetch watchlist");
  }
};
