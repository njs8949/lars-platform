import 'dart:io';
import 'dart:math';

import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../config.dart';

/// Pipeline events for the Rekora Wrap backend (`POST /events` → DynamoDB).
///
/// Only an anonymous, per-install id and technical fields are sent (event name, duration, target, error text).
/// No account data, photos or e-mail addresses. Sending is fire-and-forget: a failure never affects the wrap.
class WrapEvents {
  WrapEvents._();

  static String? _deviceId;

  /// Stable anonymous id stored in the app documents folder. Created once per install.
  static Future<String> deviceId() async {
    if (_deviceId != null) return _deviceId!;
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File(p.join(dir.path, 'rekora_device_id.txt'));
      if (await file.exists()) {
        final existing = (await file.readAsString()).trim();
        if (existing.length >= 8) {
          _deviceId = existing;
          return existing;
        }
      }
      final random = Random.secure();
      final bytes = List<int>.generate(16, (_) => random.nextInt(256));
      final id = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      await file.writeAsString(id, flush: true);
      _deviceId = id;
      return id;
    } catch (_) {
      _deviceId = 'unknown-device';
      return _deviceId!;
    }
  }

  /// Sends one event. Never throws and never blocks the caller.
  static void log(String event, {Map<String, Object?> props = const {}}) {
    () async {
      try {
        final id = await deviceId();
        await http
            .post(
              Uri.parse('${Config.wrapBackendBaseUrl}/events'),
              headers: {'Content-Type': 'application/json'},
              body: '{"device_id":"$id","event":"$event","props":${_encodeProps(props)}}',
            )
            .timeout(const Duration(seconds: 10));
      } catch (_) {
        // Analytics must not affect the user's wrap.
      }
    }();
  }

  static String _encodeProps(Map<String, Object?> props) {
    final parts = props.entries.map((e) {
      final v = e.value;
      final value = v == null
          ? 'null'
          : (v is num || v is bool)
              ? v.toString()
              : '"${v.toString().replaceAll('"', "'").replaceAll('\n', ' ')}"';
      return '"${e.key}":$value';
    });
    return '{${parts.join(',')}}';
  }
}
