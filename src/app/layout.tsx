import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Styl",
  description: "Your private wardrobe, styled every morning.",
  appleWebApp: { capable: true, title: "Styl", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>{children}</StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
