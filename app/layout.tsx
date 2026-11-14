import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#020617",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} min-h-screen font-sans antialiased`}>
        <div className="page-glow pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40rem]" aria-hidden />
        {children}
      </body>
    </html>
  );
}
