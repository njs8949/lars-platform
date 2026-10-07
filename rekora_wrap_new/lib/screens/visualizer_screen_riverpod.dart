import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/selected_wrap_provider.dart';
import '../theme.dart';
import 'design_screen_riverpod.dart';

/// Riverpod 기반 VisualizerScreen (iOS AIWrappingView와 동일)
class VisualizerScreenRiverpod extends ConsumerStatefulWidget {
  const VisualizerScreenRiverpod({super.key});

  @override
  ConsumerState<VisualizerScreenRiverpod> createState() => _VisualizerScreenRiverpodState();
}

class _VisualizerScreenRiverpodState extends ConsumerState<VisualizerScreenRiverpod> {
  @override
  Widget build(BuildContext context) {
    // selectedWrapProvider 감시 (iOS의 onChange와 동일)
    final selectedWrapState = ref.watch(selectedWrapProvider);

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
                  _buildHeader(context),
                  const SizedBox(height: 24),

                  // 색상 선택 섹션
                  _buildColorSelectionSection(context, selectedWrapState),
                  const SizedBox(height: 32),

                  // 테스트 버튼
                  _buildTestButtons(context),
                  const SizedBox(height: 32),

                  // 선택된 색상 정보
                  if (selectedWrapState.selectedWrap != null)
                    _buildSelectedColorInfo(context, selectedWrapState),

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'AI Wrapping (Riverpod)',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.info),
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✨ Riverpod 기반 상태 관리 적용됨')),
          ),
        ),
      ],
    );
  }

  Widget _buildTestButtons(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Test Riverpod State Management',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            // Test 색상 1
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ref.read(selectedWrapProvider.notifier).updateChipColor(
                    hexCode: '#FF0000',
                    brand: 'Test Brand',
                    colorName: 'Red Color',
                    finish: 'Gloss',
                  );
                },
                child: const Text('🔴 Red'),
              ),
            ),
            const SizedBox(width: 8),
            // Test 색상 2
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ref.read(selectedWrapProvider.notifier).updateChipColor(
                    hexCode: '#0000FF',
                    brand: 'Test Brand',
                    colorName: 'Blue Color',
                    finish: 'Matte',
                  );
                },
                child: const Text('🔵 Blue'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            // Test 색상 3
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ref.read(selectedWrapProvider.notifier).updateChipColor(
                    hexCode: '#00FF00',
                    brand: 'Test Brand',
                    colorName: 'Green Color',
                    finish: 'Satin',
                  );
                },
                child: const Text('🟢 Green'),
              ),
            ),
            const SizedBox(width: 8),
            // 초기화
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ref.read(selectedWrapProvider.notifier).clear();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey,
                ),
                child: const Text('🔄 Clear'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildColorSelectionSection(
    BuildContext context,
    SelectedWrapState state,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Color Chip Selection',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),

        // 디자인 허브 버튼
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const DesignScreenRiverpod(),
                    ),
                  );
                },
                icon: const Icon(Icons.dashboard_customize),
                label: const Text('Design Hub'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        Text(
          state.hasSelectedColor
              ? '✅ Selected: ${state.sampledColorName}'
              : '⭕ No color selected yet',
          style: TextStyle(
            fontSize: 14,
            color: state.hasSelectedColor ? Colors.green : WrapTheme.mutedText(context),
          ),
        ),
        const SizedBox(height: 16),
        if (state.sampledColorHex != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Color(int.parse(
                'FF${state.sampledColorHex!.replaceFirst('#', '')}',
                radix: 16,
              )),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  state.sampledColorName ?? 'Unknown',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  state.sampledColorHex ?? '#000000',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildSelectedColorInfo(BuildContext context, SelectedWrapState state) {
    final wrap = state.selectedWrap;
    if (wrap == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'AI Generation Settings',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: wrap.swatch,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      wrap.brand,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      wrap.displayName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Finish: ${state.sampledFinish ?? 'N/A'}',
                      style: TextStyle(
                        fontSize: 12,
                        color: WrapTheme.mutedText(context),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              '✨ AI prompt auto-generated!',
              style: TextStyle(
                fontSize: 12,
                color: Colors.green,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

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
