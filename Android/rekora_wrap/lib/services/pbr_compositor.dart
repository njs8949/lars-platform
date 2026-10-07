import 'dart:io';
import 'dart:isolate';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;

// ─────────────────────────────────────────────────────────────────────────────
// WrapMaterial — PBR 재질 파라미터
// ─────────────────────────────────────────────────────────────────────────────

/// 물리 기반 랩핑 재질 파라미터.
/// 3M / Avery Dennison / TeckWrap 주요 라인업을 프리셋으로 제공.
class WrapMaterial {
  const WrapMaterial({
    required this.roughness,
    required this.metallic,
    this.flakeDensity = 0.0,
    this.clearCoat = 0.0,
    this.coatRoughness = 0.0,
    this.anisotropy = 0.0,
    this.specularStrength = 1.0,
    this.isChameleon = false,
    this.chameleonColors = const [],
    this.isCarbonFiber = false,
    this.isGlitter = false,
    this.isHolographic = false,
    this.isPpf = false,
    this.isAurora = false,
    this.auroraColors = const [],
    this.isForgedCarbon = false,
    this.shimmerIntensity = 0.0,
    this.vlt = 1.0,
  });

  /// 거칠기: 0.0 = 거울면, 1.0 = 완전 무광
  final double roughness;

  /// 금속성: 0.0 = 비금속(스펙큘러 흰색), 1.0 = 금속(스펙큘러가 베이스 컬러로 착색)
  final double metallic;

  /// 플레이크 밀도: metallic/pearl의 스파클 입자 밀도 (0~1)
  final double flakeDensity;

  /// 클리어 코트 강도: 고광택 표면 추가 스펙큘러 레이어
  final double clearCoat;

  /// 클리어 코트 레이어 자체 roughness (PPF 고광택 필름: 0.01 수준)
  final double coatRoughness;

  /// 이방성(Anisotropy): 브러쉬드 메탈의 방향성 줄무늬 (0~1)
  final double anisotropy;

  /// 스펙큘러 강도 배율
  final double specularStrength;

  /// 카멜레온/컬러플로우 필름 여부
  final bool isChameleon;

  /// 카멜레온 색상 전환 리스트 (보는 각도 = 휘도로 시뮬레이션)
  final List<Color> chameleonColors;

  /// 카본 파이버 직조 패턴 여부
  final bool isCarbonFiber;

  /// 글리터/다이아몬드 스파클 여부
  final bool isGlitter;

  /// 홀로그래픽 레인보우 스펙트럼 여부
  final bool isHolographic;

  /// PPF(페인트 보호 필름) 여부 — 엣지 두께(8~10mil) 굴절 효과 활성화
  final bool isPpf;

  /// Aurora/컬러시프트 필름 (Fresnel 기반 2~3색 전환)
  final bool isAurora;

  /// Aurora 색상 전환 리스트
  final List<Color> auroraColors;

  /// 불규칙 패치 이방성 — PPF Forged Carbon 재현
  final bool isForgedCarbon;

  /// 시머 플레이크 강도 — PPF Retro Matte 전용 (0.05~0.10)
  final double shimmerIntensity;

  /// 가시광 투과율 (Visible Light Transmission): 1.0=표준, 0.366=헤드라이트 틴트 36.6%
  final double vlt;

  // ── 제조사 공식 라인업 프리셋 ─────────────────────────────────────────────

  /// 3M 2080 High Gloss — 거울 같은 반사, Orange Peel 없음
  static const WrapMaterial highGloss = WrapMaterial(
    roughness: 0.02,
    metallic: 0.0,
    clearCoat: 1.0,
    specularStrength: 3.2,
  );

  /// 3M 2080 Gloss / Avery SW900 Gloss
  static const WrapMaterial gloss = WrapMaterial(
    roughness: 0.06,
    metallic: 0.0,
    clearCoat: 0.8,
    specularStrength: 2.2,
  );

  /// 3M 2080 Satin / Avery SW900 Satin — 반광, 부드러운 확산
  static const WrapMaterial satin = WrapMaterial(
    roughness: 0.32,
    metallic: 0.0,
    clearCoat: 0.25,
    specularStrength: 0.55,
  );

  /// 3M 2080 Matte / TeckWrap Matte — 무광, 스펙큘러 없음
  static const WrapMaterial matte = WrapMaterial(
    roughness: 0.88,
    metallic: 0.0,
    clearCoat: 0.0,
    specularStrength: 0.0,
  );

  /// TeckWrap Super Matte / Dead Matte
  static const WrapMaterial superMatte = WrapMaterial(
    roughness: 1.0,
    metallic: 0.0,
    clearCoat: 0.0,
    specularStrength: 0.0,
  );

  /// Avery SW900 Gloss Metallic — 광택+플레이크
  static const WrapMaterial glossMetallic = WrapMaterial(
    roughness: 0.08,
    metallic: 0.85,
    flakeDensity: 0.28,
    clearCoat: 0.65,
    specularStrength: 2.6,
  );

  /// Avery SW900 Satin Metallic — 반광+플레이크
  static const WrapMaterial satinMetallic = WrapMaterial(
    roughness: 0.35,
    metallic: 0.75,
    flakeDensity: 0.20,
    clearCoat: 0.18,
    specularStrength: 0.85,
  );

  /// Avery SW900 Pearl — 진주광 이리데센스
  static const WrapMaterial pearl = WrapMaterial(
    roughness: 0.22,
    metallic: 0.32,
    flakeDensity: 0.16,
    clearCoat: 0.55,
    specularStrength: 1.6,
  );

  /// 3M 2080 Brushed Steel / Avery Brushed — 이방성 브러쉬드 메탈
  static const WrapMaterial brushedMetal = WrapMaterial(
    roughness: 0.42,
    metallic: 0.95,
    anisotropy: 1.0,
    specularStrength: 1.9,
  );

  /// TeckWrap Mirror Chrome / Avery Conform Chrome — 거울 크롬
  static const WrapMaterial chrome = WrapMaterial(
    roughness: 0.0,
    metallic: 1.0,
    clearCoat: 1.0,
    specularStrength: 4.5,
  );

  /// TeckWrap Satin Chrome / Neo Chrome
  static const WrapMaterial satinChrome = WrapMaterial(
    roughness: 0.18,
    metallic: 1.0,
    clearCoat: 0.55,
    specularStrength: 2.2,
  );

  /// TeckWrap Super Glitter / Diamond — 밀집 스파클
  static const WrapMaterial glitter = WrapMaterial(
    roughness: 0.12,
    metallic: 0.45,
    isGlitter: true,
    flakeDensity: 0.88,
    specularStrength: 1.6,
  );

  /// 3M / Avery Carbon Fiber — 직조 카본 패턴 + 클리어 코트
  static const WrapMaterial carbonFiber = WrapMaterial(
    roughness: 0.10,
    metallic: 0.50,
    isCarbonFiber: true,
    clearCoat: 0.90,
    specularStrength: 2.1,
  );

  /// Avery ColorFlow / TeckWrap Chameleon — 보는 각도에 따라 색상 전환
  static WrapMaterial chameleon(
    Color primary,
    Color secondary, [
    Color? tertiary,
  ]) {
    return WrapMaterial(
      roughness: 0.15,
      metallic: 0.3,
      clearCoat: 0.5,
      specularStrength: 1.4,
      isChameleon: true,
      chameleonColors: [primary, secondary, if (tertiary != null) tertiary],
    );
  }

  /// 홀로그래픽 — 레인보우 스펙트럼
  static const WrapMaterial holographic = WrapMaterial(
    roughness: 0.05,
    metallic: 0.6,
    isHolographic: true,
    clearCoat: 0.7,
    specularStrength: 2.0,
  );

  // ── PPF (Paint Protection Film) 제조사 기술 사양 기반 프리셋 ────────────────
  // G SUIT / IVIOS / FlexiShield (Reflex) / ULTRAFIT 기술 자료 기준

  /// PPF 투명 고광택 (IVIOS Axion / G SUIT Ultra Clear / ULTRAFIT XP Crystal)
  /// Orange Peel Zero, coatRoughness 0.01 — 거울급 선명도
  static const WrapMaterial ppfClear = WrapMaterial(
    roughness: 0.03,
    metallic: 0.0,
    clearCoat: 1.0,
    coatRoughness: 0.01,
    specularStrength: 2.8,
    isPpf: true,
    vlt: 1.0,
  );

  /// PPF 투명 무광 (G SUIT AG Series / FlexiShield Reflex Matte)
  static const WrapMaterial ppfClearMatte = WrapMaterial(
    roughness: 0.72,
    metallic: 0.0,
    clearCoat: 0.04,
    specularStrength: 0.0,
    isPpf: true,
    vlt: 1.0,
  );

  /// PPF 유광 컬러 (ULTRAFIT XP Gloss) — 고광택 컬러 PPF
  static const WrapMaterial ppfGloss = WrapMaterial(
    roughness: 0.04,
    metallic: 0.0,
    clearCoat: 1.0,
    coatRoughness: 0.01,
    specularStrength: 3.0,
    isPpf: true,
  );

  /// PPF 무광 컬러 (ULTRAFIT XP Matte) — 무광 컬러 PPF
  static const WrapMaterial ppfMatte = WrapMaterial(
    roughness: 0.80,
    metallic: 0.0,
    clearCoat: 0.0,
    specularStrength: 0.0,
    isPpf: true,
  );

  /// PPF Retro Matte (ULTRAFIT XP Retro) — 무광 + 5~10% 시머 플레이크
  static const WrapMaterial ppfRetroMatte = WrapMaterial(
    roughness: 0.78,
    metallic: 0.15,
    flakeDensity: 0.08,
    clearCoat: 0.04,
    specularStrength: 0.12,
    shimmerIntensity: 0.08,
    isPpf: true,
  );

  /// PPF Aurora 유광 (ULTRAFIT XP Aurora Forest: Green ↔ Bronze 등)
  /// Fresnel 기반 smooth lerp 색상 전환
  static WrapMaterial ppfAurora(
    Color primary,
    Color secondary, [
    Color? tertiary,
  ]) {
    return WrapMaterial(
      roughness: 0.12,
      metallic: 0.35,
      clearCoat: 0.6,
      specularStrength: 1.8,
      isAurora: true,
      isPpf: true,
      auroraColors: [primary, secondary, if (tertiary != null) tertiary],
    );
  }

  /// PPF Aurora 무광 (ULTRAFIT XP Aurora Matte)
  static WrapMaterial ppfAuroraMatte(
    Color primary,
    Color secondary, [
    Color? tertiary,
  ]) {
    return WrapMaterial(
      roughness: 0.55,
      metallic: 0.25,
      clearCoat: 0.08,
      specularStrength: 0.4,
      isAurora: true,
      isPpf: true,
      auroraColors: [primary, secondary, if (tertiary != null) tertiary],
    );
  }

  /// PPF 유광 메탈릭 (ULTRAFIT XP Gloss Metallic) — 플레이크 유광
  static const WrapMaterial ppfGlossMetallic = WrapMaterial(
    roughness: 0.07,
    metallic: 0.80,
    flakeDensity: 0.22,
    clearCoat: 0.75,
    coatRoughness: 0.01,
    specularStrength: 2.8,
    isPpf: true,
  );

  /// PPF Pearl (ULTRAFIT XP Pearl) — 진주광 PPF
  static const WrapMaterial ppfPearl = WrapMaterial(
    roughness: 0.20,
    metallic: 0.28,
    flakeDensity: 0.14,
    clearCoat: 0.60,
    specularStrength: 1.7,
    isPpf: true,
  );

  /// PPF Pearl Matte (ULTRAFIT XP Pearl Matte)
  static const WrapMaterial ppfPearlMatte = WrapMaterial(
    roughness: 0.60,
    metallic: 0.20,
    flakeDensity: 0.10,
    clearCoat: 0.08,
    specularStrength: 0.35,
    isPpf: true,
  );

  /// PPF Matte Metallic (ULTRAFIT XP Matte Metallic)
  static const WrapMaterial ppfMatteMetallic = WrapMaterial(
    roughness: 0.65,
    metallic: 0.70,
    flakeDensity: 0.18,
    clearCoat: 0.05,
    specularStrength: 0.45,
    isPpf: true,
  );

  /// PPF Satin (color/satin protection film)
  static const WrapMaterial ppfSatin = WrapMaterial(
    roughness: 0.42,
    metallic: 0.0,
    clearCoat: 0.22,
    coatRoughness: 0.08,
    specularStrength: 0.35,
    isPpf: true,
  );

  /// PPF Pattern (carbon/damask/mosaic texture)
  static const WrapMaterial ppfPattern = WrapMaterial(
    roughness: 0.22,
    metallic: 0.40,
    clearCoat: 0.75,
    coatRoughness: 0.05,
    specularStrength: 1.3,
    isCarbonFiber: true,
    isPpf: true,
  );

  /// PPF Black Forged Carbon (G SUIT / IVIOS) — 불규칙 패치 이방성 카본
  static const WrapMaterial ppfForgedCarbon = WrapMaterial(
    roughness: 0.18,
    metallic: 0.55,
    clearCoat: 0.85,
    specularStrength: 2.0,
    isForgedCarbon: true,
    isPpf: true,
  );

  /// PPF Headlight / Lamp Tint (ULTRAFIT XP Graphite — VLT 36.6%)
  static const WrapMaterial ppfLightTint = WrapMaterial(
    roughness: 0.08,
    metallic: 0.0,
    clearCoat: 0.30,
    specularStrength: 0.5,
    isPpf: true,
    vlt: 0.366,
  );

  // ── finish 문자열 → WrapMaterial 자동 매핑 ─────────────────────────────────

  static WrapMaterial fromFinish(String finish) {
    final f = finish.toLowerCase().trim();

    // ── PPF 전용 처리 ────────────────────────────────────────────────────────
    if (f.startsWith('ppf') || f.contains('ppf ') || f.contains('windshield')) {
      if (f.contains('aurora matte'))
        return ppfAuroraMatte(const Color(0xFF2E7D32), const Color(0xFF795548));
      if (f.contains('aurora'))
        return ppfAurora(
          const Color(0xFF1B5E20),
          const Color(0xFF8D6E63),
          const Color(0xFF4CAF50),
        );
      if (f.contains('forged') || f.contains('black forged'))
        return ppfForgedCarbon;
      if (f.contains('pattern') ||
          f.contains('carbon') ||
          f.contains('damask') ||
          f.contains('mosaic') ||
          f.contains('texture'))
        return ppfPattern;
      if (f.contains('retro matte') || f.contains('retro'))
        return ppfRetroMatte;
      if (f.contains('pearl matte')) return ppfPearlMatte;
      if (f.contains('matte metallic')) return ppfMatteMetallic;
      if (f.contains('gloss metallic')) return ppfGlossMetallic;
      if (f.contains('metallic')) return ppfGlossMetallic;
      if (f.contains('pearl')) return ppfPearl;
      if (f.contains('chameleon') ||
          f.contains('magic') ||
          f.contains('effect') ||
          f.contains('special')) {
        return ppfAurora(
          const Color(0xFF1565C0),
          const Color(0xFF6A1B9A),
          const Color(0xFF00ACC1),
        );
      }
      if (f.contains('light') ||
          f.contains('headlight') ||
          f.contains('lamp') ||
          f.contains('graphite'))
        return ppfLightTint;
      if (f.contains('clear matte')) return ppfClearMatte;
      if (f.contains('clear')) return ppfClear;
      if (f.contains('satin')) return ppfSatin;
      if (f.contains('matte')) return ppfMatte;
      if (f.contains('gloss')) return ppfGloss;
      return ppfClear; // PPF 기본 = 투명 고광택
    }

    // ── 비닐 랩 처리 ─────────────────────────────────────────────────────────
    if (f.contains('high gloss')) return highGloss;
    if (f.contains('carbon')) return carbonFiber;
    if (f.contains('holographic') || f.contains('rainbow')) return holographic;
    if (f.contains('glitter') ||
        f.contains('diamond') ||
        f.contains('super glitter'))
      return glitter;
    if (f.contains('conform chrome') ||
        f.contains('mirror chrome') ||
        f.contains('mirror'))
      return chrome;
    if (f.contains('neo chrome') || f.contains('satin chrome'))
      return satinChrome;
    if (f.contains('brushed')) return brushedMetal;
    if (f.contains('pearl')) return pearl;
    if (f.contains('colorflow') ||
        f.contains('colour flow') ||
        f.contains('chameleon') ||
        f.contains('flip')) {
      return WrapMaterial(
        roughness: 0.15,
        metallic: 0.3,
        clearCoat: 0.5,
        specularStrength: 1.4,
        isChameleon: true,
        chameleonColors: const [],
      );
    }
    if (f.contains('satin metallic')) return satinMetallic;
    if (f.contains('gloss metallic') ||
        (f.contains('gloss') && f.contains('metallic')))
      return glossMetallic;
    if (f.contains('metallic')) return glossMetallic;
    if (f.contains('super matte') || f.contains('dead matte'))
      return superMatte;
    if (f.contains('matte')) return matte;
    if (f.contains('satin')) return satin;
    if (f.contains('gloss')) return gloss;
    if (f.contains('solid')) return gloss;
    return satin; // default
  }

  /// 제조사/제품코드(=SKU) 기반 고정 프리셋 매핑.
  /// finish 문자열보다 SKU가 우선이며, 제조사 의도값을 강제 반영한다.
  static WrapMaterial fromCatalog({
    required String finish,
    String? brand,
    String? sku,
    String? productName,
  }) {
    final f = finish.toLowerCase().trim();
    final b = (brand ?? '').toLowerCase();
    final s = (sku ?? '').toLowerCase();
    final n = (productName ?? '').toLowerCase();

    bool has(String token) => f.contains(token) || s.contains(token) || n.contains(token);

    // ULTRAFIT PPF
    if (b.contains('ultrafit')) {
      if (s.contains('xp-aurora-forest')) {
        return ppfAurora(const Color(0xFF1B5E20), const Color(0xFF8D6E63), const Color(0xFF4CAF50));
      }
      if (s.contains('xp-aurora-silver')) {
        return ppfAurora(const Color(0xFFC0C7CF), const Color(0xFF5DAFB8), const Color(0xFFC8A8B3));
      }
      if (s.contains('xp-aurora-magenta')) {
        return ppfAurora(const Color(0xFF5B3A6D), const Color(0xFF2D3E88), const Color(0xFFC2185B));
      }
      if (s.contains('xp-aurora-purple') || s.contains('xp-deep-chroma-blue')) {
        return ppfAurora(const Color(0xFF311B92), const Color(0xFF0D47A1), const Color(0xFF1B5E20));
      }
      if (s.contains('xp-phoenix-red')) {
        return ppfAurora(const Color(0xFFCF1E2A), const Color(0xFF7A0F16), const Color(0xFF1A1A1A));
      }
      if (s.contains('xp-retro-phoenix-red')) {
        return ppfAuroraMatte(const Color(0xFFB71C1C), const Color(0xFF6D1212), const Color(0xFF2B2B2B));
      }
      if (s.contains('xp-purple-galaxy')) {
        return const WrapMaterial(
          roughness: 0.14,
          metallic: 0.42,
          flakeDensity: 0.34,
          clearCoat: 0.82,
          coatRoughness: 0.02,
          specularStrength: 2.0,
          shimmerIntensity: 0.12,
          isPpf: true,
        );
      }
      if (s.contains('xp-black-forged') || has('forged')) return ppfForgedCarbon;
      if (s.contains('xp-black-carbon') || has('carbon')) return ppfPattern;
      if (s.contains('xp-retro-metallic-silver')) return ppfMatteMetallic;
      if (s.contains('xp-retro-pearl-white')) return ppfPearlMatte;
      if (s.contains('xp-pearl-white')) return ppfPearl;
      if (s.contains('xp-metallic') && has('retro')) return ppfMatteMetallic;
      if (s.contains('xp-metallic')) return ppfGlossMetallic;
      if (s.contains('xp-retro-matte')) return ppfRetroMatte;
      if (s.contains('supreme-top') || s.contains('xp-crystal')) return ppfClear;
      if (s.contains('xp-graphite')) {
        return const WrapMaterial(
          roughness: 0.08,
          metallic: 0.0,
          clearCoat: 0.30,
          specularStrength: 0.5,
          isPpf: true,
          vlt: 0.366,
        );
      }
      if (s.contains('xp-moonlight')) {
        return const WrapMaterial(
          roughness: 0.08,
          metallic: 0.0,
          clearCoat: 0.30,
          specularStrength: 0.5,
          isPpf: true,
          vlt: 0.422,
        );
      }
      if (s.contains('xp-gold-black')) {
        return const WrapMaterial(
          roughness: 0.08,
          metallic: 0.0,
          clearCoat: 0.36,
          specularStrength: 0.55,
          isPpf: true,
          isAurora: true,
          auroraColors: [Color(0xFF3A2C1A), Color(0xFF6E5A2D)],
          vlt: 0.3099,
        );
      }
    }

    // G SUIT
    if (b.contains('g suit')) {
      if (s.contains('black-hg')) {
        return const WrapMaterial(
          roughness: 0.02,
          metallic: 0.0,
          clearCoat: 1.0,
          coatRoughness: 0.01,
          specularStrength: 3.2,
          isPpf: true,
        );
      }
      if (s.contains('clear-matt')) return ppfClearMatte;
      if (s.contains('satin-matt')) return ppfSatin;
      if (has('carbon')) return ppfPattern;
      if (has('windshield') || has('heat cut')) return ppfClear;
      if (has('light') || has('soft-black') || has('dark-black') || has('violet') || has('gray')) {
        return ppfLightTint;
      }
    }

    // IVIOS / Kaizer / Axion
    if (b.contains('ivios') || b.contains('kaizer') || has('axion')) {
      if (has('forged')) return ppfForgedCarbon;
      if (has('carbon')) return ppfPattern;
      if (has('aurora') || has('coast-green') || has('opal-violet') || has('lake-blue')) {
        return ppfAurora(const Color(0xFF1B5E20), const Color(0xFF4A148C), const Color(0xFF1565C0));
      }
      if (has('axion') || has('perform-x') || has('windshield')) return ppfClear;
    }

    // FLEXIShield / REFLEX
    if (b.contains('flexishield') || b.contains('reflex')) {
      if (s.startsWith('dm-') || has('chameleon') || has('flip')) {
        return ppfAurora(const Color(0xFF1565C0), const Color(0xFF6A1B9A), const Color(0xFF26A69A));
      }
      if (s.startsWith('hg-') || has('metallic')) return ppfGlossMetallic;
      if (s.startsWith('tp-') || has('texture') || has('carbon')) return ppfPattern;
      if (s.startsWith('cl-')) return ppfGloss;
    }

    // 3M / Avery / TeckWrap 코드 기반 보정
    if (b.contains('3m') || b.contains('avery') || b.contains('teckwrap')) {
      // 카탈로그에 명시된 finish가 있으면 SKU 접미사 추론보다 우선 적용
      if (f == 'satin' || f.contains('satin') && !f.contains('metallic') && !f.contains('chrome')) return satin;
      if (f == 'super matte' || f.contains('super matte') || f.contains('dead matte')) return superMatte;
      if (f == 'matte' || f.contains('matte') && !f.contains('metallic') && !f.contains('satin')) return matte;
      // finish가 불명확한 경우 SKU 접미사로 추론 (fallback)
      if (s.endsWith('-o')) return gloss;
      if (s.endsWith('-m')) return glossMetallic;
      if (s.endsWith('-s')) return satin;
      if (s.endsWith('-x')) return carbonFiber;
      if (s.startsWith('hgp') || s.startsWith('gp') || s.startsWith('sp')) {
        return pearl;
      }
      if (s.startsWith('br') || s.startsWith('sb') || s.startsWith('mx') || s.startsWith('cfs')) {
        return carbonFiber;
      }
      if (has('brushed')) return brushedMetal;
      if (has('colorflow') || has('chameleon') || has('flip')) {
        return chameleon(const Color(0xFF2E7D32), const Color(0xFF6A1B9A), const Color(0xFF1565C0));
      }
      if (has('mirror chrome') || has('conform chrome') || has('chrome')) return chrome;
      if (has('satin chrome') || has('neo chrome')) return satinChrome;
      if (has('glitter') || has('diamond')) return glitter;
      if (has('carbon')) return carbonFiber;
    }

    return fromFinish(finish);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Isolate 전달용 레코드 타입 (primitive만 포함 → SendPort 직렬화 가능)
// ─────────────────────────────────────────────────────────────────────────────

typedef _PbrArgs = ({
  Uint8List vehicleBytes,
  Uint8List maskBytes,
  Uint8List? normalMapBytes,
  Uint8List? roughnessMapBytes,
  Uint8List? flakeMapBytes,
  Uint8List? clearcoatMapBytes,
  int baseColorValue,
  double roughness,
  double metallic,
  double flakeDensity,
  double clearCoat,
  double coatRoughness,
  double anisotropy,
  double specularStrength,
  bool isChameleon,
  List<int> chameleonColorValues,
  bool isCarbonFiber,
  bool isGlitter,
  bool isHolographic,
  bool isPpf,
  bool isAurora,
  List<int> auroraColorValues,
  bool isForgedCarbon,
  double shimmerIntensity,
  double vlt,
});

/// Isolate에서 실행되는 PBR 픽셀 처리 함수 (top-level = SendPort 전달 가능).
Uint8List _pbrRenderWork(_PbrArgs a) {
  final baseColor = Color(a.baseColorValue);
  final chameleonColors = a.chameleonColorValues.map(Color.new).toList();
  final auroraColors = a.auroraColorValues.map(Color.new).toList();
  final material = WrapMaterial(
    roughness: a.roughness,
    metallic: a.metallic,
    flakeDensity: a.flakeDensity,
    clearCoat: a.clearCoat,
    coatRoughness: a.coatRoughness,
    anisotropy: a.anisotropy,
    specularStrength: a.specularStrength,
    isChameleon: a.isChameleon,
    chameleonColors: chameleonColors,
    isCarbonFiber: a.isCarbonFiber,
    isGlitter: a.isGlitter,
    isHolographic: a.isHolographic,
    isPpf: a.isPpf,
    isAurora: a.isAurora,
    auroraColors: auroraColors,
    isForgedCarbon: a.isForgedCarbon,
    shimmerIntensity: a.shimmerIntensity,
    vlt: a.vlt,
  );

  final origImg = img.decodeImage(a.vehicleBytes);
  final maskImg = a.maskBytes.isEmpty ? null : img.decodeImage(a.maskBytes);
  final normalMapImg = a.normalMapBytes == null
      ? null
      : img.decodeImage(a.normalMapBytes!);
  final roughnessMapImg = a.roughnessMapBytes == null
      ? null
      : img.decodeImage(a.roughnessMapBytes!);
  final flakeMapImg = a.flakeMapBytes == null
      ? null
      : img.decodeImage(a.flakeMapBytes!);
  final clearcoatMapImg = a.clearcoatMapBytes == null
      ? null
      : img.decodeImage(a.clearcoatMapBytes!);
  if (origImg == null || maskImg == null) {
    throw StateError('PbrCompositor: 이미지 디코딩 실패');
  }

  final resizedMask = img.copyResize(
    maskImg,
    width: origImg.width,
    height: origImg.height,
    interpolation: img.Interpolation.average,
  );
  final resizedNormalMap = normalMapImg == null
      ? null
      : img.copyResize(
          normalMapImg,
          width: origImg.width,
          height: origImg.height,
          interpolation: img.Interpolation.linear,
        );
  final resizedRoughnessMap = roughnessMapImg == null
      ? null
      : img.copyResize(
          roughnessMapImg,
          width: origImg.width,
          height: origImg.height,
          interpolation: img.Interpolation.linear,
        );
  final resizedFlakeMap = flakeMapImg == null
      ? null
      : img.copyResize(
          flakeMapImg,
          width: origImg.width,
          height: origImg.height,
          interpolation: img.Interpolation.linear,
        );
  final resizedClearcoatMap = clearcoatMapImg == null
      ? null
      : img.copyResize(
          clearcoatMapImg,
          width: origImg.width,
          height: origImg.height,
          interpolation: img.Interpolation.linear,
        );

  final out = img.Image.from(origImg);
  final rng = Random();

  final chameleonLut = PbrCompositor._buildChameleonLut(material, baseColor);
  final spectrumLut = material.isHolographic ? PbrCompositor._buildSpectrumLut() : null;
  final auroraLut = PbrCompositor._buildAuroraLut(material, baseColor);

  for (int y = 0; y < out.height; y++) {
    for (int x = 0; x < out.width; x++) {
      final mP = resizedMask.getPixel(x, y);
      final maskVal = (mP.r + mP.g + mP.b) / (3.0 * 255.0);
      if (maskVal < 0.05) continue;

      final src = origImg.getPixel(x, y);
      final srcR = src.r.toDouble();
      final srcG = src.g.toDouble();
      final srcB = src.b.toDouble();
      final lum = (0.2126 * srcR + 0.7152 * srcG + 0.0722 * srcB) / 255.0;
      final roughnessOverride = resizedRoughnessMap == null
          ? null
          : (((resizedRoughnessMap.getPixel(x, y).r +
                          resizedRoughnessMap.getPixel(x, y).g +
                          resizedRoughnessMap.getPixel(x, y).b) /
                      3.0) /
                  255.0)
              .clamp(0.0, 1.0);
      final flakeDensityOverride = resizedFlakeMap == null
          ? null
          : max(
              material.flakeDensity,
              (((resizedFlakeMap.getPixel(x, y).r +
                                  resizedFlakeMap.getPixel(x, y).g +
                                  resizedFlakeMap.getPixel(x, y).b) /
                              3.0) /
                          255.0)
                      .clamp(0.0, 1.0),
            );
      final clearCoatOverride = resizedClearcoatMap == null
          ? null
          : max(
              material.clearCoat,
              (((resizedClearcoatMap.getPixel(x, y).r +
                                  resizedClearcoatMap.getPixel(x, y).g +
                                  resizedClearcoatMap.getPixel(x, y).b) /
                              3.0) /
                          255.0)
                      .clamp(0.0, 1.0),
            );
      final microNormalInfluence = resizedNormalMap == null
          ? 0.0
          : (((resizedNormalMap.getPixel(x, y).r - 128).abs() +
                      (resizedNormalMap.getPixel(x, y).g - 128).abs()) /
                  255.0)
              .clamp(0.0, 1.0);

      final pbrResult = PbrCompositor._renderPixel(
        srcR: srcR,
        srcG: srcG,
        srcB: srcB,
        lum: lum,
        baseColor: baseColor,
        material: material,
        x: x,
        y: y,
        rng: rng,
        chameleonLut: chameleonLut,
        spectrumLut: spectrumLut,
        auroraLut: auroraLut,
        roughnessOverride: roughnessOverride,
        flakeDensityOverride: flakeDensityOverride,
        clearCoatOverride: clearCoatOverride,
        microNormalInfluence: microNormalInfluence,
      );

      final coverage = ((maskVal - 0.05) / 0.35).clamp(0.0, 1.0);
      final blendedR = (pbrResult.r * coverage + srcR * (1 - coverage)).round().clamp(0, 255);
      final blendedG = (pbrResult.g * coverage + srcG * (1 - coverage)).round().clamp(0, 255);
      final blendedB = (pbrResult.b * coverage + srcB * (1 - coverage)).round().clamp(0, 255);

      out.setPixelRgba(x, y, blendedR, blendedG, blendedB, 255);
    }
  }

  return Uint8List.fromList(img.encodePng(out));
}

// ─────────────────────────────────────────────────────────────────────────────
// PbrCompositor — 메인 렌더러
// ─────────────────────────────────────────────────────────────────────────────

class PbrCompositor {
  /// 마스크 기반 PBR 합성.
  ///
  /// - maskBytes: 차량 바디 세그멘테이션 마스크 (white=차량, black=배경)
  /// - baseColor: 디자인 허브에서 선택한 정확한 랩핑 색상
  /// - material: WrapMaterial PBR 파라미터
  static Future<File> composite({
    required File vehicleImage,
    required List<int> maskBytes,
    required Color baseColor,
    required WrapMaterial material,
    Uint8List? normalMapBytes,
    Uint8List? roughnessMapBytes,
    Uint8List? flakeMapBytes,
    Uint8List? clearcoatMapBytes,
  }) async {
    final vehicleBytes = await vehicleImage.readAsBytes();

    // 픽셀 루프 전체를 별도 Isolate에서 실행 → 메인 스레드 블로킹 없음
    final resultBytes = await Isolate.run(() => _pbrRenderWork((
      vehicleBytes: vehicleBytes,
      maskBytes: Uint8List.fromList(maskBytes),
      normalMapBytes: normalMapBytes,
      roughnessMapBytes: roughnessMapBytes,
      flakeMapBytes: flakeMapBytes,
      clearcoatMapBytes: clearcoatMapBytes,
      baseColorValue: baseColor.toARGB32(),
      roughness: material.roughness,
      metallic: material.metallic,
      flakeDensity: material.flakeDensity,
      clearCoat: material.clearCoat,
      coatRoughness: material.coatRoughness,
      anisotropy: material.anisotropy,
      specularStrength: material.specularStrength,
      isChameleon: material.isChameleon,
      chameleonColorValues: material.chameleonColors.map((c) => c.toARGB32()).toList(),
      isCarbonFiber: material.isCarbonFiber,
      isGlitter: material.isGlitter,
      isHolographic: material.isHolographic,
      isPpf: material.isPpf,
      isAurora: material.isAurora,
      auroraColorValues: material.auroraColors.map((c) => c.toARGB32()).toList(),
      isForgedCarbon: material.isForgedCarbon,
      shimmerIntensity: material.shimmerIntensity,
      vlt: material.vlt,
    )));

    final outFile = File(
      p.join(
        Directory.systemTemp.path,
        'pbr_wrap_${DateTime.now().millisecondsSinceEpoch}.png',
      ),
    );
    await outFile.writeAsBytes(resultBytes);
    return outFile;
  }

  // ── 픽셀 단위 PBR 렌더링 ──────────────────────────────────────────────────

  static ({double r, double g, double b}) _renderPixel({
    required double srcR,
    required double srcG,
    required double srcB,
    required double lum,
    required Color baseColor,
    required WrapMaterial material,
    required int x,
    required int y,
    required Random rng,
    required List<Color>? chameleonLut,
    required List<Color>? spectrumLut,
    required List<Color>? auroraLut,
    double? roughnessOverride,
    double? flakeDensityOverride,
    double? clearCoatOverride,
    double microNormalInfluence = 0.0,
  }) {
    final localRoughness = (roughnessOverride ?? material.roughness).clamp(
      0.0,
      1.0,
    );
    final localFlakeDensity = (flakeDensityOverride ?? material.flakeDensity)
        .clamp(0.0, 1.0);
    final localClearCoat = (clearCoatOverride ?? material.clearCoat).clamp(
      0.0,
      1.0,
    );
    final adjustedLum = (lum * (0.92 + microNormalInfluence * 0.20)).clamp(
      0.0,
      1.0,
    );

    // ── 베이스 컬러 결정 ─────────────────────────────────────────────────────

    double bR = (baseColor.r * 255.0).roundToDouble();
    double bG = (baseColor.g * 255.0).roundToDouble();
    double bB = (baseColor.b * 255.0).roundToDouble();

    // 카멜레온: 휘도로 보는 각도 시뮬레이션 → 색상 전환
    if (material.isChameleon &&
        chameleonLut != null &&
        chameleonLut.isNotEmpty) {
      final idx = (lum * (chameleonLut.length - 1)).round().clamp(
        0,
        chameleonLut.length - 1,
      );
      final cc = chameleonLut[idx];
      bR = (cc.r * 255.0).roundToDouble();
      bG = (cc.g * 255.0).roundToDouble();
      bB = (cc.b * 255.0).roundToDouble();
    }

    // 홀로그래픽: 레인보우 스펙트럼
    if (material.isHolographic && spectrumLut != null) {
      final idx = (lum * 255).round().clamp(0, 255);
      final sc = spectrumLut[idx];
      bR = bR * 0.25 + (sc.r * 255.0) * 0.75;
      bG = bG * 0.25 + (sc.g * 255.0) * 0.75;
      bB = bB * 0.25 + (sc.b * 255.0) * 0.75;
    }

    // Aurora: Fresnel 기반 smooth-S 색상 전환 (PPF Aurora/ColorShift 계열)
    // 휘도를 보는 각도(cosTheta)로 사용: 하이라이트=정면, 어두운 영역=측면
    if (material.isAurora && auroraLut != null && auroraLut.isNotEmpty) {
      final idx = (lum * (auroraLut.length - 1)).round().clamp(
        0,
        auroraLut.length - 1,
      );
      final ac = auroraLut[idx];
      bR = (ac.r * 255.0).roundToDouble();
      bG = (ac.g * 255.0).roundToDouble();
      bB = (ac.b * 255.0).roundToDouble();
    }

    // ── 주변광 반사 (Ambient) ─────────────────────────────────────────────────
    // roughness가 높을수록 환경광(원본 픽셀 색상) 반사가 줄어든다
    final ambientMix = 0.06 + localRoughness * 0.10;
    final diffR = bR * (1 - ambientMix) + srcR * ambientMix;
    final diffG = bG * (1 - ambientMix) + srcG * ambientMix;
    final diffB = bB * (1 - ambientMix) + srcB * ambientMix;

    // ── 확산 반사 (Diffuse) ───────────────────────────────────────────────────
    // 휘도로 shadowing 표현: 그림자는 더 어둡게
    final shadowGamma = localRoughness < 0.5 ? 0.85 : 0.78;
    final baseLuma = (0.2126 * bR + 0.7152 * bG + 0.0722 * bB) / 255.0;
    var lumFloor = material.metallic < 0.35
        ? (localRoughness >= 0.6 ? 0.32 : 0.26)
        : (localRoughness >= 0.6 ? 0.24 : 0.18);
    if (baseLuma < 0.18 && material.metallic < 0.35) {
      // Very dark non-metal colors need a higher floor to avoid black-clipping.
      lumFloor = min(0.42, lumFloor + 0.08);
    }
    final lumDiffuse = max(pow(adjustedLum, shadowGamma).toDouble(), lumFloor);
    double finalR = diffR * lumDiffuse;
    double finalG = diffG * lumDiffuse;
    double finalB = diffB * lumDiffuse;

    if (material.metallic < 0.35) {
      final flatten = (1.0 - adjustedLum).clamp(0.0, 1.0) * 0.16;
      finalR = finalR * (1.0 - flatten) + bR * flatten;
      finalG = finalG * (1.0 - flatten) + bG * flatten;
      finalB = finalB * (1.0 - flatten) + bB * flatten;
    }

    // ── 스펙큘러 반사 (Specular) ──────────────────────────────────────────────
    if (material.specularStrength > 0) {
      // roughness → 스펙큘러 지수 (낮은 roughness = 날카로운 하이라이트)
      final specExp = max(1.0, pow(1.0 - localRoughness, 2.0) * 140.0);
      final rawSpec =
          pow(adjustedLum, specExp).toDouble() * material.specularStrength;

      // 금속성: 스펙큘러를 베이스 컬러로 착색 (비금속은 흰색)
      final specTintR = material.metallic > 0.4 ? bR / 255.0 : 1.0;
      final specTintG = material.metallic > 0.4 ? bG / 255.0 : 1.0;
      final specTintB = material.metallic > 0.4 ? bB / 255.0 : 1.0;

      finalR += rawSpec * specTintR * 255.0;
      finalG += rawSpec * specTintG * 255.0;
      finalB += rawSpec * specTintB * 255.0;
    }

    // ── 클리어 코트 (Clear Coat) ──────────────────────────────────────────────
    // 유광 표면의 2차 스펙큘러 레이어 (차체 도료처럼 광택층이 별도 존재)
    if (localClearCoat > 0) {
      // coatRoughness가 지정된 경우 (PPF) 더 날카로운 하이라이트 지수 사용
      final effectiveCoatR = material.coatRoughness > 0.0
          ? material.coatRoughness
          : 0.04; // 기본 클리어 코트 roughness
      final coatExp = max(60.0, (1.0 - effectiveCoatR) * 240.0);
      final coatSpec =
          pow(adjustedLum, coatExp).toDouble() * localClearCoat * 200.0;
      finalR += coatSpec;
      finalG += coatSpec;
      finalB += coatSpec;
    }

    // ── 이방성 스펙큘러 (Brushed Metal) ──────────────────────────────────────
    // 수평 줄 방향으로 정렬된 하이라이트 — 3M Brushed Steel 재현
    if (material.anisotropy > 0) {
      final striation =
          (sin(y * 1.4) * 0.5 + 0.5) * (sin(y * 5.3) * 0.15 + 0.85);
      final anisoSpec =
          pow(striation * adjustedLum, 9.0).toDouble() *
          material.anisotropy *
          190.0;
      // 금속 스펙큘러는 베이스 컬러 착색
      finalR += anisoSpec * (bR / 255.0);
      finalG += anisoSpec * (bG / 255.0);
      finalB += anisoSpec * (bB / 255.0);
    }

    // ── 플레이크 (Metallic / Pearl) ───────────────────────────────────────────
    if (localFlakeDensity > 0 && !material.isGlitter) {
      final noise = rng.nextDouble();
      // 플레이크 확률: 밀도에 따라 랜덤 점등
      if (noise > (1.0 - localFlakeDensity * 0.45)) {
        final intensity = pow(
          (noise - (1.0 - localFlakeDensity * 0.45)) /
              (localFlakeDensity * 0.45),
          0.6,
        ).toDouble();
        final flare = intensity * adjustedLum * 50.0;
        finalR += flare;
        finalG += flare;
        finalB += flare;
      }
    }

    // ── 글리터 (Super Glitter / Diamond) ─────────────────────────────────────
    // 밀집 스파클: TeckWrap Super Glitter / Diamond 시리즈
    if (material.isGlitter) {
      final noise = rng.nextDouble();
      final threshold = 1.0 - material.flakeDensity;
      if (noise > threshold) {
        final t = (noise - threshold) / material.flakeDensity;
        final sparkle = pow(t, 0.4).toDouble() * lum * 220.0;
        finalR += sparkle;
        finalG += sparkle;
        finalB += sparkle;
      }
    }

    // ── 시머 플레이크 (PPF Retro Matte) ──────────────────────────────────────
    // ULTRAFIT XP Retro — 무광 배경에 5~10% 소형 반금속 플레이크
    if (material.shimmerIntensity > 0) {
      final sNoise = rng.nextDouble();
      final threshold = 1.0 - material.shimmerIntensity * 3.5;
      if (sNoise > threshold) {
        final t = (sNoise - threshold) / (material.shimmerIntensity * 3.5);
        final shimmerFlare = pow(t, 0.5).toDouble() * lum * 35.0;
        finalR += shimmerFlare;
        finalG += shimmerFlare;
        finalB += shimmerFlare;
      }
    }

    // ── PPF Forged Carbon (G SUIT / IVIOS — 불규칙 패치 이방성) ─────────────
    // 16×16 픽셀 패치마다 랜덤 방향의 이방성 하이라이트 → Forged Carbon 질감
    if (material.isForgedCarbon) {
      final patchX = x ~/ 16;
      final patchY = y ~/ 16;
      // 결정론적 패치 해시 → 0~π 방향
      final patchHash = ((patchX * 1619 + patchY * 31337) & 0xFFFF) / 65535.0;
      final angle = patchHash * pi;
      final lx = (x % 16) - 8;
      final ly = (y % 16) - 8;
      final rotU = lx * cos(angle) + ly * sin(angle);
      final anisoStriation = (sin(rotU * 0.75) * 0.5 + 0.5) * lum;
      final forgedSpec = pow(anisoStriation, 7.0).toDouble() * 130.0;
      finalR += forgedSpec * (bR / 255.0);
      finalG += forgedSpec * (bG / 255.0);
      finalB += forgedSpec * (bB / 255.0);
    }

    // ── PPF 엣지 두께 굴절 효과 (8~10mil 필름 두께 시각화) ───────────────────
    // 마스크 경계부에서 미세 굴절로 인한 밝기 변화 — composite() 단계에서 처리됨

    // ── VLT 가시광 투과율 (헤드라이트 틴팅 필름) ──────────────────────────────
    // ULTRAFIT XP Graphite: 36.6% VLT — 낮을수록 더 어둡게 (틴팅 효과)
    if (material.vlt < 0.99) {
      finalR *= material.vlt;
      finalG *= material.vlt;
      finalB *= material.vlt;
    }

    // ── 카본 파이버 직조 패턴 ─────────────────────────────────────────────────
    // 3M / Avery Carbon Fiber — 8×8 평직(Plain Weave) 시뮬레이션
    if (material.isCarbonFiber) {
      final wx = x % 8;
      final wy = y % 8;
      // 격자 셀: 짝수 셀은 수평, 홀수 셀은 수직 파이버
      final cellH = (wx ~/ 4 + wy ~/ 4) % 2 == 0;
      final fiberT = cellH ? (wx % 4) / 3.0 : (wy % 4) / 3.0;
      // 파이버 하이라이트: 포물선형으로 중앙이 밝고 가장자리가 어두움
      final fiberHighlight = sin(fiberT * pi) * 0.22 * lum;
      // 파이버 방향에 따른 명암 변화
      final dirFactor = cellH
          ? (1.0 + sin(wx * pi / 4.0) * 0.18)
          : (0.82 - sin(wy * pi / 4.0) * 0.15);

      finalR = (finalR * dirFactor + fiberHighlight * 255.0).clamp(0.0, 255.0);
      finalG = (finalG * dirFactor + fiberHighlight * 255.0).clamp(0.0, 255.0);
      finalB = (finalB * dirFactor + fiberHighlight * 255.0).clamp(0.0, 255.0);
    }

    // ── ACES Filmic 톤 매핑 ────────────────────────────────────────────────────
    // HDR 과노출 영역을 자연스럽게 롤오프 — 크롬/하이라이트 번짐 방지
    finalR = _acesToneMap(finalR / 255.0) * 255.0;
    finalG = _acesToneMap(finalG / 255.0) * 255.0;
    finalB = _acesToneMap(finalB / 255.0) * 255.0;

    return (
      r: finalR.clamp(0.0, 255.0),
      g: finalG.clamp(0.0, 255.0),
      b: finalB.clamp(0.0, 255.0),
    );
  }

  // ── ACES Filmic 톤 매핑 (Narkowicz 근사) ────────────────────────────────────
  // 입력: 0.0~∞ (선형 HDR), 출력: 0.0~1.0 (클리핑 없는 S-커브 롤오프)
  static double _acesToneMap(double x) {
    const a = 2.51;
    const b = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;
    if (x <= 0.0) return 0.0;
    return ((x * (a * x + b)) / (x * (c * x + d) + e)).clamp(0.0, 1.0);
  }

  // ── 카멜레온 색상 LUT (256 엔트리) ───────────────────────────────────────────

  static List<Color>? _buildChameleonLut(
    WrapMaterial material,
    Color baseColor,
  ) {
    if (!material.isChameleon) return null;
    final colors = material.chameleonColors;

    // 색상 정보 없으면 베이스 컬러 단일 사용 (카멜레온 없음)
    if (colors.isEmpty) return List.filled(256, baseColor);

    // 3가지 색상이면 그라디언트 (색상1→색상2→색상3)
    // 2가지 색상이면 선형 보간
    return List.generate(256, (i) {
      final t = i / 255.0;
      if (colors.length == 1) return colors[0];
      if (colors.length == 2) {
        return Color.lerp(colors[0], colors[1], t)!;
      }
      // 3가지: 0~0.5 → color0→color1, 0.5~1.0 → color1→color2
      if (t < 0.5) {
        return Color.lerp(colors[0], colors[1], t * 2.0)!;
      } else {
        return Color.lerp(colors[1], colors[2], (t - 0.5) * 2.0)!;
      }
    });
  }

  // ── Aurora Fresnel 색상 LUT (256 엔트리) ────────────────────────────────────
  // Smoothstep S-커브로 보는 각도(휘도)에 따라 auroraColors 간 전환

  static List<Color>? _buildAuroraLut(WrapMaterial material, Color baseColor) {
    if (!material.isAurora) return null;
    final colors = material.auroraColors;
    if (colors.isEmpty) return List.filled(256, baseColor);

    return List.generate(256, (i) {
      final t = i / 255.0;
      // Smoothstep S-커브: Fresnel 전환의 물리적 특성 (빠른 각도 변화)
      final st = t * t * (3.0 - 2.0 * t);
      if (colors.length == 1) return colors[0];
      if (colors.length == 2) {
        return Color.lerp(colors[0], colors[1], st)!;
      }
      // 3색: 0~0.5 → color0→color1, 0.5~1.0 → color1→color2
      if (t < 0.5) {
        final t2 = t * 2.0;
        final st2 = t2 * t2 * (3.0 - 2.0 * t2);
        return Color.lerp(colors[0], colors[1], st2)!;
      } else {
        final t2 = (t - 0.5) * 2.0;
        final st2 = t2 * t2 * (3.0 - 2.0 * t2);
        return Color.lerp(colors[1], colors[2], st2)!;
      }
    });
  }

  // ── 홀로그래픽 스펙트럼 LUT ───────────────────────────────────────────────

  static List<Color> _buildSpectrumLut() {
    return List.generate(256, (i) {
      // 휘도 → 무지개 색상 매핑 (Visible spectrum 700nm~380nm)
      final hue = (i / 255.0) * 300.0; // 0(빨강)~300(보라)
      return HSLColor.fromAHSL(1.0, hue, 0.90, 0.50).toColor();
    });
  }
}
