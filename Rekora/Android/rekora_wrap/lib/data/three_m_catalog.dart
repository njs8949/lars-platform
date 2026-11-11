import '../models.dart';
import 'manufacturer_color_chips.dart';

class ThreeMColorEntry {
  const ThreeMColorEntry({
    required this.name,
    required this.code,
    required this.finish,
  });

  final String name;
  final String code;
  final String finish;

  String get displayName => '$name ($code)';
}

const List<ThreeMColorEntry> threeMCatalog = [
  // High Gloss
  ThreeMColorEntry(name: 'Hot Rod Red', code: 'HG13', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Burnt Orange', code: 'HG14', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Bright Yellow', code: 'HG15', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Citric Acid', code: 'HG65', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Green Envy', code: 'HG336', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Mantis Green', code: 'HG36', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Military Green', code: 'HG26', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Sky Blue', code: 'HG77', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Blue Raspberry', code: 'HG378', finish: 'High Gloss'),
  ThreeMColorEntry(
    name: 'Flip Deep Space',
    code: 'HGP278',
    finish: 'High Gloss',
  ),
  ThreeMColorEntry(
    name: 'Plum Explosion',
    code: 'HGP258',
    finish: 'High Gloss',
  ),
  ThreeMColorEntry(name: 'Ruby Rosso', code: 'HG73', finish: 'High Gloss'),
  ThreeMColorEntry(
    name: 'Flip Black Psychedelic',
    code: 'HGP221',
    finish: 'High Gloss',
  ),
  ThreeMColorEntry(name: 'Black', code: 'HG12', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Black Metallic', code: 'HG212', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Meteor Gray', code: 'HG81', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Nardo Gray', code: 'HG61', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'White Aluminum', code: 'HG120', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'Storm Gray', code: 'HG31', finish: 'High Gloss'),
  ThreeMColorEntry(name: 'White', code: 'HG10', finish: 'High Gloss'),

  // Gloss
  ThreeMColorEntry(name: 'Red Metallic', code: 'G203', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Dragon Fire Red', code: 'G363', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Flame Red', code: 'G83', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Hot Rod Red', code: 'G13', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Fiery Orange', code: 'G364', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Liquid Copper', code: 'G344', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Burnt Orange', code: 'G14', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Deep Orange', code: 'G24', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Bright Orange', code: 'G54', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Sunflower', code: 'G25', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Bright Yellow', code: 'G15', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Lucid Yellow', code: 'G55', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Green Envy', code: 'G336', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Kelly Green', code: 'G46', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Light Green', code: 'G16', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Atomic Teal', code: 'G356', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Midnight Blue', code: 'GP272', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Boat Blue', code: 'G127', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Deep Blue Metallic', code: 'G217', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Blue Metallic', code: 'G227', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Blue Raspberry', code: 'G378', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Cosmic Blue', code: 'G377', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Intense Blue', code: 'G47', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Blue Fire', code: 'G337', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Sky Blue', code: 'G77', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Fierce Fuchsia', code: 'G348', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Flip Deep Space', code: 'GP278', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Ember Black', code: 'GP282', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Black Metallic', code: 'G212', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Black', code: 'G12', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Anthracite', code: 'G201', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Charcoal Metallic', code: 'G211', finish: 'Gloss'),
  ThreeMColorEntry(name: 'White Aluminum', code: 'G120', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Flip Psychedelic', code: 'GP281', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Sterling Silver', code: 'G251', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Storm Gray', code: 'G31', finish: 'Gloss'),
  ThreeMColorEntry(name: 'White Gold Sparkle', code: 'GP240', finish: 'Gloss'),
  ThreeMColorEntry(name: 'Light Ivory', code: 'G79', finish: 'Gloss'),
  ThreeMColorEntry(name: 'White', code: 'G10', finish: 'Gloss'),

  // Satin
  ThreeMColorEntry(name: 'Vampire Red', code: 'SP273', finish: 'Satin'),
  ThreeMColorEntry(name: 'Smoldering Red', code: 'S363', finish: 'Satin'),
  ThreeMColorEntry(name: 'Flip Electric Coral', code: 'SP236', finish: 'Satin'),
  ThreeMColorEntry(name: 'Velvet Rose', code: 'S23', finish: 'Satin'),
  ThreeMColorEntry(
    name: 'Frozen Berry Metallic',
    code: 'S238',
    finish: 'Satin',
  ),
  ThreeMColorEntry(name: 'Flip Volcanic Flare', code: 'SP236', finish: 'Satin'),
  ThreeMColorEntry(name: 'Flip Golden Aurora', code: 'SP242', finish: 'Satin'),
  ThreeMColorEntry(name: 'Bitter Yellow', code: 'S335', finish: 'Satin'),
  ThreeMColorEntry(name: 'Apple Green', code: 'S196', finish: 'Satin'),
  ThreeMColorEntry(name: 'Key West', code: 'S57', finish: 'Satin'),
  ThreeMColorEntry(name: 'Ocean Shimmer', code: 'S327', finish: 'Satin'),
  ThreeMColorEntry(name: 'Perfect Blue', code: 'S347', finish: 'Satin'),
  ThreeMColorEntry(name: 'Lunar Blue', code: 'S87', finish: 'Satin'),
  ThreeMColorEntry(name: 'Thundercloud', code: 'S271', finish: 'Satin'),
  ThreeMColorEntry(name: 'Dark Gray', code: 'S261', finish: 'Satin'),
  ThreeMColorEntry(name: 'Black', code: 'S12', finish: 'Satin'),
  ThreeMColorEntry(name: 'Gold Dust Black', code: 'SP242', finish: 'Satin'),
  ThreeMColorEntry(name: 'Komodo Green', code: 'S56', finish: 'Satin'),
  ThreeMColorEntry(name: 'Sandstone', code: 'S49', finish: 'Satin'),
  ThreeMColorEntry(name: 'Battleship Gray', code: 'S51', finish: 'Satin'),
  ThreeMColorEntry(name: 'Flip Psychedelic', code: 'SP281', finish: 'Satin'),
  ThreeMColorEntry(name: 'White Aluminum', code: 'S120', finish: 'Satin'),
  ThreeMColorEntry(name: 'Frozen Vanilla', code: 'SP240', finish: 'Satin'),
  ThreeMColorEntry(name: 'White', code: 'S10', finish: 'Satin'),
  ThreeMColorEntry(name: 'Pearl White', code: 'SP10', finish: 'Satin'),
  ThreeMColorEntry(
    name: 'Satin Flip Ghost Pearl',
    code: 'SP280',
    finish: 'Satin',
  ),

  // Matte
  ThreeMColorEntry(name: 'Red Metallic', code: 'M203', finish: 'Matte'),
  ThreeMColorEntry(name: 'Red', code: 'M13', finish: 'Matte'),
  ThreeMColorEntry(name: 'Strawberry Red', code: 'M33', finish: 'Matte'),
  ThreeMColorEntry(name: 'Pine Green Metallic', code: 'M206', finish: 'Matte'),
  ThreeMColorEntry(name: 'Military Green', code: 'M26', finish: 'Matte'),
  ThreeMColorEntry(name: 'Indigo', code: 'M27', finish: 'Matte'),
  ThreeMColorEntry(name: 'Slate Blue Metallic', code: 'M217', finish: 'Matte'),
  ThreeMColorEntry(name: 'Blue Metallic', code: 'M227', finish: 'Matte'),
  ThreeMColorEntry(name: 'Black', code: 'M12', finish: 'Matte'),
  ThreeMColorEntry(name: 'Black Metallic', code: 'M212', finish: 'Matte'),
  ThreeMColorEntry(name: 'Deep Black', code: 'M22', finish: 'Matte'),
  ThreeMColorEntry(name: 'Dead Matte Black', code: 'DM12', finish: 'Matte'),
  ThreeMColorEntry(name: 'Dark Gray', code: 'M261', finish: 'Matte'),
  ThreeMColorEntry(name: 'Gray Aluminum', code: 'M230', finish: 'Matte'),
  ThreeMColorEntry(name: 'Silver', code: 'M21', finish: 'Matte'),
  ThreeMColorEntry(name: 'White', code: 'M10', finish: 'Matte'),
  ThreeMColorEntry(name: 'Charcoal Metallic', code: 'M211', finish: 'Matte'),
  ThreeMColorEntry(name: 'Brown Metallic', code: 'M209', finish: 'Matte'),

  // Textures
  ThreeMColorEntry(name: 'Shadow Black', code: 'SB12', finish: 'Textures'),
  ThreeMColorEntry(
    name: 'Brushed Black Metallic',
    code: 'BR212',
    finish: 'Textures',
  ),
  ThreeMColorEntry(name: 'Matrix Black', code: 'MX12', finish: 'Textures'),
  ThreeMColorEntry(
    name: 'Carbon Fiber Black',
    code: 'CFS12',
    finish: 'Textures',
  ),
  ThreeMColorEntry(name: 'Brushed Steel', code: 'BR201', finish: 'Textures'),
  ThreeMColorEntry(name: 'Brushed Titanium', code: 'BR230', finish: 'Textures'),
  ThreeMColorEntry(name: 'Brushed Aluminum', code: 'BR120', finish: 'Textures'),
  ThreeMColorEntry(
    name: 'Carbon Fiber Anthracite',
    code: 'CFS201',
    finish: 'Textures',
  ),
];

final List<WrapColor> threeMWraps = threeMCatalog
    .map(
      (entry) => WrapColor(
        id: '3m-${entry.code.toLowerCase()}',
        name: entry.name,
        brand: '3M Wrap Film 2080',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish == 'Textures' ? 95 : 85,
        texturePreview: entry.finish,
        swatch: lookupThreeMColor(entry.code, entry.name),
      ),
    )
    .toList();
