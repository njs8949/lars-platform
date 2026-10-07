
import 'dart:math';
import '../models.dart';
import 'avery_supreme_catalog.dart';
import 'three_m_catalog.dart';
import 'teckwrap_catalog.dart';
import 'hexis_catalog.dart';
import 'reflex_color_ppf.dart';
import 'gswf_color_ppf.dart';
import 'uppf_color_ppf.dart';
import 'stek_fashion_ppf.dart';
import 'clif_designs_ppf.dart';
import 'ivios_kaizer_ppf.dart';
import 'g_suit_ppf.dart';
import 'ultrafit_ppf.dart';

class WrapMatch {
  const WrapMatch({
    required this.brand,
    required this.name,
    required this.code,
    required this.finish,
  });

  final String brand;
  final String name;
  final String code;
  final String finish;

  String get displayName => '$name ($code)';
}

/// Vinyl wrap catalog used across the app (design hub, etc.).
final List<WrapColor> allVinylWraps = [
  ...averyWraps,
  ...threeMWraps,
  ...teckWraps,
  ...hexisWraps,
];

/// Color PPF catalog (FLEXIShield/REFLEX + others).
final List<WrapColor> allColorPpfWraps = [
  ...reflexColorPpf,
  ...gswfColorPpf,
  ...uppfColorPpf,
  ...stekColorPpf,
  ...clifColorPpf,
  ...iviosColorPpf,
  ...gSuitColorPpf,
  ...ultrafitColorPpf,
];

/// Combined catalog used for matching/analysis.
final List<WrapColor> allWraps = [
  ...allVinylWraps,
  ...allColorPpfWraps,
];

/// Try to match user text (name or code) to a known wrap entry.
/// Prioritizes matches where the finish (Matte, Satin, etc.) also matches the query.
WrapMatch? matchWrapByQuery(String query) {
  final normalized = _sanitize(query);
  if (normalized.isEmpty || normalized.length < 3) return null;

  final catalogs = [
    (brand: 'Avery Dennison Supreme Wrapping Film', entries: averyCatalog),
    (brand: '3M Wrap Film 2080', entries: threeMCatalog),
    (brand: 'TeckWrap 2025', entries: teckWrapCatalog),
    (brand: 'Hexis Graphics', entries: hexisCatalog),
    (brand: 'FLEXIShield Color PPF', entries: reflexCatalog),
    (brand: 'GSWF Infused Color PPF', entries: gswfCatalog),
    (brand: 'UPPF Color/Texture PPF', entries: uppfCatalog),
    (brand: 'STEK Fashion Film', entries: stekCatalog),
    (brand: 'Clif Designs Stection PPF', entries: clifCatalog),
    (brand: 'IVIOS Kaizer PPF', entries: iviosCatalog),
    (brand: 'G SUIT PPF', entries: gSuitCatalog),
    (brand: 'ULTRAFIT PPF', entries: ultrafitCatalog),
  ];

  WrapMatch? bestMatch;
  double bestScore = 0.0;
  const threshold = 0.65;

  for (final cat in catalogs) {
    for (final dynamic entry in cat.entries) {
      final String entryName;
      final String entryCode;
      
      try {
        entryName = entry.name;
        // Some catalogs use 'code', some use 'id'
        entryCode = (entry is AveryColorEntry || entry is ThreeMColorEntry || entry is TeckWrapColorEntry || entry is HexisColorEntry) 
            ? entry.code 
            : entry.id;
      } catch (_) {
        continue;
      }

      final nameSan = _sanitize(entryName);
      final codeSan = _sanitize(entryCode);
      
      final scoreName = _similarity(normalized, nameSan);
      final scoreCode = _similarity(normalized, codeSan);
      final score = max(scoreName, scoreCode);

      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestMatch = WrapMatch(
          brand: cat.brand,
          name: entryName,
          code: entryCode,
          finish: entry.finish,
        );
      }
    }
  }

  return bestMatch;
}

String _sanitize(String text) =>
    text.toUpperCase().replaceAll(RegExp(r'[\s\-_]'), '');

double _similarity(String s1, String s2) {
  if (s1 == s2) return 1.0;
  final dist = _levenshtein(s1, s2);
  final maxLen = max(s1.length, s2.length);
  if (maxLen == 0) return 0.0;
  return 1.0 - (dist / maxLen);
}

int _levenshtein(String s1, String s2) {
  if (s1 == s2) return 0;
  if (s1.isEmpty) return s2.length;
  if (s2.isEmpty) return s1.length;

  final matrix = List.generate(
    s1.length + 1,
    (i) => List.filled(s2.length + 1, 0),
  );

  for (var i = 0; i <= s1.length; i++) matrix[i][0] = i;
  for (var j = 0; j <= s2.length; j++) matrix[0][j] = j;

  for (var i = 1; i <= s1.length; i++) {
    for (var j = 1; j <= s2.length; j++) {
      final cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
      matrix[i][j] = [
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      ].reduce(min);
    }
  }
  return matrix[s1.length][s2.length];
}

bool _match(String normalized, String name, String code) {
  return normalized.contains(name.toLowerCase()) ||
      normalized.contains(code.toLowerCase());
}
