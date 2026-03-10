import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAYYNAH | بيّنة — Dataset Insight Generator",
  description:
    "Upload a CSV and instantly get statistical analysis, visualisations, and insights.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
