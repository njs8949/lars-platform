import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:path_provider/path_provider.dart';
import 'package:image/image.dart' as img_lib;
import 'package:model_viewer_plus/model_viewer_plus.dart';
import '../models.dart';
import '../app_state.dart';
import '../config.dart';
import '../services/OpenAI_image_edit_service.dart';
import '../l10n.dart';
import '../theme.dart';

class ArWrappingOverlay extends StatefulWidget {
  const ArWrappingOverlay({
    super.key,
    required this.onExit,
    this.selectedWrap,
    required this.finish,
    required this.onWrapChanged,
  });

  final VoidCallback onExit;
  final WrapColor? selectedWrap;
  final String finish;
  final Function(WrapColor?, String) onWrapChanged;

  @override
  State<ArWrappingOverlay> createState() => _ArWrappingOverlayState();
}

enum ArMode { liveAI, virtual3D }

class _ArWrappingOverlayState extends State<ArWrappingOverlay> {
  ArMode _mode = ArMode.liveAI;
  CameraController? _cameraController;
  bool _isCameraReady = false;

  // Wrap Application Settings
  _WrapApplicationMode _wrapMode = _WrapApplicationMode.fullBody;
  Set<String> _selectedScopes = {'full'};
  bool _wrapWheels = false; // New: Wheel wrapping option
  bool _showingSettings = false;
  
  // Force Gemini model for high-fidelity wrapping
  final _geminiService = OpenAIImageEditService(
    proxyBaseUrl: Config.imageProxyUrl,
    model: Config.geminiImageModel,
    apiKey: Config.imageApiKey,
  );
  
  ui.Image? _geminiResult;
  bool _isGenerating = false;
  String _currentStatus = "";
  
  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    _cameraController = CameraController(
      cameras.first,
      ResolutionPreset.veryHigh,
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      if (!mounted) return;
      setState(() {
        _isCameraReady = true;
        _currentStatus = "카메라 준비됨";
      });
    } catch (e) {
      debugPrint("Camera init error: $e");
    }
  }

  Future<void> _safeExit() async {
    setState(() => _isGenerating = true);
    try {
      if (_cameraController != null) {
        if (_cameraController!.value.isStreamingImages) {
          await _cameraController!.stopImageStream();
        }
        await _cameraController!.dispose();
        _cameraController = null;
      }
    } catch (e) {
      debugPrint("Error during camera disposal: $e");
    }
    if (mounted) widget.onExit();
  }

  Future<void> _switchMode(ArMode newMode) async {
    if (_mode == newMode) return;
    setState(() {
      _mode = newMode;
      _geminiResult = null;
    });
    if (!_isCameraReady) await _initCamera();
  }

  Future<void> _onColorSelected(WrapColor wrap, String finish) async {
    widget.onWrapChanged(wrap, finish);
    setState(() => _geminiResult = null);
    await _captureAndGeminiPolish(wrap, finish);
  }

  Future<void> _captureAndGeminiPolish([WrapColor? targetWrap, String? targetFinish]) async {
    final wrap = targetWrap ?? widget.selectedWrap;
    final finish = targetFinish ?? widget.finish;
    
    if (_cameraController == null || !_cameraController!.value.isInitialized || _isGenerating) return;
    if (wrap == null) return;

    setState(() {
      _isGenerating = true;
      _currentStatus = "제미나이가 고해상도 랩핑을 적용 중입니다...";
    });

    try {
      final xFile = await _cameraController!.takePicture();
      final rawBytes = await xFile.readAsBytes();
      
      img_lib.Image? image = img_lib.decodeImage(rawBytes);
      if (image != null) {
        if (image.width > image.height) {
          image = img_lib.copyRotate(image, angle: 90);
        }
        final targetW = image.width;
        final targetH = (targetW * 16) ~/ 9;
        if (image.height > targetH) {
          image = img_lib.copyCrop(image, x: 0, y: (image.height - targetH) ~/ 2, width: targetW, height: targetH);
        } else {
          final newW = (image.height * 9) ~/ 16;
          image = img_lib.copyCrop(image, x: (image.width - newW) ~/ 2, y: 0, width: newW, height: image.height);
        }
      }
      
      final processedBytes = image != null ? Uint8List.fromList(img_lib.encodeJpg(image, quality: 95)) : rawBytes;

      final panels = _selectedScopes.join(", ");
      final wheelInstruction = _wrapWheels ? "Include the wheels and rims in the wrap color." : "MANDATORY: DO NOT wrap the wheels, rims, tires, glass, or lights. Keep them original.";
      String prompt = "";
      switch (_wrapMode) {
        case _WrapApplicationMode.fullBody:
          prompt = "Identify the vehicle. Apply a $finish ${wrap.name} wrap to ALL painted body panels. HEX: ${wrap.hexCode}. $wheelInstruction";
          break;
        case _WrapApplicationMode.twoTone:
          prompt = "Apply a $finish ${wrap.name} (HEX: ${wrap.hexCode}) wrap ONLY to these specific panels: $panels. Keep rest original. $wheelInstruction";
          break;
        case _WrapApplicationMode.accentOnly:
          prompt = "Apply a $finish ${wrap.name} (HEX: ${wrap.hexCode}) accent wrap to ONLY these parts: $panels. $wheelInstruction";
          break;
        case _WrapApplicationMode.preserveExistingAccent:
          prompt = "Apply a $finish ${wrap.name} (HEX: ${wrap.hexCode}) wrap to body, but PRESERVE all existing decals/stripes. $wheelInstruction";
          break;
      }

      final resultBytes = await _geminiService.applyWrapWithFullPrompt(
        imageBytes: processedBytes,
        maskBytes: Uint8List(0),
        fullPrompt: "$prompt Preserve all natural reflections and highlights for photorealism. Output result ONLY.",
      );

      final codec = await ui.instantiateImageCodec(resultBytes);
      final frame = await codec.getNextFrame();
      
      if (mounted) {
        setState(() {
          _geminiResult = frame.image;
          _isGenerating = false;
          _currentStatus = "AI 랩핑 완료";
        });
      }
    } catch (e) {
      debugPrint("Gemini polish error: $e");
      if (mounted) {
        setState(() {
          _isGenerating = false;
          _currentStatus = "AI 랩핑 실패";
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("AI 랩핑 중 오류 발생: $e"), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  void _syncScopesForMode(_WrapApplicationMode mode) {
    setState(() {
      switch (mode) {
        case _WrapApplicationMode.fullBody:
          _selectedScopes = {'full'};
          break;
        case _WrapApplicationMode.twoTone:
        case _WrapApplicationMode.accentOnly:
          _selectedScopes = {'roof', 'mirrors'};
          break;
        case _WrapApplicationMode.preserveExistingAccent:
          _selectedScopes = {'full'};
          break;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    final state = AppStateScope.of(context);
    
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _safeExit();
      },
      child: Material(
        color: Colors.black,
        child: Stack(
          children: [
            // LAYER 1: Shared Camera Background
            Positioned.fill(
              child: _isCameraReady 
                ? ClipRect(
                    child: OverflowBox(
                      alignment: Alignment.center,
                      child: FittedBox(
                        fit: BoxFit.cover,
                        child: SizedBox(
                          width: 1,
                          height: _cameraController!.value.aspectRatio,
                          child: CameraPreview(_cameraController!),
                        ),
                      ),
                    ),
                  )
                : const Center(child: CircularProgressIndicator(color: Colors.white)),
            ),

            // LAYER 2: Instant Color Tint
            if (_mode == ArMode.liveAI && widget.selectedWrap != null && _geminiResult == null)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    color: widget.selectedWrap!.swatch.withOpacity(0.20),
                  ),
                ),
              ),

            // LAYER 3: Virtual 3D Model
            if (_mode == ArMode.virtual3D)
              Positioned.fill(
                child: _buildVirtual3DView(),
              ),

            // LAYER 4: Gemini AI Result
            if (_geminiResult != null)
              Positioned.fill(
                child: GestureDetector(
                  onTap: () => setState(() => _geminiResult = null),
                  child: RawImage(image: _geminiResult, fit: BoxFit.cover),
                ),
              ),

            // LAYER 5: UI Overlay
            SafeArea(
              child: Column(
                children: [
                  _buildHeader(context, l10n),
                  const Spacer(),
                  if (_showingSettings) _buildSettingsQuickBar(l10n),
                  _buildModeToggle(l10n),
                  _buildBottomControls(context, l10n, state),
                ],
              ),
            ),
            
            // AI Loading Status
            if (_isGenerating)
              Positioned.fill(
                child: Container(
                  color: Colors.black54,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(color: Colors.purpleAccent, strokeWidth: 4),
                        const SizedBox(height: 25),
                        Text(l10n.tx("제미나이가 정교하게 랩핑 중...", "Gemini is wrapping with detail..."), 
                             style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVirtual3DView() {
    final color = widget.selectedWrap?.swatch ?? Colors.white;
    final r = color.red / 255.0;
    final g = color.green / 255.0;
    final b = color.blue / 255.0;
    
    double metallic = 0.5;
    double roughness = 0.4;
    if (widget.finish.toLowerCase() == 'gloss') { metallic = 0.2; roughness = 0.05; }
    if (widget.finish.toLowerCase() == 'matte') { metallic = 0.0; roughness = 0.9; }
    if (widget.finish.toLowerCase() == 'satin') { metallic = 0.1; roughness = 0.4; }
    if (widget.finish.toLowerCase() == 'metallic') { metallic = 0.8; roughness = 0.2; }

    return ModelViewer(
      key: ValueKey("3d-final-v2-${widget.selectedWrap?.id}-${widget.finish}-$_wrapWheels"),
      src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', 
      alt: "Virtual Vehicle",
      ar: true,
      autoRotate: true,
      cameraControls: true,
      backgroundColor: Colors.transparent,
      relatedJs: """
        const mv = document.querySelector('model-viewer');
        const applySelectiveColor = () => {
          if (mv && mv.model && mv.model.materials) {
            mv.model.materials.forEach(m => {
              const name = m.name.toLowerCase();
              const isWheel = name.includes('wheel') || name.includes('rim') || name.includes('tire');
              const isExcluded = name.includes('glass') || name.includes('light') || name.includes('window') || name.includes('chrome');
              
              if ((isWheel && $_wrapWheels) || (!isWheel && !isExcluded)) {
                m.pbrMetallicRoughness.setBaseColorFactor([$r, $g, $b, 1.0]);
                m.pbrMetallicRoughness.setRoughnessFactor($roughness);
                m.pbrMetallicRoughness.setMetallicFactor($metallic);
              }
            });
          }
        };
        mv.addEventListener('load', applySelectiveColor);
        setTimeout(applySelectiveColor, 300);
      """,
    );
  }

  Widget _buildHeader(BuildContext context, L10n l10n) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
      child: Row(
        children: [
          ElevatedButton.icon(
            onPressed: _safeExit,
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            label: Text(l10n.tx("나가기", "Exit"), style: const TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: const StadiumBorder(),
            ),
          ),
          const Spacer(),
          IconButton(
            onPressed: () => setState(() => _showingSettings = !_showingSettings),
            icon: const Icon(Icons.tune_rounded, color: Colors.white, size: 28),
            style: IconButton.styleFrom(backgroundColor: Colors.black45),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _isGenerating ? Colors.purple : (_mode == ArMode.liveAI ? Colors.green : Colors.blue),
              borderRadius: BorderRadius.circular(20)
            ),
            child: Text(
              _isGenerating ? l10n.tx("AI 분석 중", "AI Rendering") : (_mode == ArMode.liveAI ? l10n.tx("실시간 AI", "Live AI") : l10n.tx("가상 3D", "Virtual 3D")),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsQuickBar(L10n l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), borderRadius: BorderRadius.circular(20)),
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: _WrapApplicationMode.values.map((m) {
                final active = _wrapMode == m;
                return GestureDetector(
                  onTap: () {
                    setState(() => _wrapMode = m);
                    _syncScopesForMode(m);
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(color: active ? WrapTheme.primary : Colors.white10, borderRadius: BorderRadius.circular(25)),
                    child: Text(_wrapModeLabel(l10n, m), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  ),
                );
              }).toList(),
            ),
          ),
          if (_wrapMode == _WrapApplicationMode.twoTone || _wrapMode == _WrapApplicationMode.accentOnly) ...[
            const SizedBox(height: 15),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: _availableAccentPanels.map((p) {
                  final selected = _selectedScopes.contains(p);
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        if (selected) _selectedScopes.remove(p); else _selectedScopes.add(p);
                        if (_selectedScopes.isEmpty) _selectedScopes.add('roof');
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(color: selected ? Colors.pinkAccent : Colors.white10, borderRadius: BorderRadius.circular(15)),
                      child: Text(_panelLabel(l10n, p), style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
          const SizedBox(height: 20),
          // Wheel Wrap Toggle
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Icon(Icons.circle_outlined, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Text(l10n.tx("휠 랩핑 포함", "Wrap Wheels"), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                const Spacer(),
                Switch(
                  value: _wrapWheels,
                  onChanged: (v) => setState(() => _wrapWheels = v),
                  activeColor: WrapTheme.primary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _wrapModeLabel(L10n l10n, _WrapApplicationMode mode) {
    switch (mode) {
      case _WrapApplicationMode.fullBody: return l10n.tx('전체', 'Full');
      case _WrapApplicationMode.twoTone: return l10n.tx('투톤', 'Two-Tone');
      case _WrapApplicationMode.accentOnly: return l10n.tx('포인트', 'Accent');
      case _WrapApplicationMode.preserveExistingAccent: return l10n.tx('기존유지', 'Preserve');
    }
  }

  String _panelLabel(L10n l10n, String panel) {
    switch (panel) {
      case 'roof': return l10n.tx('루프', 'Roof');
      case 'mirrors': return l10n.tx('미러', 'Mirrors');
      case 'hood': return l10n.tx('후드', 'Hood');
      case 'trunk': return l10n.tx('트렁크', 'Trunk');
      case 'side_skirts': return l10n.tx('사이드스커트', 'Skirts');
      case 'front_bumper': return l10n.tx('앞범퍼', 'F Bumper');
      case 'rear_bumper': return l10n.tx('뒷범퍼', 'R Bumper');
      default: return panel;
    }
  }

  Widget _buildModeToggle(L10n l10n) {
    return Container(
      margin: const EdgeInsets.only(bottom: 25),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(16)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _modeBtn(ArMode.liveAI, l10n.tx("실시간 AI", "Live AI")),
          _modeBtn(ArMode.virtual3D, l10n.tx("가상 3D", "Virtual 3D")),
        ],
      ),
    );
  }

  Widget _modeBtn(ArMode mode, String label) {
    final active = _mode == mode;
    return GestureDetector(
      onTap: () => _switchMode(mode),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        decoration: BoxDecoration(
          color: active ? WrapTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label, style: TextStyle(color: Colors.white, fontWeight: active ? FontWeight.bold : FontWeight.normal, fontSize: 14)),
      ),
    );
  }

  Widget _buildBottomControls(BuildContext context, L10n l10n, AppState state) {
    final wraps = state.wraps.toList();

    return Container(
      padding: const EdgeInsets.only(bottom: 40, top: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.transparent, Colors.black.withOpacity(0.98)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter
        ),
      ),
      child: Column(
        children: [
          // Color Selector
          SizedBox(
            height: 95,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              scrollDirection: Axis.horizontal,
              itemCount: wraps.length,
              separatorBuilder: (_, __) => const SizedBox(width: 15),
              itemBuilder: (context, index) {
                final w = wraps[index];
                final selected = widget.selectedWrap?.id == w.id;
                return GestureDetector(
                  onTap: () => _onColorSelected(w, widget.finish),
                  child: Column(
                    children: [
                      Container(
                        width: 60, height: 60,
                        decoration: BoxDecoration(
                          color: w.swatch,
                          shape: BoxShape.circle,
                          border: Border.all(color: selected ? Colors.white : Colors.white24, width: selected ? 3.5 : 1.5),
                          boxShadow: [if (selected) BoxShadow(color: w.swatch.withOpacity(0.7), blurRadius: 18)]
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 70,
                        child: Text(w.name, style: const TextStyle(color: Colors.white, fontSize: 10), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                      )
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
          // Finish Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: ['Gloss', 'Matte', 'Satin', 'Metallic'].map((f) {
              final active = widget.finish == f;
              return GestureDetector(
                onTap: () => _onColorSelected(widget.selectedWrap!, f),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: active ? WrapTheme.primary : Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: Text(f, style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: active ? FontWeight.bold : FontWeight.normal)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 30),
          ElevatedButton(
            onPressed: widget.selectedWrap != null ? () => _captureAndGeminiPolish() : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white, 
              foregroundColor: Colors.black, 
              padding: const EdgeInsets.symmetric(horizontal: 70, vertical: 22),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              elevation: 15,
            ),
            child: Text(l10n.tx("AI 랩핑 적용", "Apply AI Wrap"), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
          ),
        ],
      ),
    );
  }
}

enum _WrapApplicationMode {
  fullBody,
  twoTone,
  accentOnly,
  preserveExistingAccent,
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
