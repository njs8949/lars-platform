# ML Kit text recognition language option classes (tree-shaken in our build).
# Suppress warnings about optional language-specific recognizers that are not packaged.
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**

# Keep the TextRecognizer API surface.
-keep class com.google.mlkit.vision.text.** { *; }
