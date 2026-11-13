import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewBudget — A better daily grind",
  description: "A calmer, clearer way to plan your money.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
