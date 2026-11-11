import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

/// Explicit permission before a user's photo is sent to external AI services.
class AiConsent {
  AiConsent._();

  static const _fileName = 'ai_photo_consent_v1.txt';

  static Future<File> _file() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/$_fileName');
  }

  static Future<bool> hasConsent() async {
    try {
      final file = await _file();
      return file.existsSync() && (await file.readAsString()).trim() == 'granted';
    } catch (_) {
      return false;
    }
  }

  static Future<void> _store() async {
    final file = await _file();
    await file.writeAsString('granted', flush: true);
  }

  /// Withdraws consent. The next AI feature asks again.
  static Future<void> revoke() async {
    final file = await _file();
    if (await file.exists()) await file.delete();
  }

  /// Returns true when the user has agreed (now or before). Shows the consent dialog only once.
  static Future<bool> ensure(BuildContext context, {required bool isKo}) async {
    if (await hasConsent()) return true;
    final agreed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(isKo ? '사진 전송 동의' : 'Photo sharing consent'),
        content: Text(isKo
            ? '차량 사진과 입력한 요청 내용은 AI 처리를 위해 OpenAI, Anthropic(Claude), Google(Gemini), Amazon Web Services 등 외부 AI 서비스로 전송됩니다. 전송된 정보는 각 서비스의 정책에 따라 처리됩니다. 동의하지 않으면 AI 기능을 사용할 수 없습니다. 동의는 설정에서 철회할 수 있습니다.'
            : 'Your vehicle photos and requests are sent to external AI services, including OpenAI, Anthropic (Claude), Google (Gemini) and Amazon Web Services, to process them. Each service handles the data under its own policy. Without consent, AI features cannot be used. You can withdraw consent later in settings.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(isKo ? '거부' : 'Decline')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(isKo ? '동의' : 'Agree')),
        ],
      ),
    );
    if (agreed == true) {
      await _store();
      return true;
    }
    return false;
  }
}
