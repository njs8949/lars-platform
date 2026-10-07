import '../models.dart';
import 'manufacturer_color_chips.dart';

/// Catalog of Avery Dennison Supreme Wrapping Film colors grouped by finish.
class AveryColorEntry {
  const AveryColorEntry({
    required this.name,
    required this.code,
    required this.finish,
  });

  final String name;
  final String code;
  final String finish;

  String get displayName => '$name ($code)';
}

// Core catalog extracted from Avery Dennison Supreme Wrapping Film.
const List<AveryColorEntry> averyCatalog = [
  // Gloss
  AveryColorEntry(name: 'Black', code: 'SW900-190-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Obsidian Black', code: 'SW900-191-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Dark Grey', code: 'SW900-865-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Rock Grey', code: 'SW900-821-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Grey', code: 'SW900-832-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Misty Grey', code: 'SW900-827-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Red', code: 'SW900-415-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Soft Red', code: 'SW900-427-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Cardinal Red', code: 'SW900-433-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Carmine Red', code: 'SW900-436-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Burgundy', code: 'SW900-475-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Indigo Blue', code: 'SW900-699-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Dark Blue', code: 'SW900-681-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Blue', code: 'SW900-677-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Intense Blue', code: 'SW900-667-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Light Blue', code: 'SW900-632-O', finish: 'Gloss'),
  AveryColorEntry(
    name: 'Turquoise Ocean',
    code: 'SW900-6329-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(name: 'Aqua Blue', code: 'SW900-636-O', finish: 'Gloss'),
  AveryColorEntry(
    name: 'Sea Breeze Blue',
    code: 'SW900-648-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(name: 'Smoky Blue', code: 'SW900-612-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Cloudy Blue', code: 'SW900-656-O', finish: 'Gloss'),
  AveryColorEntry(
    name: 'Park Avenue Blue',
    code: 'SW900-703-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(
    name: 'Light Pistachio',
    code: 'SW900-728-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(name: 'Smooth Sage', code: 'SW900-729-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Emerald Green', code: 'SW900-771-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Dark Green', code: 'SW900-792-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Grass Green', code: 'SW900-758-O', finish: 'Gloss'),
  AveryColorEntry(
    name: 'Tropical Vacation Green',
    code: 'SW900-701-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(name: 'Lime Green', code: 'SW900-731-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Orange', code: 'SW900-373-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Dark Yellow', code: 'SW900-249-O', finish: 'Gloss'),
  AveryColorEntry(name: 'Yellow', code: 'SW900-235-O', finish: 'Gloss'),
  AveryColorEntry(
    name: 'Ambulance Yellow',
    code: 'SW900-236-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(
    name: 'Pool Party Pink',
    code: 'SW900-517-O',
    finish: 'Gloss',
  ),
  AveryColorEntry(name: 'White', code: 'SW900-101-O', finish: 'Gloss'),

  // Satin
  AveryColorEntry(name: 'Black', code: 'SW900-197-O', finish: 'Satin'),
  AveryColorEntry(name: 'Grey', code: 'SW900-833-O', finish: 'Satin'),
  AveryColorEntry(name: 'Carmine Red', code: 'SW900-438-O', finish: 'Satin'),
  AveryColorEntry(name: 'Dark Blue', code: 'SW900-682-O', finish: 'Satin'),
  AveryColorEntry(name: 'Light Blue', code: 'SW900-633-O', finish: 'Satin'),
  AveryColorEntry(name: 'Jade', code: 'SW900-702-0', finish: 'Satin'),
  AveryColorEntry(name: 'Khaki Green', code: 'SW900-712-O', finish: 'Satin'),
  AveryColorEntry(name: 'Yellow', code: 'SW900-224-O', finish: 'Satin'),
  AveryColorEntry(name: 'Sunset Ride', code: 'SW900-302-O', finish: 'Satin'),
  AveryColorEntry(name: 'Bubblegum Pink', code: 'SW900-514-O', finish: 'Satin'),
  AveryColorEntry(name: 'White', code: 'SW900-116-O', finish: 'Satin'),

  // Gloss Metallic
  AveryColorEntry(name: 'Black', code: 'SW900-192-M', finish: 'Gloss Metallic'),
  AveryColorEntry(name: 'Grey', code: 'SW900-807-M', finish: 'Gloss Metallic'),
  AveryColorEntry(
    name: 'Eclipse',
    code: 'SW900-199-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Silver',
    code: 'SW900-803-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Quick Silver',
    code: 'SW900-816-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Pure Red',
    code: 'SW900-401-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(name: 'Spark', code: 'SW900-419-M', finish: 'Gloss Metallic'),
  AveryColorEntry(
    name: 'Popstar Concert Purple',
    code: 'SW900-521-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Vibrant Violet',
    code: 'SW900-522-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Cosmic Rose',
    code: 'SW900-526-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Mysterious Indigo',
    code: 'SW900-700-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Magnetic Burst',
    code: 'SW900-679-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Mystery Black',
    code: 'SW900-184-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Dark Blue',
    code: 'SW900-653-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Bright Blue',
    code: 'SW900-646-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(
    name: 'Radioactive',
    code: 'SW900-762-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(name: 'Gold', code: 'SW900-215-M', finish: 'Gloss Metallic'),
  AveryColorEntry(
    name: 'Sand Sparkle',
    code: 'SW900-255-M',
    finish: 'Gloss Metallic',
  ),
  AveryColorEntry(name: 'Brown', code: 'SW900-929-M', finish: 'Gloss Metallic'),
  AveryColorEntry(
    name: 'Pride Prismatic Grey',
    code: 'SW900-879-M',
    finish: 'Gloss Metallic',
  ),

  // Satin Metallic
  AveryColorEntry(
    name: 'Black Rock Grey',
    code: 'SW900-823-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Dark Grey',
    code: 'SW900-854-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Dark Basalt',
    code: 'SW900-871-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Spy Grey',
    code: 'SW900-828-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Silver',
    code: 'SW900-805-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Purple',
    code: 'SW900-566-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Safari Gold',
    code: 'SW900-260-M',
    finish: 'Satin Metallic',
  ),
  AveryColorEntry(
    name: 'Flamingo Dance',
    code: 'SW900-501-M',
    finish: 'Satin Metallic',
  ),

  // Matte
  AveryColorEntry(name: 'Black', code: 'SW900-180-O', finish: 'Matte'),
  AveryColorEntry(name: 'Dark Grey', code: 'SW900-856-O', finish: 'Matte'),
  AveryColorEntry(name: 'Dreamline Blue', code: 'SW900-616-O', finish: 'Matte'),
  AveryColorEntry(name: 'Olive Green', code: 'SW900-732-O', finish: 'Matte'),
  AveryColorEntry(name: 'Khaki Green', code: 'SW900-711-O', finish: 'Matte'),
  AveryColorEntry(name: 'Orange', code: 'SW900-321-O', finish: 'Matte'),
  AveryColorEntry(name: 'White', code: 'SW900-102-O', finish: 'Matte'),

  // Matte Metallic
  AveryColorEntry(
    name: 'Gunmetal',
    code: 'SW900-840-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Charcoal',
    code: 'SW900-845-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Anthracite',
    code: 'SW900-858-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Silver',
    code: 'SW900-857-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Garnet Red',
    code: 'SW900-472-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Cherry',
    code: 'SW900-444-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Purple',
    code: 'SW900-565-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Night Blue',
    code: 'SW900-623-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Brilliant Blue',
    code: 'SW900-671-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(name: 'Blue', code: 'SW900-615-M', finish: 'Matte Metallic'),
  AveryColorEntry(
    name: 'Frosty Blue',
    code: 'SW900-643-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Moss Green',
    code: 'SW900-737-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(
    name: 'Apple Green',
    code: 'SW900-745-M',
    finish: 'Matte Metallic',
  ),
  AveryColorEntry(name: 'Pink', code: 'SW900-520-M', finish: 'Matte Metallic'),

  // Pearl (Special Effects)
  AveryColorEntry(
    name: 'Gloss Passion Red',
    code: 'SW900-448-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Gloss Fun Purple',
    code: 'SW900-568-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin Wave Blue',
    code: 'SW900-629-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Pearl Dark Green',
    code: 'SW900-796-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Gloss Pearl Tutu Pink',
    code: 'SW900-523-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Gloss White Pearl',
    code: 'SW900-109-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin Cool Teal',
    code: 'SW900-716-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin Stunning Orange',
    code: 'SW900-316-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin Energetic Yellow',
    code: 'SW900-261-S',
    finish: 'Satin',
  ),
  AveryColorEntry(
    name: 'Gloss Pearl White Snow',
    code: 'SW900-110-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin White Pearl',
    code: 'SW900-117-S',
    finish: 'Pearl',
  ),
  AveryColorEntry(
    name: 'Satin Pearl White Snow',
    code: 'SW900-118-S',
    finish: 'Pearl',
  ),

  // Diamond
  AveryColorEntry(name: 'Silver', code: 'SW900-878-D', finish: 'Diamond'),
  AveryColorEntry(name: 'Red', code: 'SW900-426-D', finish: 'Diamond'),
  AveryColorEntry(name: 'Purple', code: 'SW900-587-D', finish: 'Diamond'),
  AveryColorEntry(name: 'Blue', code: 'SW900-676-D', finish: 'Diamond'),
  AveryColorEntry(name: 'Amber', code: 'SW900-221-D', finish: 'Diamond'),
  AveryColorEntry(name: 'White', code: 'SW900-161-D', finish: 'Diamond'),

  // Extreme Texture
  AveryColorEntry(
    name: 'Rugged Onyx Black',
    code: 'SW900-182-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Carbon Fiber Black',
    code: 'SW900-194-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Brushed Black',
    code: 'SW900-193-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Rugged Bedrock Grey',
    code: 'SW900-824-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Brushed Titanium',
    code: 'SW900-802-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Brushed Aluminum',
    code: 'SW900-812-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Brushed Steel',
    code: 'SW900-813-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Rugged Combat Green',
    code: 'SW900-718-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Rugged Marsh Green',
    code: 'SW900-738-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Brushed Bronze',
    code: 'SW900-933-X',
    finish: 'Extreme Texture',
  ),
  AveryColorEntry(
    name: 'Carbon Fiber White',
    code: 'SW900-115-X',
    finish: 'Extreme Texture',
  ),

  // Conform Chrome
  AveryColorEntry(name: 'Black', code: 'SF100-196-S', finish: 'Chrome'),
  AveryColorEntry(name: 'Silver', code: 'SF100-843-S', finish: 'Chrome'),
  AveryColorEntry(name: 'Red', code: 'SF100-474-S', finish: 'Chrome'),
  AveryColorEntry(name: 'Blue', code: 'SF100-256-S', finish: 'Chrome'),
  AveryColorEntry(name: 'Gold', code: 'SF100-604-S', finish: 'Chrome'),
  AveryColorEntry(name: 'Rose Gold', code: 'SF100-211-S', finish: 'Chrome'),

  // ColorFlow
  AveryColorEntry(
    name: 'Satin Solar Dawn',
    code: 'SW900-476-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Roaring Thunder',
    code: 'SW900-551-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Rushing Riptide',
    code: 'SW900-673-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Lightning Ridge',
    code: 'SW900-610-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Frozen Ocean',
    code: 'SW900-788-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Moonstone',
    code: 'SW900-634-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Urban Jungle',
    code: 'SW900-786-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Fresh Spring',
    code: 'SW900-251-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Satin Rising Sun',
    code: 'SW900-446-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Roaring Thunder',
    code: 'SW900-552-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Rushing Riptide',
    code: 'SW900-674-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Lightning Ridge',
    code: 'SW900-611-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Urban Jungle',
    code: 'SW900-787-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Hidden Forest',
    code: 'SW900-789-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Fresh Spring',
    code: 'SW900-252-S',
    finish: 'ColorFlow',
  ),
  AveryColorEntry(
    name: 'Gloss Rising Sun',
    code: 'SW900-447-S',
    finish: 'ColorFlow',
  ),
];

/// Deterministic color generator so every chip has a stable swatch without
/// needing the true color value.

/// Convert catalog to WrapColor objects for the UI.
final List<WrapColor> averyWraps = averyCatalog
    .map(
      (entry) => WrapColor(
        id: entry.code.toLowerCase(),
        name: entry.name,
        brand: 'Avery Dennison Supreme Wrapping Film',
        finish: entry.finish,
        pricePerSquareMeter:
            entry.finish.contains('Metallic') || entry.finish == 'Chrome'
            ? 92
            : 78,
        texturePreview: entry.finish,
        swatch: lookupAveryColor(entry.code),
      ),
    )
    .toList();

/// Find a catalog entry by matching code or name inside free-form text.
AveryColorEntry? matchAveryByQuery(String query) {
  final normalized = query.toLowerCase();
  if (normalized.isEmpty) return null;
  for (final entry in averyCatalog) {
    if (normalized.contains(entry.code.toLowerCase()) ||
        normalized.contains(entry.name.toLowerCase())) {
      return entry;
    }
  }
  return null;
}
