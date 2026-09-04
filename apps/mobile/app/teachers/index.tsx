import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
  Body,
  Caption,
  Card,
  EmptyState,
  Heading,
  Screen,
} from "@/src/components/ui";
import { Avatar } from "@/src/components/ui-display";
import { stripHtml } from "@/src/lib/html";
import { useFormat, useT } from "@/src/lib/locale";
import { listPublicTeachers, type TeacherDirectoryEntry } from "@/src/lib/api/profiles";
import { queryKeys } from "@/src/lib/query";
import { fonts, spacing } from "@/src/theme/tokens";
import { SkeletonHeading, SkeletonRows, SkeletonScreen } from "@/src/components/skeletons";
import { makeStyles, useThemeColors } from "@/src/theme/theme";

function TeacherRow({ teacher }: { teacher: TeacherDirectoryEntry }): JSX.Element {
  const styles = useStyles();
  const colors = useThemeColors();
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
            <View style={styles.metaItem}>
              <Ionicons color={colors.tint.brand.solid} name="book" size={14} />
              <Caption>
                {format.number(teacher.courseCount)} {t("common.courses")}
              </Caption>
            </View>
            <View style={styles.metaItem}>
              <Ionicons color={colors.tint.mint.solid} name="people" size={14} />
              <Caption>
                {format.number(teacher.studentCount)} {t("common.students")}
              </Caption>
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function TeachersScreen(): JSX.Element {
  const styles = useStyles();
  const t = useT();
  const { data: teachers = [], isPending } = useQuery({
    queryFn: listPublicTeachers,
    queryKey: queryKeys.teachers()
  });

  if (isPending) {
    return (
      <SkeletonScreen>
        <SkeletonHeading />
        <SkeletonRows leading="avatar" rows={5} />
      </SkeletonScreen>
    );
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

const useStyles = makeStyles((colors) => ({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm, paddingBottom: spacing.lg },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  identityText: { flex: 1, gap: spacing.xs },
  meta: {
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.md
  },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  name: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
  row: { marginBottom: spacing.md }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
