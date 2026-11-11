import 'package:flutter/material.dart';

import 'data/wrap_catalog.dart';

class WrapColor {
  WrapColor({
    required this.id,
    required this.name,
    required this.brand,
    required this.finish,
    required this.pricePerSquareMeter,
    required this.texturePreview,
    required this.swatch,
    this.referenceAssetPath,
  });

  final String id;
  final String name;
  final String brand;
  final String finish;
  final double pricePerSquareMeter;
  final String texturePreview;
  final Color swatch;
  final String? referenceAssetPath;

  String get displayName => '$brand $name';
  String get code => id;
  String? get displayCode {
    final normalized = id.trim();
    if (normalized.isEmpty) return null;
    if (normalized == 'custom-ai-wrap') return null;
    return normalized;
  }

  String get displayNameWithCode =>
      displayCode == null ? displayName : '$displayName (${displayCode!})';

  String get designHubPrompt =>
      'Wrap the vehicle in the $finish $name finish by $brand.';

  String get hexCode {
    final a = (swatch.a * 255.0).round().clamp(0, 255);
    final r = (swatch.r * 255.0).round().clamp(0, 255);
    final g = (swatch.g * 255.0).round().clamp(0, 255);
    final b = (swatch.b * 255.0).round().clamp(0, 255);
    if (a == 0) return '#000000';
    return '#${r.toRadixString(16).padLeft(2, '0').toUpperCase()}'
        '${g.toRadixString(16).padLeft(2, '0').toUpperCase()}'
        '${b.toRadixString(16).padLeft(2, '0').toUpperCase()}';
  }

  String get aiPrompt {
    final materialPrompt = WrapMaterialPrompt.fromFinish(finish);
    return 'Apply the official manufacturer wrap color '
        '$name ($id) by $brand. '
        'Finish: $finish. '
        'Exact target hex: $hexCode. '
        'Material profile: $materialPrompt. '
        'Keep the selected catalog chip identity unchanged.';
  }

  FilmProductInfo get productInfo =>
      FilmProductInfo.fromCatalog(brand: brand, finish: finish, code: id, name: name);
}

class FilmProductInfo {
  const FilmProductInfo({
    required this.productLine,
    required this.descriptionKo,
    required this.descriptionEn,
    required this.catalogSource,
    required this.highlights,
  });

  final String productLine;
  final String descriptionKo;
  final String descriptionEn;
  final String catalogSource;
  final List<String> highlights;

  factory FilmProductInfo.fromCatalog({
    required String brand,
    required String finish,
    required String code,
    required String name,
  }) {
    final normalizedBrand = brand.toLowerCase();
    final normalizedFinish = finish.toLowerCase();

    if (normalizedBrand.contains('avery')) {
      return FilmProductInfo(
        productLine: 'Avery Dennison Supreme Wrapping Film',
        descriptionKo:
            'Avery Dennison Supreme Wrapping Film 카탈로그 기반 제품입니다. 다양한 글로스, 새틴, 매트, 메탈릭, 컬러플로우 계열을 포함하며 차량 외장 전체 랩핑과 디테일 포인트 작업에 맞춘 프리미엄 캐스트 필름 라인입니다.',
        descriptionEn:
            'This film is part of the Avery Dennison Supreme Wrapping Film catalog. It covers gloss, satin, matte, metallic, and color-flow finishes and is positioned as a premium cast wrap line for full exterior wraps and detail accents.',
        catalogSource: 'Wrap/Avery Dennison Wrap Film.pdf',
        highlights: [code, finish, 'Premium Cast Vinyl'],
      );
    }
    if (normalizedBrand.contains('3m')) {
      return FilmProductInfo(
        productLine: '3M Wrap Film 2080',
        descriptionKo:
            '3M Wrap Film 2080 카탈로그 기반 제품입니다. 고광택, 글로스, 새틴, 매트, 크롬, 컬러시프트 계열을 포함한 자동차 랩핑 필름 라인으로, 순정 바디 라인을 살린 외관 변화와 다양한 색상 표현에 초점을 둔 제품군입니다.',
        descriptionEn:
            'This film belongs to the 3M Wrap Film 2080 catalog. It spans high-gloss, gloss, satin, matte, chrome, and color-shift finishes and is intended for automotive wrap transformations that preserve body lines while delivering broad color variety.',
        catalogSource: 'Wrap/3M Wrap Film.pdf',
        highlights: [code, finish, 'Automotive Wrap Film'],
      );
    }
    if (normalizedBrand.contains('teckwrap')) {
      return FilmProductInfo(
        productLine: 'TeckWrap Automotive Wrap Film',
        descriptionKo:
            'TeckWrap Wrap Film 카탈로그 기반 제품입니다. 글로스 메탈릭, 새틴 메탈릭, 크롬, 컬러시프트, 텍스처 계열까지 폭넓게 구성된 스타일 중심 랩핑 필름 라인으로, 강한 색감과 효과 표현에 특화된 제품군입니다.',
        descriptionEn:
            'This film comes from the TeckWrap Wrap Film catalog. It covers gloss metallic, satin metallic, chrome, color-shift, and textured finishes and is positioned as a style-driven wrap range for bold colors and effect-focused looks.',
        catalogSource: 'Wrap/TeckWrap Wrap Film.pdf',
        highlights: [code, finish, 'Style-Focused Effect Film'],
      );
    }
    if (normalizedBrand.contains('hexis')) {
      return FilmProductInfo(
        productLine: 'Hexis Graphics Automotive Film',
        descriptionKo:
            'Hexis 카탈로그 기반 제품입니다. 차량 랩핑용 색상과 특수 마감 구성이 포함된 그래픽 필름 라인으로, 바디 전체 적용과 부분 포인트 적용 모두를 고려한 제품군입니다.',
        descriptionEn:
            'This film is based on the Hexis automotive graphics catalog. It includes wrap colors and specialty finishes intended for both full-body coverage and selective accent applications.',
        catalogSource: 'Wrap/Hexis catalog data',
        highlights: [code, finish, 'Graphics Wrap Film'],
      );
    }
    if (normalizedBrand.contains('reflex')) {
      return FilmProductInfo(
        productLine: 'REFLEX Color PPF',
        descriptionKo:
            'REFLEX Color PPF 카탈로그 기반 제품입니다. 보호 성능과 컬러 표현을 함께 가져가는 컬러 PPF 라인으로, 클리어, 다이아몬드, 하이글로스, 텍스처 계열까지 다양한 외관 표현을 지원합니다.',
        descriptionEn:
            'This film is part of the REFLEX Color PPF catalog. It combines protection with color styling and spans clear, diamond, high-gloss, and textured appearance families.',
        catalogSource: 'PPF/REFLEX/REFLEX Color PPF.pdf',
        highlights: [code, finish, 'Color PPF'],
      );
    }
    if (normalizedBrand.contains('gswf')) {
      return FilmProductInfo(
        productLine: 'GSWF Infused Color PPF',
        descriptionKo:
            'GSWF 컬러 PPF 카탈로그 기반 제품입니다. 보호 필름 성격을 유지하면서 색상과 질감을 더한 컬러 PPF 라인으로, 메인 바디 보호와 스타일링을 동시에 고려한 제품군입니다.',
        descriptionEn:
            'This film belongs to the GSWF infused color PPF catalog. It keeps the protective role of PPF while adding color and texture options for simultaneous protection and styling.',
        catalogSource: 'PPF/GSUIT or GSWF catalog data',
        highlights: [code, finish, 'Infused Color PPF'],
      );
    }
    if (normalizedBrand.contains('uppf')) {
      final family = normalizedFinish.contains('texture')
          ? 'Texture PPF'
          : normalizedFinish.contains('magic')
              ? 'Magic PPF'
              : normalizedFinish.contains('matte')
                  ? 'Matte PPF'
                  : 'Color PPF';
      return FilmProductInfo(
        productLine: 'UPPF $family',
        descriptionKo:
            'UPPF 카탈로그 기반 제품입니다. Color PPF, Matte PPF, Magic PPF, Texture PPF 계열로 구성되며, 보호 기능 위에 색상과 표면 효과를 더한 프리미엄 컬러 PPF 라인입니다.',
        descriptionEn:
            'This film is sourced from the UPPF catalog. The range includes Color PPF, Matte PPF, Magic PPF, and Texture PPF families, combining protection with color and surface-effect styling.',
        catalogSource: 'PPF/UPPF/*.jpg',
        highlights: [code, finish, family],
      );
    }
    if (normalizedBrand.contains('stek')) {
      return FilmProductInfo(
        productLine: 'STEK Fashion Film',
        descriptionKo:
            'STEK Fashion Film 카탈로그 기반 제품입니다. 보호 필름과 패션 필름의 성격을 결합한 라인으로, 시각적 개성과 표면 효과를 강조하는 컬러 PPF 계열입니다.',
        descriptionEn:
            'This film is part of the STEK Fashion Film catalog. It blends protective-film intent with fashion-oriented surface effects for expressive color PPF styling.',
        catalogSource: 'PPF/STEK catalog data',
        highlights: [code, finish, 'Fashion Film'],
      );
    }
    if (normalizedBrand.contains('clif')) {
      return FilmProductInfo(
        productLine: 'Clif Designs Stection PPF',
        descriptionKo:
            'Clif Designs PPF 카탈로그 기반 제품입니다. 보호 성능을 유지하면서 스타일링 요소를 더한 PPF 라인으로, 스텍션 계열 패턴 및 특수 마감 표현을 포함합니다.',
        descriptionEn:
            'This film comes from the Clif Designs PPF catalog. It is a styling-oriented PPF line that keeps protective intent while adding special finishes and Stection-style visual treatments.',
        catalogSource: 'PPF/Clif Designs/PPF_Performance.pdf',
        highlights: [code, finish, 'Pattern / Styling PPF'],
      );
    }
    if (normalizedBrand.contains('ivios')) {
      final family = code.toUpperCase().contains('AXION') ? 'Axion' : 'Kaizer';
      return FilmProductInfo(
        productLine: 'IVIOS $family',
        descriptionKo:
            'IVIOS 브로슈어 기반 제품입니다. Kaizer 컬러 PPF와 Axion 계열 데이터가 함께 반영되어 있으며, 보호 성능과 스타일 표현을 함께 고려한 프리미엄 PPF 제품군입니다.',
        descriptionEn:
            'This film is based on the IVIOS brochures. It reflects Kaizer color PPF and Axion family data and is positioned as a premium PPF line balancing protection with distinctive styling.',
        catalogSource: family == 'Axion'
            ? 'PPF/IVIOS/21_Axion_brochure.pdf'
            : 'PPF/IVIOS/22_Kaizer_brochure.pdf',
        highlights: [code, finish, '$family Series'],
      );
    }
    if (normalizedBrand.contains('g suit')) {
      return FilmProductInfo(
        productLine: 'G SUIT PPF',
        descriptionKo:
            'G SUIT PPF 브로슈어 기반 제품입니다. 보호 필름 성능에 컬러, 새틴, 블랙, 패턴 계열 선택지를 더한 라인으로, 시공 후 외관 변화와 보호를 동시에 노리는 제품군입니다.',
        descriptionEn:
            'This film is sourced from the G SUIT PPF brochure. It extends protective-film performance with color, satin, black, and pattern-style options for combined appearance change and protection.',
        catalogSource: 'PPF/GSUIT/G SUIT PPF.pdf',
        highlights: [code, finish, 'Protective Styling Film'],
      );
    }
    if (normalizedBrand.contains('ultrafit')) {
      final normalizedName = name.toUpperCase();
      final family = normalizedName.contains('AURORA')
          ? 'XP Aurora'
          : normalizedName.contains('RETRO')
              ? 'XP Retro'
              : normalizedName.contains('CARBON') || normalizedName.contains('FORGED')
                  ? 'XP Texture'
                  : 'XP Supreme';
      return FilmProductInfo(
        productLine: 'ULTRAFIT $family',
        descriptionKo:
            'ULTRAFIT 카탈로그 기반 제품입니다. XP Supreme, XP Aurora, XP Retro, 카본/포지드 계열까지 포함된 컬러 PPF 라인으로, 보호 기능 위에 색상과 질감 스타일을 더한 제품군입니다.',
        descriptionEn:
            'This film comes from the ULTRAFIT catalog. It covers XP Supreme, XP Aurora, XP Retro, and carbon/forged families as a color PPF range that layers style and texture on top of protection.',
        catalogSource: 'PPF/Ultrafit/*.pdf',
        highlights: [code, finish, family],
      );
    }

    return FilmProductInfo(
      productLine: brand,
      descriptionKo: '제조사 카탈로그 기반 필름 데이터입니다. 선택한 코드와 마감 정보를 기준으로 AI 랩핑과 비교 시뮬레이션에 사용됩니다.',
      descriptionEn: 'This is manufacturer-catalog film data used for AI wrapping and comparison simulations based on the selected code and finish.',
      catalogSource: 'Catalog data',
      highlights: [code, finish],
    );
  }
}

class WrapMaterialPrompt {
  static String fromFinish(String finish) {
    switch (normalize(finish)) {
      case 'gloss':
        return 'high-gloss, mirror-sharp reflections, IoR 1.58, roughness 0.02';
      case 'matte':
        return 'matte, non-reflective, Lambertian diffuse, roughness 0.95';
      case 'satin':
        return 'satin, soft-sheen, semi-gloss, roughness 0.40';
      case 'metallic':
        return 'metallic, aluminum flakes, anisotropic reflections, flip-flop effect';
      case 'pearlescent':
        return 'pearlescent, mica thin-film interference, color-shifting sheen';
      case 'textured':
        return 'textured, 3D surface relief pattern, tactile finish';
      case 'super gloss':
        return 'ultra-high-gloss, zero orange peel, paint-like wet look, roughness 0.008';
      case 'high gloss':
        return 'high-gloss, superior reflectivity, wet-look finish';
      case 'gloss hd':
        return 'gloss HD, high-definition gloss, sharp environment reflections';
      case 'super matte':
        return 'deep matte, velvet-like, suede surface, zero specular';
      case 'gloss metallic':
        return 'gloss metallic, high-gloss plus dense aluminum flakes, strong flip-flop';
      case 'matte metallic':
        return 'matte metallic, matte coat with hidden metallic shimmer, anodized look';
      case 'satin metallic':
        return 'satin metallic, frosted metal look, soft reflections plus metallic depth';
      case 'gloss aluminum':
        return 'gloss aluminum, near-chrome brightness, heavy metallic flakes, 72 percent reflectivity';
      case 'mirror chrome':
        return 'mirror chrome, electroplated mirror surface, 92 percent reflectivity, pure specular';
      case 'conform chrome':
        return 'conform chrome, mirror-like electroplated surface, 90 percent reflectivity';
      case 'satin chrome':
        return 'satin chrome, frosted brushed steel look, 68 percent reflectivity';
      case 'reflective chrome':
        return 'reflective chrome, high-reflectivity chrome, 82 percent reflectivity';
      case 'neo chrome':
        return 'neo chrome, rainbow iridescent thin-film, full-spectrum color shift, mirror brightness';
      case 'color shift':
        return 'color shift, angle-dependent dual-color shift, chameleon effect';
      case 'white chameleons':
        return 'color shifting, angle-dependent color change, chameleon effect';
      case 'colorflow':
        return 'ColorFlow iridescent, smooth color gradient shift, liquid-like flow across surface';
      case 'special effect (diamond)':
        return 'diamond crystal sparkle, ultra-dense crystal particles, explosive glitter';
      case 'gloss glitter & diamond':
        return 'gloss glitter, dense glitter particles, sparkle effect with glossy base';
      case 'special effect (pearl)':
        return 'special effect pearl, mica interference layers, deep multi-angle color shift';
      case 'super glitter':
        return 'super glitter, large glitter particles, dramatic individual flash points';
      case 'extreme texture':
        return 'extreme texture, carbon fiber or rugged grain 3D relief, deep structural pattern';
      case 'structure vinyl':
        return 'structure vinyl, embossed carbon fiber weave, 3D surface pattern';
      default:
        return '$finish finish using the official manufacturer chip appearance';
    }
  }

  static String normalize(String finish) {
    final value = finish.trim().toLowerCase();
    if (value.contains('colorflow') || value.contains('color flow')) {
      return 'colorflow';
    }
    if (value.contains('color shift')) return 'color shift';
    if (value.contains('white chameleon')) return 'white chameleons';
    if (value.contains('mirror') && value.contains('chrome')) {
      return 'mirror chrome';
    }
    if (value.contains('conform') && value.contains('chrome')) {
      return 'conform chrome';
    }
    if (value.contains('satin') && value.contains('chrome')) {
      return 'satin chrome';
    }
    if (value.contains('reflective') && value.contains('chrome')) {
      return 'reflective chrome';
    }
    if (value.contains('neo') && value.contains('chrome')) {
      return 'neo chrome';
    }
    if (value.contains('super gloss')) {
      return 'super gloss';
    }
    if (value.contains('high gloss')) {
      return 'high gloss';
    }
    if (value.contains('gloss hd')) {
      return 'gloss hd';
    }
    if (value.contains('super matte')) {
      return 'super matte';
    }
    if (value.contains('gloss') && value.contains('metal')) {
      return 'gloss metallic';
    }
    if (value.contains('matte') && value.contains('metal')) {
      return 'matte metallic';
    }
    if (value.contains('satin') && value.contains('metal')) {
      return 'satin metallic';
    }
    if (value.contains('gloss') && value.contains('aluminum')) {
      return 'gloss aluminum';
    }
    if (value.contains('diamond')) {
      return 'special effect (diamond)';
    }
    if (value.contains('glitter') && value.contains('diamond')) {
      return 'gloss glitter & diamond';
    }
    if (value.contains('pearl')) {
      return 'special effect (pearl)';
    }
    if (value.contains('super glitter')) {
      return 'super glitter';
    }
    if (value.contains('extreme texture')) {
      return 'extreme texture';
    }
    if (value.contains('structure vinyl')) {
      return 'structure vinyl';
    }
    if (value.contains('gloss')) {
      return 'gloss';
    }
    if (value.contains('matte')) {
      return 'matte';
    }
    if (value.contains('satin')) {
      return 'satin';
    }
    if (value.contains('metal')) {
      return 'metallic';
    }
    if (value.contains('pearl') || value.contains('aurora')) {
      return 'pearlescent';
    }
    if (value.contains('carbon') ||
        value.contains('forged') ||
        value.contains('texture')) {
      return 'textured';
    }
    return value;
  }
}

enum VehicleGarageCategory {
  sedan,
  suv,
  coupe,
  hatchback;

  String get label {
    switch (this) {
      case VehicleGarageCategory.sedan:
        return '세단';
      case VehicleGarageCategory.suv:
        return 'SUV';
      case VehicleGarageCategory.coupe:
        return '쿠페';
      case VehicleGarageCategory.hatchback:
        return '해치백';
    }
  }

  static VehicleGarageCategory? fromString(String? s) {
    if (s == null) return null;
    for (final v in VehicleGarageCategory.values) {
      if (v.name == s) return v;
    }
    return null;
  }
}

enum VehicleGarageSize {
  compact,
  mid,
  full,
  large;

  String get label {
    switch (this) {
      case VehicleGarageSize.compact:
        return '소형';
      case VehicleGarageSize.mid:
        return '중형';
      case VehicleGarageSize.full:
        return '준대형';
      case VehicleGarageSize.large:
        return '대형·SUV';
    }
  }

  int get estimatedArea {
    switch (this) {
      case VehicleGarageSize.compact:
        return 15;
      case VehicleGarageSize.mid:
        return 18;
      case VehicleGarageSize.full:
        return 22;
      case VehicleGarageSize.large:
        return 26;
    }
  }

  static VehicleGarageSize? fromString(String? s) {
    if (s == null) return null;
    for (final v in VehicleGarageSize.values) {
      if (v.name == s) return v;
    }
    return null;
  }
}

enum GarageFinishType {
  gloss,
  matte,
  satin,
  chrome;

  String get label {
    switch (this) {
      case GarageFinishType.gloss:
        return '유광';
      case GarageFinishType.matte:
        return '무광';
      case GarageFinishType.satin:
        return '사틴';
      case GarageFinishType.chrome:
        return '크롬';
    }
  }

  static GarageFinishType fromString(String? s) {
    for (final v in GarageFinishType.values) {
      if (v.name == s) return v;
    }
    return GarageFinishType.gloss;
  }
}

class GarageWrapStyle {
  GarageWrapStyle({
    required this.id,
    required this.name,
    required this.baseColor,
    this.finishType = GarageFinishType.gloss,
    this.filmBrand = '',
    this.filmProduct = '',
    this.accentColor,
    this.roofColor,
    required this.createdAt,
  });

  final String id;
  final String name;
  final String baseColor;
  final GarageFinishType finishType;
  final String filmBrand;
  final String filmProduct;
  final String? accentColor;
  final String? roofColor;
  final DateTime createdAt;

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'baseColor': baseColor,
    'finishType': finishType.name,
    'filmBrand': filmBrand,
    'filmProduct': filmProduct,
    if (accentColor != null) 'accentColor': accentColor,
    if (roofColor != null) 'roofColor': roofColor,
    'createdAt': createdAt.millisecondsSinceEpoch,
  };

  static GarageWrapStyle fromMap(Map<String, dynamic> map) {
    return GarageWrapStyle(
      id: map['id'] as String,
      name: map['name'] as String? ?? '',
      baseColor: map['baseColor'] as String? ?? '#FFFFFF',
      finishType: GarageFinishType.fromString(map['finishType'] as String?),
      filmBrand: map['filmBrand'] as String? ?? '',
      filmProduct: map['filmProduct'] as String? ?? '',
      accentColor: map['accentColor'] as String?,
      roofColor: map['roofColor'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }
}

class GarageWrapHistoryEntry {
  GarageWrapHistoryEntry({
    required this.id,
    required this.wrapName,
    required this.filmBrand,
    required this.filmProduct,
    required this.finishType,
    required this.hexCode,
    required this.createdAt,
  });

  final String id;
  final String wrapName;
  final String filmBrand;
  final String filmProduct;
  final String finishType;
  final String hexCode;
  final DateTime createdAt;

  String get displayTitle {
    final title = wrapName.trim();
    if (title.isNotEmpty) return title;
    final brandAndProduct = [filmBrand, filmProduct]
        .where((value) => value.trim().isNotEmpty)
        .join(' ');
    return brandAndProduct.isEmpty ? 'Custom Wrap' : brandAndProduct;
  }

  String get displaySubtitle {
    final parts = [filmBrand, filmProduct, finishType, hexCode]
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
    return parts.join(' · ');
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'wrapName': wrapName,
        'filmBrand': filmBrand,
        'filmProduct': filmProduct,
        'finishType': finishType,
        'hexCode': hexCode,
        'createdAt': createdAt.millisecondsSinceEpoch,
      };

  static GarageWrapHistoryEntry fromMap(Map<String, dynamic> map) {
    return GarageWrapHistoryEntry(
      id: map['id'] as String? ?? DateTime.now().millisecondsSinceEpoch.toString(),
      wrapName: map['wrapName'] as String? ?? '',
      filmBrand: map['filmBrand'] as String? ?? '',
      filmProduct: map['filmProduct'] as String? ?? '',
      finishType: map['finishType'] as String? ?? '',
      hexCode: map['hexCode'] as String? ?? '#FFFFFF',
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }
}

class SavedVehicle {
  SavedVehicle({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    required this.trim,
    required this.nickname,
    required this.createdAt,
    required this.lastUpdated,
    this.notes = '',
    this.vehicleCategory,
    this.vehicleSize,
    this.originalColor,
    this.imagePath,
    this.garageStyles = const [],
    this.wrapHistory = const [],
    this.currentStyleId,
  });

  final String id;
  final String make;
  final String model;
  final int year;
  final String trim;
  final String nickname;
  final DateTime createdAt;
  final DateTime lastUpdated;
  final String notes;
  final VehicleGarageCategory? vehicleCategory;
  final VehicleGarageSize? vehicleSize;
  final String? originalColor;
  final String? imagePath;
  final List<GarageWrapStyle> garageStyles;
  final List<GarageWrapHistoryEntry> wrapHistory;
  final String? currentStyleId;

  String get displayName => '$year $make $model';

  SavedVehicle copyWith({
    String? id,
    String? make,
    String? model,
    int? year,
    String? trim,
    String? nickname,
    DateTime? createdAt,
    DateTime? lastUpdated,
    String? notes,
    VehicleGarageCategory? vehicleCategory,
    VehicleGarageSize? vehicleSize,
    String? originalColor,
    String? imagePath,
    List<GarageWrapStyle>? garageStyles,
    List<GarageWrapHistoryEntry>? wrapHistory,
    String? currentStyleId,
  }) {
    return SavedVehicle(
      id: id ?? this.id,
      make: make ?? this.make,
      model: model ?? this.model,
      year: year ?? this.year,
      trim: trim ?? this.trim,
      nickname: nickname ?? this.nickname,
      createdAt: createdAt ?? this.createdAt,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      notes: notes ?? this.notes,
      vehicleCategory: vehicleCategory ?? this.vehicleCategory,
      vehicleSize: vehicleSize ?? this.vehicleSize,
      originalColor: originalColor ?? this.originalColor,
      imagePath: imagePath ?? this.imagePath,
      garageStyles: garageStyles ?? this.garageStyles,
      wrapHistory: wrapHistory ?? this.wrapHistory,
      currentStyleId: currentStyleId ?? this.currentStyleId,
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'make': make,
    'model': model,
    'year': year,
    'trim': trim,
    'nickname': nickname,
    'createdAt': createdAt.millisecondsSinceEpoch,
    'lastUpdated': lastUpdated.millisecondsSinceEpoch,
    'notes': notes,
    if (vehicleCategory != null) 'vehicleCategory': vehicleCategory!.name,
    if (vehicleSize != null) 'vehicleSize': vehicleSize!.name,
    if (originalColor != null) 'originalColor': originalColor,
    if (imagePath != null) 'imagePath': imagePath,
    'garageStyles': garageStyles.map((s) => s.toMap()).toList(),
    'wrapHistory': wrapHistory.map((h) => h.toMap()).toList(),
    if (currentStyleId != null) 'currentStyleId': currentStyleId,
  };

  static SavedVehicle fromMap(Map<String, dynamic> map) {
    final stylesList =
        (map['garageStyles'] as List<dynamic>?)
            ?.map((s) => GarageWrapStyle.fromMap(s as Map<String, dynamic>))
            .toList() ??
        [];
    final historyList =
        (map['wrapHistory'] as List<dynamic>?)
            ?.map((h) => GarageWrapHistoryEntry.fromMap(h as Map<String, dynamic>))
            .toList() ??
        [];
    return SavedVehicle(
      id: map['id'] as String,
      make: map['make'] as String? ?? '',
      model: map['model'] as String? ?? '',
      year: (map['year'] as num?)?.toInt() ?? DateTime.now().year,
      trim: map['trim'] as String? ?? '',
      nickname: map['nickname'] as String? ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
      lastUpdated: DateTime.fromMillisecondsSinceEpoch(
        map['lastUpdated'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
      notes: map['notes'] as String? ?? '',
      vehicleCategory: VehicleGarageCategory.fromString(
        map['vehicleCategory'] as String?,
      ),
      vehicleSize: VehicleGarageSize.fromString(map['vehicleSize'] as String?),
      originalColor: map['originalColor'] as String?,
      imagePath: map['imagePath'] as String?,
      garageStyles: stylesList,
      wrapHistory: historyList,
      currentStyleId: map['currentStyleId'] as String?,
    );
  }
}

class GarageWrapLaunchContext {
  GarageWrapLaunchContext({
    required this.vehicleId,
    required this.vehicleDisplayName,
    required this.vehicleNickname,
    this.vehicleImagePath,
    this.originalColorHex,
    this.styleId,
    this.styleName,
    this.baseColorHex,
    this.finishTypeRaw,
    this.filmBrand,
    this.filmProduct,
    this.accentColorHex,
    this.roofColorHex,
  });

  factory GarageWrapLaunchContext.fromVehicle(
    SavedVehicle vehicle, {
    GarageWrapStyle? style,
  }) {
    return GarageWrapLaunchContext(
      vehicleId: vehicle.id,
      vehicleDisplayName: vehicle.displayName,
      vehicleNickname: vehicle.nickname,
      vehicleImagePath: vehicle.imagePath,
      originalColorHex: vehicle.originalColor,
      styleId: style?.id,
      styleName: style?.name,
      baseColorHex: style?.baseColor,
      finishTypeRaw: style?.finishType.name,
      filmBrand: style?.filmBrand,
      filmProduct: style?.filmProduct,
      accentColorHex: style?.accentColor,
      roofColorHex: style?.roofColor,
    );
  }

  final String vehicleId;
  final String vehicleDisplayName;
  final String vehicleNickname;
  final String? vehicleImagePath;
  final String? originalColorHex;
  final String? styleId;
  final String? styleName;
  final String? baseColorHex;
  final String? finishTypeRaw;
  final String? filmBrand;
  final String? filmProduct;
  final String? accentColorHex;
  final String? roofColorHex;

  String get summaryTitle {
    if (styleName != null && styleName!.trim().isNotEmpty) {
      return '$vehicleNickname · $styleName';
    }
    return vehicleNickname;
  }

  String get summarySubtitle {
    final parts = [filmBrand, filmProduct, baseColorHex]
        .whereType<String>()
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
    return parts.isEmpty ? vehicleDisplayName : parts.join(' · ');
  }

  String get promptText {
    final parts =
        [filmBrand, filmProduct, styleName, baseColorHex, finishTypeRaw]
            .whereType<String>()
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toList();
    return parts.join(' ');
  }
}

class VehicleProject {
  VehicleProject({
    required this.id,
    required this.vehicleName,
    this.savedVehicleId,
    required this.createdAt,
    this.selectedWrap,
    this.notes = '',
    this.captureCompleted = false,
    this.designExplored = false,
    this.consultationBooked = false,
    this.consultationDate,
    this.wrapAppliedCounted = false,
    this.selectedWrapId,
  });

  final String id;
  String vehicleName;
  String? savedVehicleId;
  DateTime createdAt;
  WrapColor? selectedWrap;
  String notes;
  bool captureCompleted;
  bool designExplored;
  bool consultationBooked;
  DateTime? consultationDate;
  bool wrapAppliedCounted;
  String? selectedWrapId;

  ProjectStage get stage {
    if (consultationBooked) return ProjectStage.booked;
    if (designExplored || selectedWrap != null) return ProjectStage.design;
    if (captureCompleted) return ProjectStage.capture;
    return ProjectStage.planning;
  }

  double get progress {
    double completed = 0;
    if (captureCompleted) completed += 1;
    if (designExplored || selectedWrap != null) completed += 1;
    if (consultationBooked) completed += 1;
    return completed / 3;
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'vehicleName': vehicleName,
    'savedVehicleId': savedVehicleId,
    'createdAt': createdAt.millisecondsSinceEpoch,
    'notes': notes,
    'captureCompleted': captureCompleted,
    'designExplored': designExplored,
    'consultationBooked': consultationBooked,
    'consultationDate': consultationDate?.millisecondsSinceEpoch,
    'wrapAppliedCounted': wrapAppliedCounted,
    'selectedWrapId': selectedWrapId ?? selectedWrap?.id,
  };

  static VehicleProject fromMap(Map<String, dynamic> map) {
    return VehicleProject(
      id: map['id'] as String,
      vehicleName: map['vehicleName'] as String? ?? '차량',
      savedVehicleId: map['savedVehicleId'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        map['createdAt'] as int? ?? DateTime.now().millisecondsSinceEpoch,
      ),
      notes: map['notes'] as String? ?? '',
      captureCompleted: map['captureCompleted'] as bool? ?? false,
      designExplored: map['designExplored'] as bool? ?? false,
      consultationBooked: map['consultationBooked'] as bool? ?? false,
      consultationDate: map['consultationDate'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['consultationDate'] as int)
          : null,
      wrapAppliedCounted: map['wrapAppliedCounted'] as bool? ?? false,
      selectedWrapId: map['selectedWrapId'] as String?,
    );
  }
}

enum ProjectStage { planning, capture, design, booked }

class RecommendationItem {
  RecommendationItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.category,
    required this.tags,
    required this.wrapId,
    this.titleKo,
    this.titleEn,
    this.subtitleKo,
    this.subtitleEn,
  });

  final String id;
  final String title;
  final String subtitle;
  final String category;
  final List<String> tags;
  final String wrapId;
  final String? titleKo;
  final String? titleEn;
  final String? subtitleKo;
  final String? subtitleEn;
}

class LearningItem {
  LearningItem({
    required this.title,
    required this.duration,
    required this.tag,
  });
  final String title;
  final String duration;
  final String tag;
}

class CommunityPost {
  CommunityPost({
    required this.id,
    required this.author,
    required this.content,
    required this.createdAt,
    required this.category,
    this.title,
    this.imagePath,
    this.contentKo,
    this.contentEn,
    this.titleKo,
    this.titleEn,
    this.ctaLabelKo,
    this.ctaLabelEn,
    this.ctaHref,
    this.mediaUrl,
    this.mediaType,
    this.isRemote = false,
  });

  final String id;
  final String author;
  final String content;
  final String category;
  final DateTime createdAt;
  final String? title;
  final String? imagePath;
  final String? contentKo;
  final String? contentEn;
  final String? titleKo;
  final String? titleEn;
  final String? ctaLabelKo;
  final String? ctaLabelEn;
  final String? ctaHref;
  final String? mediaUrl;
  final String? mediaType;
  final bool isRemote;
}

class UserProfile {
  UserProfile({
    required this.name,
    required this.email,
    required this.subscriptionPlan,
    required this.subscriptionStatus,
    this.avatarPath,
    this.avatarUrl,
    required this.wrapQuota,
    required this.wrapUsed,
    this.hasSeenUsageGuide = false,
    this.showUsageGuideOnStartup = true,
    this.storeProductId,
    this.storePurchaseId,
    this.purchaseToken,
    this.billingProvider,
    this.lastBillingSyncAt,
  });

  final String name;
  final String email;
  final String subscriptionPlan;
  final String subscriptionStatus;
  final String? avatarPath;
  final String? avatarUrl;
  final int wrapQuota;
  final int wrapUsed;
  final bool hasSeenUsageGuide;
  final bool showUsageGuideOnStartup;
  final String? storeProductId;
  final String? storePurchaseId;
  final String? purchaseToken;
  final String? billingProvider;
  final String? lastBillingSyncAt;

  UserProfile copyWith({
    String? name,
    String? email,
    String? subscriptionPlan,
    String? subscriptionStatus,
    String? avatarPath,
    String? avatarUrl,
    int? wrapQuota,
    int? wrapUsed,
    bool? hasSeenUsageGuide,
    bool? showUsageGuideOnStartup,
    String? storeProductId,
    String? storePurchaseId,
    String? purchaseToken,
    String? billingProvider,
    String? lastBillingSyncAt,
  }) {
    return UserProfile(
      name: name ?? this.name,
      email: email ?? this.email,
      subscriptionPlan: subscriptionPlan ?? this.subscriptionPlan,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      avatarPath: avatarPath ?? this.avatarPath,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      wrapQuota: wrapQuota ?? this.wrapQuota,
      wrapUsed: wrapUsed ?? this.wrapUsed,
      hasSeenUsageGuide: hasSeenUsageGuide ?? this.hasSeenUsageGuide,
      showUsageGuideOnStartup: showUsageGuideOnStartup ?? this.showUsageGuideOnStartup,
      storeProductId: storeProductId ?? this.storeProductId,
      storePurchaseId: storePurchaseId ?? this.storePurchaseId,
      purchaseToken: purchaseToken ?? this.purchaseToken,
      billingProvider: billingProvider ?? this.billingProvider,
      lastBillingSyncAt: lastBillingSyncAt ?? this.lastBillingSyncAt,
    );
  }

  Map<String, dynamic> toMap() => {
    'name': name,
    'email': email,
    'subscriptionPlan': subscriptionPlan,
    'subscriptionStatus': subscriptionStatus,
    'avatarPath': avatarPath,
    'avatarUrl': avatarUrl,
    'wrapQuota': wrapQuota,
    'wrapUsed': wrapUsed,
    'hasSeenUsageGuide': hasSeenUsageGuide,
    'showUsageGuideOnStartup': showUsageGuideOnStartup,
    'storeProductId': storeProductId,
    'storePurchaseId': storePurchaseId,
    'purchaseToken': purchaseToken,
    'billingProvider': billingProvider,
    'lastBillingSyncAt': lastBillingSyncAt,
  };

  static UserProfile fromMap(Map<String, dynamic> map) {
    return UserProfile(
      name: map['name'] as String? ?? '',
      email: map['email'] as String? ?? '',
      subscriptionPlan: map['subscriptionPlan'] as String? ?? '',
      subscriptionStatus: map['subscriptionStatus'] as String? ?? '',
      avatarPath: map['avatarPath'] as String?,
      avatarUrl: map['avatarUrl'] as String?,
      wrapQuota: (map['wrapQuota'] as num?)?.toInt() ?? 0,
      wrapUsed: (map['wrapUsed'] as num?)?.toInt() ?? 0,
      hasSeenUsageGuide: map['hasSeenUsageGuide'] as bool? ?? false,
      showUsageGuideOnStartup: map['showUsageGuideOnStartup'] as bool? ?? true,
      storeProductId: map['storeProductId'] as String?,
      storePurchaseId: map['storePurchaseId'] as String?,
      purchaseToken: map['purchaseToken'] as String?,
      billingProvider: map['billingProvider'] as String?,
      lastBillingSyncAt: map['lastBillingSyncAt'] as String?,
    );
  }
}

final sampleWraps = allVinylWraps;
final sampleColorPpfWraps = allColorPpfWraps;

final sampleVehicles = <SavedVehicle>[
  SavedVehicle(
    id: 'veh-1',
    make: 'Genesis',
    model: 'GV80',
    year: 2024,
    trim: 'Sport',
    nickname: 'GV80 프로젝트',
    createdAt: DateTime.now().subtract(const Duration(days: 14)),
    lastUpdated: DateTime.now().subtract(const Duration(days: 2)),
    notes: '랩핑 프로젝트 2건',
  ),
  SavedVehicle(
    id: 'veh-2',
    make: 'BMW',
    model: 'M4',
    year: 2023,
    trim: 'Competition',
    nickname: '트랙 전용 M4',
    createdAt: DateTime.now().subtract(const Duration(days: 35)),
    lastUpdated: DateTime.now().subtract(const Duration(days: 9)),
    notes: '레이싱 스트라이프 예정',
  ),
];

final sampleRecommendations = <RecommendationItem>[
  RecommendationItem(
    id: 'rec-1',
    title: '시그니처 새틴 그레이',
    subtitle: 'GV80/세단에 잘 어울리는 모던 새틴 계열, 크롬 딜리트와 조합 추천',
    titleKo: '시그니처 새틴 그레이',
    titleEn: 'Signature Satin Gray',
    subtitleKo: 'GV80/세단에 잘 어울리는 모던 새틴 계열, 크롬 딜리트와 조합 추천',
    subtitleEn: 'A modern satin tone for GV80s and sedans. Recommended with chrome delete.',
    category: 'Signature',
    tags: ['Satin', 'Dechrome', 'GV80'],
    wrapId: 'sw900-865-o',
  ),
  RecommendationItem(
    id: 'rec-2',
    title: '트렌드 포레스트 그린',
    subtitle: 'SUV/전기차에 포인트 주기 좋은 포레스트 톤, 루프/미러 포인트 추천',
    titleKo: '트렌드 포레스트 그린',
    titleEn: 'Trend Forest Green',
    subtitleKo: 'SUV/전기차에 포인트 주기 좋은 포레스트 톤, 루프/미러 포인트 추천',
    subtitleEn: 'A forest tone that works well for SUVs and EVs. Great for roof or mirror accents.',
    category: 'Trend',
    tags: ['Forest', 'Point', 'EV'],
    wrapId: 'sw900-771-o',
  ),
  RecommendationItem(
    id: 'rec-3',
    title: '컬러플로우 크림슨',
    subtitle: '빛에 따라 색이 변하는 컬러플로우 라인업, 쿠페·스포츠카 추천',
    titleKo: '컬러플로우 크림슨',
    titleEn: 'ColorFlow Crimson',
    subtitleKo: '빛에 따라 색이 변하는 컬러플로우 라인업, 쿠페·스포츠카 추천',
    subtitleEn: 'A color-shifting ColorFlow line ideal for coupes and sports cars.',
    category: 'ColorFlow',
    tags: ['Pearl', 'Flip', 'Coupe'],
    wrapId: 'sw900-446-s',
  ),
];

final sampleLearning = <LearningItem>[
  LearningItem(title: 'AI 랩핑 컬러 비교', duration: '3분 읽기', tag: '가이드'),
  LearningItem(title: 'Gloss vs Matte', duration: '4분 읽기', tag: '소재'),
  LearningItem(title: '랩핑 유지보수', duration: '4분 읽기', tag: '케어'),
  LearningItem(title: '캐스팅 vs 캘린더링 한눈에', duration: '2분 읽기', tag: '소재'),
];

final samplePosts = <CommunityPost>[];
