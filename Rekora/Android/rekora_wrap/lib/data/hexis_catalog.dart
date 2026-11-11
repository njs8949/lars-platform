import 'package:flutter/material.dart';
import '../models.dart';

class HexisColorEntry {
  const HexisColorEntry({
    required this.name,
    required this.code,
    required this.finish,
  });

  final String name;
  final String code;
  final String finish;

  String get displayName => '$name ($code)';
}

const List<HexisColorEntry> hexisCatalog = [
  HexisColorEntry(name: 'Satin Chrome Blue', code: 'HX30SCH01B', finish: 'Satin Chrome'),
  HexisColorEntry(name: 'Satin Chrome Silver', code: 'HX30SCH02B', finish: 'Satin Chrome'),
  HexisColorEntry(name: 'Gloss Dragon Red', code: 'HX20DRB', finish: 'Gloss'),
];

final List<WrapColor> hexisWraps = hexisCatalog
    .map(
      (entry) => WrapColor(
        id: 'hexis-${entry.code.toLowerCase()}',
        name: entry.name,
        brand: 'Hexis Graphics',
        finish: entry.finish,
        pricePerSquareMeter: 120,
        texturePreview: entry.finish,
        swatch: const Color(0xFF1E3A8A), // Default for Blue
      ),
    )
    .toList();
