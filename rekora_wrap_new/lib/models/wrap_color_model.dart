import 'dart:math' as math;
import 'package:flutter/material.dart';

class LABColor {
  final double l;
  final double a;
  final double b;

  LABColor({required this.l, required this.a, required this.b});

  /// HEX 문자열을 LABColor로 변환
  factory LABColor.fromHex(String hexString) {
    final hex = hexString.replaceFirst('#', '');
    final int hexValue = int.parse(hex, radix: 16);

    final double r = ((hexValue >> 16) & 0xFF) / 255.0;
    final double g = ((hexValue >> 8) & 0xFF) / 255.0;
    final double b = (hexValue & 0xFF) / 255.0;

    // sRGB → XYZ (D65)
    double linearize(double c) {
      return c <= 0.04045 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
    }

    double lr = linearize(r);
    double lg = linearize(g);
    double lb = linearize(b);

    double x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
    double y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
    double z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;

    // XYZ → LAB (D65)
    const double xn = 0.95047, yn = 1.00000, zn = 1.08883;
    double fx = x / xn;
    double fy = y / yn;
    double fz = z / zn;

    double labf(double t) {
      return t > 0.008856 ? math.pow(t, 1.0 / 3.0).toDouble() : (7.787 * t) + (16.0 / 116.0);
    }

    double labL = (116 * labf(fy)) - 16;
    double labA = 500 * (labf(fx) - labf(fy));
    double labB = 200 * (labf(fy) - labf(fz));

    return LABColor(l: labL, a: labA, b: labB);
  }

  /// LABColor를 HEX 문자열로 변환
  String toHexString() {
    // LAB → XYZ
    double fy = (l + 16) / 116;
    double fx = a / 500 + fy;
    double fz = fy - b / 200;

    double xr = fx * fx * fx > 0.008856 ? fx * fx * fx : (fx - 16.0 / 116.0) / 7.787;
    double yr = fy * fy * fy > 0.008856 ? fy * fy * fy : (fy - 16.0 / 116.0) / 7.787;
    double zr = fz * fz * fz > 0.008856 ? fz * fz * fz : (fz - 16.0 / 116.0) / 7.787;

    const double xn = 0.95047, yn = 1.00000, zn = 1.08883;
    double x = xr * xn;
    double y = yr * yn;
    double z = zr * zn;

    // XYZ → sRGB
    double r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    double g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    double b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    double delinearize(double c) {
      return c <= 0.0031308 ? 12.92 * c : 1.055 * math.pow(c, 1.0 / 2.4) - 0.055;
    }

    r = delinearize(r).clamp(0.0, 1.0);
    g = delinearize(g).clamp(0.0, 1.0);
    b = delinearize(b).clamp(0.0, 1.0);

    int ri = (r * 255).toInt();
    int gi = (g * 255).toInt();
    int bi = (b * 255).toInt();

    return '#${ri.toRadixString(16).padLeft(2, '0')}${gi.toRadixString(16).padLeft(2, '0')}${bi.toRadixString(16).padLeft(2, '0')}'.toUpperCase();
  }

  @override
  String toString() => 'LABColor(L: $l, A: $a, B: $b)';
}
