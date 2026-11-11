import 'package:flutter/material.dart';
import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';
import 'notifications_screen.dart';

class DesignScreen extends StatefulWidget {
  const DesignScreen({super.key, this.onWrapApplied});
  final VoidCallback? onWrapApplied;

  @override
  State<DesignScreen> createState() => _DesignScreenState();
}

class _DesignScreenState extends State<DesignScreen> {
  final _searchController = TextEditingController();
  String _selectedFinishFilter = 'All';
  // Colour chips turn like the pages of a book: one chip per page.
  final _pageController = PageController(viewportFraction: 0.74);
  int _pageIndex = 0;
  // false = book view (page turning), true = grid view.
  bool _gridView = false;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  /// One library card. Shared by the book view and the grid view.
  Widget _buildWrapCard(BuildContext context, int i, List<WrapColor> wraps, AppState state) {
    return _WrapCard(
      wrap: wraps[i],
      onSelect: () {
        state.setPendingWrap(wraps[i]);
        widget.onWrapApplied?.call();
      },
      onViewDetails: () {
        _showProductDetails(
          context,
          wraps[i],
          onApply: () {
            state.setPendingWrap(wraps[i]);
            Navigator.of(context).pop();
            widget.onWrapApplied?.call();
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateScope.of(context);
    final l10n = L10n.of(context);
    
    // Combine Vinyl and PPF
    final allWraps = [...state.wraps, ...state.colorPpfWraps];
    final finishFilters = <String>[
      l10n.allCategory,
      ...{
        ...allWraps.map((wrap) => wrap.finish),
      }.toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase())),
    ];
    
    final query = _searchController.text.trim().toLowerCase();
    final normalizedQuery = _normalizeSearchToken(query);
    final selectedFilter = _selectedFinishFilter.toLowerCase();
    final isAllFilter =
        selectedFilter == 'all' ||
        selectedFilter == l10n.allCategory.toLowerCase();
    final filteredWraps = allWraps.where((w) {
      final searchableTokens = <String>[
        w.displayName.toLowerCase(),
        w.displayNameWithCode.toLowerCase(),
        w.brand.toLowerCase(),
        w.name.toLowerCase(),
        w.finish.toLowerCase(),
        w.hexCode.toLowerCase(),
        w.code.toLowerCase(),
        _normalizeSearchToken(w.code),
        _normalizeSearchToken(w.name),
        _normalizeSearchToken(w.brand),
      ];
      final matchesQuery =
          query.isEmpty ||
          searchableTokens.any(
            (token) => token.contains(query) || token.contains(normalizedQuery),
          );
      final matchesFinish =
          isAllFilter || w.finish.toLowerCase() == selectedFilter;
      return matchesQuery && matchesFinish;
    }).toList();

    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(painter: _StudioGridPainter(dotColor: WrapTheme.border(context))),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildNewHeader(context),
                  const SizedBox(height: 12),

                  // Search Bar
                  Container(
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
                            decoration: InputDecoration(
                              hintText: l10n.tx('브랜드, 색상, 재질, 코드명 검색', 'Search Brand, Color, Material, or Code...'),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: finishFilters.map((finish) {
                        return _buildFilterChip(context, finish, _selectedFinishFilter == finish);
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 32),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${isAllFilter ? l10n.allCategory : _selectedFinishFilter} ${l10n.tx('라이브러리', 'Library')} (${filteredWraps.length})',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      IconButton(
                        tooltip: _gridView ? l10n.tx('책자 보기', 'Book view') : l10n.tx('그리드 보기', 'Grid view'),
                        onPressed: () => setState(() => _gridView = !_gridView),
                        icon: Icon(_gridView ? Icons.auto_stories_outlined : Icons.grid_view_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  if (filteredWraps.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: Text(l10n.noResults)),
                    )
                  else if (_gridView)
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
                      itemBuilder: (ctx, i) => _buildWrapCard(ctx, i, filteredWraps, state),
                    )
                  else
                    _BookFlipView(
                      controller: _pageController,
                      pageIndex: _pageIndex,
                      itemCount: filteredWraps.length,
                      onPageChanged: (i) => setState(() => _pageIndex = i),
                      itemBuilder: (ctx, i) => _buildWrapCard(ctx, i, filteredWraps, state),
                    ),

                  const SizedBox(height: 40),
                  Text(
                    l10n.tx('재질 인스피레이션', 'Material Inspirations'),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildInspirationCard(
                    context,
                    state,
                    l10n.tx('이리디센트 네뷸라 글로스', 'Iridescent Nebula Gloss'),
                    l10n.tx('프리미엄 멀티 레이어 세라믹 피니시', 'Premium Multi-Layer Ceramic Finish'),
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

  void _showProductDetails(
    BuildContext context,
    WrapColor wrap, {
    required VoidCallback onApply,
  }) {
    final l10n = L10n.of(context);
    final info = wrap.productInfo;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return SafeArea(
          child: FractionallySizedBox(
            heightFactor: 0.88,
            child: Container(
              decoration: BoxDecoration(
                color: WrapTheme.card(context),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 48,
                    height: 5,
                    margin: const EdgeInsets.only(top: 14, bottom: 18),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.tx('제품 자세히 보기', 'Product Details'),
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 18),
                          AspectRatio(
                            aspectRatio: 1.3,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(24),
                              child: wrap.referenceAssetPath != null
                                  ? Image.asset(
                                      wrap.referenceAssetPath!,
                                      fit: BoxFit.cover,
                                      cacheWidth: 960,
                                      filterQuality: FilterQuality.medium,
                                      errorBuilder: (context, error, stackTrace) =>
                                          _WrapTexturePreview(wrap: wrap),
                                    )
                                  : _WrapTexturePreview(wrap: wrap),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            wrap.displayName,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            info.productLine,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: WrapTheme.primary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              _DetailChip(label: wrap.brand),
                              _DetailChip(label: wrap.finish),
                              if (wrap.displayCode != null) _DetailChip(label: wrap.displayCode!),
                              _DetailChip(label: wrap.hexCode),
                            ],
                          ),
                          const SizedBox(height: 22),
                          _DetailSection(
                            title: l10n.tx('제조사 설명', 'Manufacturer Description'),
                            body: l10n.tx(info.descriptionKo, info.descriptionEn),
                          ),
                          const SizedBox(height: 18),
                          _DetailSection(
                            title: l10n.tx('제품 정보', 'Product Information'),
                            body:
                                '${l10n.tx('브랜드', 'Brand')}: ${wrap.brand}\n'
                                '${l10n.tx('제품명', 'Product')}: ${wrap.name}\n'
                                '${l10n.tx('코드', 'Code')}: ${wrap.displayCode ?? '-'}\n'
                                '${l10n.tx('마감', 'Finish')}: ${wrap.finish}\n'
                                '${l10n.tx('기준 HEX', 'Reference HEX')}: ${wrap.hexCode}',
                          ),
                          const SizedBox(height: 18),
                          _DetailSection(
                            title: l10n.tx('카탈로그 출처', 'Catalog Source'),
                            body: info.catalogSource,
                          ),
                          const SizedBox(height: 18),
                          Text(
                            l10n.tx('주요 포인트', 'Highlights'),
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: info.highlights
                                .map((item) => _DetailChip(label: item))
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(sheetContext).pop(),
                            child: Text(l10n.tx('닫기', 'Close')),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: onApply,
                            child: Text(l10n.tx('이 필름 적용', 'Apply This Film')),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildNewHeader(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 32),
          Text(
            'REKORA',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -1.8, color: Theme.of(context).colorScheme.onSurface),
          ),
          IconButton(
            icon: Icon(Icons.notifications_none_rounded, color: WrapTheme.primary, size: 32),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(BuildContext context, String label, bool active) {
    return Container(
      margin: const EdgeInsets.only(right: 10),
      child: FilterChip(
        label: Text(label),
        selected: active,
        onSelected: (_) {
          setState(() {
            _selectedFinishFilter = label;
            _pageIndex = 0;
          });
          if (_pageController.hasClients) _pageController.jumpToPage(0);
        },
        backgroundColor: WrapTheme.card(context),
        selectedColor: const Color(0xFF4F378A),
        checkmarkColor: Colors.white,
        labelStyle: TextStyle(color: active ? Colors.white : Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100), side: BorderSide(color: active ? Colors.transparent : WrapTheme.border(context))),
      ),
    );
  }

  Widget _buildInspirationCard(
    BuildContext context,
    AppState state,
    String title,
    String sub,
  ) {
    final inspirationWrap = _resolveInspirationWrap(state);
    return GestureDetector(
      onTap: inspirationWrap == null
          ? null
          : () {
              state.setPendingWrap(inspirationWrap);
              widget.onWrapApplied?.call();
            },
      child: Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: Theme.of(context).brightness == Brightness.dark ? 0.18 : 0.04), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Column(
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
              color: WrapTheme.background(context),
            ),
            clipBehavior: Clip.antiAlias,
            child: inspirationWrap == null
                ? Center(child: Icon(Icons.auto_awesome_mosaic_rounded, size: 48, color: Colors.grey.withValues(alpha: 0.3)))
                : Stack(
                    fit: StackFit.expand,
                    children: [
                      if (inspirationWrap.referenceAssetPath != null)
                        Image.asset(
                          inspirationWrap.referenceAssetPath!,
                          fit: BoxFit.cover,
                          cacheWidth: 720,
                          filterQuality: FilterQuality.medium,
                          errorBuilder: (context, error, stackTrace) => _WrapTexturePreview(wrap: inspirationWrap),
                        )
                      else
                        _WrapTexturePreview(wrap: inspirationWrap),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.white.withValues(alpha: 0.12),
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.22),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        top: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.32),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            inspirationWrap.finish,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 52,
                        bottom: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              inspirationWrap.displayName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                shadows: [
                                  Shadow(
                                    color: Colors.black54,
                                    blurRadius: 12,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              inspirationWrap.finish,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Positioned(
                        right: 16,
                        bottom: 16,
                        child: Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: inspirationWrap.swatch,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 4),
                Text(sub, style: TextStyle(color: WrapTheme.mutedText(context), fontWeight: FontWeight.w600)),
                if (inspirationWrap != null) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          inspirationWrap.displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        L10n.of(context).tx('적용하기', 'Apply'),
                        style: const TextStyle(
                          color: Color(0xFF4F378A),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ));
  }

  WrapColor? _resolveInspirationWrap(AppState state) {
    final allWraps = [...state.wraps, ...state.colorPpfWraps];
    for (final wrap in allWraps) {
      final finish = wrap.finish.toLowerCase();
      final name = wrap.displayName.toLowerCase();
      if (finish.contains('colorflow') ||
          finish.contains('aurora') ||
          finish.contains('effect') ||
          name.contains('iridescent') ||
          name.contains('nebula')) {
        return wrap;
      }
    }
    return allWraps.isNotEmpty ? allWraps.first : null;
  }
}

String _normalizeSearchToken(String input) {
  return input.toLowerCase().replaceAll(RegExp(r'[\s\-_()]'), '');
}

/// The colour chip preview used by the design hub cards. Shared so the home recommendations match it exactly.
class WrapChipPreview extends StatelessWidget {
  const WrapChipPreview({super.key, required this.wrap});

  final WrapColor wrap;

  @override
  Widget build(BuildContext context) {
    final previewImage = wrap.referenceAssetPath;
    return Container(
            margin: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              color: wrap.swatch.withValues(alpha: 0.18),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (previewImage != null)
                  Image.asset(
                    previewImage,
                    fit: BoxFit.cover,
                    cacheWidth: 560,
                    filterQuality: FilterQuality.medium,
                    errorBuilder: (context, error, stackTrace) => _WrapTexturePreview(wrap: wrap),
                  )
                else
                  _WrapTexturePreview(wrap: wrap),
                Positioned(
                  left: 10,
                  top: 10,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: wrap.swatch,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.2),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 6,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: 10,
                  right: 10,
                  bottom: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.44),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      wrap.finish,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
  }
}

/// Pages through items like a book: the page turns on its edge as it leaves the centre.
class _BookFlipView extends StatelessWidget {
  const _BookFlipView({
    required this.controller,
    required this.pageIndex,
    required this.itemCount,
    required this.onPageChanged,
    required this.itemBuilder,
  });

  final PageController controller;
  final int pageIndex;
  final int itemCount;
  final ValueChanged<int> onPageChanged;
  final Widget Function(BuildContext, int) itemBuilder;

  static const double _viewportFraction = 0.74;
  static const double _cardAspect = 0.85; // width / height, as in the grid it replaces

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final pageWidth = constraints.maxWidth * _viewportFraction;
        final pageHeight = pageWidth / _cardAspect;
        return Column(
          children: [
            SizedBox(
              height: pageHeight,
              child: PageView.builder(
                controller: controller,
                itemCount: itemCount,
                onPageChanged: onPageChanged,
                itemBuilder: (ctx, i) => AnimatedBuilder(
                  animation: controller,
                  builder: (context, _) {
                    final double page = controller.hasClients && controller.position.haveDimensions
                        ? (controller.page ?? pageIndex.toDouble())
                        : pageIndex.toDouble();
                    final double d = (page - i).clamp(-1.0, 1.0).toDouble();
                    final transform = Matrix4.identity()
                      ..setEntry(3, 2, 0.0012)
                      ..rotateY(-d * 0.55);
                    return Transform(
                      alignment: d >= 0 ? Alignment.centerLeft : Alignment.centerRight,
                      transform: transform,
                      child: Center(
                        child: SizedBox(
                          width: pageWidth - 16,
                          height: pageHeight - 16,
                          child: itemBuilder(ctx, i),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              itemCount == 0 ? '' : '${pageIndex + 1} / $itemCount',
              style: TextStyle(color: WrapTheme.mutedText(context), fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ],
        );
      },
    );
  }
}

class _WrapCard extends StatelessWidget {
  final WrapColor wrap;
  final VoidCallback onSelect;
  final VoidCallback onViewDetails;
  const _WrapCard({
    required this.wrap,
    required this.onSelect,
    required this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSelect,
      child: Container(
        decoration: BoxDecoration(
          color: WrapTheme.card(context),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: WrapTheme.border(context)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: WrapChipPreview(wrap: wrap)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(wrap.displayName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(wrap.brand, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: onViewDetails,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(
                        L10n.of(context).tx('제품 자세히 보기', 'View Product Details'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  const _DetailSection({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: TextStyle(
            height: 1.5,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: WrapTheme.mutedText(context),
          ),
        ),
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: WrapTheme.background(context),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onSurface,
        ),
      ),
    );
  }
}

class _WrapTexturePreview extends StatelessWidget {
  const _WrapTexturePreview({required this.wrap});

  final WrapColor wrap;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _FilmTexturePainter(
        color: wrap.swatch,
        finish: wrap.finish,
      ),
      child: Container(),
    );
  }
}

class _FilmTexturePainter extends CustomPainter {
  const _FilmTexturePainter({required this.color, required this.finish});

  final Color color;
  final String finish;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final normalized = finish.toLowerCase();

    final base = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          _shift(color, 0.18),
          color,
          _shift(color, -0.14),
        ],
        stops: const [0.0, 0.52, 1.0],
      ).createShader(rect);
    canvas.drawRect(rect, base);

    if (normalized.contains('gloss') || normalized.contains('chrome')) {
      final gloss = Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.55),
            Colors.white.withValues(alpha: 0.10),
            Colors.transparent,
          ],
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height * 0.68));
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(size.width * 0.08, size.height * 0.08, size.width * 0.84, size.height * 0.34),
          const Radius.circular(40),
        ),
        gloss,
      );
    }

    if (normalized.contains('matte') || normalized.contains('satin')) {
      final matte = Paint()..color = Colors.white.withValues(alpha: normalized.contains('matte') ? 0.06 : 0.1);
      for (double y = 0; y < size.height; y += 8) {
        canvas.drawRect(Rect.fromLTWH(0, y, size.width, 3), matte);
      }
    }

    if (normalized.contains('metal')) {
      final sparkle = Paint()..color = Colors.white.withValues(alpha: 0.18);
      for (double x = 8; x < size.width; x += 18) {
        for (double y = 8; y < size.height; y += 18) {
          canvas.drawCircle(Offset(x, y), 1.2, sparkle);
        }
      }
    }

    if (normalized.contains('carbon') || normalized.contains('forged') || normalized.contains('texture')) {
      final carbon = Paint()..color = Colors.black.withValues(alpha: 0.18);
      for (double x = -size.height; x < size.width; x += 14) {
        canvas.drawRect(
          Rect.fromLTWH(x, 0, 6, size.height),
          carbon,
        );
      }
      for (double x = 0; x < size.width + size.height; x += 14) {
        canvas.save();
        canvas.translate(x, 0);
        canvas.rotate(0.52);
        canvas.drawRect(Rect.fromLTWH(0, -size.height, 5, size.height * 2), carbon);
        canvas.restore();
      }
    }

    if (normalized.contains('colorflow') || normalized.contains('shift') || normalized.contains('aurora')) {
      final iridescent = Paint()
        ..shader = const LinearGradient(
          colors: [
            Color(0x66FF6BCB),
            Color(0x669A7CFF),
            Color(0x6656CCF2),
            Color(0x66FFD166),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ).createShader(rect);
      canvas.drawRect(rect, iridescent);
    }
  }

  Color _shift(Color input, double amount) {
    final hsl = HSLColor.fromColor(input);
    final shifted = hsl.withLightness((hsl.lightness + amount).clamp(0.0, 1.0));
    return shifted.toColor();
  }

  @override
  bool shouldRepaint(covariant _FilmTexturePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.finish != finish;
  }
}

class _StudioGridPainter extends CustomPainter {
  final Color dotColor;
  _StudioGridPainter({required this.dotColor});
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = dotColor;
    for (double x = 0; x < size.width; x += 32) {
      for (double y = 0; y < size.height; y += 32) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }
  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
