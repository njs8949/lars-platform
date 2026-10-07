import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

/// Minimal OpenAI image-edit client that mirrors the iOS flow.
class OpenAIImageEditService {
  OpenAIImageEditService({
    this.proxyBaseUrl = '',
    this.model = 'gpt-image-1.5',
    this.apiKey = '',
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String proxyBaseUrl;
  final String model;
  final String apiKey;
  final http.Client _client;
  static const String _geminiFallbackModel = 'gemini-2.5-flash-image';

  bool get _useOpenAiModel {
    final m = model.toLowerCase();
    return m.contains('gpt-image') || m.contains('chatgpt-images');
  }

  Uri get _endpoint => Uri.parse('$proxyBaseUrl/api/openai-wrap');

  List<Uri> _openAiProxyEndpoints() => [
    Uri.parse('$proxyBaseUrl/api/openai-wrap'),
    Uri.parse('https://rekora.lars-technologies.com/api/openai-wrap'),
    // DNS lookup failure fallback for some Android networks (cleartext allowed in manifest).
    Uri.parse('http://43.203.87.25/api/openai-wrap'),
    Uri.parse(
      'https://rh2kdj9wdp.ap-northeast-1.awsapprunner.com/api/openai-wrap',
    ),
  ];

  /// Calls Gemini with the original image and mask, returning the wrapped image bytes.
  Future<Uint8List> applyWrap({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    required String wrapDescription,
  }) async {
    return applyWrapWithFullPrompt(
      imageBytes: imageBytes,
      maskBytes: maskBytes,
      fullPrompt: _prompt(wrapDescription, hasMask: maskBytes.isNotEmpty),
    );
  }

  /// Refines a tinted wrap preview into a photorealistic result.
  /// Sends ONE composite image (vehicle with the chip color already tinted over the body
  /// panels) instead of vehicle + mask separately.
  Future<Uint8List> refineWrap({
    required Uint8List tintedImageBytes,
    required String hex,
    required Color color,
    required String finish,
  }) async {
    final finishDesc = (finish == 'gloss')
        ? 'bright, clear reflective shine'
        : (finish == 'matte' ? 'deep non-reflective flat surface' : finish);

    final prompt =
        """
    [TASK] You are a professional automotive photo editor. REPAINT the vehicle body panels.
    
    [MANDATORY COLOR]: Convert the $hex (RGB ${color.red},${color.green},${color.blue}) tinted areas into a solid, opaque $finish vinyl wrap.
    
    ⚠️ CRITICAL CONSTRAINTS (DO NOT IGNORE):
    1. VEHICLE MODEL: Keep the car's model, year, and trim 100% IDENTICAL to the original. DO NOT replace the car with a different model.
    2. GEOMETRY: Maintain all original body lines, panel gaps, headlights, and handles.
    3. PIXEL CONSISTENCY: The output must be pixel-perfectly aligned with the input.
    4. PHOTOREALISM: Preserve ALL original shadows, highlights, and environment reflections from the input image.
    5. NO HALLUCINATION: Do NOT add new parts, spoilers, or background elements.
    
    INSTRUCTIONS:
    1. The input image has the target color $hex tinted onto the body panels.
    2. Convert these tinted areas into a professional $finishDesc vinyl texture.
    3. Ensure the color is opaque and uniform across all panels (Hood, Doors, Bumpers, etc).
    4. Return exactly ONE edited image.
    """;

    return _callGemini(imageBytes: tintedImageBytes, prompt: prompt);
  }

  String _prompt(String wrapDescription, {required bool hasMask}) =>
      '''
[TASK] Apply a $wrapDescription vinyl wrap to EVERY visible body panel of this vehicle.

CRITICAL — FULL COVERAGE REQUIRED:
- Hood: ENTIRE surface must be $wrapDescription
- Front fenders: ENTIRE surface must be $wrapDescription
- Doors (all): ENTIRE surface must be $wrapDescription
- Rear fenders/quarter panels: ENTIRE surface must be $wrapDescription
- Roof: ENTIRE surface must be $wrapDescription
- Trunk/tailgate: ENTIRE surface must be $wrapDescription
- Front and rear bumpers: ENTIRE surface must be $wrapDescription
- Side skirts (if visible): ENTIRE surface must be $wrapDescription
- Side Mirrors: ENTIRE surface must be $wrapDescription

IMPORTANT: Even if a panel is in shadow or dark in the original image, it MUST be repainted with $wrapDescription. Do NOT leave any body panel with its original color.

${hasMask ? 'STRICT MASK COMPLIANCE: A segmentation mask is provided. Apply wrap ONLY to white-mask pixels and NEVER modify black-mask regions.' : 'No mask provided — use your vision to identify ALL body panels and wrap every single one.'}

⚠️ MIRROR RULE: Side mirrors are often missing from segmentation masks. Please identify the side mirror housings and wrap them even if the guidance mask is faint in those specific areas.

PRESERVE (do NOT change):
- Windows and windshields
- Panoramic sunroof glass and convertible fabric soft-top roofs
- Headlights, taillights, turn signals
- Wheels, tires, brake calipers
- Door handles and badges (unless on body panel surface)
- Background, road, sky

MATERIAL: $wrapDescription vinyl with realistic reflections, highlights, and panel curvature shading.

OUTPUT: One complete photorealistic image of the fully wrapped vehicle. Every body panel = $wrapDescription.''';

  /// Calls Gemini with a pre-built complete prompt (bypasses _prompt() template).
  /// Use this when the caller already constructed the full instruction string.
  Future<Uint8List> applyWrapWithFullPrompt({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    Uint8List? chipBytes,
    required String fullPrompt,
  }) async {
    if (_useOpenAiModel) {
      try {
        return await _callOpenAiEdit(
          imageBytes: imageBytes,
          maskBytes: maskBytes,
          chipBytes: chipBytes,
          prompt: fullPrompt,
          label: 'applyWrapWithFullPrompt',
        );
      } catch (e) {
        // ignore: avoid_print
        print(
          '[OpenAIImageEdit] OpenAI failed in applyWrapWithFullPrompt. Fallback to Gemini: $e',
        );
        return _callGeminiCompat(
          imageBytes: imageBytes,
          maskBytes: maskBytes,
          chipBytes: chipBytes,
          prompt: fullPrompt,
          label: 'applyWrapWithFullPrompt/fallbackGemini',
        );
      }
    }

    final hasMask = maskBytes.isNotEmpty;
    final hasChip = chipBytes != null && chipBytes.isNotEmpty;

    final parts = <Map<String, dynamic>>[
      {'text': fullPrompt},
      {
        'inlineData': {
          'mimeType': _mimeTypeForBytes(imageBytes),
          'data': base64Encode(imageBytes),
        },
      },
    ];

    if (hasMask) {
      parts.add({
        'inlineData': {
          'mimeType': 'image/png',
          'data': base64Encode(maskBytes),
        },
      });
    }

    if (hasChip) {
      parts.add({
        'inlineData': {
          'mimeType': _mimeTypeForBytes(chipBytes!),
          'data': base64Encode(chipBytes!),
        },
      });
    }

    final payload = {
      'contents': [
        {'role': 'user', 'parts': parts},
      ],
      'generationConfig': {
        'responseModalities': ['IMAGE', 'TEXT'],
      },
    };
    return _postPayload(
      payload,
      timeout: const Duration(seconds: 80),
      label: 'applyWrapWithFullPrompt',
      apiKey: apiKey,
    );
  }

  /// Focused full-body coverage cleanup pass.
  /// Used after the main wrap pass to catch missed painted panels like roof/hood/pillars.
  Future<Uint8List> applyBodyCoverageCleanup({
    required Uint8List imageBytes,
    required String wrapDescription,
  }) async {
    final prompt =
        '''
You are doing a BODY COVERAGE CLEANUP pass on an already wrapped vehicle image.

Your ONLY job is to find any painted body panel that was NOT fully recolored to the requested wrap and correct it.
Do NOT change chrome delete, wheels, lights, glass transparency, or background.

TARGET WRAP:
$wrapDescription

PAINTED PANELS THAT MUST MATCH THE TARGET WRAP:
• Hood
• Roof
• A-pillars, B-pillars, C-pillars and painted roof-side pillars
• Upper fender shoulders beside the hood
• Trunk / rear deck
• All doors and quarter panels
• Side mirror housings/caps
• Any originally black or dark painted upper body section on a two-tone luxury sedan

CRITICAL RULES:
• Treat the roof as painted bodywork unless it is clearly glass
• Treat dark painted hood sections as missed wrap coverage, not as trim to preserve
• Convert every remaining painted body panel to the same wrap color and finish as the rest of the vehicle
• Keep glass, grille metal, lights, tires and background untouched
• Keep panel gaps and body shape identical

FAIL CONDITIONS:
• Roof remains original dark paint while body is recolored
• Hood or upper fender tops remain original dark paint
• Pillars or mirror caps remain the original body color
• Any change to windows, headlights, wheels, tires, or background

OUTPUT: Same image, but every painted body panel is fully covered in the requested wrap with no missed roof/hood/pillar sections.
''';

    return _callGemini(
      imageBytes: imageBytes,
      prompt: prompt,
      label: 'applyBodyCoverageCleanup',
    );
  }

  /// Partial wrap coverage cleanup — verifies selected panels are fully wrapped.
  Future<Uint8List> applyPartialCoverageCleanup({
    required Uint8List imageBytes,
    required String panelList,
    required String wrapDescription,
  }) async {
    final prompt =
        '''
You are doing a PARTIAL WRAP COVERAGE CLEANUP pass on an already processed vehicle image.

TARGET PANELS that must be fully wrapped: $panelList
TARGET WRAP: $wrapDescription

Your ONLY job is to find any listed TARGET PANEL that was NOT fully wrapped and correct it.
Do NOT change any panel that is not listed above.

RULES:
• Each target panel must be 100% covered in the target wrap color — no partial patches, no gaps
• Non-target panels MUST remain exactly in their original factory color — do NOT change them
• Keep window glass, headlights, taillights, tires, and background completely untouched
• Keep all body lines, panel gaps, and vehicle shape identical

FAIL CONDITIONS:
• Any target panel still shows original factory paint (incomplete coverage)
• Any non-target panel has been recolored or altered
• Any change to windows, headlights, wheels, tires, or background

OUTPUT: Same image but every TARGET PANEL is fully and uniformly covered in the requested wrap.
''';
    return _callGemini(
      imageBytes: imageBytes,
      prompt: prompt,
      label: 'applyPartialCoverageCleanup',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chrome Delete — dedicated single-task pass
  // ─────────────────────────────────────────────────────────────────────────

  /// Dedicated chrome-delete pass.
  /// Input: a vehicle photo (already wrapped or original).
  /// Returns the same image with ALL chrome/silver trim repainted in matte black.
  Future<Uint8List> applyChromeDelete({
    required Uint8List imageBytes,
    required String colorHex,
    required String finish,
  }) async {
    final prompt =
        '''
You are a professional automotive photo editor. Your ONE AND ONLY job in this image is CHROME DELETE.

⚠️ MANDATORY: You MUST visibly change this image. Do NOT return the image unchanged. Chrome delete MUST be clearly visible in the output.

=== WHAT YOU MUST DO ===
Find every shiny chrome/silver metallic trim piece on this car and repaint it to: $finish finish, color $colorHex.

=== HOW TO IDENTIFY CHROME IN THIS PHOTO ===
Chrome/silver trim appears as:
• Highly reflective, mirror-like silver/metallic strips
• Bright white specular highlights on thin metal strips
• Shiny narrow bands running along door edges, window frames, grille surrounds
• Contrast: much brighter/shinier than the car body paint

=== CHROME LOCATIONS — CHECK EVERY ONE ===

① WINDOW BELTLINE CHROME STRIP (최우선 타겟)
   → The BRIGHT SHINY SILVER STRIP that runs horizontally along EVERY DOOR at the very bottom of the window glass
   → It separates the window glass (above) from the door panel (below)
   → Typically 10-20mm tall, runs the full length from front door to rear door
   → THIS IS THE MOST VISIBLE CHROME ON MOST CARS — you MUST eliminate it
   → After edit: this strip must be solid flat $colorHex $finish — no shine, no reflection

①-bis WINDSHIELD SURROUND / FRONT WINDOW FRAME
   → The shiny silver/chrome trim around the FRONT windshield and front side window frame
   → This includes the chrome running up the A-pillar and across the top/upper corners of the windshield frame if visible
   → Luxury sedans often have bright chrome around the front glass opening: this MUST also be deleted
   → After edit: solid flat $colorHex $finish with no bright metallic edge remaining

② WINDOW PILLAR CHROME (A/B/C/D 필러)
   → Shiny silver vertical strips between/beside windows
   → A-pillar: beside windshield
   → B-pillar: between front and rear doors
   → C-pillar / D-pillar: rear window frames
   → After edit: solid flat $colorHex $finish

③ DOOR HANDLE CHROME
   → Silver/chrome handle bars, bezels, or surrounds on each door
   → After edit: solid flat $colorHex $finish

④ FRONT GRILLE CHROME SURROUND
   → The bright chrome frame/outline around the front grille opening
   → On luxury sedans/SUVs this includes the large vertical grille surround and any chrome grille bars
   → For Rolls-Royce / Bentley / Maybach style grilles: recolor BOTH the outer grille frame AND the internal vertical grille slats/bars if they are chrome
   → After edit: solid flat $colorHex $finish

⑤ REAR CHROME STRIP
   → Horizontal chrome bar across trunk lid or tailgate
   → Chrome accent strip on rear bumper
   → After edit: solid flat $colorHex $finish

⑥ MIRROR TRIM
   → Chrome trim ring or chrome housing on side mirrors
   → After edit: solid flat $colorHex $finish

⑦ ANY OTHER CHROME
   → Roof rail chrome caps, brand badge surrounds, hood ornaments, lower bumper trim, side fender garnish, window trim, lower rocker trim, side skirt chrome strip, sill accent trim, any other bright silver metallic trim
   → After edit: solid flat $colorHex $finish

=== HOW TO RENDER THE RESULT ===
• The repainted surface must look like $finish colored vinyl film applied over the chrome
• ZERO metallic shine remaining on any repainted area
• Color: solid opaque $colorHex
• Finish: $finish (if matte: no highlights, if gloss: slight uniform sheen only)
• Keep the original shape and curvature of each trim piece
• Clean sharp edges where the repainted trim meets window glass or body panels
• Maintain original lighting/shadow direction for photorealism

=== DO NOT CHANGE ===
• Car body paint color
• Window glass and windshields (transparent — leave exactly as-is)
• Headlights, taillights, turn signals
• Wheels, tires, brake calipers
• Interior visible through windows
• Background, floor, surroundings

=== QUALITY CHECK (apply before outputting) ===
Before finalizing your output, scan the entire car and ask yourself:
"Is there ANY remaining shiny silver chrome strip visible on this car?"
If YES → you must repaint it before outputting.
The output is only correct when ZERO shiny chrome/silver trim remains visible.

MANDATORY FAILURE CONDITION:
If front windshield trim, window surrounds, grille surround, internal grille bars, door handles, mirror trim, trunk strip, badges, or hood ornament remain chrome,
the output is WRONG and must be regenerated.

OUTPUT: The same car photo with ALL chrome/silver trim replaced by $finish $colorHex.
The change must be clearly and obviously visible — this is a before/after transformation, not a subtle tweak.
''';

    return _callGemini(imageBytes: imageBytes, prompt: prompt);
  }

  /// Focused chrome cleanup pass.
  /// Used after the generic chrome-delete pass to catch missed grille slats and glass surrounds.
  Future<Uint8List> applyChromeCleanup({
    required Uint8List imageBytes,
    required String colorHex,
    required String finish,
  }) async {
    final prompt =
        '''
You are doing a SECOND-PASS chrome cleanup on this vehicle photo.

Your ONLY job is to find any REMAINING shiny silver/chrome trim and repaint it to $finish $colorHex.
Do NOT change the body color, wheels, lights, glass transparency, or background.

PRIORITY TARGETS — inspect these carefully:
1. Front windshield surround and A-pillar chrome
2. Front side window frame / upper window trim / beltline trim
3. Front grille outer surround
4. Internal grille vertical slats / bars if they are chrome
5. Door handle chrome
6. Mirror chrome accents
7. Lower rocker trim / side skirt chrome strip / lower sill accent trim

VERY IMPORTANT:
• This is a cleanup pass for missed chrome only
• If any bright chrome remains on the windshield frame, window trim, or grille slats, the result is WRONG
• Luxury sedan grilles often have many narrow vertical chrome bars: black out every one of them if chrome
• If there is a bright chrome strip running low along the rocker panel / side skirt, that MUST also be blacked out
• Keep all geometry identical and photorealistic
• The recolored trim must look like opaque $finish vinyl in $colorHex with no metallic shine

FAIL CONDITIONS:
• Any bright chrome still visible around the windshield or window openings
• Any chrome remaining on the grille surround or grille slats
• Any chrome remaining on the lower rocker trim / side skirt accent
• Any accidental repaint on the body panels or glass

OUTPUT: Same image with only the remaining chrome pieces converted to $finish $colorHex.
''';

    return _callGemini(
      imageBytes: imageBytes,
      prompt: prompt,
      label: 'applyChromeCleanup',
    );
  }

  /// Window-surround specific cleanup pass.
  /// Used to catch chrome around the windshield and side glass after general cleanup.
  Future<Uint8List> applyWindowChromeCleanup({
    required Uint8List imageBytes,
    required String colorHex,
    required String finish,
  }) async {
    final prompt =
        '''
You are doing a FINAL WINDOW-TRIM chrome delete pass on this vehicle image.

Only inspect and repaint chrome around the glass openings. Do not touch body paint, grille, wheels, lights, or background.

TARGETS:
• Front windshield surround chrome
• The full bright silver frame that runs up both A-pillars and across the top corners of the windshield if visible
• Front side window frame chrome
• Upper window surround chrome along the roof-side edge above the front and rear side windows
• Lower window beltline chrome directly under the side glass
• Rear side window surround chrome
• Any bright silver trim bordering the glass openings
• On Rolls-Royce / Maybach / Bentley style sedans: delete the ENTIRE bright silver window frame around all side glass openings, not just one segment

RULES:
• Convert every remaining shiny chrome/silver window trim piece to opaque $finish $colorHex
• Keep the glass itself transparent and unchanged
• Keep body panel edges unchanged
• No metallic shine may remain on window trim
• Treat every bright silver strip touching the glass perimeter as chrome delete target material
• The output is wrong if any silver outline still traces the side windows or windshield perimeter

FAIL CONDITIONS:
• Any shiny chrome still visible around the windshield
• Any shiny chrome still visible around side windows
• Any shiny silver frame still visible above the windows, below the windows, or along the A-pillars
• Any repaint bleeding into the glass or body paint

OUTPUT: Same image with only the remaining window-surround chrome converted to $finish $colorHex.
''';

    return _callGemini(
      imageBytes: imageBytes,
      prompt: prompt,
      label: 'applyWindowChromeCleanup',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shared HTTP helper
  // ─────────────────────────────────────────────────────────────────────────

  Future<Uint8List> _callGemini({
    required Uint8List imageBytes,
    required String prompt,
    String label = '_callGemini',
  }) async {
    return _callGeminiCompat(
      imageBytes: imageBytes,
      maskBytes: Uint8List(0),
      prompt: prompt,
      label: label,
    );
  }

  Future<Uint8List> _callGeminiCompat({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    Uint8List? chipBytes,
    required String prompt,
    required String label,
  }) async {
    final hasMask = maskBytes.isNotEmpty;
    final hasChip = chipBytes != null && chipBytes.isNotEmpty;
    final payload = {
      'contents': [
        {
          'role': 'user',
          'parts': [
            {'text': prompt},
            {
              'inlineData': {
                'mimeType': _mimeTypeForBytes(imageBytes),
                'data': base64Encode(imageBytes),
              },
            },
            if (hasMask)
              {
                'inlineData': {
                  'mimeType': 'image/png',
                  'data': base64Encode(maskBytes),
                },
              },
            if (hasChip)
              {
                'inlineData': {
                  'mimeType': _mimeTypeForBytes(chipBytes!),
                  'data': base64Encode(chipBytes!),
                },
              },
          ],
        },
      ],
      'generationConfig': {
        'responseModalities': ['IMAGE', 'TEXT'],
      },
    };

    return _postPayload(
      payload,
      timeout: const Duration(seconds: 80),
      label: label,
      apiKey: apiKey,
      proxyUris: _openAiProxyEndpoints(),
      envelopeEngine: 'gemini',
      envelopeModel: _geminiFallbackModel,
    );
  }

  Uri _directGeminiUri(String apiKey, {String? modelId}) => Uri.parse(
    'https://generativelanguage.googleapis.com/v1beta/models/${modelId ?? model}:generateContent?key=$apiKey',
  );

  Uri _directOpenAiUri() => Uri.parse('https://api.openai.com/v1/images/edits');

  Future<Uint8List> _callOpenAiEdit({
    required Uint8List imageBytes,
    required Uint8List maskBytes,
    Uint8List? chipBytes,
    required String prompt,
    required String label,
  }) async {
    final useDirectApi = apiKey.isNotEmpty;
    if (!useDirectApi && proxyBaseUrl.isEmpty) {
      throw StateError(
        'OpenAI API key is required for direct OpenAI image edits.',
      );
    }

    if (!useDirectApi) {
      final rawPayload = {
        'engine': 'openai',
        'model': model,
        'prompt': prompt,
        'imageBase64': base64Encode(imageBytes),
        'image_base64': base64Encode(imageBytes),
        'imageMimeType': _mimeTypeForBytes(imageBytes),
        if (maskBytes.isNotEmpty) 'maskBase64': base64Encode(maskBytes),
        if (maskBytes.isNotEmpty) 'mask_base64': base64Encode(maskBytes),
        if (chipBytes != null && chipBytes.isNotEmpty)
          'chipBase64': base64Encode(chipBytes),
        if (chipBytes != null && chipBytes.isNotEmpty)
          'chip_base64': base64Encode(chipBytes),
      };
      final geminiCompatPayload = {
        'model': model,
        'payload': {
          'contents': [
            {
              'role': 'user',
              'parts': [
                {'text': prompt},
                {
                  'inlineData': {
                    'mimeType': _mimeTypeForBytes(imageBytes),
                    'data': base64Encode(imageBytes),
                  },
                },
                if (maskBytes.isNotEmpty)
                  {
                    'inlineData': {
                      'mimeType': 'image/png',
                      'data': base64Encode(maskBytes),
                    },
                  },
                if (chipBytes != null && chipBytes.isNotEmpty)
                  {
                    'inlineData': {
                      'mimeType': _mimeTypeForBytes(chipBytes),
                      'data': base64Encode(chipBytes),
                    },
                  },
              ],
            },
          ],
          'generationConfig': {
            'responseModalities': ['IMAGE', 'TEXT'],
          },
        },
      };

      // Keep retry surface minimal to avoid long sequential stalls on mobile.
      final candidates = <Map<String, dynamic>>[
        rawPayload,
        {
          'model': model,
          'prompt': prompt,
          'image_base64': base64Encode(imageBytes),
          'imageMimeType': _mimeTypeForBytes(imageBytes),
          if (maskBytes.isNotEmpty) 'mask_base64': base64Encode(maskBytes),
          if (chipBytes != null && chipBytes.isNotEmpty)
            'chip_base64': base64Encode(chipBytes),
        },
        {'model': model, 'payload': rawPayload},
        geminiCompatPayload,
      ];

      HttpException? lastError;
      for (final uri in _openAiProxyEndpoints()) {
        bool endpointHardFailed = false;
        for (final body in candidates) {
          http.Response response;
          try {
            response = await _client
                .post(
                  uri,
                  headers: {
                    'Content-Type': 'application/json',
                    if (apiKey.isNotEmpty) 'x-api-key': apiKey,
                  },
                  body: jsonEncode(body),
                )
                .timeout(const Duration(seconds: 240));
          } on SocketException catch (e) {
            lastError = HttpException(
              'OpenAI $label network failure: ${e.message}',
              uri: uri,
            );
            continue;
          } on HttpException catch (e) {
            lastError = e;
            continue;
          } on http.ClientException catch (e) {
            lastError = HttpException(
              'OpenAI $label client failure: ${e.message}',
              uri: uri,
            );
            continue;
          }

          if (response.statusCode == 404) continue;
          if (response.statusCode == 200) {
            final decoded = jsonDecode(response.body);
            final imageBytesOut = _extractImageBytes(decoded);
            if (imageBytesOut != null) return imageBytesOut;
            throw StateError('OpenAI proxy response did not include an image.');
          }

          final preview = response.body.length > 400
              ? '${response.body.substring(0, 400)}...'
              : response.body;
          final lower = preview.toLowerCase();
          final missingFields =
              lower.contains('missing required fields') ||
              lower.contains('required field') ||
              lower.contains('invalid payload');
          if (response.statusCode == 400 && missingFields) {
            continue;
          }
          lastError = HttpException(
            'OpenAI $label failed (${response.statusCode}) $preview',
            uri: uri,
          );
          endpointHardFailed = true;
          break;
        }
        // DNS/connection failure or per-endpoint hard failure should not stop
        // trying the next fallback endpoint.
        if (endpointHardFailed) {
          continue;
        }
      }
      if (proxyBaseUrl.isNotEmpty) {
        // ignore: avoid_print
        print(
          '[OpenAIImageEdit] OpenAI proxy path failed. Falling back to Gemini proxy path.',
        );
        return _callGeminiCompat(
          imageBytes: imageBytes,
          maskBytes: maskBytes,
          chipBytes: chipBytes,
          prompt: prompt,
          label: '$label/fallbackGemini',
        );
      }
      throw lastError ??
          HttpException(
            'OpenAI $label failed (400) {"error":"Missing required fields"}',
            uri: _openAiProxyEndpoints().last,
          );
    }

    final req = http.MultipartRequest('POST', _directOpenAiUri());
    req.headers['Authorization'] = 'Bearer $apiKey';
    req.fields['model'] = model;
    req.fields['prompt'] = prompt;
    req.fields['quality'] = 'high';
    req.fields['background'] = 'auto';
    req.fields['n'] = '1';

    req.files.add(
      http.MultipartFile.fromBytes(
        'image',
        imageBytes,
        filename: 'input.${_mimeExtForBytes(imageBytes)}',
        contentType: _mediaTypeForBytes(imageBytes),
      ),
    );
    if (maskBytes.isNotEmpty) {
      req.files.add(
        http.MultipartFile.fromBytes(
          'mask',
          maskBytes,
          filename: 'mask.png',
          contentType: MediaType('image', 'png'),
        ),
      );
    }
    if (chipBytes != null && chipBytes.isNotEmpty) {
      req.files.add(
        http.MultipartFile.fromBytes(
          'image[]',
          chipBytes,
          filename: 'chip.${_mimeExtForBytes(chipBytes)}',
          contentType: _mediaTypeForBytes(chipBytes),
        ),
      );
    }

    final streamed = await req.send().timeout(const Duration(seconds: 90));
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode != 200) {
      final preview = response.body.length > 400
          ? '${response.body.substring(0, 400)}...'
          : response.body;
      if (proxyBaseUrl.isNotEmpty) {
        // ignore: avoid_print
        print(
          '[OpenAIImageEdit] Direct OpenAI failed. Falling back to Gemini proxy path.',
        );
        return _callGeminiCompat(
          imageBytes: imageBytes,
          maskBytes: maskBytes,
          chipBytes: chipBytes,
          prompt: prompt,
          label: '$label/fallbackGemini',
        );
      }
      throw HttpException(
        'OpenAI $label failed (${response.statusCode}) $preview',
        uri: _directOpenAiUri(),
      );
    }
    final decoded = jsonDecode(response.body);
    final imageBytesOut = _extractImageBytes(decoded);
    if (imageBytesOut != null) return imageBytesOut;
    throw StateError('OpenAI response did not include an image.');
  }

  Future<Uint8List> _postPayload(
    Map<String, dynamic> payload, {
    required Duration timeout,
    required String label,
    String? apiKey,
    List<Uri>? proxyUris,
    bool wrapInEnvelope = true,
    String? envelopeEngine,
    String? envelopeModel,
  }) async {
    const maxRetries = 0;
    const retryDelays = [2];

    // 프록시가 없으면 Gemini API 직접 호출
    final useDirectApi =
        (apiKey != null && apiKey.isNotEmpty) &&
        (proxyBaseUrl.isEmpty) &&
        (envelopeEngine == null);

    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      final http.Response response;
      if (useDirectApi) {
        // 직접 호출: Gemini API 형식 (contents 페이로드만 전송)
        response = await _client
            .post(
              _directGeminiUri(apiKey!, modelId: envelopeModel),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(payload),
            )
            .timeout(timeout);
      } else {
        final uris = (proxyUris != null && proxyUris.isNotEmpty)
            ? proxyUris
            : <Uri>[_endpoint];
        http.Response? selected;
        Uri selectedUri = uris.first;
        for (final uri in uris) {
          selectedUri = uri;
          // ignore: avoid_print
          print(
            '[OpenAIImageEdit] POST to $uri, payload size: ${jsonEncode(payload).length}',
          );
          final r = await _client
              .post(
                uri,
                headers: {
                  'Content-Type': 'application/json',
                  if (apiKey != null && apiKey.isNotEmpty) 'x-api-key': apiKey,
                },
                body: jsonEncode(
                  wrapInEnvelope
                      ? {
                          if (envelopeEngine != null) 'engine': envelopeEngine,
                          'model': envelopeModel ?? model,
                          'payload': payload,
                        }
                      : payload,
                ),
              )
              .timeout(timeout);
          if (r.statusCode == 404 && uri != uris.last) {
            continue;
          }
          selected = r;
          break;
        }
        response =
            selected ??
            http.Response(
              '{"error":"Proxy endpoint not found"}',
              404,
              request: http.Request('POST', selectedUri),
            );
      }

      // ignore: avoid_print
      print('[OpenAIImageEdit] Response status: ${response.statusCode}');

      // 429 = Rate limit: wait and retry
      if (response.statusCode == 429 && attempt < maxRetries) {
        final waitSec = retryDelays[attempt];
        // ignore: avoid_print
        print(
          '[OpenAIImageEdit] 429 rate limit on $label, retry ${attempt + 1}/$maxRetries after ${waitSec}s...',
        );
        await Future.delayed(Duration(seconds: waitSec));
        continue;
      }

      if (response.statusCode != 200) {
        final preview = response.body.length > 400
            ? '${response.body.substring(0, 400)}...'
            : response.body;
        // ignore: avoid_print
        print('[OpenAIImageEdit] Error body: ${response.body}');
        throw HttpException(
          'OpenAI $label failed (${response.statusCode}) $preview',
          uri: _endpoint,
        );
      }

      final decoded = jsonDecode(response.body);
      final imageBytes = _extractImageBytes(decoded);
      if (imageBytes != null) {
        return imageBytes;
      }

      throw OpenAIImageEditException.noImage(
        response.body.substring(0, response.body.length.clamp(0, 300)),
      );
    }

    // 모든 재시도 소진 (should not reach here)
    throw OpenAIImageEditException.noImage('Max retries exceeded for $label');
  }

  Uint8List? _extractImageBytes(dynamic decoded) {
    if (decoded is! Map) return null;

    // 1. Direct image field (Proxy fallback)
    final directImage = decoded['image'] ?? decoded['imageBase64'];
    if (directImage is String && directImage.isNotEmpty) {
      try {
        return base64Decode(directImage);
      } catch (e) {
        print('[OpenAIImageEdit] base64Decode error: $e');
        return null;
      }
    }

    // 1-bis. OpenAI Images response structure.
    final data = decoded['data'];
    if (data is List && data.isNotEmpty) {
      final first = data.first;
      if (first is Map) {
        final b64 = first['b64_json'] as String?;
        if (b64 != null && b64.isNotEmpty) {
          try {
            return base64Decode(b64);
          } catch (_) {}
        }
      }
    }

    // 2. Full Gemini response structure
    final candidates = decoded['candidates'];
    if (candidates is List && candidates.isNotEmpty) {
      final firstCandidate = candidates[0];
      if (firstCandidate is! Map) return null;

      final finishReason = firstCandidate['finishReason'] as String? ?? '';
      if (finishReason == 'IMAGE_SAFETY' || finishReason == 'OTHER') {
        throw OpenAIImageEditException.blocked(finishReason);
      }

      final content = firstCandidate['content'] as Map?;
      final parts = content?['parts'] as List?;
      if (parts != null && parts.isNotEmpty) {
        String? refusal;
        for (final part in parts) {
          if (part is! Map) continue;
          final inline = part['inlineData'] ?? part['inline_data'];
          if (inline is Map) {
            final data = inline['data'] as String?;
            if (data != null && data.isNotEmpty) {
              try {
                return base64Decode(data);
              } catch (e) {
                print('[OpenAIImageEdit] part base64Decode error: $e');
              }
            }
          }
          final text = part['text'] as String?;
          if (text != null && text.isNotEmpty) refusal = text;
        }
        if (refusal != null) throw OpenAIImageEditException.aiRefused(refusal);
      }
    }

    return null;
  }

  String _mimeTypeForBytes(Uint8List bytes) {
    if (bytes.length >= 8 &&
        bytes[0] == 0x89 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x4E &&
        bytes[3] == 0x47 &&
        bytes[4] == 0x0D &&
        bytes[5] == 0x0A &&
        bytes[6] == 0x1A &&
        bytes[7] == 0x0A) {
      return 'image/png';
    }
    if (bytes.length >= 3 &&
        bytes[0] == 0xFF &&
        bytes[1] == 0xD8 &&
        bytes[2] == 0xFF) {
      return 'image/jpeg';
    }
    return 'image/png';
  }

  String _mimeExtForBytes(Uint8List bytes) {
    final t = _mimeTypeForBytes(bytes);
    if (t == 'image/jpeg') return 'jpg';
    return 'png';
  }

  MediaType _mediaTypeForBytes(Uint8List bytes) {
    final t = _mimeTypeForBytes(bytes);
    final parts = t.split('/');
    return MediaType(parts[0], parts[1]);
  }
}

class OpenAIImageEditException implements Exception {
  OpenAIImageEditException._(this.message);

  final String message;

  factory OpenAIImageEditException.blocked(String finishReason) {
    return OpenAIImageEditException._(
      'OpenAI blocked output: finishReason=$finishReason',
    );
  }

  factory OpenAIImageEditException.aiRefused(String refusal) {
    return OpenAIImageEditException._(
      'OpenAI AI refused image generation: $refusal',
    );
  }

  factory OpenAIImageEditException.noImage(String bodyPreview) {
    return OpenAIImageEditException._(
      'OpenAI did not return an image. Body: $bodyPreview',
    );
  }

  @override
  String toString() => message;
}
