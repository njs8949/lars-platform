import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../config.dart';

/// Report and block tools for community posts (required for user-generated content apps).
class CommunityModeration {
  CommunityModeration._();

  static const reasons = ['abuse', 'sexual', 'spam', 'illegal', 'other'];

  /// Terms that are not allowed in posts (compared lower-case, without spaces).
  static const _blockedTerms = ['씨발', '시발', '병신', '좆', '개새끼', '지랄', 'fuck', 'shit', 'bitch', 'asshole', 'porn', '섹스파트너'];

  static bool containsBlockedTerm(String text) {
    final normalized = text.toLowerCase().replaceAll(RegExp(r'\s+'), '');
    return _blockedTerms.any((term) => normalized.contains(term));
  }
  static const _fileName = 'community_blocked_authors_v1.json';

  static Future<File> _file() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/$_fileName');
  }

  /// Authors whose posts this user has blocked (kept on this device).
  static Future<Set<String>> blockedAuthors() async {
    try {
      final file = await _file();
      if (!await file.exists()) return <String>{};
      return (jsonDecode(await file.readAsString()) as List).map((e) => e.toString()).toSet();
    } catch (_) {
      return <String>{};
    }
  }

  static Future<void> block(String author) async {
    final current = await blockedAuthors();
    current.add(author);
    final file = await _file();
    await file.writeAsString(jsonEncode(current.toList()), flush: true);
  }

  /// Sends a report to the backend. Returns true when the server accepted it.
  static Future<bool> report({
    required String postId,
    required String postAuthor,
    required String reason,
    String detail = '',
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;
    final token = await user.getIdToken();
    final res = await http
        .post(
          Uri.parse('${Config.wrapBackendBaseUrl}/community/reports'),
          headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
          body: jsonEncode({
            'postId': postId,
            'postAuthor': postAuthor,
            'reason': reason,
            'detail': detail,
          }),
        )
        .timeout(const Duration(seconds: 15));
    return res.statusCode == 201;
  }
}
