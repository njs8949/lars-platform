# LARS Prism 모바일 앱 빌드 가이드

## 📱 iOS 빌드

### 1. 준비 단계

```bash
# Xcode 설치
xcode-select --install

# Rust iOS 타겟 추가
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios
rustup target add aarch64-apple-ios-sim

# CocoaPods 설치
sudo gem install cocoapods
```

### 2. 개발자 서명 설정

```bash
# iOS 설정 파일 수정
cat > src-tauri/tauri.conf.ios.json << 'EOF'
{
  "ios": {
    "teamId": "YOUR_APPLE_TEAM_ID",
    "signingIdentity": "iPhone Developer: your.email@example.com"
  }
}
EOF
```

### 3. 빌드

```bash
# iOS 개발 빌드
npm run tauri build -- --target aarch64-apple-ios

# iOS 릴리스 빌드
npm run tauri build -- --target aarch64-apple-ios --release

# 시뮬레이터용
npm run tauri build -- --target x86_64-apple-ios
```

### 4. Xcode에서 빌드

```bash
# 프로젝트 생성
cd src-tauri
cargo build --target aarch64-apple-ios --release

# Xcode 열기
open src-ios/App.xcworkspace

# Xcode에서 빌드 및 배포
# Product > Archive 클릭
```

---

## 🤖 Android 빌드

### 1. 준비 단계

```bash
# Android SDK 설치
# https://developer.android.com/studio 에서 Android Studio 다운로드

# Rust Android 타겟 추가
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android

# Android NDK 설치
# Android Studio에서: SDK Manager > SDK Tools > NDK (Side by side) 설치

# 환경변수 설정 (.zshrc 또는 .bashrc에 추가)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin
export NDK_HOME=$ANDROID_HOME/ndk/YOUR_NDK_VERSION
export PATH=$PATH:$NDK_HOME
```

### 2. 키스토어 생성

```bash
# 새 키스토어 생성 (처음 한 번만)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# 설정 파일에 경로 추가
cat > src-tauri/tauri.conf.android.json << 'EOF'
{
  "android": {
    "keyStore": {
      "path": "../my-release-key.jks",
      "alias": "my-key-alias"
    }
  }
}
EOF
```

### 3. 빌드

```bash
# Android 개발 빌드 (APK)
npm run tauri build -- --target aarch64-linux-android

# Android 릴리스 빌드 (APK)
npm run tauri build -- --target aarch64-linux-android --release

# Android 번들 빌드 (AAB - Google Play용)
npm run tauri build -- --target aarch64-linux-android --release --app-bundle
```

### 4. 테스트

```bash
# 에뮬레이터 실행
$ANDROID_HOME/emulator/emulator -avd your_avd_name

# 앱 설치
adb install -r app-release.apk

# 앱 실행
adb shell am start -n com.lars_technologies.prism/.MainActivity
```

---

## 📦 Google Play 배포

### 1. Google Play 계정 설정

```bash
# Google Play Console에서:
# 1. 프로젝트 생성
# 2. 앱 등록
# 3. 서명 키 생성
# 4. 스토어 목록 작성
```

### 2. AAB 파일 업로드

```bash
# AAB 생성
npm run tauri build -- --target aarch64-linux-android --release --app-bundle

# Google Play Console에서 업로드
# - Release > Production 탭
# - AAB 파일 드래그 앤 드롭
# - 배포 버튼 클릭
```

---

## 🍎 App Store 배포

### 1. Apple Developer 계정 설정

```bash
# Apple Developer Program 등록
# https://developer.apple.com/membership/

# App ID 생성
# https://developer.apple.com/account/resources/identifiers

# 프로비저닝 프로필 생성
# https://developer.apple.com/account/resources/profiles
```

### 2. TestFlight 업로드

```bash
# IPA 생성
npm run tauri build -- --target aarch64-apple-ios --release

# Transporter를 통해 업로드
open /Applications/Transporter.app
```

---

## 🔧 개발 팁

### Hot Reload

```bash
# 개발 중 핫 리로드
npm run dev
# 모바일 디바이스에서 http://YOUR_IP:5173 접속
```

### 디버깅

**iOS:**
```bash
# Xcode 콘솔에서 로그 확인
# Run > Console 탭
```

**Android:**
```bash
# adb logcat으로 로그 보기
adb logcat | grep prism
```

### 성능 최적화

```bash
# 릴리스 빌드 사용
npm run build

# 불필요한 권한 제거 (tauri.conf.android.json)
# 불필요한 기능 비활성화

# WebView 최적화
# src-tauri/tauri.conf.json에서 CSP 설정 조정
```

---

## ✅ 체크리스트

- [ ] iOS 개발자 계정 활성화
- [ ] Android 키스토어 생성
- [ ] 모바일 앱 권한 설정 확인
- [ ] 소프트웨어 개발 키(SDK) 설치
- [ ] 개발 빌드 테스트
- [ ] 릴리스 빌드 테스트
- [ ] 에뮬레이터/실제 디바이스에서 테스트
- [ ] App Store Connect 설정
- [ ] Google Play Console 설정
- [ ] TestFlight 베타 테스트
- [ ] 배포

---

## 📚 참고 자료

- [Tauri 모바일 문서](https://tauri.app/develop/calling-rust/)
- [iOS 앱 배포](https://developer.apple.com/ios/submit/)
- [Android 앱 배포](https://developer.android.com/studio/publish)
