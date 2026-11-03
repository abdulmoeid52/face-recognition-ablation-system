// import type { Metadata } from "next";
// import "./globals.css";
//
// export const metadata: Metadata = {
//   title: "Face Recognition Ablation",
//   description: "ArcFace embedding verification + region ablation study",
// };
//
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   );
// }
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Face Recognition · Smart Look",
  description: "ArcFace + MediaPipe live face recognition with ablation study",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b1220",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}