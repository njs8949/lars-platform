import 'package:flutter/material.dart';

import '../l10n.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tx('개인정보처리방침', 'Privacy Policy')),
      ),
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Text(
            l10n.code == 'en' ? _privacyPolicyTextEn : _privacyPolicyText,
            style: TextStyle(
              height: 1.5,
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

class TermsOfServiceScreen extends StatelessWidget {
  const TermsOfServiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = L10n.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tx('서비스 이용약관', 'Terms of Service')),
      ),
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Text(
            l10n.code == 'en' ? _termsOfServiceTextEn : _termsOfServiceText,
            style: TextStyle(
              height: 1.5,
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

const String _privacyPolicyText = '''
# 개인정보처리방침

최종 수정일: 2025년 11월 28일

엘에이알에스(LARS Inc.) (이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 관련 법령에 의거한 개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.

## 1. 수집하는 개인정보의 항목 및 수집방법

회사는 회원가입, 원활한 고객상담, 각종 서비스의 제공을 위해 아래와 같은 최소한의 개인정보를 필수항목으로 수집하고 있습니다.

- 수집항목: 이름, 이메일 주소, 사용자 ID(Firebase UID 등), 차량/컬러칩 사진 및 프로젝트명·메모 등 사용자 콘텐츠, 프로필 이미지, 앱 성능/충돌 로그(필요 시)
- 수집방법: 회원가입 및 프로필 수정, 이미지 업로드/촬영, 서비스 이용 과정에서 이용자가 직접 입력, 충돌 리포팅 도구를 통한 수집

## 2. 개인정보의 수집 및 이용목적

회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.

- 서비스 제공 및 품질 개선: 랩핑 추천/적용, 프로젝트 관리, 고객 지원
- 회원 관리: 본인확인, 계정 관리, 비인가 사용 방지, 계정 삭제 처리
- 앱 안정성: 성능/충돌 분석(사용 시)

## 3. 개인정보의 보유 및 이용기간

이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)

## 4. 개인정보의 파기절차 및 방법

회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.

- 파기절차: 이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기됩니다.
- 파기방법: 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.

## 5. 이용자의 권리와 그 행사방법

이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입 해지를 요청할 수도 있습니다.

## 6. 개인정보 자동 수집 장치의 설치·운영 및 그 거부에 관한 사항

현재 앱은 광고/크로스 앱 추적을 하지 않으며, 웹 쿠키 기반 추적을 사용하지 않습니다.

## 7. 개인정보에 관한 민원서비스

회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보관리책임자를 지정하고 있습니다.

- 개인정보관리책임자: 남종수
- 이메일: lars@lars-technologies.com

이용자는 회사의 서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보관리책임자 혹은 담당 부서로 신고하실 수 있습니다. 앱 내 프로필 > 계정 > 계정 삭제 기능을 통해 직접 계정을 삭제할 수 있습니다.

## 8. 고지의 의무

현 개인정보처리방침 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일전부터 앱 내 공지사항을 통하여 고지할 것입니다.
''';

const String _termsOfServiceText = '''
# 서비스 이용약관

최종 수정일: 2025년 11월 19일

## 제1조 (목적)

이 약관은 엘에이알에스(LARS Inc.) (이하 "회사")가 제공하는 Wrap 관련 제반 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

## 제2조 (정의)

- 서비스: 회사가 제공하는 랩핑 시뮬레이션 및 관련 모든 기능을 의미합니다.
- 회원: 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.

## 제3조 (약관의 게시와 개정)

1. 회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. 회사는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 제1항의 방식에 따라 그 개정약관의 적용일자 7일 전부터 적용일자 전일까지 공지합니다.

## 제4조 (서비스의 제공 및 변경)

1. 회사는 다음과 같은 업무를 수행합니다.
   - 차량 랩핑 시뮬레이션 기능 제공
   - 관련 정보 제공 및 커뮤니티 기능
   - 기타 회사가 정하는 업무
2. 회사는 상당한 이유가 있는 경우에 운영상, 기술상의 필요에 따라 제공하고 있는 전부 또는 일부 서비스를 변경할 수 있습니다.

## 제5조 (회원의 의무)

1. 회원은 다음 행위를 하여서는 안 됩니다.
   - 신청 또는 변경 시 허위 내용의 등록
   - 타인의 정보 도용
   - 회사가 게시한 정보의 변경
   - 회사의 저작권 등 지적재산권에 대한 침해
   - 제3자의 명예를 손상시키거나 업무를 방해하는 행위

## 제6조 (책임제한)

1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.

## 제7조 (준거법 및 재판관할)

1. 회사와 회원 간에 발생한 분쟁에 대하여는 대한민국법을 준거법으로 합니다.
2. 회사와 회원 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.
''';

const String _privacyPolicyTextEn = '''
# Privacy Policy

Last updated: November 28, 2025

LARS Inc. ("the Company") complies with applicable privacy laws and regulations and is committed to protecting user rights through this Privacy Policy.

## 1. Personal Information We Collect

We collect the minimum information necessary to provide our services, including:

- Name, email address, and user ID such as Firebase UID
- Vehicle and color-chip photos, project titles, notes, and other user-generated content
- Profile image
- App performance or crash logs when needed

Collection methods include sign-up, profile editing, image upload/capture, direct user input while using the app, and crash reporting tools.

## 2. Purpose of Collection and Use

Collected information is used for:

- Service delivery and quality improvement, including wrap recommendations, applications, project management, and support
- User management such as identity verification, account administration, abuse prevention, and account deletion handling
- App stability monitoring such as performance and crash analysis

## 3. Retention Period

Personal data is deleted without delay once the purpose of collection and use has been fulfilled, except where retention is required by law.

- Records related to contracts or withdrawal of subscription: 5 years
- Records related to payment and supply of goods/services: 5 years
- Records related to consumer complaints or dispute resolution: 3 years

## 4. Deletion Procedure and Method

After the purpose of use is fulfilled, data is deleted promptly.

- Procedure: data entered by the user may be moved to a separate database or archive for a legally required retention period
- Method: electronically stored data is deleted using technical methods that prevent recovery

## 5. User Rights

Users may view, edit, or request deletion of their personal information at any time.

## 6. Automatic Collection Devices

The app does not use advertising-based cross-app tracking or cookie-based web tracking.

## 7. Privacy Contact

- Privacy officer: Nam Jong-su
- Email: lars@lars-technologies.com

Users may report privacy-related issues through the contact above. Accounts can also be deleted directly from Profile > Account > Delete Account.

## 8. Notice of Changes

If this Privacy Policy is added to, deleted, or revised, the Company will notify users through in-app announcements at least 7 days before the change takes effect.
''';

const String _termsOfServiceTextEn = '''
# Terms of Service

Last updated: November 19, 2025

## Article 1. Purpose

These Terms govern the rights, obligations, and responsibilities between LARS Inc. ("the Company") and members in relation to the use of the Company's wrap-related services ("the Service").

## Article 2. Definitions

- Service: all wrap simulation features and related functions provided by the Company
- Member: a customer who accesses the Service, enters into a service agreement with the Company, and uses the Service under these Terms

## Article 3. Posting and Revision of Terms

1. The Company posts these Terms so that members can review them easily from the initial service screen.
2. The Company may revise these Terms to the extent permitted by applicable laws.
3. When revising the Terms, the Company will announce the effective date and reason for revision at least 7 days before the revised Terms take effect.

## Article 4. Provision and Change of Service

1. The Company provides the following:
   - Vehicle wrap simulation features
   - Related information and community features
   - Other services determined by the Company
2. The Company may change all or part of the Service if operational or technical needs reasonably require it.

## Article 5. Member Obligations

Members must not:
- Register false information when applying or making changes
- Misappropriate another person's information
- Alter information posted by the Company
- Infringe the Company's intellectual property rights
- Damage the reputation of or interfere with the work of third parties

## Article 6. Limitation of Liability

1. The Company is not liable for failure to provide the Service due to force majeure or events equivalent thereto.
2. The Company is not liable for service disruptions caused by the member's fault.
3. The Company is not liable for loss of expected profits or damages arising from materials obtained through the Service.

## Article 7. Governing Law and Jurisdiction

1. Any dispute between the Company and a member shall be governed by the laws of the Republic of Korea.
2. Lawsuits arising from disputes between the Company and a member shall be brought before the court of competent jurisdiction under Korean civil procedure law.
''';
