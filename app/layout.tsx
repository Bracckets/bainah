import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAYYNAH | بيّنة — Dataset Insight Generator",
  description:
    "Upload a CSV and instantly get statistical analysis, visualisations, and insights.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "BAYYNAH | بيّنة — Dataset Insight Generator",
    description:
      "Upload a CSV and instantly get statistical analysis, visualisations, and generated insights.",
    url: "https://bayynah.vercel.app",
    siteName: "BAYYNAH",
    images: [
      {
        url: "https://bayynah.vercel.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://bayynah.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Analytics />
      <body>{children}</body>
    </html>
  );
}
