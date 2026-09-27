import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugProof — From bug report to proof",
  description: "Reproduce a bug, inspect a regression test, and verify the repair. A transparent developer workflow with IBM Bob.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
