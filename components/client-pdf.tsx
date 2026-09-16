import { Document, Page, View, Text, Image, StyleSheet, Font, Svg, Path, Circle, Rect, Defs, LinearGradient, Stop } from "@react-pdf/renderer";
import { ClientLedgerData, ClientLedgerPayment } from "../hooks/use-clients";
import { registerPdfFonts, formatCurrency } from "../lib/pdf-utils";

Font.registerHyphenationCallback((word) => [word]);
registerPdfFonts();

const BRAND_GOLD = "#b89968";
const BRAND_GOLD_ACCENT = "#c9a872";
const BRAND_NAVY = "#1a2732";
const BRAND_DARK = "#1f2923";
const BRAND_MUTED = "#71766f";
const BRAND_DIVIDER = "#dcd9d3";
const SOCIAL_FACEBOOK = "#1877F2";
const SOCIAL_YOUTUBE = "#FF0000";
const SOCIAL_X = "#000000";
const SOCIAL_PINTEREST = "#BD081C";
const SOCIAL_LINKEDIN = "#0A66C2";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "NotoSans", color: BRAND_DARK, flexDirection: "column", minHeight: "100%" },
  pageBody: { flexGrow: 1, flexDirection: "column" },
  header: { marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  brandColumn: { flexDirection: "column" },
  logoImage: { width: 32, height: 32, borderRadius: 2, marginRight: 10, objectFit: "cover" },
  brandMark: { width: 32, height: 32, backgroundColor: "#31563d", borderRadius: 2, justifyContent: "center", alignItems: "center", marginRight: 10 },
  brandText: { color: "#fff", fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" },
  companyName: { fontSize: 14, fontFamily: "NotoSans", fontWeight: "bold" },
  companyPhone: { fontSize: 9, color: BRAND_MUTED, marginTop: 2, fontFamily: "NotoSans" },
  divider: { height: 1, backgroundColor: BRAND_DIVIDER, marginVertical: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { color: BRAND_MUTED, fontSize: 8, textTransform: "uppercase" as any, letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e9e6df" },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 7, color: BRAND_MUTED, textTransform: "uppercase" as any, letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" },
  creditColor: { color: "#31563d" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: BRAND_DIVIDER, paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eeece7", paddingVertical: 6 },
  th: { fontSize: 7, fontFamily: "NotoSans", fontWeight: "bold", color: "#777a73", textTransform: "uppercase" as any, letterSpacing: 0.5 },
  td: { fontSize: 8 },
  colDate: { width: "12%" },
  colProject: { width: "20%" },
  colCategory: { width: "15%" },
  colPayment: { width: "15%" },
  colDesc: { width: "23%" },
  colAmount: { width: "15%", textAlign: "right" },
  footer: { marginTop: 20 },
  signatureArea: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
  signatureWrapper: { width: "40%" },
  signatureImage: { height: 40, objectFit: "contain", marginBottom: 5 },
  signatureBlock: { borderTopWidth: 1, borderColor: BRAND_DARK, paddingTop: 6 },
  signatureLabel: { fontSize: 8, color: BRAND_MUTED },
  pageNumber: { position: "absolute", bottom: 14, right: 40, fontSize: 7, color: BRAND_MUTED, zIndex: 10 },
  brandFooter: {
    marginTop: 16,
    paddingTop: 12,
    paddingBottom: 0,
    position: "relative" as any,
  },
  footerTaglineTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  footerGoldLine: {
    width: 100,
    height: 1.2,
    backgroundColor: BRAND_GOLD,
    marginHorizontal: 14,
  },
  footerTaglineText: {
    fontSize: 8.5,
    color: BRAND_DARK,
    fontFamily: "NotoSans",
    letterSpacing: 4,
    fontWeight: "bold" as any,
  },
  footerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  footerLocationText: {
    fontSize: 11,
    color: BRAND_DARK,
    fontFamily: "NotoSans",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  footerLocationSep: {
    marginHorizontal: 10,
    color: BRAND_MUTED,
    fontSize: 11,
  },
  footerSocialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  footerSocialBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  footerTaglineBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  footerTaglineBottomText: {
    fontSize: 8,
    color: BRAND_DARK,
    fontFamily: "NotoSans",
    letterSpacing: 3,
    fontWeight: "bold" as any,
  },
});

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatPaymentLabel(payment: ClientLedgerPayment) {
  const labelMap: Record<ClientLedgerPayment["paymentMode"], string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    OTHER: "Other",
  };

  return payment.paymentMode === "UPI" && payment.paymentProofUrl
    ? `${labelMap[payment.paymentMode]} (proof)`
    : labelMap[payment.paymentMode];
}

function LocationPinIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={BRAND_GOLD}
        stroke={BRAND_GOLD}
        strokeWidth="1"
      />
      <Circle cx="12" cy="9" r="3" fill="#ffffff" />
    </Svg>
  );
}

function InstagramBadge() {
  return (
    <View style={[s.footerSocialBadge, { padding: 0 }]}>
      <Svg width="30" height="30" viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="igGradClient" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#F58529" />
            <Stop offset="35%" stopColor="#DD2A7B" />
            <Stop offset="100%" stopColor="#8134AF" />
          </LinearGradient>
        </Defs>
        <Circle cx="24" cy="24" r="23" fill="url(#igGradClient)" />
        <Circle cx="24" cy="24" r="15" stroke="#ffffff" strokeWidth="2.2" fill="none" />
        <Circle cx="24" cy="24" r="8" stroke="#ffffff" strokeWidth="2.2" fill="none" />
        <Circle cx="32" cy="16" r="2.5" fill="#ffffff" />
      </Svg>
    </View>
  );
}

function FacebookBadge() {
  return (
    <View style={[s.footerSocialBadge, { backgroundColor: SOCIAL_FACEBOOK }]}>
      <Svg width="30" height="30" viewBox="0 0 24 24">
        <Path
          d="M13.5 22v-8h3l.5-3.5h-3.5V8.2c0-1 .3-1.7 1.7-1.7H17V3.3C16.4 3.2 15.2 3 13.9 3c-2.5 0-4.2 1.5-4.2 4.3v3.2H6.5V14h3.2v8h3.8z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

function YouTubeBadge() {
  return (
    <View style={[s.footerSocialBadge, { backgroundColor: SOCIAL_YOUTUBE }]}>
      <Svg width="30" height="30" viewBox="0 0 24 24">
        <Path
          d="M21.6 7.2c-.2-.8-.9-1.5-1.7-1.7C18.3 5 12 5 12 5s-6.3 0-7.9.5c-.8.2-1.5.9-1.7 1.7C1.9 8.8 1.9 12 1.9 12s0 3.2.5 4.8c.2.8.9 1.5 1.7 1.7 1.6.5 7.9.5 7.9.5s6.3 0 7.9-.5c.8-.2 1.5-.9 1.7-1.7.5-1.6.5-4.8.5-4.8s0-3.2-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

function XBadge() {
  return (
    <View style={[s.footerSocialBadge, { backgroundColor: SOCIAL_X }]}>
      <Svg width="30" height="30" viewBox="0 0 24 24">
        <Path
          d="M17.5 3h3l-6.5 7.4L22 21h-6.1l-4.8-6.3L5.5 21h-3l7-8L2.5 3h6.2l4.3 5.7L17.5 3zm-1.1 16h1.7L7.7 5H5.9l10.5 14z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

function PinterestBadge() {
  return (
    <View style={[s.footerSocialBadge, { backgroundColor: SOCIAL_PINTEREST }]}>
      <Svg width="30" height="30" viewBox="0 0 24 24">
        <Path
          d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.3 1 .5 1.8 1.4 1.8 1.7 0 3-1.8 3-4.4 0-2.3-1.7-3.9-4-3.9-2.8 0-4.4 2.1-4.4 4.2 0 .8.3 1.5.7 1.9.1.1.1.2.1.3l-.3 1.1c0 .2-.1.3-.3.2-1-.5-1.6-1.9-1.6-3.1 0-2.5 1.8-4.8 5.2-4.8 2.7 0 4.8 1.9 4.8 4.5 0 2.7-1.7 4.9-4.1 4.9-.8 0-1.6-.4-1.8-.9l-.5 1.9c-.2.7-.7 1.6-1 2.1C9.5 21.9 10.7 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

function LinkedInBadge() {
  return (
    <View style={[s.footerSocialBadge, { backgroundColor: SOCIAL_LINKEDIN }]}>
      <Svg width="30" height="30" viewBox="0 0 24 24">
        <Path
          d="M19 3A2 2 0 0 1 21 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.3 18.3V9.9H5.7v8.4h2.6zM7 8.7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.3 18.3v-4.6c0-2.4-1.3-3.5-3-3.5-1.4 0-2 .8-2.3 1.3V9.9h-2.6c.1.8 0 8.4 0 8.4h2.6v-4.7c0-.2 0-.5.1-.6.2-.5.7-1 1.5-1 1 0 1.5.8 1.5 2v4.3h2.2z"
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

function BuildingSilhouettes({ side }: { side: "left" | "right" }) {
  const color = "#e8e4dc";
  return (
    <Svg width="80" height="70" viewBox="0 0 80 70" style={{ transform: side === "right" ? "scaleX(-1)" : undefined } as any}>
      <Path d="M0 70 L0 35 L8 35 L8 28 L14 28 L14 22 L22 22 L22 14 L30 14 L30 30 L40 30 L40 18 L48 18 L48 8 L56 8 L56 26 L64 26 L64 20 L72 20 L72 32 L80 32 L80 70 Z" fill={color} opacity="0.55" />
      <Rect x="12" y="38" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="12" y="48" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="24" y="30" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="24" y="42" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="34" y="38" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="34" y="50" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="50" y="18" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="50" y="34" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="50" y="46" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="66" y="28" width="4" height="5" fill="#ffffff" opacity="0.7" />
      <Rect x="66" y="42" width="4" height="5" fill="#ffffff" opacity="0.7" />
    </Svg>
  );
}

function WaveCurves() {
  return (
    <Svg width="100%" height="55" viewBox="0 0 520 55" preserveAspectRatio="none">
      <Path
        d="M0 55 L0 35 C 130 8, 200 8, 260 22 C 320 36, 390 36, 520 10 L 520 55 Z"
        fill={BRAND_NAVY}
      />
      <Path
        d="M0 55 L0 30 C 130 5, 200 5, 260 18 C 320 32, 390 32, 520 6 L 520 55 Z"
        fill={BRAND_GOLD_ACCENT}
        opacity="0.95"
      />
      <Path
        d="M0 55 L0 26 C 130 2, 200 2, 260 15 C 320 28, 390 28, 520 3 L 520 55 Z"
        fill={BRAND_GOLD}
        opacity="0.9"
      />
    </Svg>
  );
}

export function ClientPDF({ data, companyName, logoUrl, signatureUrl }: { data: ClientLedgerData; companyName: string; logoUrl?: string | null; signatureUrl?: string | null; }) {
  return (
    <Document title={`${data.client.name} - Summary`} author={companyName}>
      <Page size="A4" style={s.page}>
        <View style={s.pageBody}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.brandRow}>
              {logoUrl ? (
                <Image src={logoUrl} style={s.logoImage} />
              ) : (
                <View style={s.brandMark}>
                  <Text style={s.brandText}>{getInitials(companyName)}</Text>
                </View>
              )}
              <View style={s.brandColumn}>
                <Text style={s.companyName}>{companyName}</Text>
                <Text style={s.companyPhone}>+91 93931 41224</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.metaRow}>
              <View>
                <Text style={s.metaLabel}>Client</Text>
                <Text style={s.metaValue}>{data.client.name}</Text>
              </View>
              <View>
                <Text style={s.metaLabel}>Contact</Text>
                <Text style={s.metaValue}>{[data.client.phone, data.client.email].filter(Boolean).join(" · ") || "N/A"}</Text>
              </View>
              <View>
                <Text style={s.metaLabel}>Date</Text>
                <Text style={s.metaValue}>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
              </View>
            </View>
          </View>

          {/* Summary */}
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Total Received</Text>
              <Text style={[s.summaryValue, s.creditColor]}>{formatCurrency(Number(data.totals.totalReceived))}</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Client Payments</Text>
              <Text style={s.summaryValue}>{data.totals.paymentCount}</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Projects</Text>
              <Text style={s.summaryValue}>{data.projects.length}</Text>
            </View>
          </View>

          {/* Table */}
          <View style={{ marginTop: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold", color: "#31563d" }}>Client Ledger (Payments Received)</Text>
          </View>
          
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colDate]}>Date</Text>
            <Text style={[s.th, s.colProject]}>Project</Text>
            <Text style={[s.th, s.colCategory]}>Category</Text>
            <Text style={[s.th, s.colPayment]}>Payment</Text>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colAmount]}>Amount</Text>
          </View>

          {data.payments.map((p) => (
            <View key={p.id} style={s.tableRow} wrap={false}>
              <Text style={[s.td, s.colDate]}>{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
              <Text style={[s.td, s.colProject]}>{p.project.name}</Text>
              <Text style={[s.td, s.colCategory]}>{p.category}</Text>
              <Text style={[s.td, s.colPayment]}>{formatPaymentLabel(p)}</Text>
              <Text style={[s.td, s.colDesc]}>{p.description || "—"}</Text>
              <Text style={[s.td, s.colAmount, s.creditColor, { fontFamily: "NotoSans", fontWeight: "bold" }]}>{formatCurrency(Number(p.credit))}</Text>
            </View>
          ))}

          {data.payments.length === 0 && (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: BRAND_MUTED }}>No client payments recorded.</Text>
            </View>
          )}

          {/* Signature Area */}
          <View style={s.footer}>
            <View style={s.divider} />
            <View style={s.signatureArea}>
              <View style={s.signatureWrapper}>
                {signatureUrl && <Image src={signatureUrl} style={s.signatureImage} />}
                <View style={s.signatureBlock}>
                  <Text style={s.signatureLabel}>Prepared By</Text>
                </View>
              </View>
              <View style={[s.signatureWrapper, { justifyContent: "flex-end" }]}>
                <View style={s.signatureBlock}>
                  <Text style={s.signatureLabel}>Client Signature</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Branded Footer */}
        <View style={s.brandFooter}>
          {/* Top tagline row */}
          <View style={s.footerTaglineTop}>
            <View style={s.footerGoldLine} />
            <Text style={s.footerTaglineText}>SPACES THAT INSPIRE</Text>
            <View style={s.footerGoldLine} />
          </View>

          {/* Location row with buildings */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 0 }}>
            <View style={{ width: 70, position: "absolute", left: -10, bottom: 0, zIndex: 0 }}>
              <BuildingSilhouettes side="left" />
            </View>

            <View style={{ flex: 1, flexDirection: "column", alignItems: "center", zIndex: 1 }}>
              <View style={s.footerLocationRow}>
                <LocationPinIcon />
                <Text style={s.footerLocationText}>Hyderabad</Text>
                <Text style={s.footerLocationSep}>|</Text>
                <Text style={s.footerLocationText}>Andhra Pradesh</Text>
                <Text style={s.footerLocationSep}>|</Text>
                <Text style={s.footerLocationText}>Karnataka</Text>
                <Text style={s.footerLocationSep}>|</Text>
                <Text style={s.footerLocationText}>Odisha</Text>
              </View>

              {/* Social icons row */}
              <View style={s.footerSocialRow}>
                <InstagramBadge />
                <FacebookBadge />
                <YouTubeBadge />
                <XBadge />
                <PinterestBadge />
                <LinkedInBadge />
              </View>

              {/* Bottom tagline */}
              <View style={s.footerTaglineBottom}>
                <Text style={s.footerTaglineBottomText}>LET'S BUILD BEAUTIFUL SPACES TOGETHER</Text>
              </View>
            </View>

            <View style={{ width: 70, position: "absolute", right: -10, bottom: 0, zIndex: 0 }}>
              <BuildingSilhouettes side="right" />
            </View>
          </View>

          {/* Wave curves at bottom */}
          <View style={{ marginHorizontal: -40, marginBottom: -40, marginTop: 0 }}>
            <WaveCurves />
          </View>
        </View>

        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
