import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app_state.dart';
import '../models.dart';
import '../providers/selected_wrap_provider.dart';
import '../theme.dart';

/// Riverpod 기반 DesignScreen (iOS DesignHubView와 동일)
class DesignScreenRiverpod extends ConsumerStatefulWidget {
  const DesignScreenRiverpod({super.key});

  @override
  ConsumerState<DesignScreenRiverpod> createState() => _DesignScreenRiverpodState();
}

class _DesignScreenRiverpodState extends ConsumerState<DesignScreenRiverpod> {
  final _searchController = TextEditingController();
  String _selectedFinishFilter = 'All';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);

    // 모든 래퍼 합치기 (Vinyl + PPF)
    final allWraps = [...state.wraps, ...state.colorPpfWraps];

    // 마감 필터 생성
    final finishFilters = <String>[
      'All',
      ...{...allWraps.map((wrap) => wrap.finish)}.toList()
        ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase())),
    ];

    // 검색 및 필터링
    final query = _searchController.text.trim().toLowerCase();
    final selectedFilter = _selectedFinishFilter.toLowerCase();
    final isAllFilter = selectedFilter == 'all';

    final filteredWraps = allWraps.where((w) {
      final searchableTokens = <String>[
        w.displayName.toLowerCase(),
        w.displayNameWithCode.toLowerCase(),
        w.brand.toLowerCase(),
        w.name.toLowerCase(),
        w.finish.toLowerCase(),
        w.hexCode.toLowerCase(),
        w.code.toLowerCase(),
      ];
      final matchesQuery =
          query.isEmpty || searchableTokens.any((token) => token.contains(query));
      final matchesFinish = isAllFilter || w.finish.toLowerCase() == selectedFilter;
      return matchesQuery && matchesFinish;
    }).toList();

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _StudioGridPainter(dotColor: WrapTheme.border(context)),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 헤더
                  _buildHeader(context),
                  const SizedBox(height: 12),

                  // 검색바
                  _buildSearchBar(context),
                  const SizedBox(height: 20),

                  // 필터 칩
                  _buildFilterChips(context, finishFilters),
                  const SizedBox(height: 32),

                  // 결과 카운트
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${isAllFilter ? 'All' : _selectedFinishFilter} Library (${filteredWraps.length})',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 래퍼 그리드
                  if (filteredWraps.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: Text(
                          'No results found',
                          style: TextStyle(
                            fontSize: 14,
                            color: WrapTheme.mutedText(context),
                          ),
                        ),
                      ),
                    )
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: filteredWraps.length,
                      itemBuilder: (ctx, i) => _WrapCardRiverpod(
                        wrap: filteredWraps[i],
                        onSelect: () => _selectWrap(context, filteredWraps[i]),
                      ),
                    ),

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 래퍼 선택 (Riverpod 업데이트)
  void _selectWrap(BuildContext context, WrapColor wrap) {
    // Riverpod 상태 업데이트
    ref.read(selectedWrapProvider.notifier).updateSelectedWrap(wrap);

    // 자동으로 뒤로가기 (iOS의 sheet 닫힘과 동일)
    Navigator.of(context).pop();

    // 유저 피드백
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✅ Selected: ${wrap.displayName}'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Design Hub',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Icon(Icons.search, color: WrapTheme.mutedText(context)),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'Search brand, color, material...',
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips(BuildContext context, List<String> filters) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: filters.map((filter) {
          final isSelected = _selectedFinishFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(filter),
              selected: isSelected,
              onSelected: (_) => setState(() => _selectedFinishFilter = filter),
              backgroundColor: Colors.transparent,
              selectedColor: WrapTheme.accentColor(context),
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.black,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Riverpod 기반 WrapCard
class _WrapCardRiverpod extends StatelessWidget {
  final WrapColor wrap;
  final VoidCallback onSelect;

  const _WrapCardRiverpod({
    required this.wrap,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSelect,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: WrapTheme.border(context)),
          color: Colors.white,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 색상 미리보기
            Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
                color: wrap.swatch,
              ),
            ),
            // 정보
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      wrap.brand,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      wrap.displayName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          wrap.finish.toLowerCase(),
                          style: const TextStyle(
                            fontSize: 9,
                            color: Colors.grey,
                          ),
                        ),
                        Text(
                          wrap.hexCode,
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 그리드 배경 페인터
class _StudioGridPainter extends CustomPainter {
  final Color dotColor;

  _StudioGridPainter({required this.dotColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = dotColor.withOpacity(0.1)
      ..strokeWidth = 0.5;

    const spacing = 20.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
