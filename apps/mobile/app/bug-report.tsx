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
  EmptyState,
  ErrorNotice,
  Field,
  Heading,
  Screen,
  ScreenSkeleton,
  Title
} from "@/src/components/ui";
import { createBugReport, listMyBugReports } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query";
import { HtmlContent } from "@/src/components/html-content";
import { useSession } from "@/src/lib/use-session";
import { spacing } from "@/src/theme/tokens";

/**
 * The app had no way to report the app. Everything a student hits on a phone —
 * a screen that will not scroll, a payment that stranded — was reportable only
 * from a laptop, which is exactly where the problem is not happening.
 *
 * `screenshotUrl` is part of the API's schema and deliberately not sent: it
 * needs the signed-upload flow the web app has and this one does not.
 */

/**
 * Stricter than the API, which accepts a single character for either. A report
 * that says "broken" cannot be acted on, and the person who could add the
 * detail is the one standing in front of the bug.
 */
const DESCRIPTION_FLOOR = 20;

export default function BugReportScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const { isPending: isSessionPending, session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
      setHasSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.bugReports() });
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
      <Stack.Screen options={{ title: "Report a bug" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading>Report a bug</Heading>
          <Body muted>
            Say what you were doing and what happened instead. Reports reach the same queue as the
            ones sent from the web.
          </Body>

          {error ? <ErrorNotice message={error} /> : null}
          {hasSubmitted ? <Badge tone="positive">Report sent. Thank you.</Badge> : null}

          <Card style={styles.form}>
            <Field
              label="What went wrong"
              onChangeText={(text) => {
                setTitle(text);
                setHasSubmitted(false);
              }}
              placeholder="Enrolling did nothing"
              value={title}
            />
            <View>
              <Field
                label="What you did, and what happened"
                multiline
                onChangeText={(text) => {
                  setDescription(text);
                  setHasSubmitted(false);
                }}
                placeholder="I tapped Enrol on the Higher Maths course and the browser opened, then…"
                style={styles.multiline}
                value={description}
              />
              <View style={styles.hint}>
                <Caption>At least {DESCRIPTION_FLOOR} characters.</Caption>
              </View>
            </View>
          </Card>

          <Button
            disabled={!canSubmit}
            isBusy={submit.isPending}
            label="Send report"
            onPress={() => {
              setError(null);
              submit.mutate({ description: description.trim(), title: title.trim() });
            }}
          />

          <Title>Your reports</Title>
          {isPending ? (
            <ScreenSkeleton rows={2} />
          ) : reports.length === 0 ? (
            <EmptyState
              message="Anything you send will be listed here with its status."
              title="Nothing reported yet"
            />
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <View style={styles.reportHeader}>
                  <Title>{report.title}</Title>
                  <Badge tone={report.status === "RESOLVED" ? "positive" : "neutral"}>
                    {report.status}
                  </Badge>
                </View>
                <View style={{ height: spacing.sm }} />
                <HtmlContent html={report.description} muted />
                <View style={{ height: spacing.sm }} />
                <Caption>{new Date(report.createdAt).toLocaleDateString()}</Caption>
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
  multiline: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  reportHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
