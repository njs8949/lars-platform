import '../models.dart';
import 'ppf_color_chips.dart';

class UppfColorEntry {
  const UppfColorEntry({
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

/// UPPF Color/Texture/Effect PPF catalog.
/// Hex values are digital approximations for UI swatches only; real film
/// appearance varies with pearl/magic/texture effects.
const List<UppfColorEntry> uppfCatalog = [
  // Solid Color PPF (gloss/satin)
  UppfColorEntry(
    id: 'uppf-mirror-black',
    name: 'Mirror Black',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  UppfColorEntry(
    id: 'uppf-satin-black',
    name: 'Satin Black',
    finish: 'PPF Satin',
    hex: '1C1C1C',
  ),
  UppfColorEntry(
    id: 'uppf-mirror-white',
    name: 'Mirror White',
    finish: 'PPF Gloss',
    hex: 'FFFFFF',
  ),
  UppfColorEntry(
    id: 'uppf-passion-red',
    name: 'Passion Red',
    finish: 'PPF Gloss',
    hex: 'CE2029',
  ),
  UppfColorEntry(
    id: 'uppf-sunrise-orange',
    name: 'Sunrise Orange',
    finish: 'PPF Gloss',
    hex: 'FF8C00',
  ),
  UppfColorEntry(
    id: 'uppf-sunflower-yellow',
    name: 'Sunflower Yellow',
    finish: 'PPF Gloss',
    hex: 'FFDA03',
  ),
  UppfColorEntry(
    id: 'uppf-forest-green',
    name: 'Forest Green',
    finish: 'PPF Gloss',
    hex: '0B6623',
  ),
  UppfColorEntry(
    id: 'uppf-peppa-pink',
    name: 'Peppa Pink',
    finish: 'PPF Gloss',
    hex: 'F8C3CD',
  ),
  UppfColorEntry(
    id: 'uppf-sky-blue',
    name: 'Sky Blue',
    finish: 'PPF Gloss',
    hex: '87CEEB',
  ),
  UppfColorEntry(
    id: 'uppf-battleship-grey',
    name: 'Battleship Grey',
    finish: 'PPF Gloss',
    hex: '848482',
  ),
  UppfColorEntry(
    id: 'uppf-nardo-grey',
    name: 'Nardo Grey',
    finish: 'PPF Gloss',
    hex: '686A6C',
  ),

  // Magic PPF - Gloss (color flip)
  UppfColorEntry(
    id: 'uppf-magic-gloss-blue-purple',
    name: 'Gloss Blue & Purple',
    finish: 'PPF Magic Gloss',
    hex: '5A4FD8',
  ),
  UppfColorEntry(
    id: 'uppf-magic-gloss-gold-green',
    name: 'Gloss Gold & Green',
    finish: 'PPF Magic Gloss',
    hex: '7A8F2A',
  ),
  UppfColorEntry(
    id: 'uppf-magic-gloss-pink-gold',
    name: 'Gloss Pink & Gold',
    finish: 'PPF Magic Gloss',
    hex: 'D8896F',
  ),

  // Magic PPF - Clear (tinted/transparent)
  UppfColorEntry(
    id: 'uppf-magic-clear-blue-purple',
    name: 'Clear Blue & Purple',
    finish: 'PPF Magic Clear',
    hex: '7E7BEF',
  ),
  UppfColorEntry(
    id: 'uppf-magic-clear-gold-green',
    name: 'Clear Gold & Green',
    finish: 'PPF Magic Clear',
    hex: '9BAE4C',
  ),
  UppfColorEntry(
    id: 'uppf-magic-clear-pink-gold',
    name: 'Clear Pink & Gold',
    finish: 'PPF Magic Clear',
    hex: 'E3A884',
  ),

  // Magic PPF - Satin (matte color flip)
  UppfColorEntry(
    id: 'uppf-magic-satin-blue-purple',
    name: 'Satin Blue & Purple',
    finish: 'PPF Magic Satin',
    hex: '4C4A9A',
  ),
  UppfColorEntry(
    id: 'uppf-magic-satin-gold-green',
    name: 'Satin Gold & Green',
    finish: 'PPF Magic Satin',
    hex: '6C7B2F',
  ),
  UppfColorEntry(
    id: 'uppf-magic-satin-pink-gold',
    name: 'Satin Pink & Gold',
    finish: 'PPF Magic Satin',
    hex: 'C97A63',
  ),

  // Texture PPF (pattern; clear vs black base)
  UppfColorEntry(
    id: 'uppf-real-carbon-clear',
    name: 'Real Carbon Clear',
    finish: 'PPF Pattern',
    hex: '3B3B3B',
  ),
  UppfColorEntry(
    id: 'uppf-real-carbon-black',
    name: 'Real Carbon Black',
    finish: 'PPF Pattern',
    hex: '111111',
  ),
  UppfColorEntry(
    id: 'uppf-satin-carbon-clear',
    name: 'Satin Carbon Clear',
    finish: 'PPF Pattern',
    hex: '3A3A3A',
  ),
  UppfColorEntry(
    id: 'uppf-satin-carbon-black',
    name: 'Satin Carbon Black',
    finish: 'PPF Pattern',
    hex: '0F0F0F',
  ),
  UppfColorEntry(
    id: 'uppf-forged-carbon-clear',
    name: 'Forged Carbon Clear',
    finish: 'PPF Pattern',
    hex: '3C3C3C',
  ),
  UppfColorEntry(
    id: 'uppf-forged-carbon-black',
    name: 'Forged Carbon Black',
    finish: 'PPF Pattern',
    hex: '121212',
  ),
  UppfColorEntry(
    id: 'uppf-mosaic-clear',
    name: 'Mosaic Clear',
    finish: 'PPF Pattern',
    hex: '4A4A4A',
  ),
  UppfColorEntry(
    id: 'uppf-mosaic-black',
    name: 'Mosaic Black',
    finish: 'PPF Pattern',
    hex: '141414',
  ),
  UppfColorEntry(
    id: 'uppf-damask-steel-clear',
    name: 'Damask Steel Clear',
    finish: 'PPF Pattern',
    hex: '505050',
  ),
  UppfColorEntry(
    id: 'uppf-damask-steel-black',
    name: 'Damask Steel Black',
    finish: 'PPF Pattern',
    hex: '1A1A1A',
  ),

  // Clear & Matte protection
  UppfColorEntry(
    id: 'uppf-p20',
    name: 'P20',
    finish: 'PPF Clear',
    hex: 'F8F8F8',
  ),
  UppfColorEntry(
    id: 'uppf-p20-nano',
    name: 'P20 Nano',
    finish: 'PPF Clear',
    hex: 'F7F7F7',
  ),
  UppfColorEntry(
    id: 'uppf-p20-pro',
    name: 'P20 Pro',
    finish: 'PPF Clear',
    hex: 'F6F6F6',
  ),
  UppfColorEntry(
    id: 'uppf-p20-max',
    name: 'P20 Max',
    finish: 'PPF Clear',
    hex: 'F5F5F5',
  ),
  UppfColorEntry(
    id: 'uppf-matte-ppf',
    name: 'Matte PPF',
    finish: 'PPF Matte',
    hex: 'E0E0E0',
  ),
];

final List<WrapColor> uppfColorPpf = uppfCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'UPPF Color/Texture PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 150
            : entry.finish.contains('Magic')
            ? 148
            : entry.finish.contains('Clear') || entry.finish.contains('Matte')
            ? 125
            : 142,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('UPPF', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('UPPF', entry.id, entry.finish),
      ),
    )
    .toList();
