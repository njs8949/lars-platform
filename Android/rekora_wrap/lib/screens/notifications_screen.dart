import 'package:flutter/material.dart';

import '../l10n.dart';
import '../services/announcement_feed.dart';
import '../theme.dart';

/// Notifications = published notices. New ones stay marked until opened.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<_FeedData> _future = _load();

  Future<_FeedData> _load() async {
    final items = await AnnouncementFeed.fetch();
    final read = await AnnouncementFeed.readIds();
    return _FeedData(items, read);
  }

  Future<void> _open(Map<String, dynamic> item, bool isKo) async {
    final id = item['id']?.toString() ?? '';
    if (id.isNotEmpty) {
      await AnnouncementFeed.markRead([id]);
    }
    if (!mounted) return;
    setState(() => _future = _load());
    final title = isKo ? item['titleKo'] : (item['titleEn'] ?? '');
    final body = isKo ? item['bodyKo'] : (item['bodyEn'] ?? '');
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.8),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['date']?.toString() ?? '', style: TextStyle(color: WrapTheme.mutedText(ctx), fontSize: 12)),
                const SizedBox(height: 6),
                Text(
                  (title as String?)?.isNotEmpty == true ? title as String : (item['titleKo'] ?? '').toString(),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 16),
                Text((body as String?) ?? '', style: const TextStyle(fontSize: 15, height: 1.6)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    final isKo = l10n.code != 'en';
    return Scaffold(
      appBar: AppBar(title: Text(l10n.tx('알림', 'Notifications'))),
      body: FutureBuilder<_FeedData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(l10n.tx('알림을 불러오지 못했습니다.', 'Could not load notifications.'),
                  style: TextStyle(color: WrapTheme.mutedText(context))),
            );
          }
          final data = snapshot.data!;
          if (data.items.isEmpty) {
            return Center(
              child: Text(l10n.tx('새로운 알림이 없습니다.', 'No new notifications.'),
                  style: TextStyle(color: WrapTheme.mutedText(context))),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: data.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final item = data.items[index];
              final id = item['id']?.toString() ?? '';
              final unread = item['isNew'] == true && !data.read.contains(id);
              final title = isKo
                  ? (item['titleKo'] ?? '').toString()
                  : ((item['titleEn'] as String?)?.isNotEmpty == true ? item['titleEn'] : item['titleKo'] ?? '').toString();
              return InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => _open(item, isKo),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: WrapTheme.card(context),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: WrapTheme.border(context)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: unread ? const Color(0xFFE11D48) : Colors.transparent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontWeight: unread ? FontWeight.w900 : FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(item['date']?.toString() ?? '',
                                style: TextStyle(color: WrapTheme.mutedText(context), fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _FeedData {
  const _FeedData(this.items, this.read);
  final List<Map<String, dynamic>> items;
  final Set<String> read;
}
