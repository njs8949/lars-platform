import 'package:flutter/material.dart';

import '../services/full_vehicle_wrap_service.dart';

// ─── ValidationOverlayWidget ─────────────────────────────────────────────────
// Phase 4: 데이터 기반 시뮬레이션임을 증명하는 물리 메타데이터 오버레이 UI

class ValidationOverlayWidget extends StatefulWidget {
  const ValidationOverlayWidget({
    super.key,
    required this.physics,
    this.colorHex,
    this.depthMap,
  });

  final PhysicsMetadata physics;
  final String? colorHex;
  final DepthMap? depthMap;

  @override
  State<ValidationOverlayWidget> createState() => _ValidationOverlayWidgetState();
}

class _ValidationOverlayWidgetState extends State<ValidationOverlayWidget>
    with SingleTickerProviderStateMixin {
  bool _expanded = false;
  late final AnimationController _animController;
  late final Animation<double> _expandAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _expandAnim = CurvedAnimation(parent: _animController, curve: Curves.easeInOutCubic);
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _expanded = !_expanded);
    _expanded ? _animController.forward() : _animController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── 상단 배지 ──────────────────────────────────────────────────────
        GestureDetector(
          onTap: _toggle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.75),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.withOpacity(0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_user, color: Colors.green, size: 13),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    widget.physics.coating,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'monospace',
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                AnimatedRotation(
                  turns: _expanded ? -0.5 : 0,
                  duration: const Duration(milliseconds: 280),
                  child: const Icon(Icons.expand_more, color: Colors.white54, size: 16),
                ),
              ],
            ),
          ),
        ),

        // ── 확장 패널 ─────────────────────────────────────────────────────
        SizeTransition(
          sizeFactor: _expandAnim,
          child: Container(
            margin: const EdgeInsets.only(top: 2),
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.80),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withOpacity(0.10)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Divider(color: Colors.white12),

                // 물리 수치 그리드
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  childAspectRatio: 3.0,
                  children: [
                    _PhysicsChip(label: 'IoR', value: widget.physics.ior.toStringAsFixed(2), accent: Colors.cyan),
                    _PhysicsChip(label: 'Roughness', value: widget.physics.roughness.toStringAsFixed(2), accent: Colors.orange),
                    _PhysicsChip(label: 'Fresnel', value: _capitalize(widget.physics.fresnelBoost), accent: Colors.purple),
                    _PhysicsChip(label: 'Sparkle', value: widget.physics.sparkle == 'none' ? '–' : widget.physics.sparkle, accent: Colors.yellow),
                  ],
                ),

                const SizedBox(height: 6),

                // 특수 효과 배지
                if (widget.physics.thinFilmInterference == true || widget.physics.colorFlip == true)
                  Wrap(
                    spacing: 4,
                    children: [
                      if (widget.physics.thinFilmInterference == true)
                        _BadgeTag(text: 'Thin-Film Interference', color: Colors.purpleAccent),
                      if (widget.physics.colorFlip == true)
                        _BadgeTag(text: 'Color-Flip Active', color: Colors.pinkAccent),
                    ],
                  ),

                if (widget.physics.flakeSize != null) ...[
                  const SizedBox(height: 4),
                  _PhysicsRow(label: 'Flake Size', value: widget.physics.flakeSize!),
                ],

                // 깊이 맵 요약
                if (widget.depthMap != null) ...[
                  const Divider(color: Colors.white12, height: 12),
                  Row(
                    children: [
                      const Icon(Icons.view_in_ar, color: Colors.white38, size: 12),
                      const SizedBox(width: 6),
                      Text(
                        'Vehicle: ${_capitalize(widget.depthMap!.vehicleType)}  ·  '
                        '${widget.depthMap!.viewAngle.replaceAll('_', ' ').split(' ').map(_capitalize).join(' ')}',
                        style: const TextStyle(color: Colors.white54, fontSize: 10, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ],

                // 제품 정보
                const Divider(color: Colors.white12, height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.physics.product,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            'SKU: ${widget.physics.sku}',
                            style: const TextStyle(color: Colors.white54, fontSize: 10, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                    if (widget.colorHex != null)
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: _hexToColor(widget.colorHex!),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white30),
                        ),
                      ),
                  ],
                ),

                const SizedBox(height: 4),
                Text(
                  widget.physics.standard ?? 'PET-based automotive wrap film simulation',
                  style: const TextStyle(color: Colors.white24, fontSize: 9, fontFamily: 'monospace'),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  Color _hexToColor(String hex) {
    try {
      final h = hex.replaceFirst('#', '');
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return Colors.grey;
    }
  }
}

// ─── Supporting Widgets ───────────────────────────────────────────────────────

class _PhysicsChip extends StatelessWidget {
  const _PhysicsChip({required this.label, required this.value, required this.accent});

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          Container(width: 2, height: 20, color: accent, margin: const EdgeInsets.only(right: 6)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 8, fontFamily: 'monospace')),
              Text(value, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
            ],
          ),
        ],
      ),
    );
  }
}

class _PhysicsRow extends StatelessWidget {
  const _PhysicsRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10, fontFamily: 'monospace')),
        const Spacer(),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500, fontFamily: 'monospace')),
      ],
    );
  }
}

class _BadgeTag extends StatelessWidget {
  const _BadgeTag({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
    );
  }
}

// ─── LightScenarioPicker (Phase 4) ───────────────────────────────────────────

class LightScenarioPicker extends StatelessWidget {
  const LightScenarioPicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final LightScenario selected;
  final ValueChanged<LightScenario> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(50),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: LightScenario.values.map((sc) {
          final isSelected = sc == selected;
          return GestureDetector(
            onTap: () => onChanged(sc),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(50),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(sc.icon, size: 12, color: isSelected ? Colors.black : Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    sc.displayName,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isSelected ? Colors.black : Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── MultiScenarioResultView (Phase 4) ───────────────────────────────────────

class MultiScenarioResultView extends StatefulWidget {
  const MultiScenarioResultView({
    super.key,
    required this.scenarios,
    required this.physics,
  });

  final List<ScenarioResult> scenarios;
  final PhysicsMetadata physics;

  @override
  State<MultiScenarioResultView> createState() => _MultiScenarioResultViewState();
}

class _MultiScenarioResultViewState extends State<MultiScenarioResultView> {
  LightScenario _selected = LightScenario.outdoor;

  ScenarioResult? get _current =>
      widget.scenarios.cast<ScenarioResult?>().firstWhere(
            (r) => r?.scenario == _selected,
            orElse: () => null,
          );

  @override
  Widget build(BuildContext context) {
    final result = _current;
    return Column(
      children: [
        if (result != null)
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Image.memory(
              result.imageBytes,
              key: ValueKey(_selected),
              fit: BoxFit.contain,
            ),
          )
        else
          const SizedBox(height: 200, child: Center(child: Text('시나리오 없음', style: TextStyle(color: Colors.white38)))),

        const SizedBox(height: 12),
        LightScenarioPicker(
          selected: _selected,
          onChanged: (sc) => setState(() => _selected = sc),
        ),

        if (result?.fromCache == true) ...[
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.bolt, color: Colors.amber, size: 12),
              SizedBox(width: 4),
              Text('캐시에서 즉시 로드됨', style: TextStyle(fontSize: 10, color: Colors.white38)),
            ],
          ),
        ],
      ],
    );
  }
}
