import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../services/announcement_feed.dart';
import '../theme.dart';
import '../l10n.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  final Set<String> _read = {};

  @override
  void initState() {
    super.initState();
    // Notices opened earlier on this device stay read.
    AnnouncementFeed.readIds().then((ids) {
      if (mounted) setState(() => _read.addAll(ids));
    });
  }
  late final Future<List<Map<String, dynamic>>> _announcementsFuture = _loadAnnouncements();

  // Published notices from the Rekora backend (managed at /admin/announcements).
  Future<List<Map<String, dynamic>>> _loadAnnouncements() async {
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

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    final isKo = l10n.code != 'en';

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tx('공지사항', 'Announcements')),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _announcementsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                l10n.tx('불러오기 실패. 다시 시도해 주세요.', 'Failed to load. Please try again.'),
                style: TextStyle(color: WrapTheme.mutedText(context)),
              ),
            );
          }
          final docs = snapshot.data ?? const <Map<String, dynamic>>[];
          if (docs.isEmpty) {
            return Center(
              child: Text(
                l10n.tx('등록된 공지사항이 없습니다.', 'No announcements yet.'),
                style: TextStyle(color: WrapTheme.mutedText(context)),
              ),
            );
          }
          final outerContext = context;
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: docs.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final data = docs[index];
              final id = data['id']?.toString() ?? '';
              final item = _Announcement.fromMap(id, data);
              final isUnread = item.isNew && !_read.contains(id);
              return _AnnouncementTile(
                item: item,
                isKo: isKo,
                isUnread: isUnread,
                onTap: () {
                  setState(() => _read.add(id));
                  AnnouncementFeed.markRead([id]);
                  _showDetail(outerContext, item, isKo);
                },
              );
            },
          );
        },
      ),
    );
  }

  void _showDetail(BuildContext context, _Announcement item, bool isKo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.92,
          builder: (context, controller) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: ListView(
                controller: controller,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: WrapTheme.border(context),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isKo ? item.titleKo : item.titleEn,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.date,
                    style: TextStyle(
                      fontSize: 12,
                      color: WrapTheme.mutedText(context),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Divider(color: WrapTheme.border(context)),
                  const SizedBox(height: 16),
                  Text(
                    isKo ? item.bodyKo : item.bodyEn,
                    style: const TextStyle(fontSize: 14, height: 1.6),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _AnnouncementTile extends StatelessWidget {
  const _AnnouncementTile({
    required this.item,
    required this.isKo,
    required this.isUnread,
    required this.onTap,
  });

  final _Announcement item;
  final bool isKo;
  final bool isUnread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WrapTheme.card(context),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isUnread
                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)
                : WrapTheme.border(context),
            width: isUnread ? 1.4 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isUnread)
                        Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'NEW',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                      Expanded(
                        child: Text(
                          isKo ? item.titleKo : item.titleEn,
                          style: TextStyle(
                            fontWeight:
                                isUnread ? FontWeight.w700 : FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.date,
                    style: TextStyle(
                      fontSize: 12,
                      color: WrapTheme.mutedText(context),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 20),
          ],
        ),
      ),
    );
  }
}

class _Announcement {
  const _Announcement({
    required this.id,
    required this.titleKo,
    required this.titleEn,
    required this.bodyKo,
    required this.bodyEn,
    required this.date,
    required this.isNew,
  });

  factory _Announcement.fromMap(String id, Map<String, dynamic> data) {
    String strValue(String key) {
      for (final k in data.keys) {
        if (k.toLowerCase() == key.toLowerCase()) {
          return data[k]?.toString() ?? '';
        }
      }
      return '';
    }

    final String date = data['date']?.toString() ?? '';
    return _Announcement(
      id: id,
      titleKo: strValue('titleKo'),
      titleEn: strValue('titleEn'),
      bodyKo: strValue('bodyKo'),
      bodyEn: strValue('bodyEn'),
      date: date,
      isNew: data['isNew'] == true,
    );
  }

  final String id;
  final String titleKo;
  final String titleEn;
  final String bodyKo;
  final String bodyEn;
  final String date;
  final bool isNew;
}
