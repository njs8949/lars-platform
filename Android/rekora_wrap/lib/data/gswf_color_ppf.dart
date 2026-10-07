import '../models.dart';
import 'ppf_color_chips.dart';

class GswfColorEntry {
  const GswfColorEntry({
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

/// GSWF Infused Color PPF catalog. Hex values are digital approximations for
/// UI swatches only; real TPU infused colors will differ under light.
const List<GswfColorEntry> gswfCatalog = [
  // Solid Gloss Series
  GswfColorEntry(
    id: 'gswf-nardo-grey',
    name: 'Nardo Grey',
    finish: 'PPF Gloss',
    hex: '686A6C',
  ),
  GswfColorEntry(
    id: 'gswf-chalk-grey',
    name: 'Chalk Grey (Swiss Coffee)',
    finish: 'PPF Gloss',
    hex: 'E2DED6',
  ),
  GswfColorEntry(
    id: 'gswf-brooklyn-grey',
    name: 'Brooklyn Grey',
    finish: 'PPF Gloss',
    hex: '76787C',
  ),
  GswfColorEntry(
    id: 'gswf-china-blue',
    name: 'China Blue',
    finish: 'PPF Gloss',
    hex: '6A86A8',
  ),
  GswfColorEntry(
    id: 'gswf-miami-blue',
    name: 'Miami Blue',
    finish: 'PPF Gloss',
    hex: '007C92',
  ),
  GswfColorEntry(
    id: 'gswf-voodoo-blue',
    name: 'Voodoo Blue',
    finish: 'PPF Gloss',
    hex: '005A9C',
  ),
  GswfColorEntry(
    id: 'gswf-ruby-stone-red',
    name: 'Ruby Stone Red',
    finish: 'PPF Gloss',
    hex: 'D43F68',
  ),
  GswfColorEntry(
    id: 'gswf-racing-yellow',
    name: 'Racing Yellow',
    finish: 'PPF Gloss',
    hex: 'FADB00',
  ),
  GswfColorEntry(
    id: 'gswf-crimson-red',
    name: 'Crimson Red / Ferrari Red',
    finish: 'PPF Gloss',
    hex: 'CC0000',
  ),
  GswfColorEntry(
    id: 'gswf-british-racing-green',
    name: 'British Racing Green',
    finish: 'PPF Gloss',
    hex: '004225',
  ),
  GswfColorEntry(
    id: 'gswf-khaki-green',
    name: 'Khaki Green (Military Olive)',
    finish: 'PPF Gloss',
    hex: '4B5320',
  ),
  GswfColorEntry(
    id: 'gswf-deep-black',
    name: 'Deep Black',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  GswfColorEntry(
    id: 'gswf-gloss-white',
    name: 'Gloss White',
    finish: 'PPF Gloss',
    hex: 'FFFFFF',
  ),

  // Satin Series
  GswfColorEntry(
    id: 'gswf-satin-black',
    name: 'Satin Black',
    finish: 'PPF Satin',
    hex: '1C1C1C',
  ),
  GswfColorEntry(
    id: 'gswf-satin-deep-grey',
    name: 'Satin Deep Grey',
    finish: 'PPF Satin',
    hex: '454545',
  ),
  GswfColorEntry(
    id: 'gswf-satin-nardo-grey',
    name: 'Satin Nardo Grey',
    finish: 'PPF Satin',
    hex: '686A6C',
  ),
  GswfColorEntry(
    id: 'gswf-satin-white',
    name: 'Satin White',
    finish: 'PPF Satin',
    hex: 'F5F5F5',
  ),
  GswfColorEntry(
    id: 'gswf-satin-military-olive',
    name: 'Satin Military Olive',
    finish: 'PPF Satin',
    hex: '545A3E',
  ),
  GswfColorEntry(
    id: 'gswf-satin-latte',
    name: 'Satin Latte',
    finish: 'PPF Satin',
    hex: 'C8AD7F',
  ),

  // Metallic & Pearl Series
  GswfColorEntry(
    id: 'gswf-magic-green',
    name: 'Magic Green (Emerald)',
    finish: 'PPF Metallic',
    hex: '50C878',
  ),
  GswfColorEntry(
    id: 'gswf-viper-green',
    name: 'Viper Green',
    finish: 'PPF Metallic',
    hex: '4CB038',
  ),
  GswfColorEntry(
    id: 'gswf-midnight-purple',
    name: 'Midnight Purple',
    finish: 'PPF Metallic',
    hex: '2E1A47',
  ),
  GswfColorEntry(
    id: 'gswf-ice-blue-metallic',
    name: 'Ice Blue Metallic',
    finish: 'PPF Metallic',
    hex: 'A0D6E6',
  ),
  GswfColorEntry(
    id: 'gswf-white-metallic',
    name: 'White Metallic',
    finish: 'PPF Metallic',
    hex: 'F0F0F0',
  ),
  GswfColorEntry(
    id: 'gswf-ocean-blue-metallic',
    name: 'Ocean Blue Metallic',
    finish: 'PPF Metallic',
    hex: '006994',
  ),
  GswfColorEntry(
    id: 'gswf-titanium-silver',
    name: 'Titanium Silver',
    finish: 'PPF Metallic',
    hex: 'C0C0C0',
  ),

  // Special Collection (anchor swatches; real effect varies)
  GswfColorEntry(
    id: 'gswf-wicked-jungle',
    name: 'Wicked Jungle',
    finish: 'PPF Special',
  ),
  GswfColorEntry(
    id: 'gswf-bahama-sea-breeze',
    name: 'Bahama Sea Breeze',
    finish: 'PPF Special',
  ),
  GswfColorEntry(
    id: 'gswf-thundercloud',
    name: 'Thundercloud',
    finish: 'PPF Special',
  ),
];

final List<WrapColor> gswfColorPpf = gswfCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'GSWF Infused Color PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Special') ? 152 : 145,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('GSWF', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('GSWF', entry.id, entry.finish),
      ),
    )
    .toList();
