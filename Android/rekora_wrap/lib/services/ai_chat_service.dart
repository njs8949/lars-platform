import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img_lib;

import '../config.dart';
import '../data/wrap_catalog.dart' as catalog;
import '../models.dart';

/// Result of one assistant turn: the text to show and the catalogue colours it recommends.
class AiChatReply {
  const AiChatReply({required this.text, required this.wraps});
  final String text;
  final List<WrapColor> wraps;
}

/// Calls POST /ai/chat on the Rekora backend. The backend holds the model key (LARS Agent secret).
class AiChatService {
  AiChatService({http.Client? client, this.deviceId = 'android'}) : _client = client ?? http.Client();

  final http.Client _client;
  final String deviceId;

  /// [history] is the conversation so far (role: 'user' | 'assistant').
  /// [photo] is an optional photo chosen by the user; it is resized before upload.
  Future<AiChatReply> send({
    required List<({String role, String text})> history,
    Uint8List? photo,
    required bool isKorean,
  }) async {
    final catalogueNames = catalog.allWraps.map((w) => w.displayName).toList();
    final body = <String, dynamic>{
      'messages': [
        for (final m in history) {'role': m.role, 'text': m.text},
      ],
      'catalogue': catalogueNames,
      'deviceId': deviceId,
      if (photo != null) 'imageBase64': base64Encode(_resizeJpeg(photo)),
    };

    final uri = Uri.parse('${Config.wrapBackendBaseUrl}/ai/chat');
    final res = await _client
        .post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(const Duration(seconds: 90));

    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode != 200 || decoded is! Map<String, dynamic>) {
      final detail = decoded is Map<String, dynamic> ? decoded['detail']?.toString() : null;
      throw StateError(detail ?? (isKorean ? 'AI 응답을 받지 못했습니다.' : 'No AI response.'));
    }

    final text = (decoded['reply'] as String?)?.trim() ?? '';
    final names = ((decoded['colors'] as List?) ?? const []).map((e) => e.toString()).toList();
    final byName = {for (final w in catalog.allWraps) w.displayName.toLowerCase(): w};
    final wraps = <WrapColor>[
      for (final n in names)
        if (byName[n.toLowerCase()] != null) byName[n.toLowerCase()]!,
    ];
    return AiChatReply(text: text.isEmpty ? (isKorean ? '다시 한 번 말씀해 주세요.' : 'Could you say that again?') : text, wraps: wraps);
  }

  /// Keeps the upload small: long side 1024 px, JPEG quality 85.
  Uint8List _resizeJpeg(Uint8List bytes) {
    final decoded = img_lib.decodeImage(bytes);
    if (decoded == null) return bytes;
    final longSide = decoded.width > decoded.height ? decoded.width : decoded.height;
    final resized = longSide > 1024
        ? img_lib.copyResize(
            decoded,
            width: decoded.width >= decoded.height ? 1024 : null,
            height: decoded.height > decoded.width ? 1024 : null,
          )
        : decoded;
    return Uint8List.fromList(img_lib.encodeJpg(resized, quality: 85));
  }
}
