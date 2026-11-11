import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config.dart';

/// Client for the Rekora Wrap backend user-data API (`/me/projects`, `/me/vehicles`).
///
/// Every request carries the Firebase ID token. The backend only writes the caller's own rows.
/// These calls are mirrors during the transition: Firestore stays the read source until the
/// backfill is complete. Failures are logged and never block the user's edit.
class UserApi {
  UserApi._();
  static final UserApi instance = UserApi._();

  static const _timeout = Duration(seconds: 10);

  Future<Map<String, String>?> _headers() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    final token = await user.getIdToken();
    if (token == null) return null;
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  Uri _uri(String collection, String id) => Uri.parse(
    '${Config.wrapBackendBaseUrl}/me/$collection/${Uri.encodeComponent(id)}',
  );

  /// Asks the backend to store this account's email, name and sign-in provider.
  /// The backend reads them from the verified Firebase token; the app sends no profile values.
  Future<bool> registerProfile() async {
    try {
      final headers = await _headers();
      if (headers == null) return false;
      final res = await http
          .put(Uri.parse('${Config.wrapBackendBaseUrl}/me/profile'), headers: headers)
          .timeout(_timeout);
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('UserApi registerProfile failed: $e');
      return false;
    }
  }

  /// Lists the caller's projects or vehicles as the app's own maps, newest first (by `createdAt`),
  /// matching the Firestore order the app used before. Returns null when the backend is unavailable.
  Future<List<Map<String, dynamic>>?> list(String collection) async {
    try {
      final headers = await _headers();
      if (headers == null) return null;
      final res = await http
          .get(Uri.parse('${Config.wrapBackendBaseUrl}/me/$collection'), headers: headers)
          .timeout(_timeout);
      if (res.statusCode != 200) {
        debugPrint('UserApi list $collection ${res.statusCode}');
        return null;
      }
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final items = (body['items'] as List<dynamic>)
          .map((item) => Map<String, dynamic>.from(
                (item as Map<String, dynamic>)['data'] as Map<String, dynamic>,
              ))
          .toList();
      items.sort((a, b) {
        final ca = a['createdAt'];
        final cb = b['createdAt'];
        final na = ca is num ? ca : 0;
        final nb = cb is num ? cb : 0;
        return nb.compareTo(na);
      });
      return items;
    } catch (e) {
      debugPrint('UserApi list $collection failed: $e');
      return null;
    }
  }

  /// Upserts a project (`projects`) or a vehicle (`vehicles`). Returns true when stored.
  Future<bool> put(String collection, String id, Map<String, dynamic> data) async {
    try {
      final headers = await _headers();
      if (headers == null) return false;
      final res = await http
          .put(_uri(collection, id), headers: headers, body: jsonEncode(data))
          .timeout(_timeout);
      if (res.statusCode != 200) {
        debugPrint('UserApi put $collection ${res.statusCode}');
        return false;
      }
      return true;
    } catch (e) {
      debugPrint('UserApi put $collection failed: $e');
      return false;
    }
  }

  /// Deletes the caller's backend copy (projects, vehicles) and marks the subscription as deleted.
  Future<bool> deleteAccount() async {
    try {
      final headers = await _headers();
      if (headers == null) return false;
      final res = await http
          .delete(Uri.parse('${Config.wrapBackendBaseUrl}/me'), headers: headers)
          .timeout(_timeout);
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('UserApi deleteAccount failed: $e');
      return false;
    }
  }

  /// Deletes a project or vehicle. Returns true when the request succeeded.
  Future<bool> delete(String collection, String id) async {
    try {
      final headers = await _headers();
      if (headers == null) return false;
      final res = await http
          .delete(_uri(collection, id), headers: headers)
          .timeout(_timeout);
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('UserApi delete $collection failed: $e');
      return false;
    }
  }
}
