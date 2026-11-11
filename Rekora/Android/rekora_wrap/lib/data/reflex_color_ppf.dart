import '../models.dart';
import 'ppf_color_chips.dart';

class ReflexColorEntry {
  const ReflexColorEntry({
    required this.code,
    required this.name,
    required this.finish,
    this.hex,
  });

  final String code;
  final String name;
  final String finish;
  final String? hex;
}

/// FLEXIShield Color PPF catalog (REFLEX). Hex values are digital
/// approximations for UI swatches only; real film appearance varies with
/// pearl/metallic/chameleon effects.
const List<ReflexColorEntry> reflexCatalog = [
  // CL Series (solid gloss)
  ReflexColorEntry(
    code: 'CL-01',
    name: 'Coral',
    hex: 'FF7F50',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-02',
    name: 'Racing Red',
    hex: 'CC0000',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-03',
    name: 'Highlighter Yellow',
    hex: 'EAFF00',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-04',
    name: 'Acidic Lime',
    hex: 'BFFF00',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-05',
    name: 'Sky Blue',
    hex: '87CEEB',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-06',
    name: 'Cerulean Blue',
    hex: '2A52BE',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-07',
    name: 'Nardo Grey',
    hex: '686A6C',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-08',
    name: 'Dusk Grey',
    hex: '4B4B4B',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-09',
    name: 'Military Green',
    hex: '4B5320',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-10',
    name: 'Deep Navy',
    hex: '000080',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-11',
    name: 'Berry Pink',
    hex: 'C71585',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-12',
    name: 'Cream / Beige',
    hex: 'F5F5DC',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-13',
    name: 'Petrol Blue',
    hex: '005F6A',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-14',
    name: 'Forest Green',
    hex: '014421',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-16',
    name: 'Slate Black',
    hex: '2F4F4F',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-17',
    name: 'Burgundy',
    hex: '800020',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-18',
    name: 'Lavender',
    hex: 'E6E6FA',
    finish: 'PPF Gloss',
  ),
  ReflexColorEntry(
    code: 'CL-19',
    name: 'Chocolate',
    hex: '7B3F00',
    finish: 'PPF Gloss',
  ),

  // HG Series (high glitter / metallic)
  ReflexColorEntry(
    code: 'HG-01',
    name: 'Silver Metallic',
    hex: 'C0C0C0',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-02',
    name: 'Bronze',
    hex: 'CD7F32',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-03',
    name: 'Orange Copper',
    hex: 'B87333',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-04',
    name: 'Yellow Gold',
    hex: 'FFD700',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-05',
    name: 'Emerald Green',
    hex: '50C878',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-06',
    name: 'Lime Green Pearl',
    hex: '32CD32',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-07',
    name: 'Mint Fresh',
    hex: '98FF98',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-08',
    name: 'Dusk Sky Pearl',
    hex: '768598',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-09',
    name: 'Shining Silver',
    hex: 'E5E4E2',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-10',
    name: 'Black Bronze',
    hex: '382C1E',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-11',
    name: 'Gold Flake',
    hex: 'D4AF37',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-12',
    name: 'Perfect Plum',
    hex: '8E4585',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-13',
    name: 'Metallic Rose',
    hex: 'E0BFB8',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-14',
    name: 'Finish Line Green',
    hex: '006400',
    finish: 'PPF Metallic',
  ),
  ReflexColorEntry(
    code: 'HG-15',
    name: 'Charcoal Metallic',
    hex: '36454F',
    finish: 'PPF Metallic',
  ),

  // DM Series (chameleon / color flip) - swatches are approximate anchor tones.
  ReflexColorEntry(
    code: 'DM-01',
    name: 'White to Pink/Blue',
    hex: 'F2ECF9',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-02',
    name: 'Pink Gold',
    hex: 'D9A79C',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-03',
    name: 'Purple/Green',
    hex: '4F4B7A',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-04',
    name: 'Blue/Purple',
    hex: '3E4E9A',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-05',
    name: 'Blue/Gold',
    hex: '3B5A86',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-06',
    name: 'Aurora Dark 06',
    hex: '2F3148',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-07',
    name: 'Aurora Dark 07',
    hex: '2C3046',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-08',
    name: 'Aurora Dark 08',
    hex: '263040',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-09',
    name: 'Aurora Dark 09',
    hex: '22313C',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-10',
    name: 'Aurora Dark 10',
    hex: '1F2D38',
    finish: 'PPF Chameleon',
  ),
  ReflexColorEntry(
    code: 'DM-11',
    name: 'Aurora Dark 11',
    hex: '1C2A36',
    finish: 'PPF Chameleon',
  ),

  // TP Series (pattern textures)
  ReflexColorEntry(
    code: 'TP-01',
    name: 'Carbon Fiber',
    hex: '2B2B2B',
    finish: 'PPF Pattern',
  ),
  ReflexColorEntry(
    code: 'TP-02',
    name: 'Oil Slick Carbon',
    hex: '43354F',
    finish: 'PPF Pattern',
  ),
  ReflexColorEntry(
    code: 'TP-03',
    name: 'Forged Carbon Red',
    hex: '5A2B2B',
    finish: 'PPF Pattern',
  ),
  ReflexColorEntry(
    code: 'TP-501',
    name: 'Forged Carbon',
    hex: '3C3C3C',
    finish: 'PPF Pattern',
  ),
];

final List<WrapColor> reflexColorPpf = reflexCatalog
    .map(
      (entry) => WrapColor(
        id: entry.code.toLowerCase(),
        name: entry.name,
        brand: 'FLEXIShield Color PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern') ? 145 : 138,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('REFLEX', entry.code),
        referenceAssetPath: lookupPpfReferenceAsset('REFLEX', entry.code, entry.finish),
      ),
    )
    .toList();
