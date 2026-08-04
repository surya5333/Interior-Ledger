import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { ClientLedgerData, ClientLedgerPayment } from "../hooks/use-clients";
import { registerPdfFonts, formatCurrency } from "../lib/pdf-utils";

Font.registerHyphenationCallback((word) => [word]);
registerPdfFonts();

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "NotoSans", color: "#1f2923" },
  header: { marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logoImage: { width: 32, height: 32, borderRadius: 2, marginRight: 10, objectFit: "cover" },
  brandMark: { width: 32, height: 32, backgroundColor: "#31563d", borderRadius: 2, justifyContent: "center", alignItems: "center", marginRight: 10 },
  brandText: { color: "#fff", fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" },
  companyName: { fontSize: 14, fontFamily: "NotoSans", fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#dcd9d3", marginVertical: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { color: "#71766f", fontSize: 8, textTransform: "uppercase" as any, letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e9e6df" },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 7, color: "#71766f", textTransform: "uppercase" as any, letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" },
  creditColor: { color: "#31563d" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#dcd9d3", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eeece7", paddingVertical: 6 },
  th: { fontSize: 7, fontFamily: "NotoSans", fontWeight: "bold", color: "#777a73", textTransform: "uppercase" as any, letterSpacing: 0.5 },
  td: { fontSize: 8 },
  colDate: { width: "12%" },
  colProject: { width: "20%" },
  colCategory: { width: "15%" },
  colPayment: { width: "15%" },
  colDesc: { width: "23%" },
  colAmount: { width: "15%", textAlign: "right" },
  footer: { marginTop: 30 },
  signatureArea: { flexDirection: "row", justifyContent: "space-between", marginTop: 50 },
  signatureWrapper: { width: "40%" },
  signatureImage: { height: 40, objectFit: "contain", marginBottom: 5 },
  signatureBlock: { borderTopWidth: 1, borderColor: "#1f2923", paddingTop: 6 },
  signatureLabel: { fontSize: 8, color: "#71766f" },
  pageNumber: { position: "absolute", bottom: 25, right: 40, fontSize: 7, color: "#71766f" },
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

export function ClientPDF({ data, companyName, logoUrl, signatureUrl }: { data: ClientLedgerData; companyName: string; logoUrl?: string | null; signatureUrl?: string | null; }) {
  return (
    <Document title={`${data.client.name} - Summary`} author={companyName}>
      <Page size="A4" style={s.page}>
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
            <Text style={s.companyName}>{companyName}</Text>
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
            <Text style={{ color: "#71766f" }}>No client payments recorded.</Text>
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

        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
