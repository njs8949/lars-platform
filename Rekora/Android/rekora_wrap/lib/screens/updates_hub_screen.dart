import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../theme.dart';
import 'announcements_screen.dart';
import 'community_feed_screen.dart';
import 'notifications_screen.dart';

class UpdatesHubScreen extends StatelessWidget {
  const UpdatesHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final l10n = L10n.of(context);

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      appBar: AppBar(
        title: Text(l10n.tx('업데이트 및 커뮤니티', 'Updates & Community')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: WrapTheme.card(context),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: WrapTheme.border(context)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.tx('알림, 공지, 커뮤니티를 한곳에서 확인하세요', 'See alerts, announcements, and community in one place'),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.tx(
                    '서비스 소식과 사용자 피드를 한 화면에서 바로 이동할 수 있습니다.',
                    'Jump into service updates and community posts from a single screen.',
                  ),
                  style: TextStyle(
                    color: WrapTheme.mutedText(context),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _UpdatesEntryTile(
            assetPath: 'assets/icons/lucide_menu/notification.svg',
            title: l10n.tx('알림', 'Notifications'),
            subtitle: l10n.tx('푸시 알림과 최근 활동', 'Push alerts and recent activity'),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            ),
          ),
          _UpdatesEntryTile(
            assetPath: 'assets/icons/lucide_menu/notification.svg',
            title: l10n.tx('공지사항', 'Announcements'),
            subtitle: l10n.tx('Firebase 공지 컬렉션 기반 업데이트', 'Updates from the Firebase announcements collection'),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
            ),
          ),
          _UpdatesEntryTile(
            assetPath: 'assets/icons/lucide_menu/community.svg',
            title: l10n.tx('커뮤니티 피드', 'Community Feed'),
            subtitle: l10n.tx(
              '원격 피드 ${state.communityPosts.length}건 포함',
              'Includes ${state.communityPosts.length} community items',
            ),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => AppStateScope(
                  notifier: state,
                  child: const CommunityFeedScreen(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _UpdatesEntryTile extends StatelessWidget {
  const _UpdatesEntryTile({
    required this.assetPath,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String assetPath;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        leading: SvgPicture.asset(
          assetPath,
          width: 24,
          height: 24,
          colorFilter: ColorFilter.mode(WrapTheme.primary, BlendMode.srcIn),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: WrapTheme.mutedText(context),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: Icon(Icons.chevron_right, color: WrapTheme.mutedText(context)),
      ),
    );
  }
}
