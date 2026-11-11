import 'dart:io';

import 'package:datadog_flutter_plugin/datadog_flutter_plugin.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

/// Consent for Datadog monitoring data (diagnostics, sessions, screen recordings).
/// Datadog starts in the pending state, so nothing is sent until the user agrees.
class DatadogConsent {
  DatadogConsent._();

  static const _fileName = 'datadog_consent_v1.txt';

  static Future<File> _file() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/$_fileName');
  }

  /// 'granted', 'notGranted', or null when the user has not answered yet.
  static Future<String?> stored() async {
    try {
      final file = await _file();
      if (!await file.exists()) return null;
      final value = (await file.readAsString()).trim();
      return value.isEmpty ? null : value;
    } catch (_) {
      return null;
    }
  }

  static Future<void> _save(String value) async {
    final file = await _file();
    await file.writeAsString(value, flush: true);
  }

  /// Applies the saved choice to the SDK. Call after Datadog has started.
  static Future<void> applyStored() async {
    final value = await stored();
    if (value == 'granted') {
      DatadogSdk.instance.setTrackingConsent(TrackingConsent.granted);
    } else if (value == 'notGranted') {
      DatadogSdk.instance.setTrackingConsent(TrackingConsent.notGranted);
    }
  }

  /// Shows the question once. Later changes go through [change].
  static Future<void> askIfNeeded(BuildContext context, {required bool isKo}) async {
    if (await stored() != null) return;
    if (!context.mounted) return;
    await _ask(context, isKo: isKo);
  }

  /// Lets the user change the choice from settings at any time.
  static Future<void> change(BuildContext context, {required bool isKo}) => _ask(context, isKo: isKo);

  static Future<void> _ask(BuildContext context, {required bool isKo}) async {
    final agreed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(isKo ? '서비스 개선을 위한 데이터 수집' : 'Data collection for service monitoring'),
        content: Text(isKo
            ? '앱 안정성 확인을 위해 사용 기록, 오류 로그, 세션 기록과 화면 녹화를 Datadog으로 전송합니다. 동의하지 않아도 앱을 사용할 수 있으며, 설정에서 언제든지 바꿀 수 있습니다.'
            : 'To monitor app stability, usage events, error logs, session records and screen recordings are sent to Datadog. You can use the app without agreeing, and you can change this in settings at any time.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(isKo ? '동의하지 않음' : 'Do not agree')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(isKo ? '동의' : 'Agree')),
        ],
      ),
    );
    if (agreed == null) return;
    final value = agreed ? 'granted' : 'notGranted';
    await _save(value);
    DatadogSdk.instance.setTrackingConsent(agreed ? TrackingConsent.granted : TrackingConsent.notGranted);
  }
}
