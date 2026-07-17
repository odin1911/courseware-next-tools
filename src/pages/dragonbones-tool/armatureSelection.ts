export const DEFAULT_ARMATURE = 'armatures/skeleton_movie_1';

const FALLBACK_ARMATURES = [DEFAULT_ARMATURE, 'armatures/main'];

type PickInitialArmatureOptions = {
  preferredArmatures?: string[];
  discoveredArmatures: string[];
};

export function pickInitialArmature({
  preferredArmatures,
  discoveredArmatures,
}: PickInitialArmatureOptions) {
  const armatures = discoveredArmatures.filter((name) => name.length > 0);

  if (armatures.length === 0) {
    return preferredArmatures?.[0] ?? DEFAULT_ARMATURE;
  }

  const candidates = [...(preferredArmatures ?? []), ...FALLBACK_ARMATURES, ...armatures];

  for (const candidate of candidates) {
    if (armatures.includes(candidate)) {
      return candidate;
    }
  }

  return armatures[0];
}
