import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI News Pulse | منصة متابعة وتلخيص الأخبار بالذكاء الاصطناعي',
  description: 'منصة ذكية لمتابعة أخبار X ومصادر الويب وتلخيصها عبر الذكاء الاصطناعي (Gemini 2.5 Flash Lite) وإرسالها إلى تيليجرام وواتساب 3 مرات يومياً.',
  keywords: ['AI News', 'Telegram Bot', 'WhatsApp Bot', 'OpenRouter', 'Gemini 2.5 Flash Lite', 'Supabase', 'Next.js'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="antialiased min-h-screen text-slate-100 selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
