import './globals.css';

export const metadata = {
  title: 'Mapa Transportu - Flexmeble',
  description: 'Zarządzanie transportami i dostawami Flexmeble w czasie rzeczywistym',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#2196F3" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}