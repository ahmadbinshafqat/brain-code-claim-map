import type { Metadata } from "next";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Code Claim Map";

export const metadata: Metadata = {
  title: appName,
  description: "Annotated maintenance-risk heatmaps for pasted code snippets."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
