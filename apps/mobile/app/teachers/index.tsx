import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Body,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenSkeleton
} from "@/src/components/ui";
import { Avatar } from "@/src/components/ui-display";
import { stripHtml } from "@/src/lib/html";
import { useFormat, useT } from "@/src/lib/locale";
import { listPublicTeachers, type TeacherDirectoryEntry } from "@/src/lib/api/profiles";
import { queryKeys } from "@/src/lib/query";
import { colors, fonts, spacing } from "@/src/theme/tokens";

function TeacherRow({ teacher }: { teacher: TeacherDirectoryEntry }): JSX.Element {
  const format = useFormat();
  const t = useT();

  return (
    <Link asChild href={{ params: { slug: teacher.slug }, pathname: "/teachers/[slug]" }}>
      <Pressable accessibilityLabel={teacher.name} accessibilityRole="link" style={styles.row}>
        <Card>
          <View style={styles.identity}>
            <Avatar name={teacher.name} photo={teacher.profilePhoto} size={64} />
            <View style={styles.identityText}>
              <Text numberOfLines={1} style={styles.name}>
                {teacher.name}
              </Text>
              {teacher.specializations ? (
                <Body muted numberOfLines={2}>
                  {stripHtml(teacher.specializations)}
                </Body>
              ) : null}
            </View>
          </View>
          {teacher.bio ? (
            <Body muted numberOfLines={3}>
              {stripHtml(teacher.bio)}
            </Body>
          ) : null}
          <View style={styles.meta}>
            <Caption>
              {format.number(teacher.courseCount)} {t("common.courses")}
            </Caption>
            <Caption>
              {format.number(teacher.studentCount)} {t("common.students")}
            </Caption>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function TeachersScreen(): JSX.Element {
  const t = useT();
  const { data: teachers = [], isPending } = useQuery({
    queryFn: listPublicTeachers,
    queryKey: queryKeys.teachers()
  });

  if (isPending) {
    return <ScreenSkeleton rows={4} />;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("teachers.title") }} />
      <FlashList
        contentContainerStyle={styles.content}
        data={teachers}
        keyExtractor={(teacher) => teacher.id}
        ListEmptyComponent={<EmptyState message={t("teachers.empty")} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Heading>{t("teachers.title")}</Heading>
            <Body muted>{t("teachers.lead")}</Body>
          </View>
        }
        renderItem={({ item }) => <TeacherRow teacher={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  header: { gap: spacing.sm, paddingBottom: spacing.lg },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  identityText: { flex: 1, gap: spacing.xs },
  meta: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.md
  },
  name: { color: colors.ink, fontFamily: fonts.displaySemiBold, fontSize: 19 },
  row: { marginBottom: spacing.md }
});

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
