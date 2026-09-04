import { type BannerPreset, richTextToPlainText } from "@mma/shared";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { getActiveBanner } from "@/src/lib/api/banners";
import { useT } from "@/src/lib/locale";
import { queryKeys } from "@/src/lib/query";
import { fonts, radius, spacing } from "@/src/theme/tokens";
import { makeStyles, useThemeColors, type ThemeColors } from "@/src/theme/theme";

/**
 * The five presets an admin can pick from, mapped onto the app's pastel
 * families rather than onto saturated fills. A promo strip sits above the
 * catalogue every visit — a full-strength colour there would out-shout the
 * courses it is advertising, so each preset is the wash and the ink already
 * known to read on it.
 */
function presetColors(
  colors: ThemeColors
): Record<BannerPreset, { background: string; foreground: string }> {
  return {
    CYAN: { background: colors.tint.sky.bg, foreground: colors.tint.sky.fg },
    INK: { background: colors.tint.brand.bg, foreground: colors.tint.brand.fg },
    ORANGE: { background: colors.tint.coral.bg, foreground: colors.tint.coral.fg },
    SPECTRUM: { background: colors.tint.lilac.bg, foreground: colors.tint.lilac.fg },
    YELLOW: { background: colors.tint.gold.bg, foreground: colors.tint.gold.fg }
  };
}

/**
 * The site-wide promo strip an admin manages. Nothing renders until an active
 * banner loads, and dismissing it is component state — the next launch shows a
 * banner that is still running, the same as the web strip.
 *
 * The message is authored as rich text and read here as plain text:
 * `richTextToPlainText`, not a stripped tag soup, so a formatted announcement
 * reads as a sentence rather than as markup.
 */
export function BannerStrip(): JSX.Element | null {
  const styles = useStyles();
  const colors = useThemeColors();
  const t = useT();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const { data: banner } = useQuery({
    queryFn: getActiveBanner,
    queryKey: queryKeys.activeBanner()
  });

  if (!banner || banner.id === dismissedId) {
    return null;
  }

  const preset = presetColors(colors)[banner.backgroundPreset];
  const message = richTextToPlainText(banner.message);

  return (
    <View style={[styles.strip, { backgroundColor: preset.background }]}>
      <View style={styles.text}>
        <Text style={[styles.message, { color: preset.foreground }]}>{message}</Text>
        {banner.linkUrl ? (
          <Pressable
            accessibilityLabel={
              banner.linkLabel && banner.linkLabel.length > 0
                ? banner.linkLabel
                : (banner.linkUrl ?? "")
            }
            accessibilityRole="link"
            onPress={() => {
              void WebBrowser.openBrowserAsync(banner.linkUrl ?? "");
            }}
          >
            <Text style={[styles.link, { color: preset.foreground }]}>
              {banner.linkLabel && banner.linkLabel.length > 0 ? banner.linkLabel : banner.linkUrl}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={t("common.close")}
        accessibilityRole="button"
        hitSlop={spacing.md}
        onPress={() => setDismissedId(banner.id)}
        style={styles.dismissBtn}
      >
        <Ionicons color={preset.foreground} name="close-circle" size={22} style={{ opacity: 0.85 } as never} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  dismissBtn: { alignItems: "center", justifyContent: "center", padding: spacing.xs },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, textDecorationLine: "underline" },
  message: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  strip: {
    alignItems: "center",
    borderRadius: radius.square,
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  text: { flex: 1, gap: spacing.xs }
}));
