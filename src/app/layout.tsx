import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '麻雀助手 - 日本麻将算点助手',
  description: '日本麻将（日麻）助手，支持和牌规则查询、拍照识别算点、对局计分。',
  keywords: ['日本麻将', '日麻', '麻雀', '算点', '役种', '符数', '番数'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F1A15',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-[#0F1A15] text-[#EFE9DA]">
        {children}
      </body>
    </html>
  );
}
