import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../config.dart';

/// Published notices from the Rekora backend, plus which of them this device has already opened.
class AnnouncementFeed {
  AnnouncementFeed._();

  static const _readFileName = 'announcement_read_ids.json';

  /// Newest first, as ordered by the backend (pinned items first).
  static Future<List<Map<String, dynamic>>> fetch() async {
    final res = await http
        .get(Uri.parse('${Config.wrapBackendBaseUrl}/announcements'))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode != 200) {
      throw StateError('announcements ${res.statusCode}');
    }
    final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    final items = (body['items'] as List?) ?? const [];
    return [for (final item in items) Map<String, dynamic>.from(item as Map)];
  }

  static Future<File> _file() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/$_readFileName');
  }

  static Future<Set<String>> readIds() async {
    try {
      final file = await _file();
      if (!await file.exists()) return <String>{};
      final list = jsonDecode(await file.readAsString()) as List;
      return list.map((e) => e.toString()).toSet();
    } catch (_) {
      return <String>{};
    }
  }

  static Future<void> markRead(Iterable<String> ids) async {
    final current = await readIds();
    current.addAll(ids);
    final file = await _file();
    await file.writeAsString(jsonEncode(current.toList()), flush: true);
  }

  /// New notices (isNew) that this device has not opened yet.
  static Future<int> unreadCount() async {
    try {
      final items = await fetch();
      final read = await readIds();
      return items.where((i) => i['isNew'] == true && !read.contains(i['id'])).length;
    } catch (_) {
      return 0;
    }
  }
}
