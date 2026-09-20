import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerPdfFonts() {
  if (!fontsRegistered) {
    Font.register({
      family: "NotoSans",
      fonts: [
        {
          src: "/fonts/NotoSans-Regular.ttf",
          fontWeight: "normal",
          fontStyle: "normal",
        },
        {
          src: "/fonts/NotoSans-Bold.ttf",
          fontWeight: "bold",
          fontStyle: "normal",
        },
      ],
    });

    fontsRegistered = true;
  }
}
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
