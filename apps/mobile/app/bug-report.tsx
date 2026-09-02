import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  ErrorNotice,
  Field,
  Heading,
  Screen,
  ScreenSkeleton,
  Title
} from "@/src/components/ui";
import { createBugReport, listMyBugReports } from "@/src/lib/api/bugs";
import { pickAndUploadImage } from "@/src/lib/image-upload";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { HtmlContent } from "@/src/components/html-content";
import { useSession } from "@/src/lib/use-session";
import { colors, spacing } from "@/src/theme/tokens";

/**
 * The app had no way to report the app. Everything a student hits on a phone —
 * a screen that will not scroll, a payment that stranded — was reportable only
 * from a laptop, which is exactly where the problem is not happening.
 *
 * Screenshots use same signed S3 upload flow as profile photos, then travel with
 * report payload so admin can reproduce visual bugs.
 */

/**
 * Stricter than the API, which accepts a single character for either. A report
 * that says "broken" cannot be acted on, and the person who could add the
 * detail is the one standing in front of the bug.
 */
const DESCRIPTION_FLOOR = 20;

export default function BugReportScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const t = useT();
  const format = useFormat();
  const { isPending: isSessionPending, session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const { data: reports = [], isPending } = useQuery({
    enabled: Boolean(session),
    queryFn: listMyBugReports,
    queryKey: queryKeys.bugReports()
  });

  const submit = useMutation({
    mutationFn: createBugReport,
    onError: (cause: Error) => {
      setError(cause.message);
    },
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setScreenshotUrl(null);
      setHasSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.bugReports() });
    }
  });
  const uploadScreenshot = useMutation({
    mutationFn: () => pickAndUploadImage({ maxWidth: 1600, purpose: "BUG_SCREENSHOT" }),
    onError: (cause: Error) => setError(cause.message),
    onSuccess: (url) => {
      if (url !== null) {
        setScreenshotUrl(url);
        setError(null);
      }
    }
  });

  if (isSessionPending) {
    return <ScreenSkeleton rows={2} />;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const canSubmit = title.trim().length > 0 && description.trim().length >= DESCRIPTION_FLOOR;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("bug.title") }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>{t("bug.title")}</Heading>
          <Body muted>{t("bug.lead")}</Body>

          {error ? <ErrorNotice message={error} /> : null}
          {hasSubmitted ? <Badge tone="faded">{t("bug.sent")}</Badge> : null}

          <Card style={styles.form}>
            <Field
              label={t("bug.whatTitle")}
              onChangeText={(text) => {
                setTitle(text);
                setHasSubmitted(false);
              }}
              placeholder={t("bug.whatPlaceholder")}
              value={title}
            />
            <View>
              <Field
                label={t("bug.doTitle")}
                multiline
                onChangeText={(text) => {
                  setDescription(text);
                  setHasSubmitted(false);
                }}
                placeholder={t("bug.doPlaceholder")}
                style={styles.multiline}
                value={description}
              />
              <View style={styles.hint}>
                <Caption>{t("bug.charFloor", { count: DESCRIPTION_FLOOR })}</Caption>
              </View>
            </View>
            <Button
              isBusy={uploadScreenshot.isPending}
              label={t("bug.chooseScreenshot")}
              onPress={() => {
                setError(null);
                uploadScreenshot.mutate();
              }}
              variant="outline"
            />
            {screenshotUrl ? <CoverImage height={180} uri={screenshotUrl} /> : null}
          </Card>

          <Button
            disabled={!canSubmit}
            isBusy={submit.isPending}
            label={t("bug.send")}
            onPress={() => {
              setError(null);
              submit.mutate({
                description: description.trim(),
                screenshotUrl: screenshotUrl ?? undefined,
                title: title.trim()
              });
            }}
          />

          <Title>{t("bug.yourReports")}</Title>
          {isPending ? (
            <ScreenSkeleton rows={2} />
          ) : reports.length === 0 ? (
            <EmptyState message={t("bug.emptyLead")} title={t("bug.emptyTitle")} />
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <View style={styles.reportHeader}>
                  <Title>{report.title}</Title>
                  <Badge tone={report.priority === "HIGH" ? "attention" : "neutral"}>
                    {report.priority}
                  </Badge>
                </View>
                <View style={{ height: spacing.sm }} />
                <HtmlContent html={report.description} muted />
                <View style={{ height: spacing.sm }} />
                <View style={styles.reportMeta}>
                  <Badge tone={report.status === "RESOLVED" ? "success" : "neutral"}>
                    {report.status}
                  </Badge>
                  <Caption>{format.date(report.createdAt)}</Caption>
                </View>
                {report.screenshotUrl ? (
                  <CoverImage height={160} uri={report.screenshotUrl} />
                ) : null}
                {report.adminNotes ? (
                  <>
                    <View style={{ height: spacing.md }} />
                    <View style={styles.adminNote}>
                      <Caption>{t("bug.fromTeam")}</Caption>
                      <HtmlContent html={report.adminNotes} />
                    </View>
                  </>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg },
  flex: { flex: 1 },
  form: { gap: spacing.lg },
  hint: { paddingTop: spacing.xs },
  adminNote: { backgroundColor: colors.panelWarm, gap: spacing.xs, padding: spacing.md },
  multiline: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  reportHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  reportMeta: { alignItems: "center", flexDirection: "row", gap: spacing.sm }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
