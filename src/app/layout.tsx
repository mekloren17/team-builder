import type { Metadata, Viewport } from "next";
import { Barlow, Big_Shoulders, Doto } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Headlines, labels and marks: tall lettering like the signs at a sports centre.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

// Scoreboard digits: only for big lit numbers (sign-up count, win chance).
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata: Metadata = {
  title: "Team Builder",
  description: "Balanced teams for 5-a-side and 7-a-side football",
};

export const viewport: Viewport = {
  themeColor: "#0d1a12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${bigShoulders.variable} ${doto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
