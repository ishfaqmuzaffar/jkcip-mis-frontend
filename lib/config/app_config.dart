import 'dart:html' as html;

class AppConfig {
  static const String _envBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get baseUrl {
    if (_envBaseUrl.trim().isNotEmpty) {
      return _normalize(_envBaseUrl);
    }

    final host = html.window.location.hostname;
    if ((host ?? '').isNotEmpty && host != 'localhost') {
      return 'http://$host:3002/api';
    }

    return 'http://72.60.28.22:3002/api';
  }

  static String _normalize(String value) {
    final trimmed = value.trim();
    if (trimmed.endsWith('/')) {
      return trimmed.substring(0, trimmed.length - 1);
    }
    return trimmed;
  }
}
