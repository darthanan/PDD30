// Icon font loader for Expo apps.
// Loads fonts directly from the local @expo/vector-icons package using
// the static `.font` property of each icon set. This avoids the
// "Font file is empty" error that occurs when loading from CDN in Expo Go.
// Usage: const [loaded, error] = useIconFonts();

import { useFonts } from 'expo-font';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Fontisto from '@expo/vector-icons/Fontisto';
import Foundation from '@expo/vector-icons/Foundation';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import Zocial from '@expo/vector-icons/Zocial';

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    ...AntDesign.font,
    ...Entypo.font,
    ...EvilIcons.font,
    ...Feather.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...Fontisto.font,
    ...Foundation.font,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
    ...Octicons.font,
    ...SimpleLineIcons.font,
    ...Zocial.font,
  });
