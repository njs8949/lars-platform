import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../l10n.dart';

class CalibrationCameraScreen extends StatefulWidget {
  const CalibrationCameraScreen({super.key});

  @override
  State<CalibrationCameraScreen> createState() => _CalibrationCameraScreenState();
}

class _CalibrationCameraScreenState extends State<CalibrationCameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isReady = false;
  bool _isAWBLocked = false;
  bool _isAELocked = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    _cameras = await availableCameras();
    if (_cameras == null || _cameras!.isEmpty) return;

    _controller = CameraController(
      _cameras![0],
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await _controller!.initialize();
      if (!mounted) return;
      setState(() => _isReady = true);
    } catch (e) {
      debugPrint('Camera init error: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _toggleAWBLock() async {
    if (!_isReady) return;
    try {
      setState(() => _isAWBLocked = !_isAWBLocked);
    } catch (e) {
      debugPrint('AWB Lock error: $e');
    }
  }

  Future<void> _toggleAELock() async {
    if (!_isReady) return;
    try {
      final mode = _isAELocked ? ExposureMode.auto : ExposureMode.locked;
      await _controller!.setExposureMode(mode);
      setState(() => _isAELocked = !_isAELocked);
    } catch (e) {
      debugPrint('AE Lock error: $e');
    }
  }

  Future<void> _takePicture() async {
    if (!_isReady) return;
    try {
      final image = await _controller!.takePicture();
      if (!mounted) return;
      
      Navigator.of(context).pop({
        'file': File(image.path),
        'metadata': {
          'awb_locked': _isAWBLocked,
          'ae_locked': _isAELocked,
          'device_model': 'Android Device',
        }
      });
    } catch (e) {
      debugPrint('Capture error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isReady || _controller == null) {
      return const Scaffold(backgroundColor: Colors.black, body: Center(child: CircularProgressIndicator(color: Colors.white)));
    }

    final l10n = L10n.of(context);
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: Center(
              child: AspectRatio(
                aspectRatio: _controller!.value.aspectRatio,
                child: CameraPreview(_controller!),
              ),
            ),
          ),

          _buildGuides(),

          SafeArea(
            child: Column(
              children: [
                _buildHeader(l10n),
                const Spacer(),
                _buildBottomControls(l10n),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(L10n l10n) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 28),
            onPressed: () => Navigator.of(context).pop(),
          ),
          Text(
            l10n.tx('컬러 캘리브레이션 촬영', 'Color Calibration Capture'),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildGuides() {
    return LayoutBuilder(builder: (context, constraints) {
      final w = constraints.maxWidth;
      final h = constraints.maxHeight;
      return Stack(
        children: [
          _GuideBox(
            title: '필름 샘플 (중앙)',
            color: Colors.purpleAccent,
            rect: Rect.fromCenter(center: Offset(w * 0.5, h * 0.5 - 40), width: w * 0.6, height: h * 0.25),
          ),
          _GuideBox(
            title: 'ColorChecker',
            color: Colors.blueAccent,
            rect: Rect.fromLTWH(w * 0.65, 80, w * 0.3, h * 0.12),
          ),
          _GuideBox(
            title: '그레이 패치',
            color: Colors.grey,
            rect: Rect.fromLTWH(20, h - 280, w * 0.2, h * 0.1),
          ),
        ],
      );
    });
  }

  Widget _buildBottomControls(L10n l10n) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _ControlButton(
                label: 'AWB',
                active: _isAWBLocked,
                activeColor: Colors.yellow,
                onTap: _toggleAWBLock,
              ),
              _ControlButton(
                label: 'AE',
                active: _isAELocked,
                activeColor: Colors.orange,
                onTap: _toggleAELock,
              ),
            ],
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _takePicture,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
              ),
              child: Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GuideBox extends StatelessWidget {
  final String title;
  final Color color;
  final Rect rect;
  const _GuideBox({required this.title, required this.color, required this.rect});

  @override
  Widget build(BuildContext context) {
    return Positioned.fromRect(
      rect: rect,
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.8), width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              top: -22,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                  child: Text(title, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final String label;
  final bool active;
  final Color activeColor;
  final VoidCallback onTap;
  const _ControlButton({required this.label, required this.active, required this.activeColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: active ? activeColor.withOpacity(0.8) : Colors.white12,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(color: active ? Colors.black : Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
