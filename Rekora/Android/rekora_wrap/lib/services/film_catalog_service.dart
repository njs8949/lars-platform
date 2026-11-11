import 'dart:convert';
import 'dart:ui' show Color;

import 'package:http/http.dart' as http;

import '../config.dart';

/// One film from the server catalogue (wrap-api /catalog/match). Identified by brand + model code.
class CatalogFilmCandidate {
  const CatalogFilmCandidate({
    required this.brand,
    required this.colorName,
    required this.modelCode,
    required this.finishLabel,
    required this.hex,
    required this.deltaE,
  });

  final String brand;
  final String colorName;
  final String modelCode;
  final String finishLabel;
  final String? hex;
  final double deltaE;

  Color? get swatch {
    final h = hex;
    if (h == null || !RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(h)) return null;
    return Color(0xFF000000 | int.parse(h.substring(1), radix: 16));
  }
}

/// Client for the film catalogue. Returns an empty list on any failure so the scan flow never breaks.
class FilmCatalogService {
  FilmCatalogService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<CatalogFilmCandidate>> matchHex(String hex, {int limit = 6}) async {
    try {
      final res = await _client
          .post(
            Uri.parse('${Config.wrapBackendBaseUrl}/catalog/match'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'hex': hex, 'kind': 'wrap', 'limit': limit}),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return const [];
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      final rawList = decoded is Map ? decoded['candidates'] : null;
      if (rawList is! List) return const [];
      final out = <CatalogFilmCandidate>[];
      for (final item in rawList) {
        if (item is! Map) continue;
        final finish = item['finish'];
        out.add(CatalogFilmCandidate(
          brand: '${item['brand'] ?? ''}',
          colorName: '${item['colorName'] ?? ''}',
          modelCode: '${item['modelCode'] ?? ''}',
          finishLabel: finish is Map ? '${finish['label'] ?? ''}' : '',
          hex: item['hex'] as String?,
          deltaE: (item['deltaE'] as num?)?.toDouble() ?? 0,
        ));
      }
      return out;
    } catch (_) {
      return const [];
    }
  }
}
