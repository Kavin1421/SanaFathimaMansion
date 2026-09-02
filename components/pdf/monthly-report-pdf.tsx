import { DEFAULT_HOUSE_NAME } from "@/lib/constants";
import type { MonthlySummary } from "@/types";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** Helvetica has no ₹ glyph — use ASCII-safe INR formatting for PDF. */
function formatPdfInr(amount: number): string {
  const n = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
  return `Rs. ${n}`;
}

const colors = {
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f8fafc",
  accent: "#4f46e5",
  accentSoft: "#eef2ff",
  white: "#ffffff",
  success: "#059669",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.ink,
    backgroundColor: colors.white,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.accent,
  },
  header: {
    marginBottom: 22,
  },
  brand: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.accent,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.muted,
  },
  heroRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  heroCard: {
    flex: 1,
    backgroundColor: colors.soft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroCardPrimary: {
    flex: 1.15,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroLabel: {
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  heroValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  heroValuePrimary: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: "#fcfcfd",
  },
  colLabel: {
    flex: 1,
    fontSize: 10,
    color: colors.ink,
  },
  colValue: {
    width: 90,
    textAlign: "right",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  settleOk: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  settleOkText: {
    color: colors.success,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  insightBox: {
    backgroundColor: colors.soft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  insightText: {
    fontSize: 10,
    lineHeight: 1.45,
    color: colors.ink,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
  },
});

function DataTable({
  headers,
  rows,
}: {
  headers: [string, string];
  rows: { key: string; label: string; value: string }[];
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>{headers[0]}</Text>
        <Text style={[styles.tableHeaderText, { width: 90, textAlign: "right" }]}>{headers[1]}</Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={row.key}
          style={[
            styles.tableRow,
            i % 2 === 1 ? styles.tableRowAlt : {},
            i === rows.length - 1 ? styles.tableRowLast : {},
          ]}
        >
          <Text style={styles.colLabel}>{row.label}</Text>
          <Text style={styles.colValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function MonthlyReportPdfDocument({
  summary,
  houseName = DEFAULT_HOUSE_NAME,
}: {
  summary: MonthlySummary;
  houseName?: string;
}) {
  const categoryRows = summary.categoryBreakdown.map((c) => ({
    key: c.category,
    label: c.category,
    value: formatPdfInr(c.total),
  }));

  const contributionRows = summary.perUserContribution.map((u) => ({
    key: u.userId,
    label: u.name,
    value: formatPdfInr(u.paid),
  }));

  const settlementRows = summary.suggestions.map((s, i) => ({
    key: `${s.fromName}-${s.toName}-${i}`,
    label: `${s.fromName}  →  ${s.toName}`,
    value: formatPdfInr(s.amount),
  }));

  return (
    <Document title={`${houseName} · ${summary.monthLabel}`} author={houseName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.header}>
          <Text style={styles.brand}>Monthly expense report</Text>
          <Text style={styles.title}>{houseName}</Text>
          <Text style={styles.subtitle}>{summary.monthLabel}</Text>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroCardPrimary}>
            <Text style={styles.heroLabel}>Total spent</Text>
            <Text style={styles.heroValuePrimary}>{formatPdfInr(summary.totalSpent)}</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Rent</Text>
            <Text style={styles.heroValue}>{formatPdfInr(summary.rentTotal)}</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Groceries</Text>
            <Text style={styles.heroValue}>{formatPdfInr(summary.groceryTotal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category breakdown</Text>
          <DataTable headers={["Category", "Amount"]} rows={categoryRows} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Per-person contribution</Text>
          <DataTable headers={["Member", "Paid"]} rows={contributionRows} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested settlements</Text>
          {settlementRows.length === 0 ? (
            <View style={styles.settleOk}>
              <Text style={styles.settleOkText}>All settled for this month</Text>
            </View>
          ) : (
            <DataTable headers={["Transfer", "Amount"]} rows={settlementRows} />
          )}
        </View>

        {summary.insight ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insight</Text>
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>{summary.insight}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{houseName}</Text>
          <Text style={styles.footerText}>
            Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
