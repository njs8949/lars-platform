import 'dart:async';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../config.dart';

class BillingCatalogItem {
  const BillingCatalogItem({
    required this.planId,
    required this.productId,
    required this.title,
    required this.description,
    required this.priceLabel,
    required this.productDetails,
  });

  final String planId;
  final String productId;
  final String title;
  final String description;
  final String priceLabel;
  final ProductDetails productDetails;
}

class BillingEntitlement {
  const BillingEntitlement({
    required this.planId,
    required this.productId,
    required this.purchaseId,
    required this.purchaseToken,
    required this.status,
  });

  final String planId;
  final String productId;
  final String? purchaseId;
  final String? purchaseToken;
  final PurchaseStatus status;
}

class BillingService {
  BillingService({
    required this.onCatalogChanged,
    required this.onEntitlementGranted,
    required this.onPendingChanged,
    required this.onRestoreChanged,
    required this.onError,
  });

  final void Function(
    bool available,
    Map<String, BillingCatalogItem> catalog,
    String? error,
  )
  onCatalogChanged;
  final Future<void> Function(BillingEntitlement entitlement)
  onEntitlementGranted;
  final void Function(bool value) onPendingChanged;
  final void Function(bool value) onRestoreChanged;
  final void Function(String message) onError;

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _purchaseSub;
  bool _initialized = false;

  static const Map<String, String> planProductIds = {
    'basic': Config.iapBasicProductId,
    'advanced': Config.iapAdvancedProductId,
    'pro': Config.iapProProductId,
  };

  Future<void> initialize() async {
    if (_initialized) {
      await refreshCatalog();
      return;
    }
    _purchaseSub = _iap.purchaseStream.listen(
      _handlePurchaseUpdates,
      onError: (Object error) => onError('Billing stream error: $error'),
      onDone: () => _purchaseSub?.cancel(),
    );
    _initialized = true;
    await refreshCatalog();
  }

  Future<void> refreshCatalog() async {
    final available = await _iap.isAvailable();
    if (!available) {
      onCatalogChanged(false, const {}, null);
      return;
    }

    final ids = planProductIds.values.where((id) => id.isNotEmpty).toSet();
    if (ids.isEmpty) {
      onCatalogChanged(false, const {}, 'No Play product IDs configured.');
      return;
    }

    final response = await _iap.queryProductDetails(ids);
    final catalog = <String, BillingCatalogItem>{};
    for (final detail in response.productDetails) {
      final planId = _planIdForProduct(detail.id);
      if (planId == null) continue;
      catalog[planId] = BillingCatalogItem(
        planId: planId,
        productId: detail.id,
        title: detail.title,
        description: detail.description,
        priceLabel: detail.price,
        productDetails: detail,
      );
    }

    final missing = response.notFoundIDs.isEmpty
        ? null
        : 'Products not found: ${response.notFoundIDs.join(', ')}';
    final errorMessage = response.error?.message ?? missing;
    onCatalogChanged(true, catalog, errorMessage);
  }

  Future<void> buyPlan(String planId) async {
    final available = await _iap.isAvailable();
    if (!available) {
      onError('Google Play billing is unavailable on this device.');
      return;
    }

    final productId = planProductIds[planId];
    if (productId == null || productId.isEmpty) {
      onError('No product ID configured for $planId.');
      return;
    }

    final response = await _iap.queryProductDetails({productId});
    final product = response.productDetails
        .where((p) => p.id == productId)
        .firstOrNull;
    if (product == null) {
      onError(
        response.error?.message ?? 'Product $productId is not available.',
      );
      return;
    }

    onPendingChanged(true);
    final started = await _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: product),
    );
    if (!started) {
      onPendingChanged(false);
      onError('Failed to start purchase flow.');
    }
  }

  Future<void> restorePurchases() async {
    final available = await _iap.isAvailable();
    if (!available) {
      onError('Google Play billing is unavailable on this device.');
      return;
    }
    onRestoreChanged(true);
    try {
      await _iap.restorePurchases();
    } catch (e) {
      onError('Failed to restore purchases: $e');
    } finally {
      onRestoreChanged(false);
    }
  }

  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      switch (purchase.status) {
        case PurchaseStatus.pending:
          onPendingChanged(true);
          continue;
        case PurchaseStatus.error:
          onPendingChanged(false);
          onError(
            purchase.error?.message ??
                'Purchase failed for ${purchase.productID}.',
          );
          break;
        case PurchaseStatus.canceled:
          onPendingChanged(false);
          break;
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          onPendingChanged(false);
          final planId = _planIdForProduct(purchase.productID);
          if (planId != null) {
            await onEntitlementGranted(
              BillingEntitlement(
                planId: planId,
                productId: purchase.productID,
                purchaseId: purchase.purchaseID,
                purchaseToken: purchase.verificationData.serverVerificationData,
                status: purchase.status,
              ),
            );
          }
          break;
      }

      if (purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
    }
  }

  String? _planIdForProduct(String productId) {
    for (final entry in planProductIds.entries) {
      if (entry.value == productId) return entry.key;
    }
    return null;
  }

  Future<void> dispose() async {
    await _purchaseSub?.cancel();
  }
}
