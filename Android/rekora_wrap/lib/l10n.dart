import 'package:flutter/material.dart';
import 'app_state.dart';

class L10n {
  L10n(this.code);
  final String code;

  static L10n of(BuildContext context) {
    final state = AppStateScope.of(context);
    return L10n(state.language);
  }

  String tx(String ko, String en) => _pick(ko, en);

  String get languageLabel => code == 'en' ? 'English' : '한국어';

  String categoryLabel(String code) {
    final normalized = code.trim().toLowerCase();
    switch (normalized) {
      case 'all':
      case '전체':
        return _pick('전체', 'All');
      case 'general':
      case 'free':
        return _pick('자유', 'General');
      case 'review':
      case 'installation':
        return _pick('시공 후기', 'Installation');
      case 'color':
      case 'color tips':
        return _pick('컬러 추천', 'Color Tips');
      case 'care':
        return _pick('케어/관리', 'Care');
      case 'partial':
      case 'partial wrap':
        return _pick('부분 랩핑', 'Partial Wrap');
      case 'coating':
        return _pick('코팅/보호', 'Coating');
      case 'notice':
      case '공지':
        return _pick('공지', 'Notice');
      case 'guide':
      case '가이드':
        return _pick('가이드', 'Guide');
      case 'featured':
      case '추천':
        return _pick('추천', 'Featured');
      default:
        return normalized;
    }
  }

  String vehicleCategoryName(String code) {
    switch (code) {
      case 'sedan':
        return _pick('세단', 'Sedan');
      case 'suv':
        return _pick('SUV', 'SUV');
      case 'coupe':
        return _pick('쿠페', 'Coupe');
      case 'hatchback':
        return _pick('해치백', 'Hatchback');
      default:
        return code;
    }
  }

  String vehicleSizeName(String code) {
    switch (code) {
      case 'compact':
        return _pick('소형', 'Compact');
      case 'mid':
        return _pick('중형', 'Mid-size');
      case 'full':
        return _pick('준대형', 'Full-size');
      case 'large':
        return _pick('대형·SUV', 'Large / SUV');
      default:
        return code;
    }
  }

  String get communityTitle => _pick('커뮤니티 피드', 'Community Feed');
  String get postPlaceholder =>
      _pick('랩핑 경험, 시공 후기를 공유해 보세요', 'Share your wrap experience');
  String get noPosts =>
      _pick('아직 게시물이 없습니다. 첫 글을 남겨보세요!', 'No posts yet. Be the first!');
  String get attachImage => _pick('이미지 첨부', 'Attach Image');
  String get postButton => _pick('게시', 'Post');
  String get posting => _pick('업로드 중...', 'Posting...');
  String get deleted => _pick('게시물이 삭제되었습니다.', 'Post deleted.');
  String get uploaded => _pick('게시물이 업로드되었습니다.', 'Posted.');
  String get scopeTitle => _pick('부분 랩핑 / 포인트', 'Partial / Accent Wrap');
  String get scopeSubtitle =>
      _pick('여러 부위를 동시에 선택할 수 있습니다.', 'You can select multiple areas.');

  // Navigation
  String get navHome => _pick('홈', 'Home');
  String get navProjects => _pick('마이 개러지', 'My Garage');
  String get navViewer => _pick('AI 랩핑', 'AI Wrapping');
  String get navDesign => _pick('디자인', 'Design');
  String get navMore => _pick('더보기', 'More');

  // Home
  String get quickActions => _pick('빠른 실행', 'Quick actions');
  String get heroSub =>
      _pick('내 차량을 위한 프리미엄 랩핑', 'Premium wrapping for your car');
  String get heroPrimary =>
      _pick('AI 랩핑으로 미리 경험하세요', 'Preview your wrap with AI Wrapping');
  String get heroStart => _pick('마이 개러지 시작', 'Start My Garage');
  String get heroOpen => _pick('개러지 열기', 'Open garage');
  String get heroRegister => _pick('차량 등록', 'Add vehicle');
  String get heroContinue => _pick('계속 진행하기', 'Continue');
  String get heroNewHere => _pick('처음 오셨나요?', 'New here?');
  String get heroLatest => _pick('최신 개러지', 'Latest garage');
  String get projectsDescription => _pick(
    '차량 촬영부터 디자인, 상담까지 내 개러지에서 모두 관리하세요.',
    'Manage capture, design, and booking in your garage.',
  );
  String get projectsFilterHint => _pick(
    '필터로 기획·디자인·예약 단계를 골라 볼 수 있어요.',
    'Use filters to view planning, design, or booking stages.',
  );
  String get sectionInProgress => _pick('진행중인 개러지', 'Active garage');
  String get viewAll => _pick('모두 보기', 'View all');
  String get emptyProjects => _pick(
    '아직 개러지가 없습니다. 새 차량을 추가해 보세요.',
    'No garage yet. Add a vehicle to get started.',
  );
  String get sectionRecommendations => _pick('추천 스타일', 'Recommended styles');
  String get sectionGuide => _pick('랩핑 가이드', 'Wrapping guide');
  String get quickAiTitle => _pick('AI 랩핑', 'AI Wrapping');
  String get quickAiDesc =>
      _pick('AI 차량 랩핑 시뮬레이션', 'AI vehicle wrap simulator');
  String get quickDesignTitle => _pick('디자인 허브', 'Design Hub');
  String get quickDesignDesc =>
      _pick('컬러/재질 추천받기', 'Get color/material recommendations');

  // Projects
  String projectStatusSubtitle({
    required bool consultationBooked,
    required bool designExplored,
    required bool captureCompleted,
  }) {
    if (consultationBooked) {
      return _pick('시공 일정이 확정되었습니다', 'Installation schedule is confirmed');
    }
    if (designExplored) {
      return _pick('컬러와 질감을 탐색하는 단계입니다', 'You are exploring colors and textures');
    }
    if (captureCompleted) {
      return _pick('차량 분석이 완료되었습니다', 'Vehicle analysis is complete');
    }
    return _pick('차량 촬영이 필요합니다', 'A vehicle photo is needed');
  }

  String projectStageLabel({
    required bool consultationBooked,
    required bool designExplored,
    required bool captureCompleted,
  }) {
    if (consultationBooked) return _pick('예약 완료', 'Booked');
    if (designExplored) return _pick('디자인 중', 'Designing');
    if (captureCompleted) return _pick('기획 중', 'Planning');
    return _pick('촬영 대기', 'Awaiting capture');
  }

  // Recommendation & learning translations (sample data)
  String recBadge(String badge) {
    switch (badge) {
      case '가이드':
        return _pick('가이드', 'Guide');
      case '소재 팁':
        return _pick('소재 팁', 'Material tip');
      case '케어':
        return _pick('케어', 'Care');
      default:
        return badge;
    }
  }

  String recTitle(String title) {
    switch (title) {
      case 'AI 랩핑 활용':
        return _pick('AI 랩핑 활용', 'How to use AI Wrapping');
      case '랩핑 소재 선택':
        return _pick('랩핑 소재 선택', 'Choosing wrap material');
      case '유지보수 팁':
        return _pick('유지보수 팁', 'Maintenance tips');
      default:
        return title;
    }
  }

  String recDescription(String desc) {
    if (desc.startsWith('차량 모델을 선택하고')) {
      return _pick(
        '차량 모델을 선택하고 360도로 회전해 보세요. 다양한 랩핑 컬러를 적용해 실시간 비교 가능하며 Gloss/Matte/Satin 마감도 바꿔볼 수 있습니다.',
        'Pick a car model and rotate 360°. Apply colors and compare in real time, switching between Gloss/Matte/Satin finishes.',
      );
    }
    if (desc.startsWith('Gloss는 깊은 색감')) {
      return _pick(
        'Gloss는 깊은 색감을 주지만 스크래치에 민감, Matte는 프리미엄 감성이지만 오염 관리가 중요, Textured는 포인트 영역에 적합합니다.',
        'Gloss gives depth but scratches easily; Matte looks premium but needs care; Textured is great for accent areas.',
      );
    }
    if (desc.startsWith('소재별 세차')) {
      return _pick(
        '소재별 세차/보호 방법을 확인해 색상과 질감을 오래 유지하세요.',
        'Check wash/protection tips per material to keep color and texture longer.',
      );
    }
    return desc;
  }

  String learningTag(String tag) {
    switch (tag) {
      case '가이드':
        return _pick('가이드', 'Guide');
      case '소재':
        return _pick('소재', 'Material');
      case '케어':
        return _pick('케어', 'Care');
      default:
        return tag;
    }
  }

  String learningTitle(String title) {
    switch (title) {
      case 'AI 랩핑 컬러 비교':
        return _pick('AI 랩핑 컬러 비교', 'AI Wrapping color compare');
      case 'Gloss vs Matte':
        return _pick('Gloss vs Matte', 'Gloss vs Matte');
      case '랩핑 유지보수':
        return _pick('랩핑 유지보수', 'Wrap maintenance');
      default:
        return title;
    }
  }

  String learningDuration(String duration) {
    switch (duration) {
      case '3분 읽기':
        return _pick('3분 읽기', '3 min read');
      case '4분 읽기':
        return _pick('4분 읽기', '4 min read');
      default:
        return duration;
    }
  }

  // ── Common ────────────────────────────────────────────────────────────────
  String get delete => _pick('삭제', 'Delete');
  String get cancel => _pick('취소', 'Cancel');
  String get save => _pick('저장', 'Save');
  String get apply => _pick('적용', 'Apply');
  String get change => _pick('변경하기', 'Change');
  String get previous => _pick('이전', 'Previous');
  String get next => _pick('다음', 'Next');
  String get doneRegister => _pick('등록 완료', 'Finish Registration');
  String get vehicleTypeSelect => _pick('차량 종류 선택', 'Select Vehicle Type');
  String get vehicleInfoInput => _pick('차량 정보 입력', 'Enter Vehicle Info');
  String get colorSetup => _pick('색상 설정', 'Set Color');
  String get vehicleCategoryTitle => _pick('차량 카테고리', 'Vehicle Category');
  String get vehicleSizeTitle => _pick('차량 크기', 'Vehicle Size');
  String get wrapAreaHint =>
      _pick('랩핑지 소요량 계산에 사용됩니다', 'Used to estimate wrap material area');
  String get currentVehicleColor => _pick('현재 차량 색상', 'Current Vehicle Color');
  String get currentVehicleColorSubtitle =>
      _pick('차량의 현재 순정 색상을 선택해주세요', 'Select your vehicle\'s current OEM color');
  List<String> get presetColorNames => [
    _pick('화이트', 'White'),
    _pick('블랙', 'Black'),
    _pick('실버', 'Silver'),
    _pick('레드', 'Red'),
    _pick('블루', 'Blue'),
    _pick('그린', 'Green'),
    _pick('오렌지', 'Orange'),
    _pick('옐로우', 'Yellow'),
    _pick('퍼플', 'Purple'),
    _pick('스카이블루', 'Sky Blue'),
  ];
  String get aiWrapStudio => _pick('AI 랩 스튜디오', 'AI Wrap Studio');
  String get uploadVehiclePhoto =>
      _pick('차량 사진을 업로드해주세요', 'Please upload a vehicle photo');
  String get materialFinishTitle => _pick('재질 · 마감', 'Material · Finish');
  String get baseColorTitle => _pick('베이스 컬러', 'Base Color');
  String get advancedOptions => _pick('고급 옵션', 'Advanced Options');
  String get includeChromeDelete => _pick('크롬 딜리트 포함', 'Include Chrome Delete');
  String get retainPointWrap =>
      _pick('기존 포인트 랩핑 유지', 'Keep Existing Accent Wrap');
  String get retainPointWrapDesc => _pick(
    '대시보드·센터콘솔 등 기존 포인트 랩핑을 그대로 두고 나머지 차체에만 적용',
    'Keep existing accent-wrapped areas like dashboard/center console and apply wrap to the remaining body only',
  );
  String get panelSelection => _pick('부위별 랩핑', 'Panel Selection');
  String get reset => _pick('초기화', 'Reset');
  String get vehiclePhoto => _pick('차량 사진', 'Vehicle Photo');
  String get colorInput => _pick('색상 입력', 'Color Input');
  String get colorChip => _pick('컬러칩', 'Color Chip');
  String get interiorTrimApply => _pick('실내 트림 적용', 'Apply Interior Trim');
  String get shootingGuideTitle => _pick('최적 촬영 가이드', 'Shooting Guide');
  String get shootingGuideWarningTitle =>
      _pick('이 메시지는 AI 실패가 아닙니다', 'This is not an AI failure');
  String get shootingGuideWarningDesc => _pick(
    '차량이 충분히 인식되지 않으면 이 메시지가 표시됩니다. 차량이 더 잘 보이는 사진으로 다시 시도해 주세요.',
    'This message appears when the vehicle is not detected clearly. Please try again with a clearer photo where the car is easier to see.',
  );
  String get promptExample => _pick(
    '예) 새틴 다크 그린, 크롬 블랙 포인트',
    'e.g. Satin dark green, chrome black accents',
  );
  String get applyAiWrap => _pick('AI 랩핑 적용하기', 'Apply AI Wrap');
  String get exploreDesignHubBtn => _pick('디자인 허브 탐색하기', 'Explore Design Hub');
  String get constructionInquiryBtn => _pick('시공 문의하기', 'Request Installation');
  String get analyzingVehicle => _pick('차량 분석 중...', 'Analyzing vehicle...');
  String get statusApplyingAiWrap => _pick('AI 랩핑 적용 중…', 'Applying AI Wrap…');
  String get statusAiAnalyzing =>
      _pick('AI가 차량을 분석하고 있어요…', 'AI is analyzing the vehicle…');
  String get statusApplyingWrapColor =>
      _pick('랩핑 색상을 적용하는 중…', 'Applying wrap color…');
  String get statusPleaseWait =>
      _pick('조금 더 기다려주세요…', 'Please wait a little longer…');
  String get statusGeneratingImage =>
      _pick('AI 이미지 생성 중… (최대 2분)', 'Generating AI image… (up to 2 min)');
  String get statusCoverageCleanup =>
      _pick('랩핑 누락 부위 정리 중…', 'Cleaning up missed wrap areas…');
  String get statusChromeDelete =>
      _pick('크롬 딜리트 적용 중…', 'Applying chrome delete…');
  String get statusChromeCleanup =>
      _pick('남은 크롬 정리 중…', 'Cleaning remaining chrome…');
  String get statusWindowChromeCleanup =>
      _pick('창틀 크롬 정리 중…', 'Cleaning window chrome…');
  String get colorInputHint => _pick('#Hex 또는 이름', '#Hex or name');
  String get cameraTakePhoto => _pick('카메라로 촬영', 'Take Photo');
  String get gallerySelect => _pick('갤러리에서 선택', 'Choose from Gallery');
  String get fullWrapSelective => _pick(
    '전체 랩핑 (부위 선택 시 해당 부위만 적용)',
    'Full wrap (select panels to limit the wrap)',
  );
  String selectedPanels(String parts) =>
      _pick('선택된 부위: $parts', 'Selected panels: $parts');

  String shootingGuideItemTitle(String key) {
    switch (key) {
      case 'soft_light':
        return _pick('부드러운 광원', 'Soft Lighting');
      case 'full_frame':
        return _pick('차량 전체 프레임', 'Full Vehicle Frame');
      case 'level_shot':
        return _pick('허리 높이·수평 유지', 'Waist-level & Level Shot');
      case 'angle_45':
        return _pick('45° 사각 앵글', '45° Angle');
      case 'simple_bg':
        return _pick('단순한 배경', 'Simple Background');
      case 'clean_body':
        return _pick('깨끗한 차체', 'Clean Vehicle Body');
      default:
        return key;
    }
  }

  String shootingGuideItemDesc(String key) {
    switch (key) {
      case 'soft_light':
        return _pick(
          '직사광선을 피하고 맑은 날 그늘 또는 실내 조명 아래서 촬영하세요.',
          'Shoot in shade or indoors to avoid harsh direct sunlight.',
        );
      case 'full_frame':
        return _pick(
          '차량이 화면 안에 전부 들어오도록 충분히 거리를 두고 촬영하세요.',
          'Step back enough to keep the whole vehicle inside the frame.',
        );
      case 'level_shot':
        return _pick(
          '카메라를 도어 손잡이 높이에서 수평으로 맞추면 왜곡이 최소화됩니다.',
          'Keep the camera level at door-handle height to reduce distortion.',
        );
      case 'angle_45':
        return _pick(
          '정면/측면/후면 각각 45° 각도에서 찍으면 AI 인식률이 높아집니다.',
          'Front/side/rear 45° shots improve AI detection accuracy.',
        );
      case 'simple_bg':
        return _pick(
          '벽이나 하늘처럼 단색 배경 앞에 세우면 차체 분리 정확도가 올라갑니다.',
          'A plain background like a wall or sky improves vehicle separation.',
        );
      case 'clean_body':
        return _pick(
          '먼지·물방울을 닦은 후 촬영하면 색상·질감 분석 품질이 개선됩니다.',
          'Wipe off dust and water drops for better color and texture analysis.',
        );
      default:
        return key;
    }
  }

  String panelName(String key) {
    switch (key) {
      case '후드':
        return _pick('후드', 'Hood');
      case '루프':
        return _pick('루프', 'Roof');
      case '트렁크':
        return _pick('트렁크', 'Trunk');
      case '앞 범퍼':
        return _pick('앞 범퍼', 'Front Bumper');
      case '뒤 범퍼':
        return _pick('뒤 범퍼', 'Rear Bumper');
      case '앞 도어':
        return _pick('앞 도어', 'Front Door');
      case '뒤 도어':
        return _pick('뒤 도어', 'Rear Door');
      case '앞 휀다':
        return _pick('앞 휀다', 'Front Fender');
      case '뒤 휀다':
        return _pick('뒤 휀다', 'Rear Fender');
      case '사이드 스커트':
        return _pick('사이드 스커트', 'Side Skirt');
      case '사이드 미러':
        return _pick('사이드 미러', 'Side Mirror');
      case 'A필러':
        return _pick('A필러', 'A-Pillar');
      case 'B필러':
        return _pick('B필러', 'B-Pillar');
      case 'C필러':
        return _pick('C필러', 'C-Pillar');
      default:
        return key;
    }
  }

  String get noResults => _pick('결과 없음', 'No results');
  String get allCategory => _pick('전체', 'All');
  String get notificationsTooltip => _pick('알림', 'Notifications');
  String get signOutTooltip => _pick('로그아웃', 'Sign Out');

  // ── Subscription / Plan ───────────────────────────────────────────────────
  String wrapUsageCount(int used, int quota) =>
      _pick('$used/${quota}회 사용', '$used/$quota uses');
  String get currentPlan => _pick('현재 플랜', 'Current Plan');
  String get upgradeAction => _pick('업그레이드', 'Upgrade');
  String get buyNowAction => _pick('구매하기', 'Buy Now');
  String get restorePurchasesAction => _pick('구매 복원', 'Restore Purchases');
  String get restoringPurchasesAction => _pick('복원 중...', 'Restoring...');
  String get billingUnavailableMsg => _pick(
    '스토어 결제를 사용할 수 없습니다. Play 스토어 로그인 및 상품 ID 설정을 확인해주세요.',
    'Store billing is unavailable. Check Play Store sign-in and product IDs.',
  );
  String get billingProductsMissingMsg => _pick(
    '일부 요금제 상품을 불러오지 못했습니다. Play Console 상품 ID와 앱 서명을 확인해주세요.',
    'Some plan products could not be loaded. Check Play Console product IDs and app signing.',
  );
  String get purchasePendingMsg =>
      _pick('결제 진행 중...', 'Purchase in progress...');
  String get purchaseRestoredMsg =>
      _pick('구매 내역을 복원했습니다.', 'Purchases restored.');
  String planPurchased(String plan) =>
      _pick('$plan 플랜 결제가 완료되었습니다.', '$plan plan purchase completed.');
  String upgradePlanTitle(String plan) =>
      _pick('$plan 업그레이드', 'Upgrade to $plan');
  String get redeemCodePrompt =>
      _pick('리딤 코드를 입력하세요.', 'Enter your redeem code.');
  String get redeemCodeInvalid =>
      _pick('유효하지 않은 리딤 코드입니다.', 'Invalid redeem code.');
  String planUpgraded(String plan) =>
      _pick('$plan 플랜으로 업데이트되었습니다.', 'Upgraded to $plan plan.');
  String planPerks(String planId) {
    switch (planId.toLowerCase()) {
      case 'free':
        return _pick('월 10회 랩핑 • 핵심기능 맛보기', '10 wraps/month • Core features');
      case 'basic':
        return _pick(
          '월 50회 랩핑 • Free 플랜의 모든 기능 • 일반 사용자에 충분',
          '50 wraps/month • All Free features • Great for most users',
        );
      case 'advanced':
        return _pick(
          '월 150회 랩핑 • Basic 플랜의 모든 기능 • 사용량 많은 개인용',
          '150 wraps/month • All Basic features • For heavy personal use',
        );
      case 'pro':
        return _pick(
          '월 500회 랩핑 • Advanced 플랜의 모든 기능 • 고급 기능 우선 접근',
          '500 wraps/month • All Advanced features • Priority access to new features',
        );
      default:
        return planId;
    }
  }

  String planPrice(String planId) {
    switch (planId.toLowerCase()) {
      case 'free':
        return _pick('0원', 'Free');
      case 'basic':
        return _pick('5,900원', '₩5,900');
      case 'advanced':
        return _pick('7,900원', '₩7,900');
      case 'pro':
        return _pick('9,900원', '₩9,900');
      default:
        return planId;
    }
  }

  String get statusActive => _pick('활성', 'Active');
  String subscriptionStatusLabel(String status) {
    final normalized = status.trim();
    if (normalized.isEmpty) return _pick('활성', 'Active');
    if (normalized == '활성' || normalized.toLowerCase() == 'active') {
      return _pick('활성', 'Active');
    }
    return normalized;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  String get signOutMsg => _pick('로그아웃되었습니다.', 'Signed out.');
  String get googleSignedInMsg =>
      _pick('Google 계정으로 로그인했습니다.', 'Signed in with Google.');
  String get appleSignedInMsg =>
      _pick('Apple 계정으로 로그인했습니다.', 'Signed in with Apple.');
  String get appleNotAvailableMsg => _pick(
    '현재 기기에서 Apple 로그인을 사용할 수 없습니다.',
    'Apple Sign In is not available on this device.',
  );
  String get googleLoginLabel => _pick('Google 로그인', 'Google Sign In');
  String get appleLoginLabel => _pick('Apple 로그인', 'Apple Sign In');

  // ── Profile ───────────────────────────────────────────────────────────────
  String get editProfileTitle => _pick('프로필 편집', 'Edit Profile');
  String get changeImageLabel => _pick('이미지 변경', 'Change Image');
  String get nameLabel => _pick('이름', 'Name');
  String get emailLabel => _pick('이메일', 'Email');
  String get profileUpdatedMsg => _pick('프로필이 업데이트되었습니다.', 'Profile updated.');
  String get noVehiclesSavedMsg => _pick(
    '저장된 차량이 없습니다. 프로젝트에서 차량을 추가하세요.',
    'No saved vehicles. Add a vehicle from a project.',
  );
  String get vehicleDeletedMsg => _pick('차량이 삭제되었습니다.', 'Vehicle deleted.');
  String get auCommunityRestrictedMsg => _pick(
    '호주 연령 제한으로 커뮤니티가 비활성화되었습니다.',
    'Community disabled due to Australian age restrictions.',
  );
  String get auChatRestrictedMsg => _pick(
    '호주 연령 제한으로 채팅이 비활성화되었습니다.',
    'Chat disabled due to Australian age restrictions.',
  );

  // ── Age Gate (main.dart) ──────────────────────────────────────────────────
  String get auAgeGateTitle =>
      _pick('호주 연령 제한 안내', 'Australian Age Restriction');
  String get auAgeGateContent => _pick(
    '만 16세 미만 사용자는 커뮤니티·채팅 기능을 사용할 수 없습니다. 만 16세 이상인가요?',
    'Users under 16 cannot access community and chat features. Are you 16 or older?',
  );
  String get auAgeGateNo => _pick('아니오', 'No');
  String get auAgeGateYes => _pick('만 16세 이상입니다', 'I am 16+');
  String get auAgeGateRestrictedMsg => _pick(
    '호주 연령 제한으로 커뮤니티/채팅이 비활성화됩니다.',
    'Community and chat disabled due to Australian age restrictions.',
  );

  // ── Vehicle Registration ───────────────────────────────────────────────────
  String get vehicleRegTitle => _pick('차량 등록', 'Register Vehicle');
  String get vehicleNicknameLabel => _pick('차량 닉네임', 'Vehicle Nickname');
  String get vehicleNicknameHint => _pick('예) GV80 패밀리카', 'e.g. My GV80');
  String get vehicleMakeLabel => _pick('제조사', 'Make');
  String get vehicleMakeCustomLabel => _pick('제조사 직접 입력', 'Enter make');
  String get vehicleModelLabel => _pick('모델', 'Model');
  String get vehicleTrimLabel => _pick('트림', 'Trim');
  String get vehicleTrimCustomLabel => _pick('트림 직접 입력', 'Enter trim');
  String get vehicleTrimCustomEntry => _pick('직접 입력', 'Custom');
  String get vehicleYearLabel => _pick('연식', 'Year');
  String get vehicleMakeOther => _pick('기타', 'Other');
  String get vehicleDefaultNickname => _pick('새 차량', 'New Vehicle');
  String get vehicleMakeUnknown => _pick('제조사 미정', 'Unknown Make');
  String get vehicleModelUnknown => _pick('모델 미정', 'Unknown Model');
  String garageCreated(String nickname) =>
      _pick('$nickname 개러지가 생성되었습니다.', 'Garage created for $nickname.');
  String get startWrapping => _pick('랩핑 시작하기', 'Start Wrapping');
  String wrapAppliedToAi(String name) =>
      _pick('${name}을(를) AI 랩핑에 불러왔습니다.', '$name loaded in AI Wrapping.');
  String get deleteProjectTitle => _pick('프로젝트 삭제', 'Delete Project');
  String get deleteProjectConfirm =>
      _pick('삭제하면 되돌릴 수 없습니다. 계속할까요?', 'This cannot be undone. Continue?');
  String get projectDeletedMsg => _pick('프로젝트가 삭제되었습니다.', 'Project deleted.');
  String progressPercent(int n) => _pick('$n% 완료', '$n% complete');
  String get wrapApplyInAiBtn => _pick('AI 랩핑에서 적용', 'Apply in AI Wrapping');
  String get wrapFilmTip => _pick(
    '곡면·장기 사용은 캐스팅을, 플랫·단기/광고용은 캘린더링을 추천해요. 예산과 차량 형태에 맞는 칩을 선택해 보세요.',
    'Use cast film for curved/long-term installs, calendered for flat/short-term. Choose by budget and vehicle shape.',
  );
  String get wrapCastingLabel =>
      _pick('캐스팅 (프리미엄·곡면 적합)', 'Cast (Premium, curved surfaces)');
  String get wrapCalenderingLabel =>
      _pick('캘린더링 (경제적·플랫용)', 'Calendered (Budget, flat surfaces)');
  String get wrapCalenderingWarning => _pick(
    '플랫/단기 추천. 곡률이 큰 부위는 수축·리프팅을 대비해 히팅/프라이머를 권장해요.',
    'Best for flat surfaces. For curved panels, heat application or primer is recommended to prevent lifting.',
  );

  // ── Project Detail ────────────────────────────────────────────────────────
  String get myGarageTitle => _pick('마이 개러지', 'My Garage');
  String get garageNotFound => _pick('개러지를 찾을 수 없습니다.', 'Garage not found.');
  String get consultationSheetTitle =>
      _pick('1:1 상담 요청 전송', 'Send Consultation Request');
  String get consultationKakaoNote => _pick(
    '예약 정보가 요약되어 카카오톡 1:1 채팅으로 전달됩니다.',
    'Your booking details will be sent via KakaoTalk 1:1 chat.',
  );
  String get consultationNameLabel => _pick('성함', 'Name');
  String get consultationContactLabel => _pick('연락처', 'Contact');
  String get consultationContactHint =>
      _pick('예) 010-1234-5678', 'e.g. 010-1234-5678');
  String get consultationMemoLabel => _pick('메모 사항', 'Notes');
  String get consultationMemoHint => _pick(
    '차량 상태, 요청 사항 등을 적어주세요.',
    'Describe your vehicle condition and requests.',
  );
  String get consultationSendBtn =>
      _pick('카카오톡 1:1 채팅으로 보내기', 'Send via KakaoTalk Chat');
  String get consultationSentMsg =>
      _pick('상담 요청을 1:1 채팅으로 전송했습니다.', 'Consultation request sent via chat.');
  String get wrapSelectSheetTitle => _pick('랩핑 선택', 'Select Wrap');
  String get wrapFilmSection => _pick('랩핑 필름', 'Wrap Film');
  String wrapSelectedMsg(String name) =>
      _pick('${name}을(를) 선택했습니다.', '$name selected.');
  String get wrapQuotaExceededMsg => _pick(
    '플랜 사용 횟수를 모두 사용했습니다. 업그레이드가 필요합니다.',
    'Plan limit reached. Upgrade required.',
  );
  String get vehicleCapturedMsg => _pick(
    '차량 촬영이 완료되었습니다. 개러지에 저장했어요.',
    'Vehicle photo captured and saved to garage.',
  );
  String get processTitle => _pick('프로세스', 'Process');
  String get captureStepTitle => _pick('차량 촬영', 'Vehicle Photo');
  String get captureStepDesc =>
      _pick('모바일로 외장 촬영 후 업로드', 'Capture exterior photo with your phone');
  String get designStepTitle => _pick('디자인 검토', 'Design Review');
  String get designStepDesc =>
      _pick('AI 랩핑에서 컬러/재질 시뮬레이션', 'Simulate color/material in AI Wrapping');
  String get bookingStepTitle => _pick('시공 예약', 'Schedule');
  String get bookingStepDesc =>
      _pick('지점 선택 후 상담 예약', 'Choose a studio and book consultation');
  String get wrapChangeBtn => _pick('변경하기', 'Change');
  String get noWrapSelected => _pick(
    '아직 선택된 랩핑이 없습니다. 디자인 허브에서 추천을 받아보세요.',
    'No wrap selected. Get recommendations in Design Hub.',
  );
  String get markCaptureBtn => _pick('촬영 완료로 표시', 'Mark as Captured');
  String get markDesignBtn => _pick('AI 디자인 검토 완료', 'Mark Design Reviewed');
  String get bookAppointmentBtn => _pick('시공 예약하기', 'Schedule Appointment');
  String bookingScheduledLabel(String date) =>
      _pick('시공 예약: $date', 'Appointment: $date');
  String get notesSection => _pick('메모', 'Notes');
  String get notesHint => _pick('시공 메모를 남겨주세요.', 'Enter wrap notes here.');

  // ── Design Screen ─────────────────────────────────────────────────────────
  String get designHubTitle => _pick('디자인 허브', 'Design Hub');
  String get searchTooltip => _pick('검색', 'Search');
  String activeProjectLabel(String name) =>
      _pick('활성 프로젝트: $name', 'Active: $name');
  String get searchHint =>
      _pick('브랜드, 색상명, 코드로 검색', 'Search by brand, color, or code');
  String get vehicleStorageTitle => _pick('차량 보관함', 'My Vehicles');
  String wrapAppliedToProject(String wrapName, String projectName) => _pick(
    '${wrapName}을(를) ${projectName}에 적용했습니다. AI 랩핑에도 전달됐습니다.',
    '$wrapName applied to $projectName. Sent to AI Wrapping too.',
  );
  String get wrapAppliedToAiOnlyMsg => _pick(
    'AI 랩핑에 색상을 전달했습니다. 바로 적용해보세요.',
    'Color sent to AI Wrapping. Tap Apply to preview.',
  );

  // ── Visualizer Screen ─────────────────────────────────────────────────────
  String get platePositionSavedMsg =>
      _pick('번호판 위치를 저장했습니다.', 'License plate position saved.');
  String get plateTapInstruction => _pick(
    '미리보기 이미지를 탭해 번호판 위치를 지정하세요.',
    'Tap the preview to set plate position.',
  );
  String get plateAssignBtn => _pick('번호판 직접 지정', 'Set Plate Position');
  String get plateReassignBtn => _pick('번호판 위치 재지정', 'Reassign Plate');
  String get accentSelectStartMsg => _pick(
    '미리보기 이미지를 탭해 포인트 영역을 표시하세요.',
    'Tap the preview to mark accent areas.',
  );
  String get accentSelectEndMsg =>
      _pick('포인트 선택을 종료했습니다.', 'Accent selection ended.');
  String get accentSelectBtn => _pick('포인트 영역 선택', 'Select Accent Area');
  String get preserveAccentLabel =>
      _pick('기존 포인트 보존', 'Preserve Existing Accent');
  String get preserveAccentMsg => _pick(
    '기존 포인트/투톤 랩핑 영역을 유지하며 랩핑합니다.',
    'Existing accent/two-tone areas will be preserved.',
  );
  String accentCountLabel(int n) =>
      _pick('선택된 포인트: ${n}개 (최대 6개)', 'Selected: $n points (max 6)');
  String get plateAngleLabel => _pick('번호판 각도', 'Plate Angle');
  String get savingLabel => _pick('저장 중...', 'Saving...');
  String get saveToGalleryBtn => _pick('사진함에 저장', 'Save to Gallery');
  String get interiorTrimTitle => _pick('실내 트림 적용', 'Interior Trim');
  String get interiorTrimDesc => _pick(
    '대시보드·도어 트림·센터콘솔 등 실내에만 색상 적용',
    'Apply color to interior surfaces only',
  );
  String get goToDesignHubBtn => _pick('디자인 허브로 이동', 'Go to Design Hub');
  String get chipNotAnalyzedMsg => _pick(
    '컬러칩을 분석하지 못했습니다. 다른 사진을 시도해 주세요.',
    'Could not analyze the color chip. Try another photo.',
  );
  String get chipAnalyzedMsg => _pick(
    '컬러칩을 분석했어요. 팔레트와 추천 색상을 확인하세요.',
    'Color chip analyzed. Check palette and recommendations.',
  );
  String get colorInputTitle => _pick('랩핑 컬러 입력', 'Enter Wrap Color');
  String get colorInputLabel => _pick('HEX 또는 컬러명', 'HEX or Color Name');
  String get colorInputAppliedMsg =>
      _pick('직접 입력한 색상을 반영했어요.', 'Custom color applied.');
  String get chipCameraOption =>
      _pick('컬러칩 촬영 (카메라)', 'Capture Color Chip (Camera)');
  String get chipGalleryOption =>
      _pick('갤러리에서 컬러칩 선택', 'Choose Color Chip from Gallery');
  String get chipExtractFromVehicle =>
      _pick('차량 사진에서 색상 추출', 'Extract Color from Vehicle Photo');
  String get chipSelectFirstMsg => _pick(
    '컬러칩을 먼저 촬영하거나 선택해주세요.',
    'Please capture or select a color chip first.',
  );
  String get vehicleSelectFirstMsg =>
      _pick('차량 이미지를 먼저 선택해주세요.', 'Please select a vehicle image first.');
  String get vehicleSelectForRecommendMsg => _pick(
    '차량 이미지를 선택하면 추천 색상으로 바로 적용할 수 있습니다.',
    'Select a vehicle image to apply the recommended color.',
  );
  String get vehicleSelectForPaletteMsg => _pick(
    '차량 이미지를 선택하면 팔레트 색상으로 바로 적용할 수 있습니다.',
    'Select a vehicle image to apply the palette color.',
  );
  String get aiWrapQuotaExceededMsg => _pick(
    '이번 달 AI 랩핑 횟수를 모두 사용했습니다. 요금제를 업그레이드해주세요.',
    'Monthly AI Wrapping limit reached. Please upgrade your plan.',
  );
  String designHubColorLoaded(String name) => _pick(
    '디자인 허브에서 $name 컬러를 불러왔습니다. 적용 버튼을 눌러보세요.',
    '$name loaded from Design Hub. Tap Apply to preview.',
  );

  // ── Visualizer (extra) ────────────────────────────────────────────────────
  String get savedToGalleryMsg => _pick('사진함에 저장했어요.', 'Saved to gallery.');
  String get saveFailedMsg => _pick('저장에 실패했습니다.', 'Save failed.');
  String get noImageToSaveMsg => _pick('저장할 이미지가 없습니다.', 'No image to save.');
  String get generatingPreviewMsg =>
      _pick('미리보기를 생성 중입니다...', 'Generating preview...');
  String get wrapAppliedMsg => _pick('랩핑이 적용되었습니다.', 'Wrap applied.');
  String get chromeDeletingMsg =>
      _pick('크롬 딜리트 적용 중...', 'Applying chrome delete...');
  String get chromeDeleteErrorMsg => _pick(
    '크롬 딜리트 처리 중 오류 (바디 랩핑만 적용됨)',
    'Chrome delete failed. Body wrap applied only.',
  );
  // ── Community Feed ────────────────────────────────────────────────────────
  String translateCategoryFromKo(String koCategory) {
    final normalized = koCategory.trim().toLowerCase();
    switch (normalized) {
      case 'all':
      case '전체':
        return _pick('전체', 'All');
      case 'general':
      case '자유':
        return _pick('자유', 'General');
      case 'review':
      case 'installation':
      case '시공 후기':
        return _pick('시공 후기', 'Installation');
      case 'color':
      case 'color tips':
      case '컬러 추천':
        return _pick('컬러 추천', 'Color Tips');
      case 'care':
      case '케어/관리':
        return _pick('케어/관리', 'Care');
      case 'partial':
      case 'partial wrap':
      case '부분 랩핑':
        return _pick('부분 랩핑', 'Partial Wrap');
      case 'coating':
      case '코팅/보호':
        return _pick('코팅/보호', 'Coating');
      case 'notice':
      case '공지':
        return _pick('공지', 'Notice');
      case 'guide':
      case '가이드':
        return _pick('가이드', 'Guide');
      case 'featured':
      case '추천':
        return _pick('추천', 'Featured');
      default:
        return normalized;
    }
  }

  String _pick(String ko, String en) => code == 'en' ? en : ko;
}
