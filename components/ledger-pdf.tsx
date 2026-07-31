import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1f2923" },
  header: { marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logoImage: { width: 32, height: 32, borderRadius: 2, marginRight: 10, objectFit: "cover" },
  brandMark: { width: 32, height: 32, backgroundColor: "#31563d", borderRadius: 2, justifyContent: "center", alignItems: "center", marginRight: 10 },
  brandText: { color: "#fff", fontSize: 12, fontFamily: "Helvetica-Bold" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  divider: { height: 1, backgroundColor: "#dcd9d3", marginVertical: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { color: "#71766f", fontSize: 8, textTransform: "uppercase" as any, letterSpacing: 0.5 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e9e6df" },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 7, color: "#71766f", textTransform: "uppercase" as any, letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  creditColor: { color: "#31563d" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#dcd9d3", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eeece7", paddingVertical: 6 },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#777a73", textTransform: "uppercase" as any, letterSpacing: 0.5 },
  td: { fontSize: 8 },
  colDate: { width: "12%" },
  colContact: { width: "18%" },
  colCategory: { width: "14%" },
  colDesc: { width: "20%" },
  colMoney: { width: "12%", textAlign: "right" },
  footer: { marginTop: 30 },
  signatureArea: { flexDirection: "row", justifyContent: "space-between", marginTop: 50 },
  signatureWrapper: { width: "40%" },
  signatureImage: { height: 40, objectFit: "contain", marginBottom: 5 },
  signatureBlock: { borderTopWidth: 1, borderColor: "#1f2923", paddingTop: 6 },
  signatureLabel: { fontSize: 8, color: "#71766f" },
  pageNumber: { position: "absolute", bottom: 25, right: 40, fontSize: 7, color: "#71766f" },
});

type LedgerTransaction = {
  id: string;
  date: string;
  contact: { id: string; name: string; category: string; };
  category: string;
  description?: string | null;
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

const money = (amt: string | number) => {
  const n = Number(amt);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function LedgerPDF({ ledger, companyName, logoUrl, signatureUrl }: { ledger: LedgerData; companyName: string; logoUrl?: string | null; signatureUrl?: string | null; }) {
  return (
    <Document title={`${ledger.project.name} - Ledger`} author={companyName}>
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
              <Text style={s.metaValue}>{ledger.client.name}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>Project</Text>
              <Text style={s.metaValue}>{ledger.project.name}</Text>
            </View>
            <View>
              <Text style={s.metaLabel}>Budget</Text>
              <Text style={s.metaValue}>Rs. {money(ledger.project.budget)}</Text>
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
            <Text style={s.summaryLabel}>Credit Received</Text>
            <Text style={[s.summaryValue, s.creditColor]}>Rs. {money(ledger.totals.credit)}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Amount Spent</Text>
            <Text style={s.summaryValue}>Rs. {money(ledger.totals.debit)}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Balance Remaining</Text>
            <Text style={[s.summaryValue, s.creditColor]}>Rs. {money(ledger.totals.balance)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.th, s.colDate]}>Date</Text>
          <Text style={[s.th, s.colContact]}>Contact</Text>
          <Text style={[s.th, s.colCategory]}>Category</Text>
          <Text style={[s.th, s.colDesc]}>Description</Text>
          <Text style={[s.th, s.colMoney]}>Credit</Text>
          <Text style={[s.th, s.colMoney]}>Debit</Text>
          <Text style={[s.th, s.colMoney]}>Balance</Text>
        </View>

        {ledger.transactions.map((t) => (
          <View key={t.id} style={s.tableRow} wrap={false}>
            <Text style={[s.td, s.colDate]}>{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
            <Text style={[s.td, s.colContact]}>{t.contact.name}</Text>
            <Text style={[s.td, s.colCategory]}>{t.category}</Text>
            <Text style={[s.td, s.colDesc]}>{t.description || "—"}</Text>
            <Text style={[s.td, s.colMoney, s.creditColor]}>{Number(t.credit) ? `Rs. ${money(t.credit)}` : "—"}</Text>
            <Text style={[s.td, s.colMoney]}>{Number(t.debit) ? `Rs. ${money(t.debit)}` : "—"}</Text>
            <Text style={[s.td, s.colMoney, { fontFamily: "Helvetica-Bold" }]}>Rs. {money(t.runningBalance)}</Text>
          </View>
        ))}

        {ledger.transactions.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <Text style={{ color: "#71766f" }}>No transactions recorded.</Text>
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
