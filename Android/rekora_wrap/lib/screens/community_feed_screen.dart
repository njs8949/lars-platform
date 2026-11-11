import 'package:flutter/material.dart';

import '../app_state.dart';
import '../widgets/community_widgets.dart';
import '../theme.dart';
import '../l10n.dart';
import '../services/age_gate.dart';

class CommunityFeedScreen extends StatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  State<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends State<CommunityFeedScreen> {
  String _selectedCategory = '전체';
  bool _ageLoaded = false;
  DateTime? _birth;

  @override
  void initState() {
    super.initState();
    AgeGate.birthDate().then((birth) {
      if (mounted) setState(() {
        _birth = birth;
        _ageLoaded = true;
      });
    });
  }

  Future<void> _pickBirthDate(BuildContext context, bool isKo) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(DateTime.now().year - 20),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      helpText: isKo ? '생년월일' : 'Date of birth',
    );
    if (picked == null) return;
    await AgeGate.save(picked);
    if (mounted) setState(() => _birth = picked);
  }

  Widget _ageBlock(BuildContext context, L10n t) {
    final isKo = t.code != 'en';
    final birth = _birth;
    final under13 = birth != null && AgeGate.isUnder13(birth);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              under13
                  ? t.tx('만 13세 미만은 커뮤니티를 이용할 수 없습니다.', 'Community is not available to users under 13.')
                  : t.tx('커뮤니티 이용을 위해 생년월일을 입력해 주세요.', 'Please enter your date of birth to use the community.'),
              textAlign: TextAlign.center,
              style: TextStyle(color: WrapTheme.mutedText(context)),
            ),
            if (!under13) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => _pickBirthDate(context, isKo),
                child: Text(t.tx('생년월일 입력', 'Enter date of birth')),
              ),
            ],
          ],
        ),
      ),
    );
  }

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
      body: !_ageLoaded
          ? const Center(child: CircularProgressIndicator())
          : (_birth == null || AgeGate.isUnder13(_birth!))
              ? _ageBlock(context, t)
              : RefreshIndicator(
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
              ...posts.map((p) => CommunityFeedItem(post: p)),
          ],
        ),
      ),
    );
  }
}
