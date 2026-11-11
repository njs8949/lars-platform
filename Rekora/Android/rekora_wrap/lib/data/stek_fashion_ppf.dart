import '../models.dart';
import 'ppf_color_chips.dart';

class StekColorEntry {
  const StekColorEntry({
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

/// STEK Fashion Film (Color/Pattern/Effect/Light) PPF catalog.
/// Hex values are digital approximations; real finish varies with pearl/pattern.
const List<StekColorEntry> stekCatalog = [
  // Solid Color Series
  StekColorEntry(
    id: 'stek-dynoblack',
    name: 'DYNOblack (gloss)',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  StekColorEntry(
    id: 'stek-dynoblack-matte',
    name: 'DYNOblack-matte',
    finish: 'PPF Matte',
    hex: '1C1C1C',
  ),
  StekColorEntry(
    id: 'stek-dynogray',
    name: 'DYNOgray',
    finish: 'PPF Gloss',
    hex: '686A6C',
  ),
  StekColorEntry(
    id: 'stek-dynowhite',
    name: 'DYNOwhite',
    finish: 'PPF Pearl',
    hex: 'F0F0F0',
  ),
  StekColorEntry(
    id: 'stek-dynored',
    name: 'DYNOred',
    finish: 'PPF Gloss',
    hex: '8D021F',
  ),
  StekColorEntry(
    id: 'stek-dynopurple',
    name: 'DYNOpurple',
    finish: 'PPF Gloss',
    hex: '321436',
  ),
  StekColorEntry(
    id: 'stek-dynomiami-blue',
    name: 'DYNOmiami-blue',
    finish: 'PPF Gloss',
    hex: '007C92',
  ),
  StekColorEntry(
    id: 'stek-dynogreen',
    name: 'DYNOgreen',
    finish: 'PPF Gloss',
    hex: '004225',
  ),
  StekColorEntry(
    id: 'stek-dynoorange',
    name: 'DYNOorange',
    finish: 'PPF Metallic',
    hex: 'E25822',
  ),

  // Pattern Series
  StekColorEntry(
    id: 'stek-dynodamascus-black',
    name: 'DYNOdamascus (Black)',
    finish: 'PPF Pattern',
  ),
  StekColorEntry(
    id: 'stek-dynodamascus-clear',
    name: 'DYNOdamascus (Clear)',
    finish: 'PPF Pattern',
  ),
  StekColorEntry(
    id: 'stek-dynocarbon-gloss',
    name: 'DYNOcarbon (Gloss)',
    finish: 'PPF Pattern',
  ),
  StekColorEntry(
    id: 'stek-dynocarbon-matte',
    name: 'DYNOcarbon (Matte)',
    finish: 'PPF Pattern',
  ),
  StekColorEntry(
    id: 'stek-dynoforged-carbon',
    name: 'DYNOforged-carbon',
    finish: 'PPF Pattern',
  ),
  StekColorEntry(
    id: 'stek-dynocamo-black',
    name: 'DYNOcamo-black',
    finish: 'PPF Pattern',
  ),

  // Effect Series
  StekColorEntry(id: 'stek-dynoprism', name: 'DYNOprism', finish: 'PPF Effect'),
  StekColorEntry(
    id: 'stek-dynoshift-green',
    name: 'DYNOshift-green',
    finish: 'PPF Effect',
  ),

  // Light Protection (head/tail lights)
  StekColorEntry(id: 'stek-dynoshade', name: 'DYNOshade', finish: 'PPF Light'),
  StekColorEntry(id: 'stek-dynosmoke', name: 'DYNOsmoke', finish: 'PPF Light'),
  StekColorEntry(
    id: 'stek-dynoyellow',
    name: 'DYNOyellow',
    finish: 'PPF Light',
  ),
];

final List<WrapColor> stekColorPpf = stekCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'STEK Fashion Film',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 158
            : entry.finish.contains('Effect')
            ? 150
            : entry.finish.contains('Light')
            ? 128
            : 148,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('STEK', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('STEK', entry.id, entry.finish),
      ),
    )
    .toList();
