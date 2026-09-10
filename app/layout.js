import './globals.css';

export const metadata = {
  title: '내 ERP',
  description: '개인 업무 자동화 ERP',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
