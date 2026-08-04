import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerPdfFonts() {
  if (fontsRegistered) return;
  
  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: "/fonts/NotoSans-Regular.ttf",
        fontWeight: "normal",
      },
      {
        src: "/fonts/NotoSans-Bold.ttf",
        fontWeight: "bold",
      },
    ],
  });

  fontsRegistered = true;
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
