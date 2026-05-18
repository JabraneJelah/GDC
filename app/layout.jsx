import { Inter, Cairo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Gestion des Congés des Professeurs",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body className={`${inter.variable} ${cairo.variable} antialiased bg-white text-[#334155]`}>
        {children}
      </body>
    </html>
  );
}

