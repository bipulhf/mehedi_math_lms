import { useQuery } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import type { JSX } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import {
  Body,
  Caption,
  Card,
  CoverImage,
  EmptyState,
  Heading,
  Screen,
  ScreenSkeleton,
  Title
} from "@/src/components/ui";
import { Avatar, PriceText, RingedWord } from "@/src/components/ui-display";
import { HtmlContent } from "@/src/components/html-content";
import { getPublicTeacherBySlug } from "@/src/lib/api/profiles";
import { useFormat, useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { spacing } from "@/src/theme/tokens";
import { makeStyles } from "@/src/theme/theme";

export default function TeacherProfileScreen(): JSX.Element {
  const styles = useStyles();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useT();
  const format = useFormat();
  const { data: profile, isPending } = useQuery({
    queryFn: () => getPublicTeacherBySlug(slug),
    queryKey: queryKeys.teacher(slug)
  });

  if (isPending) {
    return <ScreenSkeleton rows={4} />;
  }

  if (!profile) {
    return (
      <Screen>
        <EmptyState message={t("teachers.empty")} />
      </Screen>
    );
  }

  const teacherPhoto = profile.teacherProfile?.profilePhoto ?? profile.user.image;
  const phone = profile.teacherProfile?.phone ?? null;

  return (
    <Screen>
      <Stack.Screen options={{ title: profile.user.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar name={profile.user.name} photo={teacherPhoto} size={112} />
          <View style={styles.heroText}>
            <RingedWord>
              <Heading>{profile.user.name}</Heading>
            </RingedWord>
            {profile.teacherProfile?.specializations ? (
              <HtmlContent html={profile.teacherProfile.specializations} muted />
            ) : null}
          </View>
        </View>

        {profile.teacherProfile?.bio ? (
          <Card>
            <Title>{t("teachers.lead")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.bio} muted />
          </Card>
        ) : null}

        {profile.teacherProfile?.qualifications ? (
          <Card>
            <Title>{t("detail.qualifications")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.qualifications} muted />
          </Card>
        ) : null}

        {profile.teacherProfile?.socialLinks ? (
          <Card>
            <Title>{t("teacher.links")}</Title>
            <View style={{ height: spacing.sm }} />
            <HtmlContent html={profile.teacherProfile.socialLinks} muted />
          </Card>
        ) : null}

        {phone ? (
          <Card>
            <Title>{t("teacher.phone")}</Title>
            <View style={{ height: spacing.sm }} />
            <Pressable
              accessibilityLabel={`${t("teacher.phone")} ${format.digits(phone)}`}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            >
              <Body muted>{format.digits(phone)}</Body>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.metrics}>
          <Metric
            label={t("common.courses")}
            value={format.number(profile.metrics.publishedCourseCount)}
          />
          <Metric label={t("common.reviews")} value={format.number(profile.metrics.reviewCount)} />
          {profile.metrics.reviewAverage === null ? null : (
            <Metric
              label={t("common.rating")}
              value={format.rating(profile.metrics.reviewAverage)}
            />
          )}
        </View>

        <Title>{t("common.courses")}</Title>
        {profile.courses.length === 0 ? (
          <EmptyState message={t("teachers.empty")} />
        ) : (
          profile.courses.map((course) => (
            <Link
              asChild
              href={{ params: { courseId: course.slug }, pathname: "/courses/[courseId]" }}
              key={course.id}
            >
              <Pressable
                accessibilityLabel={course.title}
                accessibilityRole="link"
                style={({ pressed }) => [pressed ? { opacity: 0.92, transform: [{ scale: 0.98 }] } : null]}
              >
                <Card style={styles.courseCard}>
                  <CoverImage bleed height={120} uri={course.coverImageUrl} />
                  <View style={styles.courseText}>
                    <Title>{course.title}</Title>
                    <Body muted numberOfLines={2}>
                      {course.description.replace(/<[^>]*>/g, "")}
                    </Body>
                    <PriceText amount={course.price} />
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Title>{value}</Title>
      <Caption>{label}</Caption>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  content: { gap: spacing.lg, padding: spacing.lg },
  courseCard: { gap: 0, marginBottom: spacing.md, overflow: "hidden", padding: 0 },
  courseText: { gap: spacing.sm, padding: spacing.md },
  hero: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  heroText: { flex: 1, gap: spacing.sm },
  metric: { flex: 1, gap: spacing.xs },
  metrics: {
    borderBottomColor: colors.hairline,
    borderBottomWidth: 1,
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md
  }
}));

export { ScreenErrorBoundary as ErrorBoundary } from "@/src/components/route-error";
