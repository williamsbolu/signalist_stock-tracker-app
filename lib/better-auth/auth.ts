import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectToDatabase } from "@/database/mongoose";
import { nextCookies } from "better-auth/next-js";

// Create a singleton instance of the auth object: prevent multiple connections improving performance
let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
  if (authInstance) return authInstance;

  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) throw new Error("MongoDB connection not found");

  authInstance = betterAuth({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    database: mongodbAdapter(db as any),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    // Makes it work with nextjs server actions: when you call functions that set cookies like signInEmail or signUpEmail in a server action, they will be automatically set.
    plugins: [nextCookies()],
  });

  return authInstance;
};

export const auth = await getAuth();

// ? Note for Me: The implementation of better-auth on this project is not perfect, it can be better. It also has some security flaws that was negleted like, "handling auth checks in each page/route", because the middleware check is not really a secure protected way and also the one on the Layout file. so i can fix that later
