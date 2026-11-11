import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';

/// Version shown in the app. Keep in step with pubspec.yaml (version + build).
const String kAppVersionName = '7.0.0';
const int kAppBuildNumber = 56;

enum UpdateKind { upToDate, optional, required }

class UpdateCheck {
  const UpdateCheck({required this.kind, required this.latestVersion, required this.latestBuild, required this.storeUrl});

  final UpdateKind kind;
  final String latestVersion;
  final int latestBuild;
  final String storeUrl;
}

/// Compares this build with the server policy (wrap-api GET /app/version).
/// Returns null when the policy cannot be read.
Future<UpdateCheck?> checkForAppUpdate({http.Client? client}) async {
  try {
    final res = await (client ?? http.Client())
        .get(Uri.parse('${Config.wrapBackendBaseUrl}/app/version'))
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 200) return null;
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    final android = decoded is Map ? decoded['android'] : null;
    if (android is! Map) return null;
    final minBuild = (android['minBuild'] as num).toInt();
    final latestBuild = (android['latestBuild'] as num).toInt();
    final kind = kAppBuildNumber < minBuild
        ? UpdateKind.required
        : kAppBuildNumber < latestBuild
            ? UpdateKind.optional
            : UpdateKind.upToDate;
    return UpdateCheck(
      kind: kind,
      latestVersion: '${android['latestVersion']}',
      latestBuild: latestBuild,
      storeUrl: '${android['storeUrl'] ?? ''}',
    );
  } catch (_) {
    return null;
  }
}

/// Runs the check and shows the result. Tapping the version in settings calls this.
/// An outdated build gets a required update dialog that cannot be dismissed.
Future<void> showAppUpdateCheck(BuildContext context, {required bool isKorean}) async {
  final messenger = ScaffoldMessenger.of(context);
  final check = await checkForAppUpdate();
  if (!context.mounted) return;
  if (check == null) {
    messenger.showSnackBar(SnackBar(
      content: Text(isKorean ? '업데이트 정보를 확인하지 못했습니다. 네트워크를 확인해 주세요.' : 'Could not check for updates. Check your connection.'),
    ));
    return;
  }

  Future<void> openStore() async {
    final uri = check.storeUrl.isEmpty ? null : Uri.tryParse(check.storeUrl);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  if (check.kind == UpdateKind.upToDate) {
    messenger.showSnackBar(SnackBar(
      content: Text(isKorean
          ? '최신 버전을 사용 중입니다 (v$kAppVersionName).'
          : 'You are on the latest version (v$kAppVersionName).'),
    ));
    return;
  }

  final required = check.kind == UpdateKind.required;
  await showDialog<void>(
    context: context,
    barrierDismissible: !required,
    builder: (ctx) => PopScope(
      canPop: !required,
      child: AlertDialog(
        title: Text(required
            ? (isKorean ? '업데이트가 필요합니다' : 'Update required')
            : (isKorean ? '새 버전이 있습니다' : 'New version available')),
        content: Text(required
            ? (isKorean
                ? '현재 버전(v$kAppVersionName)은 더 이상 지원되지 않습니다. 최신 버전(v${check.latestVersion})으로 업데이트해 주세요.'
                : 'This version (v$kAppVersionName) is no longer supported. Please update to v${check.latestVersion}.')
            : (isKorean
                ? '최신 버전(v${check.latestVersion})이 출시되었습니다. 업데이트하시겠습니까?'
                : 'Version v${check.latestVersion} is available. Would you like to update?')),
        actions: [
          if (!required)
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: Text(isKorean ? '나중에' : 'Later')),
          FilledButton(
            onPressed: () async {
              await openStore();
            },
            child: Text(isKorean ? '업데이트 하기' : 'Update'),
          ),
        ],
      ),
    ),
  );
}
