import '../models.dart';
import 'ppf_color_chips.dart';

class ClifColorEntry {
  const ClifColorEntry({
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

/// Clif Designs (Stection) styling & clear PPF catalog.
/// Hex values are digital approximations for UI swatches only.
const List<ClifColorEntry> clifCatalog = [
  // Styling & Color PPF
  ClifColorEntry(
    id: 'clif-black-gloss',
    name: 'Black Gloss',
    finish: 'PPF Gloss',
    hex: '000000',
  ),
  ClifColorEntry(
    id: 'clif-black-matte',
    name: 'Black Matte',
    finish: 'PPF Matte',
    hex: '1C1C1C',
  ),
  ClifColorEntry(
    id: 'clif-carbon-gloss',
    name: 'Carbon Gloss',
    finish: 'PPF Pattern',
    hex: '1A1A1A',
  ),
  ClifColorEntry(
    id: 'clif-carbon-semi-matte',
    name: 'Carbon Semi-Matte',
    finish: 'PPF Pattern',
    hex: '2A2A2A',
  ),
  ClifColorEntry(
    id: 'clif-pearl-gloss',
    name: 'Pearl Gloss',
    finish: 'PPF Pearl',
    hex: 'F5F5F5',
  ),
  ClifColorEntry(
    id: 'clif-pearl-matte',
    name: 'Pearl Matte',
    finish: 'PPF Pearl Matte',
    hex: 'E6E6E6',
  ),
  ClifColorEntry(
    id: 'clif-iridescent-gloss',
    name: 'Iridescent Gloss',
    finish: 'PPF Effect',
    hex: 'D8D8FF',
  ),

  // Clear protection PPF
  ClifColorEntry(
    id: 'clif-gloss-super',
    name: 'Gloss Super',
    finish: 'PPF Clear',
    hex: 'F7F7F7',
  ),
  ClifColorEntry(
    id: 'clif-gloss-pro',
    name: 'Gloss Pro',
    finish: 'PPF Clear',
    hex: 'F6F6F6',
  ),
  ClifColorEntry(
    id: 'clif-gloss-plus',
    name: 'Gloss Plus',
    finish: 'PPF Clear',
    hex: 'F6F6F6',
  ),
  ClifColorEntry(
    id: 'clif-gloss-st',
    name: 'Gloss ST',
    finish: 'PPF Clear',
    hex: 'F5F5F5',
  ),
  ClifColorEntry(
    id: 'clif-gloss-expert',
    name: 'Gloss Expert',
    finish: 'PPF Clear',
    hex: 'F4F4F4',
  ),
  ClifColorEntry(
    id: 'clif-matte',
    name: 'Matte',
    finish: 'PPF Matte',
    hex: 'E2E2E2',
  ),
];

final List<WrapColor> clifColorPpf = clifCatalog
    .map(
      (entry) => WrapColor(
        id: entry.id,
        name: entry.name,
        brand: 'Clif Designs Stection PPF',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish.contains('Pattern')
            ? 150
            : entry.finish.contains('Pearl') || entry.finish.contains('Effect')
            ? 148
            : entry.finish.contains('Clear')
            ? 126
            : 140,
        texturePreview: entry.finish,
        swatch: lookupPpfColor('Clif Designs', entry.id),
        referenceAssetPath: lookupPpfReferenceAsset('Clif Designs', entry.id, entry.finish),
      ),
    )
    .toList();
