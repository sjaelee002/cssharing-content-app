import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "콘텐츠 운영 OS",
  description: "CS쉐어링 콘텐츠 운영 OS MVP — Step 1~4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
