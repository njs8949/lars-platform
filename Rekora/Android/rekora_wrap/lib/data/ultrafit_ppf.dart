import '../models.dart';
import 'ppf_color_chips.dart';

class UltrafitColorEntry {
  const UltrafitColorEntry({
    required this.id,
    required this.name,
    required this.finish,
    this.hex,
  });

  final String id;
  final String name;
  final String finish;
  final String? hex;
}

/// ULTRAFIT PPF catalog (Clear, Black/Pattern, Aurora, Gloss colors, Retro, Headlight).
/// Hex values are digital approximations for UI swatches only.
const List<UltrafitColorEntry> ultrafitCatalog = [
  // Clear / protection
  UltrafitColorEntry(
    id: 'ultrafit-supreme-top',
    name: 'SUPREME TOP',
    finish: 'PPF Clear',
    hex: 'F8F8F8',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-crystal',
    name: 'XP CRYSTAL',
    finish: 'PPF Clear',
    hex: 'F7F7F7',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-matte',
    name: 'XP RETRO MATTE',
    finish: 'PPF Clear Matte',
    hex: 'E6E6E6',
  ),

  // Black & pattern
  UltrafitColorEntry(
    id: 'ultrafit-xp-black',
    name: 'XP BLACK',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-black-matte',
    name: 'XP BLACK MATTE',
    finish: 'PPF Matte',
    hex: '1C1C1C',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-black-carbon',
    name: 'XP BLACK CARBON',
    finish: 'PPF Pattern',
    hex: '1A1A1A',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-black-forged',
    name: 'XP BLACK FORGED',
    finish: 'PPF Pattern',
    hex: '2A2A2A',
  ),

  // Aurora & color shift
  UltrafitColorEntry(
    id: 'ultrafit-xp-aurora-aqua',
    name: 'XP AURORA AQUA',
    finish: 'PPF Aurora',
    hex: '2F7E8D',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-aurora-forest',
    name: 'XP AURORA FOREST',
    finish: 'PPF Aurora',
    hex: '4A5A35',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-aurora-silver',
    name: 'XP AURORA SILVER',
    finish: 'PPF Aurora',
    hex: 'BCC6D2',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-aurora-magenta',
    name: 'XP AURORA MAGENTA',
    finish: 'PPF Aurora',
    hex: '8A1F6C',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-aurora-purple',
    name: 'XP AURORA PURPLE',
    finish: 'PPF Aurora',
    hex: '4A3D70',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-deep-chroma-blue',
    name: 'XP DEEP CHROMA BLUE',
    finish: 'PPF Aurora',
    hex: '1D2F5B',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-phoenix-red',
    name: 'XP PHOENIX RED',
    finish: 'PPF Aurora',
    hex: 'B01F2E',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-phoenix-red',
    name: 'XP RETRO PHOENIX RED',
    finish: 'PPF Aurora Matte',
    hex: 'A5202A',
  ),

  // Gloss colors
  UltrafitColorEntry(
    id: 'ultrafit-xp-fire-red',
    name: 'XP FIRE RED',
    finish: 'PPF Gloss',
    hex: 'D92732',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-metallic-rose-silver',
    name: 'XP METALLIC ROSE SILVER',
    finish: 'PPF Gloss Metallic',
    hex: 'C7B0B8',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-light-stone',
    name: 'XP LIGHT STONE',
    finish: 'PPF Gloss',
    hex: 'C2C9BD',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-metallic-silver',
    name: 'XP METALLIC SILVER',
    finish: 'PPF Gloss Metallic',
    hex: 'C0C0C0',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-mountain-gray',
    name: 'XP MOUNTAIN GRAY',
    finish: 'PPF Gloss',
    hex: '8F9499',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-olive-green',
    name: 'XP OLIVE GREEN',
    finish: 'PPF Gloss',
    hex: '6B7B3A',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-purple-galaxy',
    name: 'XP PURPLE GALAXY',
    finish: 'PPF Gloss',
    hex: '5C3A7A',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-pearl-white',
    name: 'XP PEARL WHITE',
    finish: 'PPF Pearl',
    hex: 'F8F8F4',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-stone-beige',
    name: 'XP STONE BEIGE',
    finish: 'PPF Gloss',
    hex: 'D9C8B0',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-tuscan-yellow',
    name: 'XP TUSCAN YELLOW',
    finish: 'PPF Gloss',
    hex: 'E7B112',
  ),

  // Matte / Retro colors
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-fire-red',
    name: 'XP RETRO FIRE RED',
    finish: 'PPF Matte',
    hex: 'C12A2A',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-metallic-silver',
    name: 'XP RETRO METALLIC SILVER',
    finish: 'PPF Matte Metallic',
    hex: 'B7BABC',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-olive-green',
    name: 'XP RETRO OLIVE GREEN',
    finish: 'PPF Matte',
    hex: '7B8451',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-pearl-white',
    name: 'XP RETRO PEARL WHITE',
    finish: 'PPF Pearl Matte',
    hex: 'EFEFE6',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-tuscan-yellow',
    name: 'XP RETRO TUSCAN YELLOW',
    finish: 'PPF Matte',
    hex: 'D6A018',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-retro-stone-beige',
    name: 'XP RETRO STONE BEIGE',
    finish: 'PPF Matte',
    hex: 'CBB59D',
  ),

  // Headlight / tail lamp films
  UltrafitColorEntry(
    id: 'ultrafit-xp-gold-black',
    name: 'XP GOLD BLACK',
    finish: 'PPF Light',
    hex: '5A4A2C',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-graphite',
    name: 'XP GRAPHITE',
    finish: 'PPF Light',
    hex: '4A4A4A',
  ),
  UltrafitColorEntry(
    id: 'ultrafit-xp-moonlight',
    name: 'XP MOONLIGHT',
    finish: 'PPF Light',
    hex: '9BA3B3',
  ),
];

final List<WrapColor> ultrafitColorPpf = ultrafitCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'ULTRAFIT PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 150
            : entry.finish.contains('Aurora')
            ? 155
            : entry.finish.contains('Light') || entry.finish.contains('Clear')
            ? 130
            : entry.finish.contains('Matte')
            ? 140
            : 145,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('ULTRAFIT', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('ULTRAFIT', entry.id, entry.finish),
      ),
    )
    .toList();
