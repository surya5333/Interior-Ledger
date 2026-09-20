import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  Svg,
  Path,
  Circle,
  Rect,
  Line,
  Polygon,
} from "@react-pdf/renderer";
import { registerPdfFonts, formatCurrency } from "../lib/pdf-utils";

Font.registerHyphenationCallback((word) => [word]);
registerPdfFonts();

// ============================================================
// PALETTE  — NAVY + GOLD + GREEN + RED + WHITE
// ============================================================
const NAVY = "#0f2544";
const NAVY_DARK = "#0a1b36";
const NAVY_SOFT = "#e3eaf3";
const NAVY_TABLE_ROW_ALT = "#f6f9fc";
const GOLD = "#c9a24c";
const GOLD_LINE = "#d6b767";
const GREEN = "#1f7a3e";
const GREEN_DARK = "#145a2d";
const GREEN_SOFT = "#e2f1e7";
const GREEN_SOFT_BG = "#dff3e6";
const RED = "#b42318";
const RED_SOFT = "#fde3e0";
const TEAL_SOFT = "#dff4ee";
const BORDER_SUBTLE = "#d7deea";
const DARK = "#1c2434";
const MUTED = "#606b7e";
const CARD_BG = "#ffffff";
const PAGE_BG = "#ffffff";

const DEFAULT_PHONE = "+91 93931 41224";

// ============================================================
// EXACT BANNER RENDERED HEIGHTS (Measured from actual PNG)
//
// A4 width (react-pdf pt at 72dpi) = 595.28 pt
//
// Header PNG: 2172 x 446 px  -> 595.28 * 446 / 2172 = 122.31 pt ≈ 122 pt
// Footer PNG: 2172 x 391 px  -> 595.28 * 391 / 2172 = 107.24 pt ≈ 107 pt
//
// Reserved space = rendered banner height + small visual gap so
// "PROJECT LEDGER" does not hug the header's bottom edge.
// ============================================================
const HEADER_BANNER_RENDERED_HEIGHT_PT = 122;
const FOOTER_BANNER_RENDERED_HEIGHT_PT = 107;
const HEADER_VISUAL_GAP_PT = 12;
const FOOTER_VISUAL_GAP_PT = 6;
const HEADER_RESERVED_PT = HEADER_BANNER_RENDERED_HEIGHT_PT + HEADER_VISUAL_GAP_PT;
const FOOTER_RESERVED_PT = FOOTER_BANNER_RENDERED_HEIGHT_PT + FOOTER_VISUAL_GAP_PT;

// ============================================================
// STYLESHEET
// ============================================================
const s = StyleSheet.create({
  page: {
    // Reserve EXACT space at top/bottom so dynamic content never
    // overlaps the absolutely-positioned fixed header/footer.
    paddingTop: HEADER_RESERVED_PT,
    paddingBottom: FOOTER_RESERVED_PT,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "NotoSans",
    color: DARK,
    flexDirection: "column",
    backgroundColor: PAGE_BG,
  },
  headerFixed: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: HEADER_BANNER_RENDERED_HEIGHT_PT,
  },
  footerFixed: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: FOOTER_BANNER_RENDERED_HEIGHT_PT,
  },
  headerBanner: {
    width: "100%",
    height: HEADER_BANNER_RENDERED_HEIGHT_PT,
    objectFit: "contain",
  },
  footerBanner: {
    width: "100%",
    height: FOOTER_BANNER_RENDERED_HEIGHT_PT,
    objectFit: "contain",
  },
  content: {
    // Content lives inside the page's already-reserved safe area.
    // No internal paddingTop/Bottom here — page padding already protects
    // us from the absolute header/footer.
    flexDirection: "column",
    flexGrow: 1,
  },

  // ---------- GOLD SECTION DIVIDER ----------
  goldDivider: {
    width: "100%",
    height: 1,
    backgroundColor: GOLD_LINE,
    marginVertical: 10,
    opacity: 0.85,
  },

  // ---------- PROJECT HEADER (2 columns) ----------
  projectHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  projectLeft: {
    width: "62%",
    paddingRight: 20,
    paddingTop: 1,
    // Small left padding reserves enough space for large bold capitals
    // (e.g. "S" in "Skypark 1104" at 22pt bold NotoSans) to slightly
    // overshoot the glyph origin without being clipped at the text
    // container left edge.  Works generically for ALL project names.
    paddingLeft: 4,
  },
  projectLedgerLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 3.2,
    fontFamily: "NotoSans",
    marginBottom: 5,
  },
  projectName: {
    fontSize: 22,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 0.3,
    lineHeight: 1.15,
    marginBottom: 6,
    // Extra safety: Text-level left padding so the glyph box does
    // not sit exactly at the viewport/clipping edge.
    paddingLeft: 2,
  },
  clientLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  clientLabel: {
    fontSize: 9.5,
    color: MUTED,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginRight: 6,
  },
  clientValue: {
    fontSize: 10.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
  },

  projectRight: {
    width: "38%",
    paddingLeft: 22,
    borderLeftWidth: 1.4,
    borderLeftColor: GOLD_LINE,
    paddingTop: 0,
  },
  rightStackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
  },
  rightStackRowLast: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  rightIconWrap: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
    backgroundColor: NAVY_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 0,
  },
  rightTextCol: {
    flexDirection: "column",
    flexShrink: 1,
  },
  rightFieldLabel: {
    fontSize: 7,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  rightFieldValue: {
    fontSize: 10,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: DARK,
  },

  // ---------- FINANCIAL CARDS ----------
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: -10,
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    backgroundColor: CARD_BG,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  summaryIconLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  summaryIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 5.6,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    letterSpacing: 1.2,
    color: MUTED,
  },
  summaryAmount: {
    fontSize: 10,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    lineHeight: 1.10,
  },
  // green credit
  creditBg: { backgroundColor: GREEN_SOFT_BG },
  creditText: { color: GREEN_DARK },
  // red debit
  debitBg: { backgroundColor: RED_SOFT },
  debitText: { color: RED },
  // green balance
  balanceBg: { backgroundColor: GREEN_SOFT },
  balanceText: { color: GREEN_DARK },

  // ---------- TRANSACTION DETAILS TITLE ----------
  txTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  txTitleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: NAVY_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txTitleText: {
    fontSize: 11.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 1.6,
  },

  // ---------- TRANSACTION TABLE ----------
  tableOuter: {
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 7.2,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 0.6,
    textTransform: "uppercase" as any,
  },
  tableBody: {
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: NAVY_TABLE_ROW_ALT,
  },
  td: {
    fontSize: 8,
    fontFamily: "NotoSans",
    color: DARK,
    textAlignVertical: "center" as any,
  },
  // col widths — FULL 8-col layout
  colDate: { width: "11%" },
  colContact: { width: "13%" },
  colCategory: { width: "13%" },
  colPayment: { width: "13%" },
  colDesc: { width: "16%" },
  colMoney: { width: "11%", textAlign: "right" },
  // col widths — RESTRICTED 6-col layouts (client / contact)
  colDate6: { width: "14%" },
  colContact6: { width: "17%" },
  colCategory6: { width: "17%" },
  colPayment6: { width: "17%" },
  colDesc6: { width: "20%" },
  colMoney6: { width: "15%", textAlign: "right" },
  // single summary card — centered full width
  summarySingle: {
    flex: 1,
    marginHorizontal: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    backgroundColor: CARD_BG,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "column",
    alignItems: "flex-start",
  },

  // badges
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 50,
    fontSize: 6.8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    letterSpacing: 0.3,
    overflow: "hidden",
  },
  catBadge: {
    backgroundColor: NAVY_SOFT,
    color: NAVY_DARK,
  },
  payBadge: {
    backgroundColor: TEAL_SOFT,
    color: "#0e6d5c",
  },

  // empty
  emptyRow: {
    paddingVertical: 22,
    alignItems: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 8,
    fontFamily: "NotoSans",
  },

  // ---------- SIGNATURES ----------
  sigArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginHorizontal: -18,
  },
  sigCol: {
    width: "44%",
    marginHorizontal: 18,
  },
  sigHeaderTextClean: {
    fontSize: 9,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  sigCompanyName: {
    fontSize: 9.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 10,
  },
  sigImage: {
    height: 38,
    objectFit: "contain",
    marginBottom: 6,
  },
  sigRuleOnly: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#8a97ad",
  },
  sigNameText: {
    fontSize: 9,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: DARK,
    marginTop: 5,
  },
  // ===== ONLY for Kalkinadh.G =====
  sigNameComicSans: {
    fontSize: 11,
    fontFamily: "Comic Sans MS",
    fontWeight: "bold",
    color: DARK,
    marginTop: 5,
    letterSpacing: 0.4,
  },
  sigRightAlign: {
    alignItems: "flex-end",
  },
  sigRightAlignRule: {
    alignItems: "flex-end",
  },
});

// ============================================================
// TYPES
// ============================================================
type LedgerTransaction = {
  id: string;
  date: string;
  contact: { id: string; name: string; category: string };
  category: string;
  description?: string | null;
  paymentMode: "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";
  paymentProofUrl: string | null;
  credit: string;
  debit: string;
  runningBalance: string;
};

type LedgerData = {
  project: { id: string; name: string; budget: string };
  client: { id: string; name: string };
  totals: { credit: string; debit: string; balance: string };
  transactions: LedgerTransaction[];
};

// ============================================================
// HELPERS
// ============================================================
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function formatPaymentLabel(transaction: LedgerTransaction) {
  const labelMap: Record<LedgerTransaction["paymentMode"], string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    NEFT: "NEFT",
    IMPS: "IMPS",
    OTHER: "Other",
  };
  const proofModes: ReadonlyArray<LedgerTransaction["paymentMode"]> = ["UPI", "NEFT", "IMPS"];
  return proofModes.includes(transaction.paymentMode) && transaction.paymentProofUrl
    ? `${labelMap[transaction.paymentMode]} (proof)`
    : labelMap[transaction.paymentMode];
}

// ============================================================
// ICONS (inline SVG, react-pdf compatible) — ALL NAVY
// ============================================================

// Calendar / Date icon (navy)
function IconDate() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24">
      <Rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke={NAVY} strokeWidth="2" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={NAVY} strokeWidth="1.6" />
      <Line x1="8" y1="3" x2="8" y2="7" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="16" y1="3" x2="16" y2="7" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="8.5" cy="14" r="1" fill={NAVY} />
      <Circle cx="12" cy="14" r="1" fill={NAVY} />
      <Circle cx="15.5" cy="14" r="1" fill={NAVY} />
    </Svg>
  );
}

// Person / Client icon (navy)
function IconClient() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" fill="none" stroke={NAVY} strokeWidth="2" />
      <Path
        d="M4 21c1.6-4 4.6-6 8-6s6.4 2 8 6"
        fill="none"
        stroke={NAVY}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Project / Briefcase icon (navy)
function IconProject() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24">
      <Path
        d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"
        fill="none"
        stroke={NAVY}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Rupee stack / credit icon (green tint)
function IconCredit() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Path
        d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.8 7.1 17.2 8 11.7 4 7.8l5.5-.8L12 2z"
        fill={GREEN_DARK}
        opacity="0.9"
      />
      <Line x1="6" y1="20" x2="18" y2="20" stroke={GREEN_DARK} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// Arrow down / debit icon (red tint)
function IconDebit() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Path d="M12 4v14" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
      <Polygon points="6,14 12,20 18,14" fill={RED} />
      <Line x1="6" y1="20" x2="18" y2="20" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// Wallet / balance icon (dark green)
function IconBalance() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V8H3V7.5z"
        fill={GREEN_DARK}
        opacity="0.22"
      />
      <Path
        d="M3 8v9A2.5 2.5 0 0 0 5.5 19.5h13a2.5 2.5 0 0 0 2.5-2.5V8"
        fill="none"
        stroke={GREEN_DARK}
        strokeWidth="1.8"
      />
      <Line x1="3" y1="8" x2="21" y2="8" stroke={GREEN_DARK} strokeWidth="1.8" />
      <Circle cx="17" cy="13.5" r="1.5" fill={GREEN_DARK} />
    </Svg>
  );
}

// Document / table / ledger (navy)
function IconTx() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2.5"
        fill="none"
        stroke={NAVY}
        strokeWidth="2"
      />
      <Line x1="3" y1="8.5" x2="21" y2="8.5" stroke={NAVY} strokeWidth="1.6" />
      <Line x1="3" y1="13.5" x2="21" y2="13.5" stroke={NAVY} strokeWidth="1.2" opacity="0.7" />
      <Line x1="9" y1="3" x2="9" y2="21" stroke={NAVY} strokeWidth="1.2" opacity="0.7" />
      <Circle cx="5.8" cy="5.8" r="1" fill={NAVY} />
      <Circle cx="11.5" cy="5.8" r="1" fill={NAVY} />
    </Svg>
  );
}

// ============================================================
// COMPONENT
// ============================================================
export type LedgerPDFViewMode = "full" | "client" | "contact";

export function LedgerPDF({
  ledger,
  companyName,
  logoUrl,
  signatureUrl,
  phone = DEFAULT_PHONE,
  headerBannerUrl,
  footerBannerUrl,
  viewMode = "full",
}: {
  ledger: LedgerData;
  companyName: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  phone?: string | null;
  headerBannerUrl?: string | null;
  footerBannerUrl?: string | null;
  viewMode?: LedgerPDFViewMode;
}) {
  void phone; // banner already contains branding; Settings integration slot preserved
  void logoUrl; // reserved for future use
  const isClientView = viewMode === "client";
  const isContactView = viewMode === "contact";
  const isFullView = viewMode === "full";
  const isRestricted = isClientView || isContactView;
  void isRestricted; // preserved for future conditional logic
  const exportDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Document title={`${ledger.project.name} - Ledger`} author={companyName}>
      <Page size="A4" style={s.page}>
        {/* =========================================================
            FIXED REPEATING HEADER — EVERY PAGE
            ========================================================= */}
        <View fixed style={s.headerFixed}>
          {headerBannerUrl ? (
            <Image src={headerBannerUrl} style={s.headerBanner} />
          ) : null}
        </View>

        {/* =========================================================
            FIXED REPEATING FOOTER — EVERY PAGE
            ========================================================= */}
        <View fixed style={s.footerFixed}>
          {footerBannerUrl ? (
            <View wrap={false}>
              <Image src={footerBannerUrl} style={s.footerBanner} />
            </View>
          ) : null}
        </View>

        {/* =========================================================
            DYNAMIC CONTENT AREA — flows between header & footer
            ========================================================= */}
        <View style={s.content}>
          {/* ===== PROJECT HEADER (left/right split) ===== */}
          <View style={s.projectHeaderRow}>
            <View style={s.projectLeft}>
              <Text style={s.projectLedgerLabel}>PROJECT LEDGER</Text>
              <Text style={s.projectName}>{ledger.project.name}</Text>
              <View style={s.clientLine}>
                <Text style={s.clientLabel}>{isContactView ? "Contact:" : "Client:"}</Text>
                <Text style={s.clientValue}>{ledger.client.name}</Text>
              </View>
            </View>

            <View style={s.projectRight}>
              {/* Date */}
              <View style={s.rightStackRow}>
                <View style={s.rightIconWrap}>
                  <IconDate />
                </View>
                <View style={s.rightTextCol}>
                  <Text style={s.rightFieldLabel}>DATE</Text>
                  <Text style={s.rightFieldValue}>{exportDate}</Text>
                </View>
              </View>
              {/* Client or Contact */}
              <View style={s.rightStackRow}>
                <View style={s.rightIconWrap}>
                  <IconClient />
                </View>
                <View style={s.rightTextCol}>
                  <Text style={s.rightFieldLabel}>{isContactView ? "CONTACT" : "CLIENT"}</Text>
                  <Text style={s.rightFieldValue}>{ledger.client.name}</Text>
                </View>
              </View>
              {/* Project */}
              <View style={s.rightStackRowLast}>
                <View style={s.rightIconWrap}>
                  <IconProject />
                </View>
                <View style={s.rightTextCol}>
                  <Text style={s.rightFieldLabel}>PROJECT</Text>
                  <Text style={s.rightFieldValue}>
                    {ledger.project.name}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Gold separator */}
          <View style={s.goldDivider} />

          {/* ===== FINANCIAL SUMMARY ===== */}
          {isFullView ? (
            <View style={s.summaryRow}>
              {/* TOTAL CREDIT */}
              <View style={s.summaryCard}>
                <View style={s.summaryIconLine}>
                  <View style={[s.summaryIconBg, s.creditBg]}>
                    <IconCredit />
                  </View>
                  <Text style={s.summaryLabel}>TOTAL CREDIT</Text>
                </View>
                <Text style={[s.summaryAmount, s.creditText]}>
                  {formatCurrency(Number(ledger.totals.credit))}
                </Text>
              </View>

              {/* TOTAL DEBIT */}
              <View style={s.summaryCard}>
                <View style={s.summaryIconLine}>
                  <View style={[s.summaryIconBg, s.debitBg]}>
                    <IconDebit />
                  </View>
                  <Text style={s.summaryLabel}>TOTAL DEBIT</Text>
                </View>
                <Text style={[s.summaryAmount, s.debitText]}>
                  {formatCurrency(Number(ledger.totals.debit))}
                </Text>
              </View>

              {/* BALANCE REMAINING */}
              <View style={s.summaryCard}>
                <View style={s.summaryIconLine}>
                  <View style={[s.summaryIconBg, s.balanceBg]}>
                    <IconBalance />
                  </View>
                  <Text style={s.summaryLabel}>BALANCE REMAINING</Text>
                </View>
                <Text style={[s.summaryAmount, s.balanceText]}>
                  {formatCurrency(Number(ledger.totals.balance))}
                </Text>
              </View>
            </View>
          ) : isClientView ? (
            <View style={s.summaryRow}>
              <View style={s.summarySingle}>
                <View style={s.summaryIconLine}>
                  <View style={[s.summaryIconBg, s.creditBg]}>
                    <IconCredit />
                  </View>
                  <Text style={s.summaryLabel}>TOTAL CREDIT</Text>
                </View>
                <Text style={[s.summaryAmount, s.creditText]}>
                  {formatCurrency(Number(ledger.totals.credit))}
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.summaryRow}>
              <View style={s.summarySingle}>
                <View style={s.summaryIconLine}>
                  <View style={[s.summaryIconBg, s.debitBg]}>
                    <IconDebit />
                  </View>
                  <Text style={s.summaryLabel}>TOTAL DEBIT</Text>
                </View>
                <Text style={[s.summaryAmount, s.debitText]}>
                  {formatCurrency(Number(ledger.totals.debit))}
                </Text>
              </View>
            </View>
          )}

          {/* ===== TRANSACTION DETAILS TITLE ===== */}
          <View style={s.txTitleRow}>
            <View style={s.txTitleIconWrap}>
              <IconTx />
            </View>
            <Text style={s.txTitleText}>TRANSACTION DETAILS</Text>
          </View>

          {/* ===== TRANSACTION TABLE ===== */}
          <View style={s.tableOuter}>
            <View style={s.tableHead}>
              {isFullView ? (
                <>
                  <Text style={[s.th, s.colDate]}>DATE</Text>
                  <Text style={[s.th, s.colContact]}>CONTACT</Text>
                  <Text style={[s.th, s.colCategory]}>CATEGORY</Text>
                  <Text style={[s.th, s.colPayment]}>PAYMENT MODE</Text>
                  <Text style={[s.th, s.colDesc]}>DESCRIPTION</Text>
                  <Text style={[s.th, s.colMoney]}>CREDIT (₹)</Text>
                  <Text style={[s.th, s.colMoney]}>DEBIT (₹)</Text>
                  <Text style={[s.th, s.colMoney]}>BALANCE (₹)</Text>
                </>
              ) : (
                <>
                  <Text style={[s.th, s.colDate6]}>DATE</Text>
                  <Text style={[s.th, s.colContact6]}>CONTACT</Text>
                  <Text style={[s.th, s.colCategory6]}>CATEGORY</Text>
                  <Text style={[s.th, s.colPayment6]}>PAYMENT MODE</Text>
                  <Text style={[s.th, s.colDesc6]}>DESCRIPTION</Text>
                  <Text style={[s.th, s.colMoney6]}>
                    {isClientView ? "CREDIT (₹)" : "DEBIT (₹)"}
                  </Text>
                </>
              )}
            </View>

            <View style={s.tableBody}>
              {ledger.transactions.length === 0 ? (
                <View style={s.emptyRow}>
                  <Text style={s.emptyText}>No transactions recorded.</Text>
                </View>
              ) : (
                ledger.transactions.map((t, i) => (
                  <View
                    key={t.id}
                    style={
                      i % 2 === 1 ? [s.tableRow, s.tableRowAlt] : s.tableRow
                    }
                    wrap={false}
                  >
                    {isFullView ? (
                      <>
                        <Text style={[s.td, s.colDate]}>
                          {new Date(t.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                        <Text
                          style={[s.td, s.colContact, { fontWeight: "bold" as any }]}
                        >
                          {t.contact.name}
                        </Text>
                        <View style={s.colCategory}>
                          <View style={[s.badge, s.catBadge]}>
                            <Text>{t.category}</Text>
                          </View>
                        </View>
                        <View style={s.colPayment}>
                          <View style={[s.badge, s.payBadge]}>
                            <Text>{formatPaymentLabel(t)}</Text>
                          </View>
                        </View>
                        <Text style={[s.td, s.colDesc]}>
                          {t.description || "—"}
                        </Text>
                        <Text
                          style={[
                            s.td,
                            s.colMoney,
                            { fontWeight: "bold" as any, color: GREEN_DARK },
                          ]}
                        >
                          {Number(t.credit)
                            ? formatCurrency(Number(t.credit))
                            : "—"}
                        </Text>
                        <Text
                          style={[
                            s.td,
                            s.colMoney,
                            { fontWeight: "bold" as any, color: RED },
                          ]}
                        >
                          {Number(t.debit)
                            ? formatCurrency(Number(t.debit))
                            : "—"}
                        </Text>
                        <Text
                          style={[
                            s.td,
                            s.colMoney,
                            {
                              fontWeight: "bold" as any,
                              color: NAVY_DARK,
                            },
                          ]}
                        >
                          {formatCurrency(Number(t.runningBalance))}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[s.td, s.colDate6]}>
                          {new Date(t.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                        <Text
                          style={[s.td, s.colContact6, { fontWeight: "bold" as any }]}
                        >
                          {t.contact.name}
                        </Text>
                        <View style={s.colCategory6}>
                          <View style={[s.badge, s.catBadge]}>
                            <Text>{t.category}</Text>
                          </View>
                        </View>
                        <View style={s.colPayment6}>
                          <View style={[s.badge, s.payBadge]}>
                            <Text>{formatPaymentLabel(t)}</Text>
                          </View>
                        </View>
                        <Text style={[s.td, s.colDesc6]}>
                          {t.description || "—"}
                        </Text>
                        {isClientView ? (
                          <Text
                            style={[
                              s.td,
                              s.colMoney6,
                              { fontWeight: "bold" as any, color: GREEN_DARK },
                            ]}
                          >
                            {Number(t.credit)
                              ? formatCurrency(Number(t.credit))
                              : "—"}
                          </Text>
                        ) : (
                          <Text
                            style={[
                              s.td,
                              s.colMoney6,
                              { fontWeight: "bold" as any, color: RED },
                            ]}
                          >
                            {Number(t.debit)
                              ? formatCurrency(Number(t.debit))
                              : "—"}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ===== PREPARED BY / {CLIENT OR CONTACT} SIGNATURE =====
              Keep signature section together across page breaks  */}
          <View style={s.sigArea} wrap={false}>
            {/* LEFT: Prepared By — INCHX INTERIO / Signature / Kalkinadh.G */}
            <View style={s.sigCol}>
              <Text style={s.sigHeaderTextClean}>Prepared By</Text>
              <Text style={s.sigCompanyName}>{companyName}</Text>

              {signatureUrl ? (
                <Image src={signatureUrl} style={s.sigImage} />
              ) : (
                <View style={{ height: 38 }} />
              )}

              <View style={s.sigRuleOnly} />
              {/* =========================================================
                  ONLY "Kalkinadh.G" uses Comic Sans MS.
                  Every other Text element uses NotoSans (default fontFamily).
                  ========================================================= */}
              <Text style={s.sigNameComicSans}>Kalkinadh.G</Text>
            </View>

            {/* RIGHT: Client Signature — OR — Contact Signature */}
            <View style={[s.sigCol, s.sigRightAlign]}>
              <Text style={[s.sigHeaderTextClean, { textAlign: "right" }]}>
                {isContactView ? "Contact Signature" : "Client Signature"}
              </Text>

              <View style={{ height: 38 + 10 + 9.5 }} />

              <View style={[s.sigRuleOnly, s.sigRightAlignRule]} />
              <Text style={[s.sigNameText, { textAlign: "right" }]}>
                {ledger.client.name}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
