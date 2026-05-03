import { DEFAULT_HOUSE_NAME } from "@/lib/constants";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary } from "@/types";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  muted: { color: "#666" },
  box: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
});

export function MonthlyReportPdfDocument({
  summary,
  houseName = DEFAULT_HOUSE_NAME,
}: {
  summary: MonthlySummary;
  houseName?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{houseName}</Text>
        <Text style={styles.muted}>Monthly expense report · {summary.monthLabel}</Text>

        <Text style={styles.h2}>Totals</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text>Total spent</Text>
            <Text>{formatInr(summary.totalSpent)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Rent</Text>
            <Text>{formatInr(summary.rentTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Groceries</Text>
            <Text>{formatInr(summary.groceryTotal)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Category breakdown</Text>
        <View style={styles.box}>
          {summary.categoryBreakdown.map((c) => (
            <View key={c.category} style={styles.row}>
              <Text>
                {c.emoji} {c.category}
              </Text>
              <Text>{formatInr(c.total)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Per-person contribution (paid)</Text>
        <View style={styles.box}>
          {summary.perUserContribution.map((u) => (
            <View key={u.userId} style={styles.row}>
              <Text>{u.name}</Text>
              <Text>{formatInr(u.paid)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Suggested settlements</Text>
        <View style={styles.box}>
          {summary.suggestions.length === 0 ? (
            <Text style={styles.muted}>All settled</Text>
          ) : (
            summary.suggestions.map((s, i) => (
              <View key={i} style={styles.row}>
                <Text>
                  {s.fromName} → {s.toName}
                </Text>
                <Text>{formatInr(s.amount)}</Text>
              </View>
            ))
          )}
        </View>

        {summary.insight ? (
          <>
            <Text style={styles.h2}>Insight</Text>
            <Text>{summary.insight}</Text>
          </>
        ) : null}
      </Page>
    </Document>
  );
}
