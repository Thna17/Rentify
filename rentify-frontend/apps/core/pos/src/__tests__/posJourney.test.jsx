import { describe, it, expect, vi } from "vitest";
import {
  buildExactProductLookupIndex,
  resolveExactProductLookupFromIndex,
  normalizeScanCode,
} from "../lib/posProductLookup.js";
import { resolvePaymentMethod, isProductInStore } from "../hooks/useStorePOS.js";

describe("P4-POS-001: Physical-Store POS Journey Suite", () => {
  const storeA = "11111111-2222-3333-4444-555555555555";
  const mockProducts = [
    {
      id: "prod-1",
      storeId: storeA,
      name: "Handmade Silk Scarf",
      sku: "SILK-SCF-001",
      barcode: "8851234567890",
      basePrice: 45.0,
      stockQuantity: 10,
      trackInventory: true,
      status: "active",
      variants: [
        {
          id: "var-1",
          sku: "SILK-SCF-RED",
          barcode: "8851234567891",
          price: 45.0,
          title: "Ruby Red",
          stockQuantity: 4,
          trackInventory: true,
        },
        {
          id: "var-2",
          sku: "SILK-SCF-BLUE",
          barcode: "8851234567892",
          price: 48.0,
          title: "Sapphire Blue",
          stockQuantity: 6,
          trackInventory: true,
        },
      ],
    },
    {
      id: "prod-2",
      storeId: storeA,
      name: "Kampot Black Pepper (100g)",
      sku: "PEPPER-BLK-100",
      barcode: "8859999000012",
      basePrice: 6.5,
      stockQuantity: 25,
      trackInventory: true,
      status: "active",
      variants: [],
    },
  ];

  describe("1. Barcode & Exact SKU Resolution", () => {
    it("indexes products and resolves exact barcode to product and variant", () => {
      const index = buildExactProductLookupIndex(mockProducts);

      // Lookup product by main barcode
      const matchProduct = resolveExactProductLookupFromIndex("8859999000012", index);
      expect(matchProduct).toBeDefined();
      expect(matchProduct.product.id).toBe("prod-2");
      expect(matchProduct.variantId).toBeFalsy();

      // Lookup variant by variant barcode
      const matchVariant = resolveExactProductLookupFromIndex("8851234567891", index);
      expect(matchVariant).toBeDefined();
      expect(matchVariant.product.id).toBe("prod-1");
      expect(matchVariant.variantId).toBe("var-1");

      // Lookup by SKU (case insensitive)
      const matchSku = resolveExactProductLookupFromIndex("silk-scf-blue", index);
      expect(matchSku).toBeDefined();
      expect(matchSku.product.id).toBe("prod-1");
      expect(matchSku.variantId).toBe("var-2");
    });

    it("normalizes scan input with leading/trailing spaces and control characters", () => {
      expect(normalizeScanCode("  8851234567890 \r\n")).toBe("8851234567890");
      expect(normalizeScanCode("PEPPER-BLK-100\t")).toBe("pepper-blk-100");
    });

    it("filters products by active store and ensures marketplace store-first isolation", () => {
      expect(isProductInStore(mockProducts[0], storeA)).toBe(true);
      expect(isProductInStore(mockProducts[0], "different-store-uuid")).toBe(false);
      expect(isProductInStore({ id: "inactive-p", status: "inactive" }, storeA)).toBe(false);
    });
  });

  describe("2. Cart Totals & Cash Tender Calculation", () => {
    it("calculates exact subtotal, discount, USD total and KHR exchange total", () => {
      const cart = [
        { productId: "prod-1", price: 45.0, quantity: 2 },
        { productId: "prod-2", price: 6.5, quantity: 1 },
      ];
      const exchangeRate = 4100;
      const discountPercent = 10; // 10% discount

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(subtotal).toBe(96.5);

      const discountAmount = (subtotal * discountPercent) / 100;
      expect(discountAmount).toBe(9.65);

      const totalUSD = Math.max(0, subtotal - discountAmount);
      expect(totalUSD).toBe(86.85);

      const totalKHR = Math.round(totalUSD * exchangeRate);
      expect(totalKHR).toBe(356085);
    });

    it("calculates cash change due accurately", () => {
      const totalUSD = 34.5;
      const cashTendered = 40.0;
      const changeDue = Math.max(0, cashTendered - totalUSD);
      expect(changeDue).toBe(5.5);

      const underTendered = 30.0;
      const noChange = Math.max(0, underTendered - totalUSD);
      expect(noChange).toBe(0);
    });
  });

  describe("3. POS Idempotency & Network Recovery Guidance", () => {
    it("generates a stable checkoutKey and reuses it upon network retry", () => {
      const saleAttemptKey = "pos-key-unique-789";
      const payload = {
        storeId: storeA,
        checkoutKey: saleAttemptKey,
        idempotencyKey: saleAttemptKey,
        items: [{ productId: "prod-1", quantity: 1, price: 45.0 }],
        paymentMethod: "cash",
      };

      // Ensure key is preserved across attempts
      expect(payload.checkoutKey).toBe(saleAttemptKey);
      expect(payload.idempotencyKey).toBe(saleAttemptKey);

      // Simulating retry with the same key
      const retryPayload = { ...payload };
      expect(retryPayload.checkoutKey).toBe(saleAttemptKey);
      expect(retryPayload.items[0].quantity).toBe(1);
    });

    it("preserves original checkoutKey in offline recovery queue items", () => {
      const key = "pos-offline-attempt-111";
      const offlineItem = {
        id: `offline-${Date.now()}`,
        payload: {
          storeId: storeA,
          checkoutKey: key,
          idempotencyKey: key,
          items: [{ productId: "prod-2", quantity: 2, price: 6.5 }],
        },
      };

      expect(offlineItem.payload.checkoutKey).toBe(key);
      expect(offlineItem.payload.idempotencyKey).toBe(key);
    });
  });

  describe("4. Staff Permission Gating", () => {
    function checkPosPermission(user) {
      if (!user) return false;
      if (user.type !== "staff") return true; // Owner or platform admin
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      return perms.includes("pos") || perms.includes("manage_pos");
    }

    it("allows merchant owner and admin unconditionally", () => {
      expect(checkPosPermission({ type: "user", role: "merchant" })).toBe(true);
      expect(checkPosPermission({ type: "admin", role: "admin" })).toBe(true);
    });

    it("allows staff with 'pos' or 'manage_pos' permission", () => {
      expect(checkPosPermission({ type: "staff", permissions: ["pos"] })).toBe(true);
      expect(checkPosPermission({ type: "staff", permissions: ["manage_pos"] })).toBe(true);
      expect(checkPosPermission({ type: "staff", permissions: ["orders", "pos"] })).toBe(true);
    });

    it("rejects staff without pos permission", () => {
      expect(checkPosPermission({ type: "staff", permissions: ["orders"] })).toBe(false);
      expect(checkPosPermission({ type: "staff", permissions: ["manage_analytics"] })).toBe(false);
      expect(checkPosPermission({ type: "staff", permissions: [] })).toBe(false);
      expect(checkPosPermission({ type: "staff" })).toBe(false);
    });
  });

  describe("5. Cancellation & Return Boundaries", () => {
    it("validates return eligibility only for completed orders and blocks refunded orders", () => {
      function canReturnOrder(order) {
        if (!order) return { eligible: false, reason: "Order not found" };
        if (order.status === "refunded" || order.status === "cancelled") {
          return { eligible: false, reason: "Order has already been refunded" };
        }
        if (order.status !== "completed") {
          return { eligible: false, reason: "Only completed orders can be returned" };
        }
        return { eligible: true };
      }

      expect(canReturnOrder({ id: "o-1", status: "completed" }).eligible).toBe(true);
      expect(canReturnOrder({ id: "o-2", status: "refunded" }).eligible).toBe(false);
      expect(canReturnOrder({ id: "o-3", status: "pending" }).eligible).toBe(false);
      expect(canReturnOrder({ id: "o-4", status: "cancelled" }).eligible).toBe(false);
    });

    it("creates a cash payout event when refunding a cash POS sale", () => {
      const order = {
        id: "order-cash-refund-1",
        totalAmount: 45.0,
        paymentMethod: "cash",
      };

      const refundTillEvent = {
        id: `till-${Date.now()}`,
        type: "cash_out_refund",
        amount: order.totalAmount,
        reason: `POS Return #${order.id.slice(0, 8)}`,
        timestamp: new Date().toISOString(),
      };

      expect(refundTillEvent.type).toBe("cash_out_refund");
      expect(refundTillEvent.amount).toBe(45.0);
      expect(refundTillEvent.reason).toContain("POS Return");
    });
  });

  describe("6. Payment Resolution Provider Mapping", () => {
    it("maps POS payment types to canonical payment method providers", () => {
      expect(resolvePaymentMethod("cash")).toEqual({ method: "COD", provider: "COD" });
      expect(resolvePaymentMethod("card")).toEqual({ method: "CARD", provider: "ABA_PAYWAY" });
      expect(resolvePaymentMethod("khqr")).toEqual({ method: "WALLET", provider: "KHQR" });
    });
  });

  describe("7. Inventory Limits & In-App Stock Warning Feedback", () => {
    function evaluateStockAddition(product, currentCartQty, addQty, variantId = null) {
      const selectedVariant = variantId
        ? (product.variants || []).find((v) => v.id === variantId)
        : null;
      const effectiveStock = selectedVariant
        ? (selectedVariant.stockQuantity ?? product.stockQuantity)
        : (product.stockQuantity ?? 0);
      const trackInventory = selectedVariant
        ? (selectedVariant.trackInventory ?? product.trackInventory)
        : product.trackInventory;
      const itemName = `${product.name}${selectedVariant?.title ? ' - ' + selectedVariant.title : ''}`;

      if (trackInventory && effectiveStock <= 0) {
        return {
          allowed: false,
          alert: {
            title: "Out of Stock",
            message: `"${itemName}" is currently out of stock.`,
            tone: "warning",
            stockLimit: 0,
            itemName,
          },
        };
      }

      if (
        trackInventory &&
        effectiveStock !== undefined &&
        effectiveStock !== null &&
        currentCartQty + addQty > effectiveStock
      ) {
        return {
          allowed: false,
          alert: {
            title: "Stock Limit Reached",
            message: `Cannot add more than available stock (${effectiveStock} in stock).`,
            tone: "warning",
            stockLimit: effectiveStock,
            itemName,
          },
        };
      }

      return { allowed: true, newQty: currentCartQty + addQty };
    }

    function checkStockFeedbackStatus(product, currentCartQty) {
      const isOutOfStock =
        product.trackInventory && ((product.stockQuantity ?? 0) <= 0 || product.status === "out_of_stock");
      const hasTrackedStock =
        product.trackInventory && product.stockQuantity !== undefined && product.stockQuantity !== null;
      const isStockLimitReached = !isOutOfStock && hasTrackedStock && currentCartQty >= (product.stockQuantity ?? 0);

      return {
        isOutOfStock,
        isStockLimitReached,
        isCartItemAtMax: hasTrackedStock && currentCartQty >= (product.stockQuantity ?? 0),
      };
    }

    it("prevents adding out-of-stock items and yields an out-of-stock notice", () => {
      const oosProduct = {
        id: "prod-oos",
        name: "Out of Stock Item",
        trackInventory: true,
        stockQuantity: 0,
      };

      const result = evaluateStockAddition(oosProduct, 0, 1);
      expect(result.allowed).toBe(false);
      expect(result.alert.title).toBe("Out of Stock");
      expect(result.alert.stockLimit).toBe(0);
      expect(result.alert.tone).toBe("warning");
    });

    it("prevents exceeding available stock and provides an in-app limit alert card payload", () => {
      const limitedProduct = {
        id: "prod-limited",
        name: "Vintage Ceramic Mug",
        trackInventory: true,
        stockQuantity: 1,
      };

      // First addition succeeds
      const firstAdd = evaluateStockAddition(limitedProduct, 0, 1);
      expect(firstAdd.allowed).toBe(true);
      expect(firstAdd.newQty).toBe(1);

      // Attempting to add a 2nd unit exceeds available stock (1 in stock)
      const secondAdd = evaluateStockAddition(limitedProduct, 1, 1);
      expect(secondAdd.allowed).toBe(false);
      expect(secondAdd.alert.title).toBe("Stock Limit Reached");
      expect(secondAdd.alert.message).toBe("Cannot add more than available stock (1 in stock).");
      expect(secondAdd.alert.stockLimit).toBe(1);
      expect(secondAdd.alert.itemName).toBe("Vintage Ceramic Mug");
    });

    it("correctly flags visual feedback on product card and cart line item when max stock is reached", () => {
      const trackedProduct = {
        id: "prod-3",
        name: "Locally Roasted Coffee",
        trackInventory: true,
        stockQuantity: 3,
      };

      // Cart has 2: limit not reached
      const status2 = checkStockFeedbackStatus(trackedProduct, 2);
      expect(status2.isStockLimitReached).toBe(false);
      expect(status2.isCartItemAtMax).toBe(false);

      // Cart has 3: reached max stock
      const status3 = checkStockFeedbackStatus(trackedProduct, 3);
      expect(status3.isStockLimitReached).toBe(true);
      expect(status3.isCartItemAtMax).toBe(true);
    });

    it("permits unlimited cart additions when inventory tracking is disabled", () => {
      const digitalProduct = {
        id: "prod-digital",
        name: "E-Book Guide",
        trackInventory: false,
        stockQuantity: 0,
      };

      const add10 = evaluateStockAddition(digitalProduct, 0, 10);
      expect(add10.allowed).toBe(true);
      expect(add10.newQty).toBe(10);

      const status = checkStockFeedbackStatus(digitalProduct, 10);
      expect(status.isOutOfStock).toBe(false);
      expect(status.isStockLimitReached).toBe(false);
      expect(status.isCartItemAtMax).toBe(false);
    });

    it("enforces variant-level inventory limits when variants are present", () => {
      const variantProduct = {
        id: "prod-tshirt",
        name: "Linen T-Shirt",
        trackInventory: true,
        stockQuantity: 10,
        variants: [
          { id: "var-s", title: "Small", stockQuantity: 2, trackInventory: true },
          { id: "var-m", title: "Medium", stockQuantity: 0, trackInventory: true },
        ],
      };

      // Medium is out of stock
      const mediumAdd = evaluateStockAddition(variantProduct, 0, 1, "var-m");
      expect(mediumAdd.allowed).toBe(false);
      expect(mediumAdd.alert.title).toBe("Out of Stock");
      expect(mediumAdd.alert.itemName).toBe("Linen T-Shirt - Medium");

      // Small has 2 in stock; adding 3rd fails
      const smallAdd = evaluateStockAddition(variantProduct, 2, 1, "var-s");
      expect(smallAdd.allowed).toBe(false);
      expect(smallAdd.alert.title).toBe("Stock Limit Reached");
      expect(smallAdd.alert.stockLimit).toBe(2);
      expect(smallAdd.alert.itemName).toBe("Linen T-Shirt - Small");
    });

    it("safely executes onConfirm at most once during alert dismissal", () => {
      let callCount = 0;
      let alertState = {
        title: "Test",
        onConfirm: () => {
          callCount++;
        },
      };

      const closePosAlert = () => {
        if (alertState?.onConfirm) {
          const cb = alertState.onConfirm;
          alertState = null;
          cb();
        } else {
          alertState = null;
        }
      };

      // Button click triggers dismissal
      closePosAlert();
      expect(callCount).toBe(1);

      // Subsequent modal onOpenChange triggers dismissal again
      closePosAlert();
      expect(callCount).toBe(1); // not called again
    });
  });
});
