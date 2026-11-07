import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import '../services/wrap_events.dart';
import '../app_state.dart';
import '../config.dart';
import '../l10n.dart';
import '../models.dart';
import '../services/ai_viewer_service.dart';
import '../services/chip_calibration_service.dart';
import '../services/color_chip_analyzer.dart';
import '../services/full_vehicle_wrap_service.dart';
import '../theme.dart';
import 'calibration_camera_screen.dart';
import 'design_screen.dart';
import 'notifications_screen.dart';
import '../widgets/ar_wrapping_overlay.dart';

class VisualizerScreen extends StatefulWidget {
  const VisualizerScreen({
    super.key,
    this.onSelectDesign,
  });

  final VoidCallback? onSelectDesign;

  @override
  State<VisualizerScreen> createState() => _VisualizerScreenState();
}

class _VisualizerScreenState extends State<VisualizerScreen> {
  final _picker = ImagePicker();
  final _promptController = TextEditingController();
  final _canvasTransformController = TransformationController();
  final GlobalKey _canvasImageKey = GlobalKey();
  Size? _vehicleImageSize;
  List<double>? _tapPoint;
  final _fullWrapService = FullVehicleWrapService(backendBaseUrl: Config.backendBaseUrl);
  final _chipAnalyzer = ColorChipAnalyzer();
  final _aiViewerService = AiViewerService();
  final _chipCalibrationService = ChipCalibrationService();
  
  File? _vehicleImage;
  Uint8List? _maskBytes;
  bool _segmenting = false;
  WrapColor? _selectedWrap;
  Color? _chipColor;
  String? _chipHex;
  ChipCalibrationResult? _chipCalibration;
  String _finish = 'Satin';
  String _finishPrompt = 'Satin';
  _WrapApplicationMode _wrapMode = _WrapApplicationMode.fullBody;
  final Set<String> _accentPanels = {'roof', 'mirrors'};
  bool _includeChromeDelete = false;
  Color? _secondaryChipColor;
  String? _secondaryChipHex;
  String _secondaryFinish = 'Gloss';
  String _secondaryFinishPrompt = 'Gloss';
  DateTime? _wrapStartedAt;
  // SAM 3 only produces the mask. Colour is applied by the OpenAI router; the deterministic recolour is optional.
  static const bool _useDeterministicRecolor = false;
  bool _generating = false;
  String _generatingStatus = '';
  AiPreviewResult? _preview;
  bool _proAdvancedEngineEnabled = false;
  final Set<String> _expanded = {"color", "ai"};
  bool _captureGuideExpanded = true;
  bool _wrapPanelExpanded = true;
  bool _optionsPanelExpanded = true;
  bool _incomingStateSyncScheduled = false;
  bool _showingArView = false;
  String? _activeGarageVehicleId;
  _AnglePreset _anglePreset = _AnglePreset.front;
  _WeatherPreset _weatherPreset = _WeatherPreset.clear;
  _TimeOfDayPreset _timeOfDayPreset = _TimeOfDayPreset.day;
  _BackgroundPreset _backgroundPreset = _BackgroundPreset.original;

  @override
  void initState() {
    super.initState();
    // Wake the SAM 3 GPU endpoint now so the mask job after capture is not a cold start.
    _fullWrapService.warmUpMaskEndpoint();
  }

  @override
  void dispose() {
    _promptController.dispose();
    _canvasTransformController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _scheduleIncomingStateSync();
    final l10n = L10n.of(context);
    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(painter: _StudioGridPainter(dotColor: WrapTheme.border(context))),
          ),

          SafeArea(
            child: Column(
              children: [
                _buildNewHeader(context, l10n),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      children: [
                        _buildCanvasArea(context, l10n),
                        _buildCaptureGuideCard(context, l10n),
                        _buildFloatingActionPanel(context, l10n),
                        _buildActionButtonsCard(context, l10n),
                        const SizedBox(height: 120),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          
        ],
      ),
    );
  }

  Widget _buildNewHeader(BuildContext context, L10n l10n) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 32),
          Text(
            'REKORA',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -1.8, color: Theme.of(context).colorScheme.onSurface),
          ),
          IconButton(
            tooltip: l10n.notificationsTooltip,
            icon: Icon(Icons.notifications_none_rounded, color: WrapTheme.primary, size: 32),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          ),
        ],
      ),
    );
  }

  /// Loading state shown inside the preview canvas (AI wrap / calibration progress).
  Widget _buildCanvasLoadingOverlay() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(44),
      ),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 44,
            height: 44,
            child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF4F378A)),
          ),
          const SizedBox(height: 18),
          Text(
            _generatingStatus.isEmpty ? 'AI 랩핑 처리 중...' : _generatingStatus,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF4F378A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCanvasArea(BuildContext context, L10n l10n) {
    final displayImage = _preview?.generatedImage ?? _vehicleImage;

    return Container(
      height: 380,
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(44),
            ),
            child: CustomPaint(
              painter: _DashedBorderPainter(color: const Color(0xFFCBC4D2), radius: 44, strokeWidth: 2),
              child: displayImage == null 
                ? _buildCanvasPlaceholder(context, l10n)
                : ClipRRect(
                    borderRadius: BorderRadius.circular(44),
                    child: InteractiveViewer(
                      transformationController: _canvasTransformController,
                      minScale: 1,
                      maxScale: 4,
                      child: GestureDetector(
                        onTapUp: (d) => _onCanvasTap(d.localPosition),
                        child: AnimatedRotation(
                        key: _canvasImageKey,
                        turns: _anglePreset.turns,
                        duration: const Duration(milliseconds: 240),
                        curve: Curves.easeOutCubic,
                        child: Image.file(
                          displayImage,
                          key: ValueKey('${displayImage.path}-${_anglePreset.name}'),
                          fit: BoxFit.contain,
                          width: double.infinity,
                          height: double.infinity,
                        ),
                      ),
                      ),
                    ),
                  ),
            ),
          ),
          
          if (_segmenting)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(color: Colors.white60, borderRadius: BorderRadius.circular(44)),
                child: const Center(child: CircularProgressIndicator(color: Color(0xFF4F378A))),
              ),
            ),

          if (_generating)
            Positioned.fill(child: _buildCanvasLoadingOverlay()),
          
          if (_vehicleImage != null)
            Positioned(
              top: -18,
              child: OutlinedButton.icon(
                onPressed: _pickVehicleImage,
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: Text(l10n.tx('차량 이미지 변경', 'Change Vehicle Image')),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.96),
                  foregroundColor: const Color(0xFF4F378A),
                  side: const BorderSide(color: Color(0xFFE9D5FF)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
          
          // Side Icons
          Positioned(
            left: 20, bottom: 20,
            child: Column(
              children: [
                _buildSideIcon(
                  Icons.zoom_in_rounded,
                  onTap: () => _handleZoomAction(context, displayImage != null),
                ),
                const SizedBox(height: 12),
                _buildSideIcon(
                  Icons.threed_rotation_rounded,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ArWrappingOverlay(
                          onExit: () => Navigator.of(context).pop(),
                          selectedWrap: _selectedWrap,
                          finish: _finish,
                          onWrapChanged: (wrap, finish) {
                            setState(() {
                              _selectedWrap = wrap;
                              // The AI prompt reads the target color from _chipColor/_chipHex, so a wrap picked here
                              // must update them too (otherwise the car's own color was sent as the target).
                              if (wrap != null) {
                                _chipColor = wrap.swatch;
                                _chipHex = _hexFromColor(wrap.swatch);
                              }
                              _finish = finish;
                            });
                          },
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          Positioned(
            right: 20, top: 20,
            child: _buildSideIcon(
              Icons.wb_sunny_outlined,
              onTap: () => _showEnvironmentSheet(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCanvasPlaceholder(BuildContext context, L10n l10n) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        GestureDetector(
          onTap: _pickVehicleImage,
          child: Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: const Color(0xFFF3E8FF).withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Container(
                width: 50,
                height: 50,
                decoration: const BoxDecoration(
                  color: Color(0xFF4F378A),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.file_upload_outlined,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          l10n.aiWrapStudio,
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w900,
            color: isDark
                ? Colors.white.withValues(alpha: 0.96)
                : Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 40),
          child: Text(
            l10n.tx('고해상도 차량 사진을 업로드해 AI 랩핑을 시작하세요.', 'Upload a high-resolution photo of your vehicle to begin AI wrapping.'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 17,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.74)
                  : WrapTheme.mutedText(context),
              height: 1.3,
              fontWeight: isDark ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCaptureGuideCard(BuildContext context, L10n l10n) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF151426)
            : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: WrapTheme.border(context)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => setState(() => _captureGuideExpanded = !_captureGuideExpanded),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF3E8FF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.photo_camera_outlined,
                    size: 18,
                    color: Color(0xFF4F378A),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l10n.tx('최적의 랩핑을 위한 촬영 방법', 'Best photo tips for wrapping'),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
                Icon(
                  _captureGuideExpanded ? Icons.expand_less : Icons.expand_more,
                  color: WrapTheme.mutedText(context),
                ),
              ],
            ),
          ),
          if (_captureGuideExpanded) ...[
            const SizedBox(height: 14),
            _buildCaptureTip(
              context,
              l10n.tx('정면 45도', 'Front 45°'),
              l10n.tx('차량 전체 윤곽이 보이도록 정면 45도에서 촬영하세요.', 'Capture from a front 45° angle so the full silhouette is visible.'),
            ),
            const SizedBox(height: 10),
            _buildCaptureTip(
              context,
              l10n.tx('밝고 균일한 조명', 'Even lighting'),
              l10n.tx('그늘이나 역광보다 밝고 균일한 실내/야외 조명이 좋습니다.', 'Use bright, even lighting instead of harsh shadows or backlight.'),
            ),
            const SizedBox(height: 10),
            _buildCaptureTip(
              context,
              l10n.tx('차량만 프레임 안에', 'Vehicle only'),
              l10n.tx('사람, 다른 차량, 복잡한 배경은 최소화해 주세요.', 'Keep people, other cars, and busy backgrounds out of frame.'),
            ),
            const SizedBox(height: 10),
            _buildCaptureTip(
              context,
              l10n.tx('차체가 선명하게', 'Keep panels sharp'),
              l10n.tx('도어, 범퍼, 휠 아치가 선명하게 보이는 해상도를 권장합니다.', 'Use a sharp photo where doors, bumpers, and wheel arches are clearly visible.'),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF2A2A2A)
                    : const Color(0xFFF8F2FA),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFF4F378A).withValues(alpha: 0.18)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF4F378A), size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.shootingGuideWarningTitle,
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.shootingGuideWarningDesc,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCaptureTip(BuildContext context, String title, String desc) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: WrapTheme.background(context),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFF22C55E)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    height: 1.35,
                    color: WrapTheme.mutedText(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSideIcon(IconData icon, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48, height: 48,
        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))]),
        child: Icon(icon, color: const Color(0xFF494551), size: 24),
      ),
    );
  }

  Widget _buildFloatingActionPanel(BuildContext context, L10n l10n) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 24, 20, 20),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(52),
        boxShadow: [BoxShadow(color: const Color(0xFF4F378A).withValues(alpha: 0.06), blurRadius: 40, offset: const Offset(0, 15))],
      ),
      child: Column(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _wrapPanelExpanded = !_wrapPanelExpanded),
            child: Container(
              width: 96,
              height: 28,
              alignment: Alignment.center,
              child: Container(
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
          AnimatedCrossFade(
            crossFadeState: _wrapPanelExpanded ? CrossFadeState.showFirst : CrossFadeState.showSecond,
            duration: const Duration(milliseconds: 220),
            firstChild: Column(
              children: [
                const SizedBox(height: 32),
                _buildAvatarStack(),
                const SizedBox(height: 24),
                _buildStatusIndicator(context, l10n),
                const SizedBox(height: 32),
                _buildOptionsPanel(context, l10n),
              ],
            ),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 20),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => _wrapPanelExpanded = true),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                  decoration: BoxDecoration(
                    color: const Color(0xFF12182C).withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF4F378A).withValues(alpha: 0.16)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded, color: Color(0xFF8B7FF0)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n.tx('탭하여 랩핑 설정을 펼치세요', 'Tap to expand wrapping settings'),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.74),
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionsPanel(BuildContext context, L10n l10n) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F378A).withValues(alpha: 0.05),
            blurRadius: 26,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => setState(() => _optionsPanelExpanded = !_optionsPanelExpanded),
            leading: const Icon(Icons.tune_rounded, color: Color(0xFF4F378A)),
            title: Text(
              l10n.tx('랩핑 설정', 'Wrapping Settings'),
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            trailing: Icon(_optionsPanelExpanded ? Icons.expand_less : Icons.expand_more),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          AnimatedCrossFade(
            crossFadeState: _optionsPanelExpanded ? CrossFadeState.showFirst : CrossFadeState.showSecond,
            duration: const Duration(milliseconds: 220),
            firstChild: Column(
              children: [
                _buildAccordionSection(
                  "color",
                  Icons.palette_rounded,
                  l10n.tx('컬러칩 선택', 'Select Color Chip'),
                  _buildColorOptions(),
                ),
                _buildAccordionSection(
                  "ai",
                  Icons.auto_awesome_rounded,
                  l10n.tx('AI 생성', 'AI Generation'),
                  _buildAiInput(),
                ),
                _buildAccordionSection(
                  "advanced",
                  Icons.tune_rounded,
                  l10n.advancedOptions,
                  _buildAdvancedOptions(),
                ),
              ],
            ),
            secondChild: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Text(
                l10n.tx('설정을 펼쳐 랩핑 옵션을 조정하세요.', 'Expand settings to adjust wrapping options.'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: WrapTheme.mutedText(context),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtonsCard(BuildContext context, L10n l10n) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(36),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F378A).withValues(alpha: 0.05),
            blurRadius: 26,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: _buildMainActionButtons(context, l10n),
    );
  }

  Widget _buildAccordionSection(String id, IconData icon, String title, Widget child) {
    final isOpen = _expanded.contains(id);
    return Column(
      children: [
        ListTile(
          onTap: () => setState(() => isOpen ? _expanded.remove(id) : _expanded.add(id)),
          leading: Icon(icon, color: const Color(0xFF4F378A)),
          title: Text(title, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
          trailing: Icon(isOpen ? Icons.expand_less : Icons.expand_more),
        ),
        if (isOpen) Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: child),
        const Divider(height: 1, color: Color(0xFFF1F5F9)),
      ],
    );
  }

  Widget _buildMaterialPills() {
    final finishes = ['Gloss', 'Matte', 'Satin', 'Metallic', 'Carbon'];
    return Wrap(
      spacing: 8,
      children: finishes.map((f) => ChoiceChip(
        label: Text(f),
        selected: _finish == f,
        onSelected: (v) => setState(() {
          _finish = f;
          _finishPrompt = _resolveFinishPrompt(f);
        }),
        selectedColor: const Color(0xFF4F378A),
        labelStyle: TextStyle(color: _finish == f ? Colors.white : Colors.black, fontWeight: FontWeight.bold),
      )).toList(),
    );
  }

  Widget _buildWrapApplicationOptions(BuildContext context, L10n l10n) {
    final modes = _WrapApplicationMode.values;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: modes.map((mode) {
            final selected = mode == _wrapMode;
            return ChoiceChip(
              label: Text(_wrapModeLabel(l10n, mode)),
              selected: selected,
              onSelected: (_) => setState(() => _wrapMode = mode),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Text(
          _wrapModeDescription(l10n, _wrapMode),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: WrapTheme.mutedText(context),
            height: 1.4,
          ),
        ),
        if (_wrapMode == _WrapApplicationMode.twoTone ||
            _wrapMode == _WrapApplicationMode.accentOnly) ...[
          const SizedBox(height: 18),
          Text(
            l10n.tx('적용 영역', 'Target Panels'),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _availableAccentPanels.map((panel) {
              final selected = _accentPanels.contains(panel);
              return FilterChip(
                label: Text(_panelLabel(l10n, panel)),
                selected: selected,
                onSelected: (value) {
                  setState(() {
                    if (value) {
                      _accentPanels.add(panel);
                    } else if (_accentPanels.length > 1) {
                      _accentPanels.remove(panel);
                    }
                  });
                },
              );
            }).toList(),
          ),
        ],
        if (_wrapMode == _WrapApplicationMode.twoTone) ...[
          const SizedBox(height: 18),
          Text(
            l10n.tx('보조 랩 필름', 'Secondary Wrap Film'),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: ['Gloss', 'Matte', 'Satin', 'Metallic'].map((f) => ChoiceChip(
              label: Text(f),
              selected: _secondaryFinish == f,
              onSelected: (_) => setState(() {
                _secondaryFinish = f;
                _secondaryFinishPrompt = f;
              }),
            )).toList(),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildIconButton(
                Icons.colorize_outlined,
                l10n.tx('보조 Hex 입력', 'Secondary Hex'),
                () => _showHexInputSheet(target: _HexInputTarget.secondary),
              ),
              _buildIconButton(
                Icons.copy_rounded,
                l10n.tx('주색 복사', 'Copy Primary'),
                () {
                  final primary = _chipColor ?? _selectedWrap?.swatch;
                  if (primary == null) return;
                  setState(() {
                    _secondaryChipColor = primary;
                    _secondaryChipHex = _hexFromColor(primary);
                  });
                },
              ),
            ],
          ),
          if (_secondaryChipColor != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: WrapTheme.background(context),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: WrapTheme.border(context)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _secondaryChipColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '${_secondaryChipHex ?? ''} · $_secondaryFinish',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
        if (_wrapMode == _WrapApplicationMode.preserveExistingAccent) ...[
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: WrapTheme.background(context),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WrapTheme.border(context)),
            ),
            child: Text(
              l10n.tx(
                '기존 차량에 이미 들어가 있는 스트라이프, 데칼, 포인트 랩핑은 유지하고 나머지 바디에만 새 랩핑을 적용합니다.',
                'Existing stripes, decals, and accent wraps stay untouched while the new wrap is applied to the remaining body panels.',
              ),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: WrapTheme.mutedText(context),
                height: 1.4,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildColorOptions() {
    final l10n = L10n.of(context);
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildIconButton(
              Icons.camera_alt_outlined,
              l10n.tx('컬러칩 스캔', 'Scan Chip'),
              _pickChipImage,
            ),
            _buildIconButton(
              Icons.palette_outlined,
              l10n.tx('디자인 허브', 'Design Hub'),
              _openDesignHub,
            ),
          ],
        ),
        if (_chipColor != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: WrapTheme.background(context), borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                Container(width: 40, height: 40, decoration: BoxDecoration(color: _chipColor, shape: BoxShape.circle)),
                const SizedBox(width: 12),
                Text(_chipHex ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          )
        ]
      ],
    );
  }

  Widget _buildAiInput() {
    final l10n = L10n.of(context);
    return TextField(
      controller: _promptController,
      decoration: InputDecoration(
        hintText: l10n.promptExample,
        filled: true,
        fillColor: WrapTheme.background(context),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      ),
      maxLines: 2,
    );
  }

  Widget _buildAdvancedSubtitle(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    );
  }

  Widget _buildAdvancedOptions() {
    final l10n = L10n.of(context);
    return Column(
      children: [
        _buildAdvancedSubtitle(l10n.tx('랩핑 방식', 'Wrap Strategy')),
        _buildWrapApplicationOptions(context, l10n),
        const SizedBox(height: 18),
        _buildAdvancedSubtitle(l10n.materialFinishTitle),
        _buildMaterialPills(),
        const Divider(height: 28),
        SwitchListTile(
          title: Text(l10n.includeChromeDelete, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          value: _includeChromeDelete,
          onChanged: (v) => setState(() => _includeChromeDelete = v),
          activeThumbColor: const Color(0xFF4F378A),
        ),
        SwitchListTile(
          title: Text(l10n.tx('고급 프로 엔진', 'Advanced Pro Engine'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          value: _proAdvancedEngineEnabled,
          onChanged: (v) => setState(() => _proAdvancedEngineEnabled = v),
          activeThumbColor: const Color(0xFF4F378A),
        ),
      ],
    );
  }

  Widget _buildIconButton(IconData icon, String label, VoidCallback onTap) {
    return Column(
      children: [
        IconButton(onPressed: onTap, icon: Icon(icon, color: const Color(0xFF4F378A))),
        Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
      ],
    );
  }

  Widget _buildAvatarStack() {
    return SizedBox(
      width: 120,
      height: 48,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(left: 0, child: _buildAvatarCircle('assets/icons/wrap_clay/02_car_select.png')),
          Positioned(left: 36, child: _buildAvatarCircle('assets/icons/wrap_clay/04_color_picker.png')),
          Positioned(
            left: 72,
            child: Container(
              width: 48, height: 48,
              decoration: BoxDecoration(color: const Color(0xFF63597C), border: Border.all(color: Colors.white, width: 3), shape: BoxShape.circle),
              child: const Center(child: Text('+12', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900))),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarCircle(String asset) {
    return Container(
      width: 48, height: 48,
      decoration: BoxDecoration(
        color: Colors.white, border: Border.all(color: Colors.white, width: 3), shape: BoxShape.circle,
        image: DecorationImage(image: AssetImage(asset), fit: BoxFit.cover),
      ),
    );
  }

  Widget _buildStatusIndicator(BuildContext context, L10n l10n) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF8A7CFF), shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Text(
              l10n.tx('AI 준비 완료', 'AI READY'),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: isDark
                    ? const Color(0xFFC8BFFF)
                    : const Color(0xFF4F378A),
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          l10n.tx('차량 변신을 시작할까요?', 'Ready to transform your vehicle?'),
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: isDark
                ? Colors.white.withValues(alpha: 0.96)
                : Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ],
    );
  }

  Widget _buildMainActionButtons(BuildContext context, L10n l10n) {
    return Column(
      children: [
        GestureDetector(
          onTap: _generatePreview,
          child: Container(
            width: double.infinity,
            height: 80,
            decoration: BoxDecoration(color: const Color(0xFF4F378A), borderRadius: BorderRadius.circular(24)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
                const SizedBox(width: 10),
                Text(
                  l10n.tx('AI 랩핑\n적용', 'Apply AI\nWrapping'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, height: 1.2, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
        if (_preview?.generatedImage != null) ...[
          const SizedBox(height: 14),
          Text(
            l10n.tx(
              'Rekora Image Generator로 생성된 참고용 이미지입니다. 실제 필름과 색상 차이가 있을 수 있습니다.',
              'Generated with Rekora Image Generator for reference only. Colors may differ from the actual film.',
            ),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              height: 1.4,
              color: WrapTheme.mutedText(context),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _savePreviewToGallery,
              icon: const Icon(Icons.download_rounded),
              label: Text(
                l10n.saveToGalleryBtn,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                foregroundColor: const Color(0xFF4F378A),
                side: BorderSide(color: WrapTheme.border(context)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
        if (_vehicleImage != null) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: _pickVehicleImage,
              icon: const Icon(Icons.photo_library_outlined),
              label: Text(
                l10n.tx('다른 차량 이미지로 다시 시작', 'Start over with another vehicle image'),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              style: TextButton.styleFrom(
                foregroundColor: WrapTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _pickVehicleImage() async {
    // imageQuality makes image_picker re-encode the photo as JPEG (HEIC originals are rejected by the render API).
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 95);
    if (picked == null) return;
    
    final file = File(picked.path);
    await _setVehicleImage(file);
  }

  Future<void> _pickChipImage() async {
    final messenger = ScaffoldMessenger.of(context);
    
    // 1. Navigate to Custom Calibration Camera
    final captureResult = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => const CalibrationCameraScreen()),
    );
    
    if (captureResult == null) return;
    
    final file = captureResult['file'] as File;
    final metadata = captureResult['metadata'] as Map<String, dynamic>;
    
    setState(() {
      _generating = true;
      _generatingStatus = L10n.of(context).tx('컬러 캘리브레이션 분석 중...', 'Analyzing color calibration...');
    });

    try {
      // 2. Perform Server-side Calibration
      // ROIs match CalibrationCameraScreen guides
      final result = await _chipCalibrationService.calibrateChip(
        imageFile: file,
        chipRoi: const CalibrationRoi(x: 0.2, y: 0.325, width: 0.6, height: 0.25),
        checkerRoi: const CalibrationRoi(x: 0.65, y: 0.1, width: 0.3, height: 0.12),
        captureMetadata: CaptureMetadataPayload(
          awbLocked: metadata['awb_locked'] as bool?,
          aeLocked: metadata['ae_locked'] as bool?,
          deviceModel: metadata['device_model'] as String?,
        ),
      );

      _chipCalibration = result;
      final calibrated = result.calibratedColor;
      if (calibrated != null && mounted) {
        final rgb = calibrated['rgb'] as Map<String, dynamic>?;
        if (rgb != null) {
          final color = Color.fromARGB(255, rgb['r'] as int, rgb['g'] as int, rgb['b'] as int);
          setState(() {
            _chipColor = color;
            _chipHex = calibrated['hex'] as String?;
            
            // Apply material prediction if available
            final material = result.materialPrediction;
            if (material != null) {
              final finishLabel = material['finish_label'] as String?;
              if (finishLabel != null) {
                _finish = _normalizeFinish(finishLabel);
                _finishPrompt = finishLabel.trim();
              }
            }
          });
        }
      }

      // Also run local analysis for palette if needed (optional)
      final analysis = await _chipAnalyzer.analyze(file);
      if (mounted) {
        setState(() {
          if (_chipColor == null && analysis != null) {
            _chipColor = analysis.primaryColor;
            _chipHex = analysis.hex;
          }
          _expanded.add("color");
        });
      }

    } catch (e) {
      debugPrint('Calibration failed: $e');
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text(L10n.of(context).tx('캘리브레이션 실패: $e', 'Calibration failed: $e'))),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _openDesignHub() {
    if (widget.onSelectDesign != null) {
      widget.onSelectDesign!.call();
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const DesignScreen(),
      ),
    );
  }

  Future<void> _generatePreview() async {
    final messenger = ScaffoldMessenger.of(context);
    final l10n = L10n.of(context);
    final successMessage = l10n.tx('AI 랩핑이 적용되었습니다.', 'AI wrapping has been applied.');
    final failurePrefix = l10n.tx('AI 랩핑 실패: ', 'AI wrapping failed: ');
    if (_vehicleImage == null) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            l10n.tx(
              '먼저 차량 사진을 업로드해 주세요.',
              'Please upload a vehicle photo first.',
            ),
          ),
        ),
      );
      return;
    }
    final state = AppStateScope.of(context);
    if (state.profile.wrapQuota > 0 &&
        state.profile.wrapUsed >= state.profile.wrapQuota) {
      messenger.showSnackBar(
        SnackBar(content: Text(L10n.of(context).aiWrapQuotaExceededMsg)),
      );
      return;
    }
    if (_wrapMode == _WrapApplicationMode.twoTone &&
        _secondaryChipColor == null) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            L10n.of(context).tx(
              '투톤 랩핑에는 보조 랩 필름 색상을 먼저 지정해 주세요.',
              'Please choose the secondary wrap film color for two-tone wrapping first.',
            ),
          ),
        ),
      );
      return;
    }
    
    setState(() {
      _generating = true;
      _generatingStatus = 'AI 랩핑 엔진 분석 중...';
      _wrapStartedAt = DateTime.now();
      WrapEvents.log('wrap_started', props: {
        'target': 'exterior',
        'target_hex': _chipHex ?? _hexFromColor(_chipColor ?? Colors.grey),
        'selected_wrap': _selectedWrap?.name ?? '',
        'wrap_mode': _wrapMode.name,
      });
    });

    try {
      final basePromptText = _promptController.text.trim().isEmpty
          ? (_selectedWrap?.aiPrompt ?? '')
          : _promptController.text.trim();
      final promptText = _buildRenderPrompt(basePromptText);
      final selectedParts = _selectedPartsForRequest();

      final imageBytes = await _vehicleImage!.readAsBytes();
      
      // 제미나이가 인식하기 좋은 상세 랩핑 설명 생성
      final colorHex = _chipHex ?? _hexFromColor(_chipColor ?? Colors.grey);
      final wrapDescription = 'Premium ${_finishPrompt.toLowerCase()} vinyl wrap in exact hex color $colorHex';

      final wrapColor = WrapColor(
        id: _selectedWrap?.id ?? 'custom-ai-wrap',
        name: _selectedWrap?.name ?? wrapDescription,
        brand: _selectedWrap?.brand ?? 'AI Studio',
        finish: _finishPrompt,
        swatch: _chipColor ?? _selectedWrap?.swatch ?? Colors.grey,
        texturePreview: _selectedWrap?.texturePreview ?? 'smooth',
        pricePerSquareMeter: _selectedWrap?.pricePerSquareMeter ?? 50000,
        referenceAssetPath: _selectedWrap?.referenceAssetPath,
      );

      // 마스크 데이터와 함께 랩핑 요청 (제미나이에게 정확한 가이드 제공)
      // Default path: deterministic recolour on the backend. Only masked pixels change colour; shape, glass,
      // wheels and background stay identical. The OpenAI path below runs only when this is unavailable.
      Uint8List? recolorMask = _maskBytes;
      if (_useDeterministicRecolor && recolorMask == null) {
        // Backend mode: the app skips segmentation on pick, so fetch the mask only for this path.
        try {
          recolorMask = (await _fullWrapService.segmentVehicle(imageBytes, point: _tapPoint)).mask;
        } catch (_) {}
      }
      if (_useDeterministicRecolor && recolorMask != null && recolorMask.isNotEmpty) {
        try {
          final recoloredBytes = await _fullWrapService.recolorVehicle(
            imageBytes: imageBytes,
            maskBytes: recolorMask,
            hex: _hexFromColor(wrapColor.swatch),
            finish: _finishPrompt,
          );
          final resultFile = await _writePreviewTempFile(recoloredBytes);
          if (!mounted) return;
          setState(() {
            _preview = AiPreviewResult(
              generatedImage: resultFile,
              primary: wrapColor.swatch,
              secondary: wrapColor.swatch,
              caption: 'AI Wrap Result',
              generationMethod: 'Deterministic recolor',
            );
            _generating = false;
          });
          state.recordAiWrapUsed();
          _recordGarageWrapHistory(state);
          messenger.showSnackBar(SnackBar(content: Text(successMessage)));
          return;
        } catch (e) {
          debugPrint('[Visualizer] Recolor unavailable, using OpenAI path: $e');
        }
      }

      // iOS-parity pipeline: SAM mask + photo -> OpenAI router -> applied check -> mask composite.
      // Any failure falls through to the layered render fallback below (proxy -> wrap-api).
      Uint8List? aiBytes;
      // Stage timing for measurement: the OpenAI call only (the mask was prepared before this step).
      final maskCached = _maskBytes != null;
      int openaiMs = 0;
      final openaiStart = DateTime.now();
      try {
        final candidate = await _aiViewerService.generateOpenAiMaskedWrap(
          vehicleImage: _vehicleImage!,
          chipColor: _chipColor ?? _selectedWrap?.swatch ?? Colors.grey,
          prompt: promptText.isEmpty ? null : promptText,
          selectedParts: selectedParts,
          finish: _finishPrompt,
          sku: _selectedWrap?.displayCode,
          brand: _selectedWrap?.brand,
          productName: _selectedWrap?.name,
          mask: _maskBytes,
        );
        openaiMs = DateTime.now().difference(openaiStart).inMilliseconds;
        // Backend pipeline: the server already restored the original outside the car body, so the result is
        // used as is (no second masking here, which could erase the colour when the app-side mask is weak).
        if (Config.useBackendWrap || _maskBytes == null || _wrapVisiblyApplied(imageBytes, candidate, _maskBytes!)) {
          aiBytes = candidate;
        } else {
          debugPrint('[Visualizer] OpenAI result shows no color change in the mask; using fallback render');
        }
      } catch (e) {
        debugPrint('[Visualizer] OpenAI router failed; using fallback render: $e');
      }
      if (aiBytes != null) {
        final mergedBytes = Config.useBackendWrap
            ? aiBytes
            : await _mergePreviewWithOriginalBackground(aiBytes);
        final resultFile = await _writePreviewTempFile(mergedBytes);
        if (!mounted) return;
        setState(() {
          _preview = AiPreviewResult(
            generatedImage: resultFile,
            primary: wrapColor.swatch,
            secondary: wrapColor.swatch,
            caption: 'AI Wrap Result',
            generationMethod: 'OpenAI router (mask)',
          );
          _generating = false;
        });
        state.recordAiWrapUsed();
        _recordGarageWrapHistory(state);
        WrapEvents.log('wrap_completed', props: {
          'target_hex': _chipHex ?? _hexFromColor(_chipColor ?? Colors.grey),
          'duration_ms': DateTime.now().difference(_wrapStartedAt ?? DateTime.now()).inMilliseconds,
          'openai_ms': openaiMs,
          'mask_cached': maskCached,
          'route': 'openai_padded',
        });
        messenger.showSnackBar(SnackBar(content: Text(successMessage)));
        return;
      }

      // OpenAI router only: no Gemini-based render fallback. A failed generation is reported to the user.
      throw StateError('OpenAI 라우터에서 결과를 받지 못했습니다. 다시 시도해 주세요.');
    } catch (e) {
      WrapEvents.log('wrap_failed', props: {'duration_ms': DateTime.now().difference(_wrapStartedAt ?? DateTime.now()).inMilliseconds, 'error': '$e'});
      setState(() => _generating = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text('$failurePrefix$e'),
        ),
      );
    }
  }

  Future<File> _writePreviewTempFile(Uint8List bytes) async {
    final tempDir = await getTemporaryDirectory();
    final tempPath = p.join(
      tempDir.path,
      'wrap_result_${DateTime.now().millisecondsSinceEpoch}.png',
    );
    final resultFile = File(tempPath);
    await resultFile.writeAsBytes(bytes, flush: true);
    return resultFile;
  }

  /// iOS parity: mean RGB difference inside the mask (64x64 samples). Small difference = color not applied.
  bool _wrapVisiblyApplied(Uint8List original, Uint8List generated, Uint8List mask) {
    const side = 64;
    final o = img.decodeImage(original);
    final g = img.decodeImage(generated);
    final m = img.decodeImage(mask);
    if (o == null || g == null || m == null) return true;
    final os = img.copyResize(o, width: side, height: side);
    final gs = img.copyResize(g, width: side, height: side);
    final ms = img.copyResize(m, width: side, height: side, interpolation: img.Interpolation.nearest);
    double total = 0;
    var count = 0;
    for (var y = 0; y < side; y++) {
      for (var x = 0; x < side; x++) {
        if (img.getLuminance(ms.getPixel(x, y)) < 128) continue;
        final a = os.getPixel(x, y);
        final b = gs.getPixel(x, y);
        total += (a.r - b.r).abs().toDouble() + (a.g - b.g).abs().toDouble() + (a.b - b.b).abs().toDouble();
        count++;
      }
    }
    if (count == 0) return true;
    return total / (count * 3) >= 6.0;
  }

  Future<Uint8List> _mergePreviewWithOriginalBackground(Uint8List generatedBytes) async {
    if (_vehicleImage == null || _maskBytes == null || _maskBytes!.isEmpty) {
      return generatedBytes;
    }

    try {
      final originalBytes = await _vehicleImage!.readAsBytes();
      final original = img.decodeImage(originalBytes);
      final generated = img.decodeImage(generatedBytes);
      final mask = img.decodeImage(_maskBytes!);
      if (original == null || generated == null || mask == null) {
        return generatedBytes;
      }

      final sizedGenerated = _fitImageToCanvas(
        generated,
        canvasWidth: original.width,
        canvasHeight: original.height,
        interpolation: img.Interpolation.cubic,
      );

      final sizedMask = _fitImageToCanvas(
        mask,
        canvasWidth: original.width,
        canvasHeight: original.height,
        interpolation: img.Interpolation.nearest,
      );

      // A hard mask edge pastes the model's regenerated background (which never matches the
      // original pixel-for-pixel) as a seam along the body outline. Blur the mask and only let
      // the solid interior take generated pixels, so the boundary falls back to the original.
      final alphaMap = img.Image(width: original.width, height: original.height);
      for (var y = 0; y < original.height; y++) {
        for (var x = 0; x < original.width; x++) {
          if (!sizedMask.contains(x, y)) continue;
          final coverage = img.getLuminance(sizedMask.sample(x, y));
          alphaMap.setPixelRgb(x, y, coverage, coverage, coverage);
        }
      }
      final softMask = img.gaussianBlur(alphaMap, radius: 4);

      final output = img.Image.from(original);
      for (var y = 0; y < original.height; y++) {
        for (var x = 0; x < original.width; x++) {
          if (!sizedGenerated.contains(x, y)) {
            continue;
          }
          final edge = (softMask.getPixel(x, y).r / 255.0).clamp(0.0, 1.0);
          final alpha = ((edge - 0.3) / 0.6).clamp(0.0, 1.0);
          if (alpha == 0.0) continue;

          final src = sizedGenerated.sample(x, y);
          final dst = output.getPixel(x, y);
          final blended = img.ColorRgb8(
            _blendChannel(src.r.toInt(), dst.r.toInt(), alpha),
            _blendChannel(src.g.toInt(), dst.g.toInt(), alpha),
            _blendChannel(src.b.toInt(), dst.b.toInt(), alpha),
          );
          output.setPixel(x, y, blended);
        }
      }

      return Uint8List.fromList(img.encodePng(output));
    } catch (e) {
      debugPrint('[Visualizer] Failed to preserve original background: $e');
      return generatedBytes;
    }
  }

  void _recordGarageWrapHistory(AppState state) {
    final vehicleId = _activeGarageVehicleId;
    if (vehicleId == null || vehicleId.isEmpty) return;
    final history = GarageWrapHistoryEntry(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      wrapName: _selectedWrap?.displayNameWithCode ?? _fallbackSavedFilmName(),
      filmBrand: _selectedWrap?.brand ?? 'AI Studio',
      filmProduct: _selectedWrap?.name ?? _fallbackSavedFilmName(),
      finishType: _finishPrompt,
      hexCode: _chipHex ?? _selectedWrap?.hexCode ?? _hexFromColor(_chipColor ?? Colors.grey),
      createdAt: DateTime.now(),
    );
    state.addVehicleWrapHistory(vehicleId, history);
  }

  int _blendChannel(int source, int destination, double alpha) {
    return ((source * alpha) + (destination * (1 - alpha)))
        .round()
        .clamp(0, 255);
  }

  Future<void> _savePreviewToGallery() async {
    final l10n = L10n.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final previewFile = _preview?.generatedImage;
    if (previewFile == null || !await previewFile.exists()) {
      messenger.showSnackBar(SnackBar(content: Text(l10n.noImageToSaveMsg)));
      return;
    }

    try {
      final bytes = await previewFile.readAsBytes();
      final composedBytes = await _composeWatermarkedPreview(bytes);
      final fileName = 'rekora_wrap_${DateTime.now().millisecondsSinceEpoch}';
      final result = await ImageGallerySaver.saveImage(
        composedBytes,
        quality: 100,
        name: fileName,
      );
      final isSuccess = result is Map ? result['isSuccess'] == true : result == true;
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(
          content: Text(isSuccess ? l10n.savedToGalleryMsg : l10n.saveFailedMsg),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(l10n.saveFailedMsg)));
    }
  }

  Future<Uint8List> _composeWatermarkedPreview(Uint8List imageBytes) async {
    final codec = await ui.instantiateImageCodec(imageBytes);
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final size = Size(image.width.toDouble(), image.height.toDouble());

    canvas.drawImage(image, Offset.zero, Paint());

    final overlayHeight = size.height * 0.14;
    final overlayTop = size.height - overlayHeight;
    canvas.drawRect(
      Rect.fromLTWH(0, overlayTop, size.width, overlayHeight),
      Paint()..color = Colors.black.withValues(alpha: 0.54),
    );

    final selectedCode = _selectedWrap?.displayCode;
    final filmName =
        _selectedWrap?.displayNameWithCode ?? _fallbackSavedFilmName();
    final filmDetailParts = <String>[];
    if (selectedCode?.trim().isNotEmpty == true) {
      filmDetailParts.add(selectedCode!.trim());
    }
    filmDetailParts.add(_finishPrompt.toUpperCase());
    final chipHex = _chipHex ?? _selectedWrap?.hexCode ?? '';
    if (chipHex.trim().isNotEmpty) {
      filmDetailParts.add(chipHex.trim());
    }
    final filmDetail = filmDetailParts.join('  ');
    final copyright = '© 2026 REKORA / LARS Inc.';
    final horizontalPadding = size.width * 0.045;

    final titlePainter = TextPainter(
      text: TextSpan(
        text: filmName,
        style: TextStyle(
          color: Colors.white,
          fontSize: size.width * 0.04,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: size.width - horizontalPadding * 2);
    titlePainter.paint(canvas, Offset(horizontalPadding, overlayTop + overlayHeight * 0.18));

    final detailPainter = TextPainter(
      text: TextSpan(
        text: filmDetail,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.88),
          fontSize: size.width * 0.024,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: size.width - horizontalPadding * 2);
    detailPainter.paint(canvas, Offset(horizontalPadding, overlayTop + overlayHeight * 0.58));

    final copyrightPainter = TextPainter(
      text: TextSpan(
        text: copyright,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.82),
          fontSize: size.width * 0.02,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: size.width - horizontalPadding * 2);
    copyrightPainter.paint(
      canvas,
      Offset(
        size.width - horizontalPadding - copyrightPainter.width,
        overlayTop + overlayHeight * 0.62,
      ),
    );

    final rendered = await recorder.endRecording().toImage(image.width, image.height);
    final byteData = await rendered.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) {
      throw StateError('Failed to encode saved preview image.');
    }
    return byteData.buffer.asUint8List();
  }

  String _fallbackSavedFilmName() {
    final prompt = _promptController.text.trim();
    if (prompt.isNotEmpty) {
      return prompt.length > 48 ? '${prompt.substring(0, 48)}…' : prompt;
    }
    if (_chipHex != null) {
      return 'Custom Wrap $_chipHex';
    }
    return 'REKORA AI Wrap';
  }

  void _handleZoomAction(BuildContext context, bool hasImage) {
    if (!hasImage) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(L10n.of(context).vehicleSelectFirstMsg)),
      );
      return;
    }
    final currentScale = _canvasTransformController.value.getMaxScaleOnAxis();
    final nextScale = currentScale < 1.4 ? 1.8 : 1.0;
    final matrix = Matrix4.diagonal3Values(nextScale, nextScale, 1);
    setState(() {
      _canvasTransformController.value = matrix;
    });
  }

  Future<void> _showEnvironmentSheet(BuildContext context) async {
    final l10n = L10n.of(context);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return SafeArea(
              child: FractionallySizedBox(
                heightFactor: 0.82,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.tx('환경 설정', 'Environment Presets'),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 18),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.tx('날씨', 'Weather'),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: _WeatherPreset.values.map((preset) {
                                  final selected = preset == _weatherPreset;
                                  return ChoiceChip(
                                    label: Text(_weatherLabel(l10n, preset)),
                                    selected: selected,
                                    onSelected: (_) {
                                      setSheetState(() => _weatherPreset = preset);
                                      setState(() => _weatherPreset = preset);
                                    },
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 18),
                              Text(
                                l10n.tx('시간대', 'Time of Day'),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: _TimeOfDayPreset.values.map((preset) {
                                  final selected = preset == _timeOfDayPreset;
                                  return ChoiceChip(
                                    label: Text(_timeOfDayLabel(l10n, preset)),
                                    selected: selected,
                                    onSelected: (_) {
                                      setSheetState(() => _timeOfDayPreset = preset);
                                      setState(() => _timeOfDayPreset = preset);
                                    },
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 18),
                              Text(
                                l10n.tx('배경', 'Backdrop'),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: _BackgroundPreset.values.map((preset) {
                                  final selected = preset == _backgroundPreset;
                                  return ChoiceChip(
                                    label: Text(_backgroundLabel(l10n, preset)),
                                    selected: selected,
                                    onSelected: (_) {
                                      setSheetState(() => _backgroundPreset = preset);
                                      setState(() => _backgroundPreset = preset);
                                    },
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(sheetContext).pop(),
                          child: Text(l10n.tx('적용', 'Apply')),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _weatherLabel(L10n l10n, _WeatherPreset preset) {
    switch (preset) {
      case _WeatherPreset.clear:
        return l10n.tx('맑음', 'Clear');
      case _WeatherPreset.cloudy:
        return l10n.tx('흐림', 'Cloudy');
      case _WeatherPreset.rainy:
        return l10n.tx('비', 'Rain');
    }
  }

  String _timeOfDayLabel(L10n l10n, _TimeOfDayPreset preset) {
    switch (preset) {
      case _TimeOfDayPreset.day:
        return l10n.tx('낮', 'Day');
      case _TimeOfDayPreset.night:
        return l10n.tx('밤', 'Night');
      case _TimeOfDayPreset.dawn:
        return l10n.tx('새벽', 'Dawn');
    }
  }

  String _buildRenderPrompt(String basePromptText) {
    final preserveBackground = _backgroundPreset == _BackgroundPreset.original;
    final weatherInstruction = switch (_weatherPreset) {
      _WeatherPreset.clear => 'Keep a clear weather look with crisp reflections and a clean sky tone.',
      _WeatherPreset.cloudy => preserveBackground
          ? 'Preserve the original background while making the lighting feel overcast and softly diffused.'
          : 'Make the selected scene feel overcast with softly diffused lighting.',
      _WeatherPreset.rainy => preserveBackground
          ? 'Preserve the original background while making the scene feel rainy with darker wet reflections on the vehicle only.'
          : 'Make the selected scene feel rainy with wet-surface reflections and moody lighting.',
    };
    final timeInstruction = switch (_timeOfDayPreset) {
      _TimeOfDayPreset.day => 'Use bright daytime illumination.',
      _TimeOfDayPreset.night => 'Use nighttime lighting with subdued ambient light and stronger artificial highlights.',
      _TimeOfDayPreset.dawn => 'Use dawn lighting with cool early-morning ambient tones.',
    };
    final backgroundInstruction = switch (_backgroundPreset) {
      _BackgroundPreset.original => 'Keep the same camera angle and preserve the original background composition.',
      _BackgroundPreset.seoul => 'Change the background to a photorealistic Seoul city scene with premium urban street atmosphere while keeping the same vehicle angle and scale.',
      _BackgroundPreset.tokyo => 'Change the background to a photorealistic Tokyo night street with clean neon reflections and dense city detail while keeping the same vehicle angle and scale.',
      _BackgroundPreset.paris => 'Change the background to a photorealistic Paris avenue scene with refined architecture while keeping the same vehicle angle and scale.',
      _BackgroundPreset.london => 'Change the background to a photorealistic London city backdrop with classic streetscape while keeping the same vehicle angle and scale.',
      _BackgroundPreset.newYork => 'Change the background to a photorealistic New York street scene with modern metropolitan energy while keeping the same vehicle angle and scale.',
      _BackgroundPreset.losAngeles => 'Change the background to a photorealistic Los Angeles boulevard with palm-lined luxury atmosphere while keeping the same vehicle angle and scale.',
      _BackgroundPreset.dubai => 'Change the background to a photorealistic Dubai skyline and luxury district backdrop while keeping the same vehicle angle and scale.',
      _BackgroundPreset.monaco => 'Change the background to a photorealistic Monaco harbor or grand prix street setting while keeping the same vehicle angle and scale.',
      _BackgroundPreset.santorini => 'Change the background to a photorealistic Santorini coastal backdrop with white architecture and sea view while keeping the same vehicle angle and scale.',
      _BackgroundPreset.swissAlps => 'Change the background to a photorealistic Swiss Alps mountain road backdrop while keeping the same vehicle angle and scale.',
      _BackgroundPreset.rome => 'Change the background to a photorealistic Rome historic city street backdrop while keeping the same vehicle angle and scale.',
      _BackgroundPreset.singapore => 'Change the background to a photorealistic Singapore luxury downtown backdrop while keeping the same vehicle angle and scale.',
    };
    final sceneChangeMarker = _backgroundPreset == _BackgroundPreset.original
        ? null
        : '[SCENE_CHANGE]';

    final wrapModeInstruction = _buildWrapModeInstruction();
    final chromeInstruction = _includeChromeDelete
        ? 'Include chrome delete on the trim and window moldings as part of the wrap concept.'
        : 'Keep chrome trim unchanged unless the selected wrap strategy explicitly includes it.';
    final parts = <String>[];
    if (sceneChangeMarker?.trim().isNotEmpty == true) {
      parts.add(sceneChangeMarker!.trim());
    }
    if (basePromptText.trim().isNotEmpty) {
      parts.add(basePromptText.trim());
    }
    parts.add(wrapModeInstruction);
    parts.add(chromeInstruction);
    parts.add(weatherInstruction);
    parts.add(timeInstruction);
    parts.add(backgroundInstruction);
    return parts.join(' ');
  }

  LightScenario _mapScenarioFromEnvironment() {
    if (_weatherPreset == _WeatherPreset.rainy || _timeOfDayPreset == _TimeOfDayPreset.night) {
      return LightScenario.tunnel;
    }
    if (_weatherPreset == _WeatherPreset.cloudy || _timeOfDayPreset == _TimeOfDayPreset.dawn) {
      return LightScenario.showroom;
    }
    return LightScenario.outdoor;
  }

  String _backgroundLabel(L10n l10n, _BackgroundPreset preset) {
    switch (preset) {
      case _BackgroundPreset.original:
        return l10n.tx('원본 유지', 'Original');
      case _BackgroundPreset.seoul:
        return 'Seoul';
      case _BackgroundPreset.tokyo:
        return 'Tokyo';
      case _BackgroundPreset.paris:
        return 'Paris';
      case _BackgroundPreset.london:
        return 'London';
      case _BackgroundPreset.newYork:
        return 'New York';
      case _BackgroundPreset.losAngeles:
        return 'Los Angeles';
      case _BackgroundPreset.dubai:
        return 'Dubai';
      case _BackgroundPreset.monaco:
        return 'Monaco';
      case _BackgroundPreset.santorini:
        return 'Santorini';
      case _BackgroundPreset.swissAlps:
        return 'Swiss Alps';
      case _BackgroundPreset.rome:
        return 'Rome';
      case _BackgroundPreset.singapore:
        return 'Singapore';
    }
  }

  bool get _shouldPreserveOriginalBackground =>
      _backgroundPreset == _BackgroundPreset.original;

  Future<void> _showAnglePresetSheet(BuildContext context, bool hasImage) async {
    if (!hasImage) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(L10n.of(context).vehicleSelectFirstMsg)),
      );
      return;
    }
    final l10n = L10n.of(context);
    final preset = await showModalBottomSheet<_AnglePreset>(
      context: context,
      backgroundColor: WrapTheme.card(context),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.tx('시점 프리셋', 'Angle Presets'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _AnglePreset.values.map((preset) {
                    final selected = preset == _anglePreset;
                    return ChoiceChip(
                      label: Text(_anglePresetLabel(l10n, preset)),
                      selected: selected,
                      onSelected: (_) => Navigator.of(sheetContext).pop(preset),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (preset == null || !mounted) return;
    setState(() {
      _anglePreset = preset;
      _canvasTransformController.value = Matrix4.diagonal3Values(
        preset.scale,
        preset.scale,
        1,
      );
    });
  }

  String _anglePresetLabel(L10n l10n, _AnglePreset preset) {
    switch (preset) {
      case _AnglePreset.front:
        return l10n.tx('기본 정면', 'Default');
      case _AnglePreset.leftThreeQuarter:
        return l10n.tx('좌측 3/4', 'Left 3/4');
      case _AnglePreset.rightThreeQuarter:
        return l10n.tx('우측 3/4', 'Right 3/4');
      case _AnglePreset.detail:
        return l10n.tx('디테일 확대', 'Detail Zoom');
    }
  }

  /// Tap on the car to pick it. The tap is mapped from the screen onto the photo, then the mask is redone for that car.
  Future<void> _onCanvasTap(Offset local) async {
    final imageSize = _vehicleImageSize;
    final box = _canvasImageKey.currentContext?.findRenderObject() as RenderBox?;
    final file = _vehicleImage;
    if (imageSize == null || box == null || file == null || _segmenting || _generating) return;
    if (!_canvasTransformController.value.isIdentity() || _anglePreset != _AnglePreset.front) return;
    final size = box.size;
    final scale = min(size.width / imageSize.width, size.height / imageSize.height);
    final drawnW = imageSize.width * scale;
    final drawnH = imageSize.height * scale;
    final offsetX = (size.width - drawnW) / 2;
    final offsetY = (size.height - drawnH) / 2;
    final nx = (local.dx - offsetX) / drawnW;
    final ny = (local.dy - offsetY) / drawnH;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    setState(() {
      _tapPoint = [nx, ny];
      _segmenting = true;
      _preview = null;
      _maskBytes = null;
    });
    try {
      final bytes = await file.readAsBytes();
      final result = await _fullWrapService.segmentVehicle(bytes, point: [nx, ny]);
      if (!mounted) return;
      setState(() {
        _maskBytes = result.mask;
        _segmenting = false;
      });
    } catch (_) {
      if (mounted) setState(() => _segmenting = false);
    }
  }

  Future<void> _setVehicleImage(File file) async {
    setState(() {
      _vehicleImage = file;
      _preview = null;
      _maskBytes = null;
      _tapPoint = null;
      _segmenting = true;
      _anglePreset = _AnglePreset.front;
      _canvasTransformController.value = Matrix4.identity();
    });

    if (Config.useBackendWrap) {
      // The server makes the vehicle mask once during the wrap (SAM), so the app does not segment here.
      if (mounted) setState(() => _segmenting = false);
      return;
    }

    try {
      final bytes = await file.readAsBytes();
      try {
        final codec = await ui.instantiateImageCodec(bytes);
        final frame = await codec.getNextFrame();
        _vehicleImageSize = Size(frame.image.width.toDouble(), frame.image.height.toDouble());
      } catch (_) {}
      final result = await _fullWrapService.segmentVehicle(bytes);
      if (!mounted) return;
      setState(() {
        _maskBytes = result.mask;
        _segmenting = false;
      });
    } catch (e) {
      debugPrint('Masking failed: $e');
      if (!mounted) return;
      setState(() {
        _segmenting = false;
        _maskBytes = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            L10n.of(context).tx(
              '차량을 자동으로 분리하지 못했습니다. 사진이 더 선명하면 정확도가 올라가지만, 랩핑은 계속 진행할 수 있습니다.',
              'Could not auto-segment the vehicle. A clearer photo improves accuracy, but you can still continue with wrapping.',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _hydrateIncomingState() async {
    final state = AppStateScope.of(context);
    final pendingWrap = state.consumePendingWrap();
    final garageLaunch = state.consumePendingGarageWrapLaunch();
    final currentVehicleImage = state.currentVehicleImage;

    if (pendingWrap != null && mounted) {
      setState(() {
        _selectedWrap = pendingWrap;
        _chipColor = pendingWrap.swatch;
        _chipHex = _hexFromColor(pendingWrap.swatch);
        _finish = _normalizeFinish(pendingWrap.finish);
        _finishPrompt = _resolveFinishPrompt(pendingWrap.finish);
        _promptController.text = pendingWrap.designHubPrompt;
        _expanded.add("color");
        _expanded.add("advanced");
      });
    }

    if (garageLaunch != null && mounted) {
      final launchColor = _parseHexColor(garageLaunch.baseColorHex);
      setState(() {
        _activeGarageVehicleId = garageLaunch.vehicleId;
        _selectedWrap = null;
        if (launchColor != null) {
          _chipColor = launchColor;
          _chipHex = _hexFromColor(launchColor);
        }
        if ((garageLaunch.finishTypeRaw ?? '').trim().isNotEmpty) {
          _finish = _normalizeFinish(garageLaunch.finishTypeRaw!);
          _finishPrompt = _resolveFinishPrompt(garageLaunch.finishTypeRaw!);
        }
        if (garageLaunch.promptText.trim().isNotEmpty) {
          _promptController.text = garageLaunch.promptText.trim();
        }
        _expanded.add("color");
        _expanded.add("advanced");
        _expanded.add("ai");
      });
    }

    final forceAssistantPhoto = state.assistantPhotoPending;
    state.assistantPhotoPending = false;
    if (currentVehicleImage != null && (_vehicleImage == null || forceAssistantPhoto)) {
      await _setVehicleImage(currentVehicleImage);
    } else {
      final launchImagePath = garageLaunch?.vehicleImagePath;
      if (launchImagePath != null && _vehicleImage == null) {
        await _setVehicleImage(File(launchImagePath));
      }
    }
  }

  void _scheduleIncomingStateSync() {
    if (_incomingStateSyncScheduled) return;
    final state = AppStateScope.of(context);
    if (state.pendingWrap == null &&
        state.pendingGarageWrapLaunch == null &&
        state.currentVehicleImage == null &&
        !state.assistantPhotoPending) {
      return;
    }

    _incomingStateSyncScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _incomingStateSyncScheduled = false;
      if (!mounted) return;
      await _hydrateIncomingState();
    });
  }

  String _hexFromColor(Color color) {
    return '#${color.toARGB32().toRadixString(16).substring(2).toUpperCase()}';
  }

  _CanvasFitResult _fitImageToCanvas(
    img.Image source, {
    required int canvasWidth,
    required int canvasHeight,
    required img.Interpolation interpolation,
  }) {
    if (source.width == canvasWidth && source.height == canvasHeight) {
      return _CanvasFitResult(
        image: source,
        offsetX: 0,
        offsetY: 0,
        width: source.width,
        height: source.height,
      );
    }

    final scale = min(
      canvasWidth / max(1, source.width),
      canvasHeight / max(1, source.height),
    );
    final targetWidth = max(1, (source.width * scale).round());
    final targetHeight = max(1, (source.height * scale).round());
    final resized = img.copyResize(
      source,
      width: targetWidth,
      height: targetHeight,
      interpolation: interpolation,
    );
    final offsetX = ((canvasWidth - targetWidth) / 2).round();
    final offsetY = ((canvasHeight - targetHeight) / 2).round();
    return _CanvasFitResult(
      image: resized,
      offsetX: offsetX,
      offsetY: offsetY,
      width: targetWidth,
      height: targetHeight,
    );
  }

  Future<void> _showHexInputSheet({_HexInputTarget target = _HexInputTarget.primary}) async {
    final currentHex = target == _HexInputTarget.primary ? _chipHex : _secondaryChipHex;
    final controller = TextEditingController(text: currentHex ?? '');
    final value = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Wrap Color Hex',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  hintText: '#6E7074',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
                  child: Text(L10n.of(ctx).tx('적용', 'Apply')),
                ),
              ),
            ],
          ),
        );
      },
    );

    controller.dispose();
    if (value == null || value.isEmpty) return;

    final color = _parseHexColor(value);
    if (color == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            L10n.of(context).tx(
              '올바른 Hex 형식이 아닙니다. 예: #6E7074',
              'Invalid hex format. Example: #6E7074',
            ),
          ),
        ),
      );
      return;
    }

    setState(() {
      if (target == _HexInputTarget.primary) {
        _selectedWrap = null;
        _chipColor = color;
        _chipHex = _hexFromColor(color);
      } else {
        _secondaryChipColor = color;
        _secondaryChipHex = _hexFromColor(color);
      }
      _expanded.add("color");
      _expanded.add("advanced");
    });
  }

  Color? _parseHexColor(String? value) {
    if (value == null) return null;
    final normalized = value.trim().replaceFirst('#', '');
    if (normalized.length != 6 && normalized.length != 8) return null;
    final hex = normalized.length == 6 ? 'FF$normalized' : normalized;
    final parsed = int.tryParse(hex, radix: 16);
    if (parsed == null) return null;
    return Color(parsed);
  }

  String _normalizeFinish(String raw) {
    final value = raw.trim().toLowerCase();
    if (value.isEmpty) return 'Satin';
    if (value.contains('carbon') || value.contains('forged') || value.contains('texture')) {
      return 'Carbon';
    }
    if (value.contains('chrome') || value.contains('metallic') || value.contains('metal')) {
      if (value.contains('satin')) return 'Satin';
      if (value.contains('matte')) return 'Matte';
      return 'Metallic';
    }
    if (value.contains('gloss')) return 'Gloss';
    if (value.contains('matte')) return 'Matte';
    if (value.contains('satin')) return 'Satin';
    return 'Satin';
  }

  String _resolveFinishPrompt(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return _normalizeFinish(raw);
    return trimmed;
  }

  Set<String> _selectedPartsForRequest() {
    switch (_wrapMode) {
      case _WrapApplicationMode.fullBody:
      case _WrapApplicationMode.twoTone:
      case _WrapApplicationMode.preserveExistingAccent:
        return {'전체 랩핑'};
      case _WrapApplicationMode.accentOnly:
        return {..._accentPanels};
    }
  }

  List<String>? _selectedScopesForFallback() {
    if (_wrapMode == _WrapApplicationMode.accentOnly) {
      return _accentPanels.toList();
    }
    return null;
  }

  String _buildWrapModeInstruction() {
    final primaryHex = _chipHex ?? _selectedWrap?.hexCode ?? '#808080';
    final primaryName = _selectedWrap?.displayName ?? 'primary wrap film';
    final primaryFinish = _finishPrompt.isEmpty ? _finish : _finishPrompt;
    final accentList = _accentPanels.map((p) => _panelPromptLabel(p)).join(', ');
    switch (_wrapMode) {
      case _WrapApplicationMode.fullBody:
        return 'Apply a full-body wrap using $primaryName in $primaryFinish finish with exact target color $primaryHex on all painted body panels.';
      case _WrapApplicationMode.twoTone:
        final secondaryHex = _secondaryChipHex ?? '#FFFFFF';
        final secondaryFinish = _secondaryFinishPrompt.isEmpty ? _secondaryFinish : _secondaryFinishPrompt;
        return 'Create a premium two-tone wrap. Use the primary film $primaryName in $primaryFinish finish with exact target color $primaryHex on the main body. '
            'Use a secondary wrap film in $secondaryFinish finish with exact target color $secondaryHex only on these accent panels: $accentList. '
            'The separation between primary and secondary areas must be clean, intentional, and OEM-like.';
      case _WrapApplicationMode.accentOnly:
        return 'Apply a point-wrap only. Keep the rest of the vehicle unchanged and apply the selected wrap film $primaryName in $primaryFinish finish with exact target color $primaryHex only on these panels: $accentList.';
      case _WrapApplicationMode.preserveExistingAccent:
        return 'Apply the new wrap film $primaryName in $primaryFinish finish with exact target color $primaryHex across the main painted body panels, '
            'but preserve all existing stripes, decals, racing graphics, and existing accent wrap sections exactly as they already appear.';
    }
  }

  String _wrapModeLabel(L10n l10n, _WrapApplicationMode mode) {
    switch (mode) {
      case _WrapApplicationMode.fullBody:
        return l10n.tx('전체 랩핑', 'Full Wrap');
      case _WrapApplicationMode.twoTone:
        return l10n.tx('투톤 랩핑', 'Two-Tone');
      case _WrapApplicationMode.accentOnly:
        return l10n.tx('포인트 랩핑', 'Accent Wrap');
      case _WrapApplicationMode.preserveExistingAccent:
        return l10n.tx('기존 포인트 유지', 'Keep Existing Accents');
    }
  }

  String _wrapModeDescription(L10n l10n, _WrapApplicationMode mode) {
    switch (mode) {
      case _WrapApplicationMode.fullBody:
        return l10n.tx('차량의 모든 도장 패널에 하나의 랩 필름을 적용합니다.', 'Apply one wrap film to all painted body panels.');
      case _WrapApplicationMode.twoTone:
        return l10n.tx('메인 바디와 선택한 패널에 서로 다른 두 개의 랩 필름을 적용합니다.', 'Use one main wrap film and a second film on selected accent panels.');
      case _WrapApplicationMode.accentOnly:
        return l10n.tx('루프, 미러, 후드 같은 특정 부위에만 포인트 랩핑을 적용합니다.', 'Apply the wrap only to selected accent panels such as roof, mirrors, or hood.');
      case _WrapApplicationMode.preserveExistingAccent:
        return l10n.tx('기존 그래픽과 포인트 랩핑은 유지하고, 나머지 바디만 새로 랩핑합니다.', 'Keep existing accent graphics intact and wrap only the remaining body panels.');
    }
  }

  String _panelLabel(L10n l10n, String panel) {
    switch (panel) {
      case 'roof':
        return l10n.tx('루프', 'Roof');
      case 'mirrors':
        return l10n.tx('사이드미러', 'Mirrors');
      case 'hood':
        return l10n.tx('후드', 'Hood');
      case 'trunk':
        return l10n.tx('트렁크', 'Trunk');
      case 'side_skirts':
        return l10n.tx('사이드스커트', 'Side Skirts');
      case 'front_bumper':
        return l10n.tx('프론트 범퍼', 'Front Bumper');
      case 'rear_bumper':
        return l10n.tx('리어 범퍼', 'Rear Bumper');
      default:
        return panel;
    }
  }

  String _panelPromptLabel(String panel) {
    switch (panel) {
      case 'side_skirts':
        return 'side skirts';
      case 'front_bumper':
        return 'front bumper';
      case 'rear_bumper':
        return 'rear bumper';
      default:
        return panel;
    }
  }
}

class _CanvasFitResult {
  const _CanvasFitResult({
    required this.image,
    required this.offsetX,
    required this.offsetY,
    required this.width,
    required this.height,
  });

  final img.Image image;
  final int offsetX;
  final int offsetY;
  final int width;
  final int height;

  bool contains(int x, int y) {
    final sx = x - offsetX;
    final sy = y - offsetY;
    return sx >= 0 && sy >= 0 && sx < width && sy < height;
  }

  img.Pixel sample(int x, int y) {
    final sx = x - offsetX;
    final sy = y - offsetY;
    return image.getPixel(sx, sy);
  }
}

const List<String> _availableAccentPanels = <String>[
  'roof',
  'mirrors',
  'hood',
  'trunk',
  'side_skirts',
  'front_bumper',
  'rear_bumper',
];

enum _WrapApplicationMode {
  fullBody,
  twoTone,
  accentOnly,
  preserveExistingAccent,
}

enum _HexInputTarget { primary, secondary }

class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double radius;
  final double strokeWidth;
  _DashedBorderPainter({required this.color, required this.radius, this.strokeWidth = 1});
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..strokeWidth = strokeWidth..style = PaintingStyle.stroke;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, size.width, size.height), Radius.circular(radius)));
    for (final pm in path.computeMetrics()) {
      double d = 0.0;
      while (d < pm.length) {
        canvas.drawPath(pm.extractPath(d, d + 8), paint);
        d += 14;
      }
    }
  }
  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
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

class _ModernStudioLoader extends StatelessWidget {
  final String status;
  const _ModernStudioLoader({this.status = ''});
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.black.withValues(alpha: 0.8),
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: Colors.white, strokeWidth: 4),
          const SizedBox(height: 24),
          Text(status, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    ),
  );
}

enum _AnglePreset {
  front(turns: 0.0, scale: 1.0),
  leftThreeQuarter(turns: -0.012, scale: 1.05),
  rightThreeQuarter(turns: 0.012, scale: 1.05),
  detail(turns: 0.0, scale: 1.8);

  const _AnglePreset({required this.turns, required this.scale});

  final double turns;
  final double scale;
}

enum _WeatherPreset { clear, cloudy, rainy }

enum _TimeOfDayPreset { day, night, dawn }

enum _BackgroundPreset {
  original,
  seoul,
  tokyo,
  paris,
  london,
  newYork,
  losAngeles,
  dubai,
  monaco,
  santorini,
  swissAlps,
  rome,
  singapore,
}
