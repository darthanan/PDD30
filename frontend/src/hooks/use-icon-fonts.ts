// Icon font loader for Expo apps. Fonts are loaded from a CDN only under
// Expo Go (StoreClient) — that's where @expo/vector-icons' .ttf files come
// back as 0 bytes from Metro's asset resolver on Android. Native dev/prod
// builds and web pass an empty map, so useFonts resolves to [true, null]
// immediately via react-native-vector-icons autolinking / web stubs.
// ICON_VECTOR_VERSION must match @expo/vector-icons in package.json.
// Usage: const [loaded, error] = useIconFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";

const ICON_VECTOR_VERSION = "15.1.1";

const ICON_MAPPING = {
  AntDesign: { name: "anticon", file: "AntDesign.ttf" },
  Entypo: { name: "entypo", file: "Entypo.ttf" },
  EvilIcons: { name: "evilicons", file: "EvilIcons.ttf" },
  Feather: { name: "feather", file: "Feather.ttf" },
  FontAwesome: { name: "FontAwesome", file: "FontAwesome.ttf" },
  FontAwesome5_Brands: { name: "FontAwesome5Free-Brand", file: "FontAwesome5_Brands.ttf" },
  FontAwesome5_Regular: { name: "FontAwesome5Free-Regular", file: "FontAwesome5_Regular.ttf" },
  FontAwesome5_Solid: { name: "FontAwesome5Free-Solid", file: "FontAwesome5_Solid.ttf" },
  FontAwesome6_Brands: { name: "FontAwesome6Brands-Regular", file: "FontAwesome6_Brands.ttf" },
  FontAwesome6_Regular: { name: "FontAwesome6Free-Regular", file: "FontAwesome6_Regular.ttf" },
  FontAwesome6_Solid: { name: "FontAwesome6Free-Solid", file: "FontAwesome6_Solid.ttf" },
  Fontisto: { name: "Fontisto", file: "Fontisto.ttf" },
  Foundation: { name: "foundation", file: "Foundation.ttf" },
  Ionicons: { name: "ionicons", file: "Ionicons.ttf" },
  MaterialCommunityIcons: { name: "material-community", file: "MaterialCommunityIcons.ttf" },
  MaterialIcons: { name: "material", file: "MaterialIcons.ttf" },
  Octicons: { name: "octicons", file: "Octicons.ttf" },
  SimpleLineIcons: { name: "simple-line-icons", file: "SimpleLineIcons.ttf" },
  Zocial: { name: "zocial", file: "Zocial.ttf" },
} as const;

const iconFontMap = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(ICON_MAPPING).map(([_, value]) => [
      value.name,
      `https://cdn.jsdelivr.net/npm/@expo/vector-icons@${ICON_VECTOR_VERSION}/build/vendor/react-native-vector-icons/Fonts/${value.file}`,
    ])
  );

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : {},
  );
