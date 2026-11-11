import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config.dart';

/// AI wrap usage for the current month, counted by the server (wrap-api /me/wrap-usage).
class WrapUsage {
  const WrapUsage({required this.period, required this.used, required this.quota});

  final String period;
  final int used;
  final int quota;

  static WrapUsage? fromJson(Object? json) {
    if (json is! Map) return null;
    final used = json['used'];
    final quota = json['quota'];
    if (used is! num || quota is! num) return null;
    return WrapUsage(period: '${json['period'] ?? ''}', used: used.toInt(), quota: quota.toInt());
  }
}

/// The plan quota is used up. [usage] is the server's current count when it was returned.
class WrapQuotaExceeded implements Exception {
  const WrapQuotaExceeded(this.usage);
  final WrapUsage? usage;
}

/// Client for the server-side wrap counter. The count is never kept only on the device.
class WrapUsageService {
  WrapUsageService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<Map<String, String>?> _headers() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    final token = await user.getIdToken();
    return {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'};
  }

  Uri _uri(String path) => Uri.parse('${Config.wrapBackendBaseUrl}/$path');

  /// Current usage, or null when it cannot be read (signed out or offline).
  Future<WrapUsage?> fetch() async {
    try {
      final headers = await _headers();
      if (headers == null) return null;
      final res = await _client.get(_uri('me/wrap-usage'), headers: headers).timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) return null;
      return WrapUsage.fromJson(jsonDecode(utf8.decode(res.bodyBytes)));
    } catch (_) {
      return null;
    }
  }

  /// Counts one wrap before generating. Throws [WrapQuotaExceeded] when the quota is used up,
  /// and [StateError] when the count could not be made (not signed in, offline).
  Future<WrapUsage> consume() async {
    final headers = await _headers();
    if (headers == null) throw StateError('not signed in');
    final res = await _client.post(_uri('me/wrap-usage/consume'), headers: headers).timeout(const Duration(seconds: 15));
    final body = _decode(res.bodyBytes);
    if (res.statusCode == 429) {
      final detail = body is Map ? body['detail'] : null;
      throw WrapQuotaExceeded(WrapUsage.fromJson(detail));
    }
    if (res.statusCode != 200) throw StateError('wrap usage unavailable (${res.statusCode})');
    final usage = WrapUsage.fromJson(body);
    if (usage == null) throw StateError('invalid wrap usage response');
    return usage;
  }

  /// Gives back one wrap when generation failed after it was counted. Returns the new usage when known.
  Future<WrapUsage?> refund() async {
    try {
      final headers = await _headers();
      if (headers == null) return null;
      final res = await _client.post(_uri('me/wrap-usage/refund'), headers: headers).timeout(const Duration(seconds: 15));
      if (res.statusCode != 200) return null;
      return WrapUsage.fromJson(_decode(res.bodyBytes));
    } catch (_) {
      return null;
    }
  }

  Object? _decode(List<int> bytes) {
    try {
      return jsonDecode(utf8.decode(bytes));
    } catch (_) {
      return null;
    }
  }
}
