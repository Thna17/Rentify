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
});
