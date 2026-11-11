import 'package:datadog_flutter_plugin/datadog_flutter_plugin.dart';

DatadogLogger? _datadogAppLogger;

void initializeDatadogLogger() {
  final logs = DatadogSdk.instance.logs;
  if (logs == null || _datadogAppLogger != null) {
    return;
  }

  _datadogAppLogger = logs.createLogger(
    DatadogLoggerConfiguration(
      name: 'rekora-wrap-android',
      service: 'com.larsinc.rekora.wrap',
      remoteLogThreshold: LogLevel.debug,
      bundleWithRumEnabled: true,
      networkInfoEnabled: true,
    ),
  );
}

void logDatadogInfo(String message, {Map<String, Object?> attributes = const {}}) {
  _datadogAppLogger?.info(message, attributes: attributes);
}

void logDatadogWarn(String message, {Map<String, Object?> attributes = const {}}) {
  _datadogAppLogger?.warn(message, attributes: attributes);
}

void logDatadogError(
  String message, {
  String? errorMessage,
  String? errorKind,
  StackTrace? errorStackTrace,
  Map<String, Object?> attributes = const {},
}) {
  _datadogAppLogger?.error(
    message,
    errorMessage: errorMessage,
    errorKind: errorKind,
    errorStackTrace: errorStackTrace,
    attributes: attributes,
  );
}
