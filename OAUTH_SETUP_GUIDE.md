# OAuth 설정 가이드 (Apple & Google)

AWS Cognito와 통합하기 위해 Apple과 Google에서 OAuth 설정을 완료해야 합니다.

---

## 🍎 Apple Sign In 설정

### Step 1: Apple Developer 계정 확인
1. [Apple Developer Console](https://developer.apple.com/)에 로그인
2. "Certificates, Identifiers & Profiles" 선택

### Step 2: App ID 생성/업데이트
1. **Identifiers** → **App IDs** 선택
2. "+" 버튼 클릭하여 새 App ID 생성 (또는 기존 App ID 선택)
3. **Capabilities** 탭에서 "Sign in with Apple" 추가
4. "Configure" 클릭
   - Primary App ID 선택 (또는 새로 생성)
   - Domain: `rekora.local` (또는 실제 도메인)
   - Return URL: `https://your-domain/auth/callback`
5. Save

### Step 3: 개발 인증서 생성 (필요한 경우)
1. **Certificates** → "+" 클릭
2. "Apple Development" 선택
3. CSR 파일 업로드
4. 다운로드 및 설치

### Step 4: Provisioning Profile 생성
1. **Profiles** → "+" 클릭
2. "iOS Development" 선택
3. App ID 선택 (Step 2에서 생성한 것)
4. 인증서 선택
5. Device 선택
6. Profile Name: `Rekora Wrap Development`
7. Download

### Step 5: Xcode에서 설정
```
iOS 프로젝트 → Signing & Capabilities
  → "+ Capability" 클릭
  → "Sign in with Apple" 추가
  
Team ID: [Apple Developer Team ID]
```

### Step 6: Info.plist 업데이트
```xml
<key>CFBundleDisplayName</key>
<string>Rekora Wrap</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>rekora-wrap-signin</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>rekorawrap</string>
    </array>
  </dict>
</array>
```

---

## 🔵 Google Sign In 설정

### Step 1: Google Cloud Console 접근
1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
   - 프로젝트명: "Rekora Wrap"

### Step 2: OAuth 동의 화면 설정
1. **APIs & Services** → **OAuth consent screen** 선택
2. **User Type**: External 선택
3. 다음 정보 입력:
   - **App name**: Rekora Wrap
   - **User support email**: support@rekora.local
   - **Developer contact**: your-email@rekora.local
4. **Scopes**: 다음 추가
   - `openid`
   - `email`
   - `profile`
5. Save

### Step 3: OAuth 2.0 Credentials 생성
1. **APIs & Services** → **Credentials** 선택
2. **"+ Create Credentials"** → **OAuth 2.0 Client ID** 선택
3. Application type 선택:
   - **iOS 앱**: Application type = "iOS"
   - **Android 앱**: Application type = "Android"

#### iOS용
1. Application type: **iOS**
2. Bundle ID: `com.rekora.wrap` (또는 실제 Bundle ID)
3. Team ID: [Apple Developer Team ID]
4. **Create** 클릭
5. **Client ID** 복사 (나중에 필요)

#### Android용
1. Application type: **Android**
2. Package name: `com.rekora.wrap` (또는 실제 Package name)
3. SHA-1 certificate fingerprint 입력:
   ```bash
   # 개발 키스토어의 SHA-1 조회
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
4. **Create** 클릭
5. **Client ID** 복사

### Step 4: Google Sign-In SDK 설정

#### iOS (Xcode)
```swift
// Info.plist에 추가
<key>GIDClientID</key>
<string>[YOUR_GOOGLE_CLIENT_ID]</string>

<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>google-signin</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>[GOOGLE_URL_SCHEME]</string>
    </array>
  </dict>
</array>
```

#### Android (Flutter)
```yaml
# pubspec.yaml
dependencies:
  google_sign_in: ^6.1.0
```

```xml
<!-- android/app/build.gradle -->
android {
    defaultConfig {
        minSdkVersion 19
    }
}
```

---

## 🔗 AWS Cognito에 연결

### Step 1: Cognito User Pool 접근
1. [AWS Console](https://console.aws.amazon.com/) → Cognito
2. User Pool 선택: `Rekora-Wrap-Users`
3. **Sign-in experience** → **Federated sign-in** → **Social providers** 클릭

### Step 2: Apple Provider 추가
1. **Sign-in options** → "Apple" 선택
2. 다음 정보 입력:
   - **Service ID**: com.rekora.wrap.signin
   - **Team ID**: [Apple Developer Team ID]
   - **Key ID**: [Apple Sign-In Key ID]
   - **Private Key**: [Apple 개인 키]
3. **Save** 클릭

### Step 3: Google Provider 추가
1. **Sign-in options** → "Google" 선택
2. **Google Client ID**: [위에서 생성한 Google Client ID]
3. **Google Client secret**: [Google Client Secret]
4. **Save** 클릭

### Step 4: App Client 업데이트
1. **App clients and analytics** → App Client 선택
2. **Allowed OAuth Flows**:
   - ✅ Authorization code flow
   - ✅ Implicit flow
   - ✅ Authorization code grant
3. **Allowed OAuth Scopes**:
   - ✅ openid
   - ✅ email
   - ✅ profile
4. **Save** 클릭

---

## 🧪 테스트

### iOS 테스트
```swift
// AWSAuthenticationViewModel.swift에서

// Apple Sign-In 테스트
viewModel.signInWithApple()

// Google Sign-In 테스트
viewModel.signInWithGoogle()
```

### Android 테스트
```bash
cd /Users/larsinc./Documents/LARS/Rekora/Android/rekora_wrap
flutter run
```

---

## 🔑 환경변수 설정

### .env 파일
```bash
# Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple
APPLE_CLIENT_ID=com.rekora.wrap.signin
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=your-private-key
```

---

## 📱 URL Scheme 설정

### iOS (Info.plist)
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>rekorawrap</string>
      <string>com.googleusercontent.apps.YOUR_CLIENT_ID.oauth</string>
    </array>
  </dict>
</array>
```

### Android (AndroidManifest.xml)
```xml
<activity
    android:name=".MainActivity"
    android:scheme="rekorawrap">
    
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:host="auth"
            android:path="/callback"
            android:scheme="rekorawrap" />
    </intent-filter>
</activity>
```

---

## 🔐 보안 주의사항

⚠️ **필수 확인 사항**

1. **Secret Key 관리**
   - 절대 Git에 커밋하지 말 것
   - 환경변수로만 관리
   - 프로덕션과 개발 분리

2. **Deep Linking**
   - SSL/TLS 사용 (프로덕션)
   - URL Scheme 등록

3. **CORS 설정**
   - 백엔드에서 OAuth 콜백 URL 화이트리스트 등록
   - `Allowed redirect URIs` 설정

4. **Refresh Token**
   - 안전한 저장소 사용 (Keychain/Secure Storage)
   - 만료 시간 설정

---

## 📚 참고 자료

- [Apple Sign in 문서](https://developer.apple.com/sign-in-with-apple/)
- [Google Sign-In 문서](https://developers.google.com/identity/protocols/oauth2)
- [AWS Cognito 페더레이션](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html)

---

## ✅ 체크리스트

- [ ] Apple Developer 계정 준비
- [ ] Apple App ID 생성 및 Sign in with Apple 활성화
- [ ] Apple 개인 키 다운로드
- [ ] Google Cloud 프로젝트 생성
- [ ] Google OAuth 2.0 Credentials 생성
- [ ] iOS 및 Android Bundle ID/Package name 준비
- [ ] Android SHA-1 fingerprint 조회
- [ ] AWS Cognito에 Apple/Google 추가
- [ ] 환경변수 설정
- [ ] iOS Info.plist URL Scheme 설정
- [ ] Android URL Scheme 설정
- [ ] iOS 시뮬레이터 테스트
- [ ] Android 에뮬레이터 테스트
- [ ] 실제 기기 테스트

---

**설정 완료 일시**: ___________  
**담당자**: ___________  
**상태**: ⏳ 진행 중
