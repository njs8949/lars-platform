import 'package:flutter/material.dart';

import '../l10n.dart';
import '../theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tx('알림', 'Notifications')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: WrapTheme.card(context),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: WrapTheme.border(context)),
            ),
            child: Text(
              l10n.tx('새로운 알림이 없습니다.', 'No new notifications.'),
              style: TextStyle(color: WrapTheme.mutedText(context)),
            ),
          ),
        ],
      ),
    );
  }
}
