"use server";

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";

export const signUpWithEmail = async ({
  email,
  fullName,
  password,
  country,
  investmentGoals,
  preferredIndustry,
  riskTolerance,
}: SignUpFormData) => {
  try {
    // Create and Sign the user in
    const response = await auth.api.signUpEmail({
      body: {
        name: fullName,
        email: email,
        password: password,
      },
    });

    // if the user creation is successful, trigger the background processing
    if (response) {
      await inngest.send({
        name: "app/user.created",
        data: {
          name: fullName,
          email,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
        },
      });
    }

    return { success: true, data: response };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log("Sign up failed", e);

    // i used e.message as a direct message because better auth tends to format their error messages well
    return { success: false, error: e?.message || "Sign up failed" };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({ body: { email, password } });

    return { success: true, data: response };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log("Sign in failed", e);

    return { success: false, error: e?.message || "Sign in failed" };
  }
};

export const signOut = async () => {
  try {
    const response = await auth.api.signOut({ headers: await headers() });

    return { success: true, data: response };
  } catch (e) {
    console.log("Sign out failed", e);
    return { success: false, error: "Sign out failed" };
  }
};
