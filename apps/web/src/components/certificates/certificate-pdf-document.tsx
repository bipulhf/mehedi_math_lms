import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";
import type { ReactElement } from "react";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 72
  },
  title: {
    color: "#262633",
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    marginBottom: 8
  },
  subtitle: {
    color: "#59596b",
    fontFamily: "Helvetica",
    fontSize: 12,
    marginBottom: 48
  },
  label: {
    color: "#262633",
    fontFamily: "Helvetica",
    fontSize: 11,
    marginBottom: 8
  },
  name: {
    color: "#262633",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 32
  },
  body: {
    color: "#262633",
    fontFamily: "Helvetica",
    fontSize: 11,
    marginBottom: 8
  },
  courseTitle: {
    color: "#262633",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 32,
    marginTop: 4
  },
  issued: {
    color: "#59596b",
    fontFamily: "Helvetica",
    fontSize: 10
  }
});

export interface CertificatePdfDocumentProps {
  courseTitle: string;
  issuedAt: Date;
  studentName: string;
}

export function CertificatePdfDocument({
  courseTitle,
  issuedAt,
  studentName
}: CertificatePdfDocumentProps): ReactElement {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Certificate of Completion</Text>
        <Text style={styles.subtitle}>{"Mehedi's Math Academy"}</Text>
        <Text style={styles.label}>This certifies that</Text>
        <Text style={styles.name}>{studentName}</Text>
        <Text style={styles.body}>has successfully completed</Text>
        <Text style={styles.courseTitle}>{courseTitle}</Text>
        <Text style={styles.issued}>Issued on {issuedAt.toISOString().slice(0, 10)}</Text>
      </Page>
    </Document>
  );
}
