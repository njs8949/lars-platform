import 'package:flutter/material.dart';

import '../app_state.dart';
import '../widgets/community_widgets.dart';
import '../theme.dart';
import '../l10n.dart';

class CommunityFeedScreen extends StatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  State<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends State<CommunityFeedScreen> {
  String _selectedCategory = '전체';
  static const _categories = [
    '전체',
    '공지',
    '가이드',
    '추천',
    '자유',
    '시공 후기',
    '컬러 추천',
    '케어/관리',
    '부분 랩핑',
    '코팅/보호',
  ];

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final t = L10n.of(context);
    final posts = state.communityPosts.where((p) {
      if (_selectedCategory == '전체') return true;
      return p.category == _selectedCategory;
    }).toList();

    return Scaffold(
      appBar: AppBar(title: Text(t.communityTitle)),
      body: RefreshIndicator(
        onRefresh: state.refreshRemoteCommunityFeed,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const CommunityComposer(),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((c) {
                final selected = _selectedCategory == c;
                return ChoiceChip(
                  label: Text(t.translateCategoryFromKo(c)),
                  selected: selected,
                  onSelected: (_) => setState(() => _selectedCategory = c),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            if (posts.isEmpty)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: WrapTheme.card(context),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: WrapTheme.border(context)),
                ),
                child: Text(
                  t.noPosts,
                  style: TextStyle(color: WrapTheme.mutedText(context)),
                ),
              )
            else
              ...posts.map((p) => CommunityPostTile(post: p)),
          ],
        ),
      ),
    );
  }
}
