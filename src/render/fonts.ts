// @expo-google-fonts ships one static font file per weight rather than a
// single variable-weight family, so a numeric fontWeight alone can't select
// weight the way it could under a system font — this bridges that gap.
const WEIGHT_TO_FAMILY: Record<number, string> = {
  400: 'Inter_400Regular',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  900: 'Inter_900Black',
};

export function resolveFontFamily(weight: number): string {
  return WEIGHT_TO_FAMILY[weight] || WEIGHT_TO_FAMILY[400];
}
