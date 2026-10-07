import '../models.dart';
import 'manufacturer_color_chips.dart';

class TeckWrapColorEntry {
  const TeckWrapColorEntry({
    required this.name,
    required this.code,
    required this.finish,
  });

  final String name;
  final String code;
  final String finish;

  String get displayName => '$name ($code)';
}

const List<TeckWrapColorEntry> teckWrapCatalog = [
  // Reflective Chrome
  TeckWrapColorEntry(
    name: 'Ice Silver',
    code: 'CSC01',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Graphite Grey',
    code: 'CSC03',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Shadow Red',
    code: 'CSC04',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Dark Purple',
    code: 'CSC05',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Shadow Blue',
    code: 'CSC06',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Dark Green',
    code: 'CSC07',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Copper Brown',
    code: 'CSC08',
    finish: 'Reflective Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Super Silver (Mirror)',
    code: 'CMC01',
    finish: 'Reflective Chrome',
  ),

  // Gloss Metallic
  TeckWrapColorEntry(
    name: 'Deep Blue',
    code: 'RB02-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Passionate Purple',
    code: 'RB04-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Acid Lime',
    code: 'RB07-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Coral Peach',
    code: 'RB08-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Caribbean Blue',
    code: 'RB09-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Dark Platinum',
    code: 'RB12-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Ash Grey',
    code: 'RB13-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Sea Turquoise',
    code: 'RB16-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Ocean Green',
    code: 'RB18-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Deep Orange',
    code: 'RB19-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Midnight Purple',
    code: 'RB20-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Kelly Green',
    code: 'RB22-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Golden Yellow',
    code: 'RB25-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Ruby Green',
    code: 'RB26-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Arctic Silver',
    code: 'RB27-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Vibrant Nickel',
    code: 'RB28-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Grau Pearl',
    code: 'RB30-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Silver Fern',
    code: 'RB31-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Deep Onyx',
    code: 'RB32-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Dolomite Silver',
    code: 'RB33-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Wilderness Green',
    code: 'RB35-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Palladian Blue',
    code: 'RB36-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Phantom Green',
    code: 'RB37-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Deep Purple Blue',
    code: 'RB38-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Dragon Green',
    code: 'RB39-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Titanium Violet',
    code: 'RB40-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Gloss Green Black',
    code: 'HM07-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Black Cherry Ice',
    code: 'HM08-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Black Gold',
    code: 'HM09-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Burgundy Black',
    code: 'HM10-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Sonoma Green',
    code: 'HM12-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Sherwood Green',
    code: 'HM14-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Copper Bronze',
    code: 'HM15-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Antique Green',
    code: 'HM16-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Gloss Coal Black',
    code: 'MT01-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Pink Sakura',
    code: 'SL01-HD',
    finish: 'Gloss Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Royal Purple',
    code: 'SL07-HD',
    finish: 'Gloss Metallic',
  ),

  // Color Shift
  TeckWrapColorEntry(
    name: 'Gloss Purple Blue',
    code: 'CK892G',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Rainbow Vortex',
    code: 'RD11-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Honey Lime',
    code: 'RD12-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(name: 'Ruby Gold', code: 'RD13-HD', finish: 'Color Shift'),
  TeckWrapColorEntry(
    name: 'Violet Sunrise',
    code: 'RD14-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Green Galaxy',
    code: 'RD15-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Madeira Red',
    code: 'RD17-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Madeira Red Matte',
    code: 'RD17-M',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Crazy Grape',
    code: 'RD18-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Purple Green',
    code: 'RD19-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Purple Sunset',
    code: 'RD20PRO-HD',
    finish: 'Color Shift',
  ),
  TeckWrapColorEntry(
    name: 'Purple Flame',
    code: 'RD21PRO-HD',
    finish: 'Color Shift',
  ),

  // Super Glitter
  TeckWrapColorEntry(
    name: 'Silver Fireworks',
    code: 'RCH01-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Niigata White Fireworks',
    code: 'RCH03-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Silver Sunset',
    code: 'DS03-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Silver Sunset Matte',
    code: 'DS03M',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Azure Maya Blue',
    code: 'DS04-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Wild Heather',
    code: 'DS05-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Maize Pink',
    code: 'DS06-HD',
    finish: 'Super Glitter',
  ),
  TeckWrapColorEntry(
    name: 'Frosted Tulip',
    code: 'DS07-HD',
    finish: 'Super Glitter',
  ),

  // Matte Metallic
  TeckWrapColorEntry(
    name: 'Satin Pearl White',
    code: 'ECH01',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Gunsmoke Grey',
    code: 'ECH02',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Charcoal Grey',
    code: 'ECH03',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Navy Black',
    code: 'ECH15',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Hornet Yellow',
    code: 'ECH16',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Bond Gold',
    code: 'ECH17',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Forest Green',
    code: 'ECH19',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Dark Platinum',
    code: 'ECH21',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Cherry Blossom Pink',
    code: 'ECH22',
    finish: 'Matte Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Matte Coal Black',
    code: 'MT01',
    finish: 'Matte Metallic',
  ),

  // White Chameleons
  TeckWrapColorEntry(
    name: 'White Pearl',
    code: 'CK522-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'Creamrose Pearl',
    code: 'CK523-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'Light Blue Pearl',
    code: 'CK524-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'Gold Pearl',
    code: 'CK525-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'Lavender Pearl',
    code: 'CK526-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'Frosted Pearl',
    code: 'CK527-HD',
    finish: 'White Chameleons',
  ),
  TeckWrapColorEntry(
    name: 'White Satin',
    code: 'CK903',
    finish: 'White Chameleons',
  ),

  // Gloss Glitter & Diamond
  TeckWrapColorEntry(
    name: 'Ebony Sparkle',
    code: 'CK202-HD',
    finish: 'Gloss Glitter & Diamond',
  ),
  TeckWrapColorEntry(
    name: 'Diamond White',
    code: 'CK801-HD',
    finish: 'Gloss Glitter & Diamond',
  ),
  TeckWrapColorEntry(
    name: 'Matte Aurora White',
    code: 'DCH02',
    finish: 'Gloss Glitter & Diamond',
  ),
  TeckWrapColorEntry(
    name: 'Aurora White',
    code: 'DCH02-HD',
    finish: 'Gloss Glitter & Diamond',
  ),

  // High Gloss / Gloss HD
  TeckWrapColorEntry(
    name: 'Ultimate Black',
    code: 'CG01-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Super White',
    code: 'CG02-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Amazon Grey',
    code: 'CG03-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Racing Red', code: 'CG06-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(name: 'Tiffany', code: 'CG11-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Sunflower Yellow',
    code: 'CG12-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Slate Grey', code: 'CG16-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Millennial Pink',
    code: 'CG19-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Battleship Grey',
    code: 'CG20-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Rolling Sea',
    code: 'CG21-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'China Blue', code: 'CG22-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Mossy Green',
    code: 'CG23-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Lava Orange',
    code: 'CG24-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Chelsea Rose',
    code: 'CG25-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Ivory Cream',
    code: 'CG26-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'True Nardo Grey',
    code: 'CG27-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Yacht Blue', code: 'CG28-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Khaki Green',
    code: 'CG29-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Pale Celadon',
    code: 'CG30-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'French Olive',
    code: 'CG31-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Amphibian Green',
    code: 'CG32-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Amber Rose', code: 'CG36-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(name: 'Bali Blue', code: 'CG37-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'British Racing Green',
    code: 'CG38-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Monsoon Green',
    code: 'CG39-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Tangerine Orange',
    code: 'CG40-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Gecko Green',
    code: 'CG41-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Grape Green',
    code: 'CG42-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Louvre Yellow',
    code: 'CG43-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Sunray Yellow',
    code: 'CG44-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Amberwave', code: 'CG45-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Sahara Beige',
    code: 'CG46-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Vintage Grey',
    code: 'CG47-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Spanish Lavender',
    code: 'CG48-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Berry Red', code: 'CG49-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Strawberry Milk',
    code: 'CG50-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Camouflage Green',
    code: 'CG51-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Leather Beige',
    code: 'CG52-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Cool Blue', code: 'CG53-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Papaya Orange',
    code: 'CG54-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Wild Dove', code: 'CG55-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Flamingo Pink',
    code: 'CG56-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Vibrant Blue',
    code: 'CG57-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(name: 'Baby Blue', code: 'CG58-HD', finish: 'High Gloss'),
  TeckWrapColorEntry(
    name: 'Sorbet Pink',
    code: 'CG59-HD',
    finish: 'High Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Vanilla Mist',
    code: 'CG60-HD',
    finish: 'High Gloss',
  ),

  // Super Gloss
  TeckWrapColorEntry(name: 'Black', code: 'CG01', finish: 'Super Gloss'),
  TeckWrapColorEntry(
    name: 'Top Coated Super Black',
    code: 'CG01-SH',
    finish: 'Super Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Top Coated Moss Green',
    code: 'CG23-SH',
    finish: 'Super Gloss',
  ),
  TeckWrapColorEntry(
    name: 'Top Coated Vintage Grey',
    code: 'CG47-SH',
    finish: 'Super Gloss',
  ),

  // Super Matte
  TeckWrapColorEntry(name: 'Black', code: 'CM01M', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Sandy Black',
    code: 'CM01-MS',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(name: 'White', code: 'CM02', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Grainy Black',
    code: 'CM02-MS',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(
    name: 'Military Green',
    code: 'CM09',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(name: 'Raven Black', code: 'CM14', finish: 'Super Matte'),
  TeckWrapColorEntry(name: 'Pearl Black', code: 'CM15', finish: 'Super Matte'),
  TeckWrapColorEntry(name: 'Sable Black', code: 'TC01', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Piniengruen Pearl',
    code: 'TC02',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(name: 'Deep Black', code: 'SCM01', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Alaska White',
    code: 'SCM02',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(name: 'Lizard Grey', code: 'SCM23', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Vanilla Cream',
    code: 'SCM26-R',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(name: 'Nickel Grey', code: 'SCM27', finish: 'Super Matte'),
  TeckWrapColorEntry(
    name: 'Autumn Blaze',
    code: 'SCM36',
    finish: 'Super Matte',
  ),
  TeckWrapColorEntry(
    name: 'Granite Grey',
    code: 'SCM47',
    finish: 'Super Matte',
  ),

  // Mirror Chrome
  TeckWrapColorEntry(
    name: 'White Gold',
    code: 'CHM01-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Yellow Gold',
    code: 'CHM02-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Rose Gold',
    code: 'CHM03-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Cherry Red',
    code: 'CHM04-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Jet Black',
    code: 'CHM10-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Solar Gold',
    code: 'CHM21-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Crystal Chrome',
    code: 'CHM22-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Inferno Red',
    code: 'CHM24-HD',
    finish: 'Mirror Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Nova Blue',
    code: 'CHM26-HD',
    finish: 'Mirror Chrome',
  ),

  // Satin Chrome
  TeckWrapColorEntry(
    name: 'Crimson Red',
    code: 'VCH401-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Velvet Blue',
    code: 'VCH402-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Concord Grape',
    code: 'VCH403-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Hot Pink',
    code: 'VCH404-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Emerald Green',
    code: 'VCH405-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Golden Yellow',
    code: 'VCH408-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Gunmetal Grey',
    code: 'VCH410-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Super Silver Sage',
    code: 'VCH411-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Lemon Yellow',
    code: 'VCH412-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Violet Purple',
    code: 'VCH416-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Carmine Red',
    code: 'VCH417-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Autumn Orange',
    code: 'VCH418-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Deep Cobalt',
    code: 'VCH419-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Lapis Blue',
    code: 'VCH420-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Antique Rose',
    code: 'VCH421-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Sangria Red',
    code: 'VCH422-S',
    finish: 'Satin Chrome',
  ),
  TeckWrapColorEntry(
    name: 'Gable Green',
    code: 'VCH423-S',
    finish: 'Satin Chrome',
  ),

  // Neo Chrome
  TeckWrapColorEntry(
    name: 'Purple Blue Aquamarine',
    code: 'MCH01',
    finish: 'Neo Chrome',
  ),
  TeckWrapColorEntry(name: 'Ammolite Gem', code: 'MCH02', finish: 'Neo Chrome'),
  TeckWrapColorEntry(name: 'Frozen Berry', code: 'MCH08', finish: 'Neo Chrome'),

  // Gloss Aluminum
  TeckWrapColorEntry(
    name: 'Blue Gem',
    code: 'GAL02-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Candy Purple',
    code: 'GAL03-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Paprika Orange',
    code: 'GAL06-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Super Silver Mist',
    code: 'GAL11-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Space Blue',
    code: 'GAL14-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Royal Blue',
    code: 'GAL19-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Pink Gold',
    code: 'GAL23-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Supreme Red',
    code: 'GAL26-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Hunter Green',
    code: 'GAL29-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Velvet Red',
    code: 'GAL30-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Atomic Silver',
    code: 'GAL31-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Purple Pearl',
    code: 'GAL32-HD',
    finish: 'Gloss Aluminum',
  ),
  TeckWrapColorEntry(
    name: 'Azure Flame',
    code: 'GAL33-HD',
    finish: 'Gloss Aluminum',
  ),

  // Satin Metallic
  TeckWrapColorEntry(
    name: 'Dark Grey Silk',
    code: 'HM01',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Black Silver',
    code: 'HM02-R',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Matte Green Black Silk',
    code: 'HM07',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Greenfinch Gold',
    code: 'HM09',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Mineral Grey',
    code: 'SMT01',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Burnt Maroon',
    code: 'SMT02',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Venetian Violet',
    code: 'SMT03',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Boysenberry Black',
    code: 'SMT04',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Green Mantle',
    code: 'SMT05',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Apollo Grey',
    code: 'SMT06',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Rasant Blue',
    code: 'SMT07',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Admiral Blue',
    code: 'SMT08',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Onyx Grey',
    code: 'SMT09',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Solar Orange',
    code: 'SMT10',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Surf Blue',
    code: 'SMT11',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Paradise Green',
    code: 'SMT12',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Pine Green',
    code: 'SMT13',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Lawn Green',
    code: 'SMT14',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Flame Red',
    code: 'SMT15',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Jewel Green',
    code: 'SMT16',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Copper Orange',
    code: 'SMT17R',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Velour Red',
    code: 'SMT18R',
    finish: 'Satin Metallic',
  ),
  TeckWrapColorEntry(
    name: 'Silver Blue',
    code: 'SMT19',
    finish: 'Satin Metallic',
  ),

  // Structure Vinyl
  TeckWrapColorEntry(
    name: 'Noir Black Carbon',
    code: 'CF01',
    finish: 'Structure Vinyl',
  ),
  TeckWrapColorEntry(
    name: 'Pitch Black',
    code: 'CF02',
    finish: 'Structure Vinyl',
  ),
  TeckWrapColorEntry(
    name: 'Premium Black',
    code: 'RCF03-R',
    finish: 'Structure Vinyl',
  ),
  TeckWrapColorEntry(
    name: 'Ceramic Carbon',
    code: 'RCF03',
    finish: 'Structure Vinyl',
  ),
  TeckWrapColorEntry(
    name: 'Ghost Dark Forged Carbon',
    code: 'RCF09',
    finish: 'Structure Vinyl',
  ),
  TeckWrapColorEntry(
    name: 'Ink Black',
    code: 'BM04',
    finish: 'Structure Vinyl',
  ),
];

final List<WrapColor> teckWraps = teckWrapCatalog
    .map(
      (entry) => WrapColor(
        id: 'teckwrap-${entry.code.toLowerCase()}',
        name: entry.name,
        brand: 'TeckWrap 2025',
        finish: entry.finish,
        pricePerSquareMeter: entry.finish == 'ColorFlow' ? 110 : 90,
        texturePreview: entry.finish,
        swatch: lookupTeckWrapColor(entry.code),
      ),
    )
    .toList();
