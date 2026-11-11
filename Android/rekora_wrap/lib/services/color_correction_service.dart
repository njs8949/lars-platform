import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config.dart';

/// Moves the painted area of a generated wrap onto the film colour (wrap-api POST /color-correct).
/// Returns null on any failure, so the caller keeps the AI image.
class ColorCorrectionService {
  ColorCorrectionService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<Uint8List?> correct({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    required String hex,
  }) async {
    try {
      final res = await _client
          .post(
            Uri.parse('${Config.wrapBackendBaseUrl}/color-correct'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'imageBase64': base64Encode(imageBytes),
              'maskBase64': base64Encode(maskBytes),
              'targetHex': hex,
            }),
          )
          .timeout(const Duration(seconds: 60));
      if (res.statusCode != 200) return null;
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      final b64 = decoded is Map ? decoded['imageBase64'] : null;
      if (b64 is! String) return null;
      return base64Decode(b64);
    } catch (_) {
      return null;
    }
  }
}
