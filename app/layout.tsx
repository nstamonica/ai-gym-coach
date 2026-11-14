import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow for reading, Barlow Condensed for display type. The variables go on <html>
// so the theme tokens that reference them resolve everywhere.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Gym Coach: instant form feedback",
    template: "%s · AI Gym Coach",
  },
  description:
    "Upload a video of your lift and get an AI form grade, the corrections that matter most, and a record of your progress over time.",
  applicationName: "AI Gym Coach",
};

export const viewport: Viewport = {
  themeColor: "#100e0c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
