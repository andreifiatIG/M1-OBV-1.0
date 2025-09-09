import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Server-side authentication helper
 * Use this in server components and API routes
 */
export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return userId;
}

/**
 * Get current user ID on the server
 * Returns null if not authenticated
 */
export async function getCurrentUserId() {
  const { userId } = await auth();
  return userId;
}

/**
 * Check if user is authenticated on the server
 */
export async function isAuthenticated() {
  const { userId } = await auth();
  return !!userId;
}
