import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../l10n.dart';
import '../services/booking_service.dart';
import '../theme.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  // ── 상태 ──────────────────────────────────────────────────────────────────
  List<RekoraShop> _shops = [];
  bool _loadingShops = true;
  RekoraShop? _selectedShop;

  final _vehicleMakeCtrl = TextEditingController();
  final _vehicleModelCtrl = TextEditingController();
  final _vehicleYearCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  String _wrapType = 'full-wrap';
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 3));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 14, minute: 0);

  bool _submitting = false;
  bool _submitted = false;
  String? _errorMessage;

  static const _wrapTypes = [
    'full-wrap',
    'partial-wrap',
    'ppf',
    'consultation',
  ];

  // ── 생명주기 ──────────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _loadShops();
  }

  @override
  void dispose() {
    _vehicleMakeCtrl.dispose();
    _vehicleModelCtrl.dispose();
    _vehicleYearCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  // ── 데이터 로딩 ───────────────────────────────────────────────────────────
  Future<void> _loadShops() async {
    try {
      final shops = await BookingService.fetchShops();
      if (mounted) setState(() { _shops = shops; });
    } catch (_) {
      // 로딩 실패 시 빈 목록 — 수동 입력으로 진행
    } finally {
      if (mounted) setState(() { _loadingShops = false; });
    }
  }

  // ── 날짜/시간 선택 ─────────────────────────────────────────────────────────
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked != null) setState(() { _selectedDate = picked; });
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) setState(() { _selectedTime = picked; });
  }

  // ── 예약 제출 ──────────────────────────────────────────────────────────────
  Future<void> _submit() async {
    final l10n = L10n.of(context);
    if (_selectedShop == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tx('시공점을 선택해 주세요.', 'Please select a shop.'))),
      );
      return;
    }
    if (_vehicleMakeCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tx('차량 제조사를 입력해 주세요.', 'Please enter the vehicle make.'))),
      );
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final timeStr = _selectedTime.format(context);
      final yearText = _vehicleYearCtrl.text.trim();

      await BookingService.createBooking(
        shopId: _selectedShop!.id,
        vehicleMake: _vehicleMakeCtrl.text.trim(),
        vehicleModel: _vehicleModelCtrl.text.trim(),
        vehicleYear: yearText.isNotEmpty ? int.tryParse(yearText) : null,
        wrapType: _wrapType,
        preferredDate: dateStr,
        preferredTime: timeStr,
        notes: _notesCtrl.text.trim(),
      );

      if (mounted) setState(() { _submitted = true; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = l10n.tx(
            '예약 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
            'An error occurred while sending the booking. Please try again later.',
          );
        });
      }
    } finally {
      if (mounted) setState(() { _submitting = false; });
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    if (_submitted) return _SuccessView(shopName: _selectedShop?.name ?? '');

    return Scaffold(
      appBar: AppBar(title: Text(l10n.tx('시공 예약', 'Booking'))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionHeader(l10n.tx('시공점 선택', 'Select Shop')),
            const SizedBox(height: 8),
            _ShopSelector(
              shops: _shops,
              loading: _loadingShops,
              selected: _selectedShop,
              onSelected: (shop) => setState(() { _selectedShop = shop; }),
            ),
            const SizedBox(height: 24),
            _sectionHeader(l10n.tx('차량 정보', 'Vehicle Information')),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: _field(_vehicleMakeCtrl, l10n.tx('제조사 (예: 현대, BMW)', 'Make (e.g. Hyundai, BMW)'), required: true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _field(_vehicleModelCtrl, l10n.tx('모델 (예: 아반떼, 3 Series)', 'Model (e.g. Elantra, 3 Series)')),
              ),
            ]),
            const SizedBox(height: 12),
            _field(_vehicleYearCtrl, l10n.tx('연식 (예: 2023)', 'Year (e.g. 2023)'),
                keyboardType: TextInputType.number),
            const SizedBox(height: 24),
            _sectionHeader(l10n.tx('랩핑 유형', 'Wrap Type')),
            const SizedBox(height: 8),
            _WrapTypeSelector(
              selected: _wrapType,
              options: _wrapTypes,
              onChanged: (v) => setState(() { _wrapType = v; }),
            ),
            const SizedBox(height: 24),
            _sectionHeader(l10n.tx('희망 일정', 'Preferred Schedule')),
            const SizedBox(height: 8),
            _DateTimeRow(
              date: _selectedDate,
              time: _selectedTime,
              onPickDate: _pickDate,
              onPickTime: _pickTime,
            ),
            const SizedBox(height: 24),
            _sectionHeader(l10n.tx('요청 사항', 'Request Notes')),
            const SizedBox(height: 8),
            TextField(
              controller: _notesCtrl,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: l10n.tx(
                  '예: 파셜 랩핑 문의, PPF 제거 필요, 대차 서비스 문의 등',
                  'e.g. partial wrap inquiry, PPF removal request, courtesy car request',
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                fillColor: WrapTheme.card(context),
                filled: true,
              ),
            ),
            const SizedBox(height: 24),
            _ChecklistSection(),
            const SizedBox(height: 24),
            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
              const SizedBox(height: 8),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        l10n.tx('예약 접수', 'Submit Booking'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title) => Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
      );

  Widget _field(TextEditingController ctrl, String hint,
      {bool required = false, TextInputType? keyboardType}) =>
      TextField(
        controller: ctrl,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          hintText: hint,
          labelText: required ? '$hint *' : hint,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          fillColor: WrapTheme.card(context),
          filled: true,
        ),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop Selector
// ─────────────────────────────────────────────────────────────────────────────

class _ShopSelector extends StatelessWidget {
  const _ShopSelector({
    required this.shops,
    required this.loading,
    required this.selected,
    required this.onSelected,
  });

  final List<RekoraShop> shops;
  final bool loading;
  final RekoraShop? selected;
  final ValueChanged<RekoraShop> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    if (loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(),
        ),
      );
    }
    if (shops.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WrapTheme.card(context),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WrapTheme.border(context)),
        ),
        child: Text(
          l10n.tx(
            '시공점 목록을 불러올 수 없습니다. 네트워크 상태를 확인해 주세요.',
            'Unable to load the shop list. Please check your network connection.',
          ),
          style: TextStyle(color: WrapTheme.mutedText(context)),
        ),
      );
    }

    return SizedBox(
      height: 160,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: shops.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final shop = shops[i];
          final isSelected = selected?.id == shop.id;
          return GestureDetector(
            onTap: () => onSelected(shop),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 220,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary.withAlpha(20)
                    : WrapTheme.card(context),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected
                      ? Theme.of(context).colorScheme.primary
                      : WrapTheme.border(context),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          shop.name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isSelected)
                        Icon(Icons.check_circle,
                            size: 16, color: Theme.of(context).colorScheme.primary),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 12, color: Colors.amber),
                      const SizedBox(width: 2),
                      Text(
                        '${shop.rating.toStringAsFixed(1)} (${shop.reviewCount})',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    shop.address,
                    style: TextStyle(fontSize: 11, color: WrapTheme.mutedText(context)),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Spacer(),
                  Wrap(
                    spacing: 4,
                    children: shop.specialties.take(2).map((s) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withAlpha(20),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          s,
                          style: TextStyle(
                            fontSize: 10,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrap Type Selector
// ─────────────────────────────────────────────────────────────────────────────

class _WrapTypeSelector extends StatelessWidget {
  const _WrapTypeSelector({
    required this.selected,
    required this.options,
    required this.onChanged,
  });

  final String selected;
  final List<String> options;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((value) {
        final l10n = L10n.of(context);
        final label = switch (value) {
          'full-wrap' => l10n.tx('전체 랩핑', 'Full Wrap'),
          'partial-wrap' => l10n.tx('부분 랩핑', 'Partial Wrap'),
          'ppf' => 'PPF',
          'consultation' => l10n.tx('상담만', 'Consultation'),
          _ => value,
        };
        final isSelected = selected == value;
        return ChoiceChip(
          label: Text(label),
          selected: isSelected,
          onSelected: (_) => onChanged(value),
        );
      }).toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Date / Time Row
// ─────────────────────────────────────────────────────────────────────────────

class _DateTimeRow extends StatelessWidget {
  const _DateTimeRow({
    required this.date,
    required this.time,
    required this.onPickDate,
    required this.onPickTime,
  });

  final DateTime date;
  final TimeOfDay time;
  final VoidCallback onPickDate;
  final VoidCallback onPickTime;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onPickDate,
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(DateFormat('yyyy.MM.dd').format(date)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onPickTime,
            icon: const Icon(Icons.access_time, size: 16),
            label: Text(time.format(context)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist
// ─────────────────────────────────────────────────────────────────────────────

class _ChecklistSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Column(
      children: [
        _Checklist(
          title: l10n.tx('캐스팅 필름 품질 체크', 'Cast Film Quality Check'),
          items: [
            l10n.tx('곡률 부위 후열(>90℃) 완료', 'Post-heat curved sections above 90°C'),
            l10n.tx('오렌지필/기포 체크 후 다시 밀착', 'Check orange peel or bubbles and re-squeegee'),
            l10n.tx('컷팅 후 엣지 실란트 적용', 'Apply edge sealant after trimming'),
          ],
        ),
        const SizedBox(height: 12),
        _Checklist(
          title: l10n.tx('캘린더링 필름 유의사항', 'Calendered Film Notes'),
          warning: l10n.tx(
            '곡률 큰 부위는 프라이머·히팅 필수, 단기용 권장',
            'Primer and heat are required on high-curvature areas; best for short-term use.',
          ),
          items: [
            l10n.tx('플랫/패널 부위 우선 적용', 'Prioritize flat and panel sections first'),
            l10n.tx('사전 탈지·건조 완료', 'Complete degreasing and drying in advance'),
            l10n.tx('수축 가능 부위 테이프 보강', 'Reinforce potential shrink areas with tape'),
          ],
        ),
        const SizedBox(height: 12),
        _Checklist(
          title: l10n.tx('예산·내구성 메모', 'Budget & Durability Notes'),
          items: [
            l10n.tx(
              '예산 우선이면 캘린더링, 내구성 우선이면 캐스팅',
              'Choose calendered film for budget, cast film for durability.',
            ),
            l10n.tx(
              'UV·세차 빈도에 따라 보증기간 안내',
              'Explain warranty expectations based on UV exposure and wash frequency.',
            ),
          ],
        ),
      ],
    );
  }
}

class _Checklist extends StatelessWidget {
  const _Checklist({required this.title, required this.items, this.warning});
  final String title;
  final List<String> items;
  final String? warning;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WrapTheme.card(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WrapTheme.border(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle_outline, size: 18),
              const SizedBox(width: 6),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          if (warning != null) ...[
            const SizedBox(height: 6),
            Text(warning!,
                style: const TextStyle(color: Colors.orange, fontSize: 12)),
          ],
          const SizedBox(height: 8),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(Icons.radio_button_unchecked, size: 16),
                  const SizedBox(width: 6),
                  Expanded(child: Text(item)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Success View
// ─────────────────────────────────────────────────────────────────────────────

class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.shopName});
  final String shopName;

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.tx('예약 완료', 'Booking Complete'))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, size: 72, color: Colors.green),
              const SizedBox(height: 16),
              Text(
                l10n.tx('예약이 접수되었습니다!', 'Your booking has been submitted!'),
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                shopName.isNotEmpty
                    ? l10n.tx('$shopName에서 확인 후 연락드립니다.', '$shopName will review and contact you.')
                    : l10n.tx('담당자가 확인 후 연락드립니다.', 'Our team will review and contact you.'),
                style: const TextStyle(fontSize: 15, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.tx('홈으로 돌아가기', 'Back to Home')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
