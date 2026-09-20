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

  // ============================================================
  // "Comic Sans MS" family registration.
  //
  // @react-pdf/renderer requires explicit Font.register() for
  // every fontFamily used. To swap this to a real Comic Sans MS
  // TTF later, simply drop the file into public/fonts/ and update
  // the `src` paths below (and optionally add an italic variant).
  //
  // Currently uses NotoSans variants as the on-disk source so the
  // PDF always renders without error in every environment (dev,
  // server, CI, cross-OS) while the family name "Comic Sans MS"
  // remains exclusively applied to the "Kalkinadh.G" signature
  // line — visually differentiated via italic + size styling.
  // ============================================================
  Font.register({
    family: "Comic Sans MS",
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
