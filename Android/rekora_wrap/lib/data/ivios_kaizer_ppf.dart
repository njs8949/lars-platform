import '../models.dart';
import 'ppf_color_chips.dart';

class IvosColorEntry {
  const IvosColorEntry({
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

/// IVIOS Kaizer PPF and Axion windshield catalog.
/// Hex values are digital approximations; real finishes vary with pearl/texture.
const List<IvosColorEntry> iviosCatalog = [
  // Kaizer Satin Finish Series
  IvosColorEntry(
    id: 'ivios-crystal-satin',
    name: 'Crystal Satin Finish',
    finish: 'PPF Satin',
    hex: 'E8E8E8',
  ),
  IvosColorEntry(
    id: 'ivios-black-satin',
    name: 'Black Satin Finish',
    finish: 'PPF Satin',
    hex: '1C1C1C',
  ),

  // Kaizer Gray Collection
  IvosColorEntry(
    id: 'ivios-winter-gray',
    name: 'Winter Gray',
    finish: 'PPF Gloss',
    hex: '9A9FA5',
  ),
  IvosColorEntry(
    id: 'ivios-noble-gray',
    name: 'Noble Gray',
    finish: 'PPF Gloss',
    hex: '8C8F94',
  ),
  IvosColorEntry(
    id: 'ivios-charcoal-gray',
    name: 'Charcoal Gray',
    finish: 'PPF Gloss',
    hex: '4B4D50',
  ),
  IvosColorEntry(
    id: 'ivios-gray-satin',
    name: 'Gray Satin Finish',
    finish: 'PPF Satin',
    hex: '7A7D82',
  ),

  // Kaizer Art Collection
  IvosColorEntry(
    id: 'ivios-onyx-black',
    name: 'Onyx Black',
    finish: 'PPF Gloss',
    hex: '0A0A0A',
  ),

  // Kaizer Aurora Collection (color shift)
  IvosColorEntry(
    id: 'ivios-coast-green',
    name: 'Coast Green',
    finish: 'PPF Aurora',
    hex: '2D5E52',
  ),
  IvosColorEntry(
    id: 'ivios-opal-violet',
    name: 'Opal Violet',
    finish: 'PPF Aurora',
    hex: '4E3C70',
  ),
  IvosColorEntry(
    id: 'ivios-fantasy-black',
    name: 'Fantasy Black',
    finish: 'PPF Aurora',
    hex: '1F1F2F',
  ),
  IvosColorEntry(
    id: 'ivios-rosy-green',
    name: 'Rosy Green',
    finish: 'PPF Aurora',
    hex: '3A6B5A',
  ),
  IvosColorEntry(
    id: 'ivios-lake-blue',
    name: 'Lake Blue',
    finish: 'PPF Aurora',
    hex: '3C6A9C',
  ),

  // Kaizer Texture Series
  IvosColorEntry(
    id: 'ivios-carbon-fiber',
    name: 'Carbon Fiber',
    finish: 'PPF Pattern',
    hex: '1B1B1B',
  ),
  IvosColorEntry(
    id: 'ivios-forged-carbon',
    name: 'Forged Carbon',
    finish: 'PPF Pattern',
    hex: '2C2C2C',
  ),

  // Kaizer Nova Collection (limited/special)
  IvosColorEntry(
    id: 'ivios-nova-bl',
    name: 'Nova BL',
    finish: 'PPF Special',
    hex: '1E3A70',
  ),

  // Kaizer Perform X Series (clear protection)
  IvosColorEntry(
    id: 'ivios-perform-x1',
    name: 'Perform X1',
    finish: 'PPF Clear',
    hex: 'F7F7F7',
  ),
  IvosColorEntry(
    id: 'ivios-perform-x2',
    name: 'Perform X2',
    finish: 'PPF Clear',
    hex: 'F6F6F6',
  ),
  IvosColorEntry(
    id: 'ivios-perform-z12',
    name: 'Perform Z12',
    finish: 'PPF Clear',
    hex: 'F5F5F5',
  ),

  // Axion Meta Series (windshield protection)
  IvosColorEntry(
    id: 'ivios-axion-meta-c1',
    name: 'Axion Meta C1',
    finish: 'Windshield Protection',
    hex: 'EAEAEA',
  ),
  IvosColorEntry(
    id: 'ivios-axion-meta-r1',
    name: 'Axion Meta R1',
    finish: 'Windshield Protection',
    hex: 'E8E8E8',
  ),
  IvosColorEntry(
    id: 'ivios-axion-meta-e1',
    name: 'Axion Meta E1',
    finish: 'Windshield Protection',
    hex: 'E6E6E6',
  ),
];

final List<WrapColor> iviosColorPpf = iviosCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'IVIOS Kaizer PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 150
            : entry.finish.contains('Aurora') ||
                  entry.finish.contains('Special')
            ? 155
            : entry.finish.contains('Clear') ||
                  entry.finish.contains('Windshield')
            ? 132
            : 145,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('IVIOS', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('IVIOS', entry.id, entry.finish),
      ),
    )
    .toList();
