import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models.dart';

/// 선택된 래퍼 상태 관리 (iOS의 SelectedColorChipStore와 동일)
final selectedWrapProvider = StateNotifierProvider<SelectedWrapNotifier, SelectedWrapState>((ref) {
  return SelectedWrapNotifier();
});

class SelectedWrapState {
  final WrapColor? selectedWrap;
  final String? sampledColorHex;
  final String? sampledBrand;
  final String? sampledColorName;
  final String? sampledFinish;

  const SelectedWrapState({
    this.selectedWrap,
    this.sampledColorHex,
    this.sampledBrand,
    this.sampledColorName,
    this.sampledFinish,
  });

  SelectedWrapState copyWith({
    WrapColor? selectedWrap,
    String? sampledColorHex,
    String? sampledBrand,
    String? sampledColorName,
    String? sampledFinish,
  }) {
    return SelectedWrapState(
      selectedWrap: selectedWrap ?? this.selectedWrap,
      sampledColorHex: sampledColorHex ?? this.sampledColorHex,
      sampledBrand: sampledBrand ?? this.sampledBrand,
      sampledColorName: sampledColorName ?? this.sampledColorName,
      sampledFinish: sampledFinish ?? this.sampledFinish,
    );
  }
}

class SelectedWrapNotifier extends StateNotifier<SelectedWrapState> {
  SelectedWrapNotifier() : super(const SelectedWrapState());

  /// 래퍼 선택 (iOS의 colorChipStore.update()와 동일)
  void updateSelectedWrap(WrapColor wrap) {
    state = state.copyWith(
      selectedWrap: wrap,
      sampledColorHex: wrap.hexCode,
      sampledBrand: wrap.brand,
      sampledColorName: wrap.displayName,
      sampledFinish: wrap.finish,
    );
  }

  /// 칩 색상 업데이트
  void updateChipColor({
    required String hexCode,
    required String brand,
    required String colorName,
    required String finish,
  }) {
    state = state.copyWith(
      sampledColorHex: hexCode,
      sampledBrand: brand,
      sampledColorName: colorName,
      sampledFinish: finish,
    );
  }

  /// 초기화
  void clear() {
    state = const SelectedWrapState();
  }

  /// 선택된 색상이 있는지 확인
  bool get hasSelectedColor => state.selectedWrap != null || state.sampledColorHex != null;
}
