import 'package:flutter/material.dart';

class WrapTheme {
  static const Color primary = Color(0xFF4F378A);
  static const Color primaryContainer = Color(0xFF6750A4);
  static const Color secondary = Color(0xFF63597C);
  static const Color _bgLight = Color(0xFFFDF7FF);
  static const Color surface = Color(0xFFFDF7FF);
  static const Color surfaceContainer = Color(0xFFF2ECF4);
  static const Color surfaceContainerLow = Color(0xFFF8F2FA);
  static const Color onSurface = Color(0xFF1D1B20);
  static const Color onSurfaceVariant = Color(0xFF494551);
  static const Color outlineVariant = Color(0xFFCBC4D2);

  static const Color _backgroundDark = Color(0xFF0D0F1A);
  static const Color _cardDark = Color(0xFF13192A);
  static const Color _borderDark = Color(0xFF1F2740);
  static const Color _mutedTextDark = Color(0xFFB7C0D6);

  static ThemeData get light {
    final base = ThemeData(useMaterial3: true);
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      background: _bgLight,
      surface: surface,
      onSurface: onSurface,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _bgLight,
      cardColor: surface,
      iconTheme: const IconThemeData(color: Color(0xFF1D1B20)),
      primaryIconTheme: const IconThemeData(color: Color(0xFF1D1B20)),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF1D1B20),
        elevation: 0,
        centerTitle: false,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: primary.withOpacity(0.10),
        elevation: 0,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.all(
          const IconThemeData(color: Color(0xFF494551)),
        ),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF494551), fontSize: 10, letterSpacing: 0.5),
        ),
      ),
      textTheme: base.textTheme.copyWith(
        titleLarge: const TextStyle(
          fontWeight: FontWeight.w800,
          color: Color(0xFF1D1B20),
          letterSpacing: -0.5,
        ),
        bodyMedium: const TextStyle(height: 1.5, color: Color(0xFF1D1B20)),
      ),
      chipTheme: base.chipTheme.copyWith(
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          color: Color(0xFF1D1B20),
        ),
        backgroundColor: surfaceContainer,
        selectedColor: primary.withOpacity(0.12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        color: surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(32)),
        ),
      ),
    );
  }

  static ThemeData get dark {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.dark);
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
      background: _backgroundDark,
      surface: _cardDark,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _backgroundDark,
      cardColor: _cardDark,
      iconTheme: const IconThemeData(color: Colors.white70),
      primaryIconTheme: const IconThemeData(color: Colors.white70),
      appBarTheme: const AppBarTheme(
        backgroundColor: _backgroundDark,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white.withOpacity(0.04),
        indicatorColor: primary.withOpacity(0.18),
        elevation: 0,
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      textTheme: base.textTheme.copyWith(
        titleLarge: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.1),
        titleMedium: const TextStyle(fontWeight: FontWeight.w600),
        bodyMedium: const TextStyle(height: 1.4),
      ),
      chipTheme: base.chipTheme.copyWith(
        labelStyle: const TextStyle(fontWeight: FontWeight.w600),
        backgroundColor: Colors.white.withOpacity(0.08),
        selectedColor: primary.withOpacity(0.24),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
        ),
      ),
    );
  }

  static Color background([BuildContext? context]) {
    if (context == null) return _bgLight;
    return Theme.of(context).brightness == Brightness.dark
        ? _backgroundDark
        : _bgLight;
  }

  static Color card([BuildContext? context]) {
    if (context == null) return surface;
    return Theme.of(context).brightness == Brightness.dark
        ? _cardDark
        : surface;
  }

  static Color border([BuildContext? context]) {
    if (context == null) return outlineVariant;
    return Theme.of(context).brightness == Brightness.dark
        ? _borderDark
        : outlineVariant;
  }

  static Color mutedText([BuildContext? context]) {
    if (context == null) return onSurfaceVariant;
    return Theme.of(context).brightness == Brightness.dark
        ? _mutedTextDark
        : onSurfaceVariant;
  }

  static Color badge(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF23304A)
        : const Color(0xFFE8ECF5);
  }

  static Color badgeText(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? Colors.white
        : const Color(0xFF1F2A44);
  }
}
