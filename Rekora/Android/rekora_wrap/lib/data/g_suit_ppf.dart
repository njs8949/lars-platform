import '../models.dart';
import 'ppf_color_chips.dart';

class GSuitEntry {
  const GSuitEntry({
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

/// G SUIT PPF catalog (Color, Carbon, Headlight, Clear, Windshield).
/// Hex values are digital approximations for UI swatches only.
const List<GSuitEntry> gSuitCatalog = [
  // Color & styling
  GSuitEntry(
    id: 'gsuit-black-hg',
    name: 'Black HG',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  GSuitEntry(
    id: 'gsuit-light-gray',
    name: 'Light Gray',
    finish: 'PPF Gloss',
    hex: 'B0B0B0',
  ),

  // Matte / satin
  GSuitEntry(
    id: 'gsuit-black-matt',
    name: 'Black Matt',
    finish: 'PPF Matte',
    hex: '1C1C1C',
  ),
  GSuitEntry(
    id: 'gsuit-clear-matt',
    name: 'Clear Matt',
    finish: 'PPF Matte',
    hex: 'EAEAEA',
  ),
  GSuitEntry(
    id: 'gsuit-satin-matt',
    name: 'Satin Matt',
    finish: 'PPF Satin',
    hex: 'F0F0F0',
  ),

  // 4D Carbon
  GSuitEntry(
    id: 'gsuit-carbon-black',
    name: 'Carbon Black',
    finish: 'PPF Pattern',
    hex: '111111',
  ),
  GSuitEntry(
    id: 'gsuit-carbon-silver',
    name: 'Carbon Silver',
    finish: 'PPF Pattern',
    hex: 'C0C0C0',
  ),
  GSuitEntry(
    id: 'gsuit-carbon-clear',
    name: 'Carbon Clear',
    finish: 'PPF Pattern',
    hex: 'EDEDED',
  ),

  // Headlight
  GSuitEntry(
    id: 'gsuit-soft-black',
    name: 'Soft Black',
    finish: 'PPF Light',
    hex: '303030',
  ),
  GSuitEntry(
    id: 'gsuit-dark-black',
    name: 'Dark Black',
    finish: 'PPF Light',
    hex: '101010',
  ),
  GSuitEntry(
    id: 'gsuit-violet',
    name: 'Violet',
    finish: 'PPF Light',
    hex: '6A5ACD',
  ),
  GSuitEntry(
    id: 'gsuit-gray',
    name: 'Gray',
    finish: 'PPF Light',
    hex: 'A9A9A9',
  ),

  // Clear (gloss) protection
  GSuitEntry(
    id: 'gsuit-prime-plus',
    name: 'Prime+',
    finish: 'PPF Clear',
    hex: 'F8F8F8',
  ),
  GSuitEntry(
    id: 'gsuit-aegis',
    name: 'Aegis',
    finish: 'PPF Clear',
    hex: 'F7F7F7',
  ),
  GSuitEntry(
    id: 'gsuit-ultra-plus',
    name: 'Ultra+',
    finish: 'PPF Clear',
    hex: 'F6F6F6',
  ),
  GSuitEntry(
    id: 'gsuit-special-plus',
    name: 'Special+',
    finish: 'PPF Clear',
    hex: 'F5F5F5',
  ),
  GSuitEntry(
    id: 'gsuit-special-light',
    name: 'Special Light',
    finish: 'PPF Clear',
    hex: 'F4F4F4',
  ),

  // Windshield protection
  GSuitEntry(
    id: 'gsuit-windshield',
    name: 'Windshield',
    finish: 'Windshield Protection',
    hex: 'E8E8E8',
  ),
  GSuitEntry(
    id: 'gsuit-heat-cut',
    name: 'Heat Cut',
    finish: 'Windshield Protection',
    hex: 'E6E6E6',
  ),
];

final List<WrapColor> gSuitColorPpf = gSuitCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'G SUIT PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 148
            : entry.finish.contains('Light') ||
                  entry.finish.contains('Windshield')
            ? 132
            : entry.finish.contains('Clear')
            ? 128
            : entry.finish.contains('Matte') || entry.finish.contains('Satin')
            ? 140
            : 142,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('G SUIT', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('G SUIT', entry.id, entry.finish),
      ),
    )
    .toList();
