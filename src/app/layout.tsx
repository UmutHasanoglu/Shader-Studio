import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shader Studio - Animation Creator',
  description: 'Create, render, and export shader animations in 4K for stock footage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
