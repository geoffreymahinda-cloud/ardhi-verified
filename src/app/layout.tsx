import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Ardhi Verified — Kenya's Verified Land Marketplace",
    template: "%s | Ardhi Verified",
  },
  description:
    "Buy verified land in Kenya with confidence. Ardhi Verified connects diaspora buyers with NLIMS-verified plots, trusted agents, and transparent trust scores.",
  keywords:
    "Kenya land, verified land, diaspora, NLIMS, trust score, Kiambu, Nakuru",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ardhi Verified",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Ardhi Verified — Kenya's Verified Land Marketplace",
    description:
      "Buy verified land in Kenya with confidence. Ardhi Verified connects diaspora buyers with NLIMS-verified plots, trusted agents, and transparent trust scores.",
    type: "website",
    url: "https://www.ardhiverified.com",
    images: [{ url: "https://www.ardhiverified.com/api/og", width: 1200, height: 630 }],
    siteName: "Ardhi Verified",
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://www.ardhiverified.com/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#00A550" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script defer data-domain="ardhiverified.com" src="https://plausible.io/js/script.js" />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-bg text-text`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
