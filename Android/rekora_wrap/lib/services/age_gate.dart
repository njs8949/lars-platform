import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Community is closed to users under 13. The birth date stays on this device only.
class AgeGate {
  AgeGate._();

  static const minimumAge = 13;
  static const _fileName = 'birth_date_v1.txt';

  static Future<File> _file() async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/$_fileName');
  }

  static Future<DateTime?> birthDate() async {
    try {
      final file = await _file();
      if (!await file.exists()) return null;
      return DateTime.tryParse((await file.readAsString()).trim());
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(DateTime birth) async {
    final file = await _file();
    final value = '${birth.year.toString().padLeft(4, '0')}-${birth.month.toString().padLeft(2, '0')}-${birth.day.toString().padLeft(2, '0')}';
    await file.writeAsString(value, flush: true);
  }

  static bool isUnder13(DateTime birth, {DateTime? now}) {
    final today = now ?? DateTime.now();
    var age = today.year - birth.year;
    if (today.month < birth.month || (today.month == birth.month && today.day < birth.day)) {
      age -= 1;
    }
    return age < minimumAge;
  }
}
