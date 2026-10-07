import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../app_state.dart';
import '../l10n.dart';
import '../models.dart';
import '../theme.dart';

class GarageAddVehicleScreen extends StatefulWidget {
  const GarageAddVehicleScreen({super.key});

  @override
  State<GarageAddVehicleScreen> createState() =>
      _GarageAddVehicleScreenState();
}

class _GarageAddVehicleScreenState extends State<GarageAddVehicleScreen> {
  final _picker = ImagePicker();
  int _step = 1;
  VehicleGarageCategory? _category;
  VehicleGarageSize? _size;
  final _nicknameCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  String _originalColor = '#FFFFFF';
  File? _vehicleImage;

  @override
  void dispose() {
    _nicknameCtrl.dispose();
    _modelCtrl.dispose();
    super.dispose();
  }

  bool get _canProceed {
    if (_step == 1) return _category != null && _size != null;
    if (_step == 2) {
      return _nicknameCtrl.text.trim().isNotEmpty &&
          _modelCtrl.text.trim().isNotEmpty &&
          _vehicleImage != null;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Scaffold(
      backgroundColor: WrapTheme.background(context),
      appBar: AppBar(
        backgroundColor: WrapTheme.card(context),
        title: Text(
          _stepTitle,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_step > 1) {
              setState(() => _step--);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: Column(
        children: [
          _StepIndicator(current: _step, total: 2),
          Expanded(
            child: _step == 1
                ? _Step1(
                    category: _category,
                    size: _size,
                    onCategoryChanged: (c) => setState(() => _category = c),
                    onSizeChanged: (s) => setState(() => _size = s),
                  )
                : _Step2(
                    nicknameCtrl: _nicknameCtrl,
                    modelCtrl: _modelCtrl,
                    vehicleImage: _vehicleImage,
                    onPickImage: _pickVehicleImage,
                    onChanged: () => setState(() {}),
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: _canProceed ? _proceed : null,
                  child: Text(
                    _step < 2 ? l10n.next : l10n.doneRegister,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String get _stepTitle {
    final l10n = L10n.of(context);
    switch (_step) {
      case 1:
        return l10n.vehicleTypeSelect;
      default:
        return l10n.vehicleInfoInput;
    }
  }

  Future<void> _proceed() async {
    if (_step < 2) {
      setState(() => _step++);
    } else {
      final state = AppStateScope.of(context);
      final savedImagePath = await _persistVehicleImage();
      final vehicle = SavedVehicle(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        make: '',
        model: _modelCtrl.text.trim(),
        year: DateTime.now().year,
        trim: '',
        nickname: _nicknameCtrl.text.trim(),
        createdAt: DateTime.now(),
        lastUpdated: DateTime.now(),
        vehicleCategory: _category,
        vehicleSize: _size,
        originalColor: _originalColor,
        imagePath: savedImagePath,
      );
      state.addVehicle(vehicle);
      if (!mounted) return;
      Navigator.pop(context);
    }
  }

  Future<void> _pickVehicleImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    setState(() {
      _vehicleImage = File(picked.path);
    });
  }

  Future<String?> _persistVehicleImage() async {
    final source = _vehicleImage;
    if (source == null) return null;
    final appDir = await getApplicationDocumentsDirectory();
    final vehicleDir = Directory(p.join(appDir.path, 'vehicle_images'));
    if (!await vehicleDir.exists()) {
      await vehicleDir.create(recursive: true);
    }
    final ext = p.extension(source.path).isEmpty ? '.jpg' : p.extension(source.path);
    final targetPath = p.join(
      vehicleDir.path,
      'vehicle_${DateTime.now().millisecondsSinceEpoch}$ext',
    );
    final copied = await source.copy(targetPath);
    return copied.path;
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.current, required this.total});
  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
      child: Row(
        children: List.generate(total * 2 - 1, (i) {
          if (i.isOdd) {
            return Expanded(
              child: Container(
                height: 2,
                color: (i ~/ 2 + 1) < current
                    ? Colors.indigo
                    : Colors.grey.shade300,
              ),
            );
          }
          final step = i ~/ 2 + 1;
          final done = step < current;
          final active = step == current;
          return Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done || active ? Colors.indigo : Colors.grey.shade200,
            ),
            alignment: Alignment.center,
            child: done
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Text(
                    '$step',
                    style: TextStyle(
                      color: active ? Colors.white : Colors.grey,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          );
        }),
      ),
    );
  }
}

class _Step1 extends StatelessWidget {
  const _Step1({
    required this.category,
    required this.size,
    required this.onCategoryChanged,
    required this.onSizeChanged,
  });
  final VehicleGarageCategory? category;
  final VehicleGarageSize? size;
  final ValueChanged<VehicleGarageCategory> onCategoryChanged;
  final ValueChanged<VehicleGarageSize> onSizeChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? Colors.white : Colors.black87;
    final subtitleColor = isDark ? Colors.white70 : Colors.grey.shade600;
    final unselectedCardColor = isDark ? Colors.white : Colors.white;
    final unselectedBorderColor = isDark ? Colors.white.withOpacity(0.72) : Colors.grey.shade300;
    final selectedCardColor = Colors.indigo.withOpacity(isDark ? 0.18 : 0.08);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.vehicleCategoryTitle,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: titleColor)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.8,
            children: VehicleGarageCategory.values.map((c) {
              final selected = category == c;
              return GestureDetector(
                onTap: () => onCategoryChanged(c),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: selected ? Colors.indigo : unselectedBorderColor,
                      width: selected ? 2 : 1,
                    ),
                    color: selected ? selectedCardColor : unselectedCardColor,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isDark ? 0.18 : 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      VehicleCategoryArtwork(
                        category: c,
                        selected: selected,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.vehicleCategoryName(c.name),
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: selected ? Colors.indigo : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          Text(l10n.vehicleSizeTitle,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: titleColor)),
          const SizedBox(height: 4),
          Text(
            l10n.wrapAreaHint,
            style: TextStyle(fontSize: 12, color: subtitleColor),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 2.5,
            children: VehicleGarageSize.values.map((s) {
              final selected = size == s;
              return GestureDetector(
                onTap: () => onSizeChanged(s),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: selected ? Colors.indigo : unselectedBorderColor,
                      width: selected ? 2 : 1,
                    ),
                    color: selected ? selectedCardColor : unselectedCardColor,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isDark ? 0.18 : 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        l10n.vehicleSizeName(s.name),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: selected ? Colors.indigo : Colors.black87,
                        ),
                      ),
                      Text(
                        '약 ${s.estimatedArea}m²',
                        style: TextStyle(
                            fontSize: 11, color: selected ? Colors.indigo : Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class VehicleCategoryArtwork extends StatelessWidget {
  const VehicleCategoryArtwork({
    super.key,
    required this.category,
    required this.selected,
  });

  final VehicleGarageCategory category;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final assetPath = switch (category) {
      VehicleGarageCategory.hatchback =>
        'assets/icons/garage_categories/Hatchback.png',
      VehicleGarageCategory.coupe =>
        'assets/icons/garage_categories/Coupe.png',
      VehicleGarageCategory.sedan =>
        'assets/icons/garage_categories/Sedan.png',
      VehicleGarageCategory.suv =>
        'assets/icons/garage_categories/SUV.png',
    };

    return SizedBox(
      width: 108,
      height: 56,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 180),
        scale: selected ? 1.04 : 1.0,
        child: Opacity(
          opacity: selected ? 1.0 : 0.82,
          child: Image.asset(
            assetPath,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}

class _Step2 extends StatelessWidget {
  const _Step2({
    required this.nicknameCtrl,
    required this.modelCtrl,
    required this.vehicleImage,
    required this.onPickImage,
    required this.onChanged,
  });
  final TextEditingController nicknameCtrl;
  final TextEditingController modelCtrl;
  final File? vehicleImage;
  final VoidCallback onPickImage;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.tx('차량 사진', 'Vehicle Photo'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onPickImage,
            child: Container(
              height: 180,
              width: double.infinity,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: vehicleImage != null
                  ? Image.file(vehicleImage!, fit: BoxFit.cover)
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_a_photo_outlined,
                          size: 34,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          l10n.tx('차량 사진 선택', 'Select vehicle photo'),
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 20),
          Text(l10n.tx('차량 별명', 'Vehicle Nickname'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: nicknameCtrl,
            onChanged: (_) => onChanged(),
            decoration: InputDecoration(
              hintText: l10n.tx('예: 흰둥이, 내 소중한 차', 'e.g. Whitey, My Favorite Car'),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 20),
          Text(l10n.tx('차량 모델명', 'Vehicle Model'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: modelCtrl,
            onChanged: (_) => onChanged(),
            decoration: InputDecoration(
              hintText: l10n.tx('예: 아반떼 N, 팰리세이드', 'e.g. Elantra N, Palisade'),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

