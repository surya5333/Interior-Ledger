import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { ContactDetail } from "../hooks/use-contacts";
import { registerPdfFonts, formatCurrency } from "../lib/pdf-utils";

Font.registerHyphenationCallback((word) => [word]);
registerPdfFonts();

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "NotoSans", color: "#1f2923" },
  header: { marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logoImage: { width: 32, height: 32, borderRadius: 2, marginRight: 10, objectFit: "cover" },
  brandMark: { width: 32, height: 32, backgroundColor: "#31563d", borderRadius: 2, justifyContent: "center", alignItems: "center", marginRight: 10 },
  brandText: { color: "#fff", fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" as any },
  companyName: { fontSize: 14, fontFamily: "NotoSans", fontWeight: "bold" as any },
  companyContact: { fontSize: 9, color: "#71766f", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#dcd9d3", marginVertical: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { color: "#71766f", fontSize: 8, textTransform: "uppercase" as any, letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold" as any },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e9e6df" },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 7, color: "#71766f", textTransform: "uppercase" as any, letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 12, fontFamily: "NotoSans", fontWeight: "bold" as any },
  creditColor: { color: "#31563d" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#dcd9d3", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eeece7", paddingVertical: 6 },
  th: { fontSize: 7, fontFamily: "NotoSans", fontWeight: "bold" as any, color: "#777a73", textTransform: "uppercase" as any, letterSpacing: 0.5 },
  td: { fontSize: 8 },
  colDate: { width: "10%" },
  colProject: { width: "15%" },
  colCategory: { width: "12%" },
  colPayment: { width: "12%" },
  colDesc: { width: "15%" },
  colAmount: { width: "12%", textAlign: "right" },
  colBalance: { width: "12%", textAlign: "right" },
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

function formatPaymentLabel(mode: string, proofUrl: string | null) {
  const labelMap: Record<string, string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    OTHER: "Other",
  };

  return mode === "UPI" && proofUrl
    ? `${labelMap[mode] || mode} (proof)`
    : labelMap[mode] || mode;
}

export function ContactPDF({ data, companyName, logoUrl, signatureUrl }: { data: ContactDetail; companyName: string; logoUrl?: string | null; signatureUrl?: string | null; }) {
  // Flatten and sort transactions
  const allTransactions = data.projects.flatMap((p) => 
    p.transactions.map((t) => ({ ...t, projectName: p.project.name }))
  );

  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const enrichedTransactions = allTransactions.map((t) => {
    runningBalance += Number(t.credit) - Number(t.debit);
    return { ...t, runningBalance };
  });

  return (
    <Document title={`${data.contact.name} - Ledger`} author={companyName}>
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
            <View>
              <Text style={s.companyName}>{companyName}</Text>
            </View>
          </View>
          <View style={s.divider} />
          
          <View style={{ marginTop: 6, marginBottom: 16 }}>
             <Text style={{ fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold" as any, color: "#31563d", textTransform: "uppercase" as any }}>Contact Ledger</Text>
          </View>

          <View style={s.metaRow}>
            <View>
              <Text style={s.metaLabel}>Contact Name</Text>
              <Text style={s.metaValue}>{data.contact.name}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>Category</Text>
              <Text style={s.metaValue}>{data.contact.category}</Text>
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
            <Text style={s.summaryLabel}>Total Credit</Text>
            <Text style={[s.summaryValue, s.creditColor]}>{formatCurrency(Number(data.totals.credit))}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Debit</Text>
            <Text style={s.summaryValue}>{formatCurrency(Number(data.totals.debit))}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Net Balance</Text>
            <Text style={[s.summaryValue, s.creditColor]}>{formatCurrency(Number(data.totals.balance))}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Total Transactions</Text>
            <Text style={s.summaryValue}>{data.totals.transactionCount}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Projects Worked On</Text>
            <Text style={s.summaryValue}>{data.totals.projectCount}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={{ marginTop: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 10, fontFamily: "NotoSans", fontWeight: "bold" as any, color: "#31563d", textTransform: "uppercase" as any }}>Transaction History</Text>
        </View>
        
        <View style={s.tableHeader}>
          <Text style={[s.th, s.colDate]}>Date</Text>
          <Text style={[s.th, s.colProject]}>Project</Text>
          <Text style={[s.th, s.colCategory]}>Category</Text>
          <Text style={[s.th, s.colPayment]}>Payment</Text>
          <Text style={[s.th, s.colDesc]}>Description</Text>
          <Text style={[s.th, s.colAmount]}>Credit</Text>
          <Text style={[s.th, s.colAmount]}>Debit</Text>
          <Text style={[s.th, s.colBalance]}>Running Balance</Text>
        </View>

        {enrichedTransactions.map((t) => (
          <View key={t.id} style={s.tableRow} wrap={false}>
            <Text style={[s.td, s.colDate]}>{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
            <Text style={[s.td, s.colProject]}>{t.projectName}</Text>
            <Text style={[s.td, s.colCategory]}>{t.category}</Text>
            <Text style={[s.td, s.colPayment]}>{formatPaymentLabel(t.paymentMode, t.paymentProofUrl)}</Text>
            <Text style={[s.td, s.colDesc]}>{t.description || "—"}</Text>
            <Text style={[s.td, s.colAmount, s.creditColor]}>{Number(t.credit) ? formatCurrency(Number(t.credit)) : "—"}</Text>
            <Text style={[s.td, s.colAmount]}>{Number(t.debit) ? formatCurrency(Number(t.debit)) : "—"}</Text>
            <Text style={[s.td, s.colBalance, { fontFamily: "NotoSans", fontWeight: "bold" as any }]}>{formatCurrency(Number(t.runningBalance))}</Text>
          </View>
        ))}

        {enrichedTransactions.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <Text style={{ color: "#71766f" }}>No transactions available.</Text>
          </View>
        )}

        {/* Signature Area */}
        <View style={s.footer}>
          <View style={s.divider} />
          <View style={s.signatureArea}>
            <View style={s.signatureWrapper}>
              {signatureUrl && <Image src={signatureUrl} style={s.signatureImage} />}
              <View style={s.signatureBlock}>
                <Text style={s.signatureLabel}>Generated by Interior Ledger</Text>
                <Text style={[s.signatureLabel, { marginTop: 2 }]}>Company Signature</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
