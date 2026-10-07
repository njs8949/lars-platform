/// Backend endpoints (set via --dart-define when running or building).
class Config {
  static const backendBaseUrl = String.fromEnvironment(
    'BACKEND_BASE_URL',
    defaultValue: 'https://rekora.lars-technologies.com',
  );

  static const backendBaseUrlCellular = String.fromEnvironment(
    'BACKEND_BASE_URL_CELLULAR',
    defaultValue: 'https://rekora.lars-technologies.com',
  );

  static const wrapApplyPath = String.fromEnvironment(
    'WRAP_APPLY_PATH',
    defaultValue: '/generate-mask',
  );

  static const ocioServiceUrl = String.fromEnvironment(
    'OCIO_SERVICE_URL',
    defaultValue: 'https://rekora.lars-technologies.com',
  );

  static const enableOpenAiImage = bool.fromEnvironment(
    'OPENAI_IMAGE_ENABLED',
    defaultValue: true,
  );

  static const communitySiteUrl = String.fromEnvironment(
    'COMMUNITY_SITE_URL',
    defaultValue: 'https://rekora.lars-technologies.com',
  );

  static const communityFeedUrl = String.fromEnvironment(
    'COMMUNITY_FEED_URL',
    defaultValue: 'https://rekora.lars-technologies.com/api/community/feed',
  );

  static const iapBasicProductId = String.fromEnvironment(
    'IAP_BASIC_PRODUCT_ID',
    defaultValue: 'rekora_basic_monthly',
  );

  static const iapAdvancedProductId = String.fromEnvironment(
    'IAP_ADVANCED_PRODUCT_ID',
    defaultValue: 'rekora_advanced_monthly',
  );

  static const iapProProductId = String.fromEnvironment(
    'IAP_PRO_PRODUCT_ID',
    defaultValue: 'rekora_pro_monthly',
  );

  static const geminiImageModel = String.fromEnvironment(
    'GEMINI_IMAGE_MODEL',
    defaultValue: 'gemini-2.5-flash-image',
  );

  static const openAiImageModel = String.fromEnvironment(
    'OPENAI_IMAGE_MODEL',
    defaultValue: 'gpt-image-1.5',
  );

  @Deprecated('Use geminiImageModel/openAiImageModel by subscription plan.')
  static const imageModel = geminiImageModel;

  static final imageProxyUrl = (() {
    const override = String.fromEnvironment(
      'OPENAI_IMAGE_PROXY_URL',
      defaultValue: '',
    );
    return override.isNotEmpty
        ? override
        : 'https://rekora.lars-technologies.com';
  })();

  static const imageApiKey = String.fromEnvironment(
    'OPENAI_IMAGE_API_KEY',
    defaultValue: '',
  );

  /// AWS Bedrock Titan Image Generator server URL
  static const bedrockServerUrl = String.fromEnvironment(
    'BEDROCK_SERVER_URL',
    defaultValue: 'https://rekora.lars-technologies.com',
  );

  /// Enable Bedrock as primary image generation service
  static const enableBedrockImage = bool.fromEnvironment(
    'BEDROCK_IMAGE_ENABLED',
    defaultValue: false,
  );
}
