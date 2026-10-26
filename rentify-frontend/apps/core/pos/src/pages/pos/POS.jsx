import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Banknote,
  Barcode,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Inbox,
  Loader2,
  Minus,
  Package,
  PackageSearch,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  User,
  UserCheck,
  WalletCards,
  X,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { LoadingState, EmptyState } from "@/components/ui/feedback-state.jsx";
import useStorePOS, { resolvePaymentMethod } from "@/hooks/useStorePOS.js";
import { usePOSShell } from "@/components/layout/POSLayout.jsx";
import {
  buildExactProductLookupIndex,
  normalizeScanCode,
  resolveExactProductLookupFromIndex,
} from "@/lib/posProductLookup.js";
import {
  POS_SCAN_AUTO_SUBMIT_DELAY_MS,
  shouldAutoSubmitScan,
  shouldTreatAsLikelyScannerInput,
} from "@/lib/posScanBehavior.js";
import { formatCurrency, parseDecimal } from "@/lib/cartUtils.js";
import { ECOMMERCE_API_BASE, RENTIFY_API_BASE } from "@rentify/shared/config/urls";

const DEFAULT_WALK_IN = {
  id: "walk-in",
  name: "Walk-In Customer",
  phoneNumber: "",
};

const QUICK_CASH_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];
const QUICK_KHR_DENOMINATIONS = [1000, 5000, 10000, 20000, 50000, 100000];

export default function POS() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setShellActions } = usePOSShell();

  const {
    activeStore,
    activeStoreId,
    activeStoreName,
    primaryCurrency,
    secondaryCurrency,
    exchangeRate,
    user,
    hasPosPermission,
    isLoading: loadingStore,
  } = useStorePOS();

  // Active sub-view derived from path: /sell, /tickets, /returns, /register, /recovery
  const currentView = useMemo(() => {
    const seg = location.pathname.replace(/^\/pos\/?/, "").replace(/^\//, "");
    return seg || "sell";
  }, [location.pathname]);

  // Idempotency Attempt Key & Uncertain Network State
  const [saleAttemptKey, setSaleAttemptKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `pos-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  const [uncertainOutcome, setUncertainOutcome] = useState(null); // { key: string, payload: any, error: string }

  // Returns & Refund Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [processingReturn, setProcessingReturn] = useState(false);

  // Catalog State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customer, setCustomer] = useState(DEFAULT_WALK_IN);
  const [orderOption, setOrderOption] = useState("in_store");

  // Held Tickets State
  const [parkedTickets, setParkedTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentify.pos.tickets.${activeStoreId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Till & Register State
  const [tillEvents, setTillEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentify.pos.till.${activeStoreId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [openingFloat, setOpeningFloat] = useState(50);
  const [tillModalOpen, setTillModalOpen] = useState(false);
  const [tillEventType, setTillEventType] = useState("cash_in");
  const [tillEventAmount, setTillEventAmount] = useState("");
  const [tillEventReason, setTillEventReason] = useState("");

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' | 'khqr' | 'card'
  const [cashTendered, setCashTendered] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [khqrData, setKhqrData] = useState(null);
  const [khqrPolling, setKhqrPolling] = useState(false);

  // Completed Order & Receipt State
  const [completedOrder, setCompletedOrder] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Past Orders (for Returns & History)
  const [pastOrders, setPastOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [returnSearch, setReturnSearch] = useState("");

  // Offline Recovery Queue State
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentify.pos.offlineQueue.${activeStoreId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Discount Modal State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState("0");

  // Barcode Scanning buffer ref
  const scanInputRef = useRef(null);
  const scanTimerRef = useRef(null);

  // ── 1. Fetch Products for Store ──────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      setLoadingProducts(true);

      // Attempt authenticated store products endpoint first
      let res = await fetch(`${ECOMMERCE_API_BASE}/api/stores/${activeStoreId}/products?limit=100`, {
        credentials: "include",
      });

      if (!res.ok) {
        // Fallback to marketplace public store filter
        res = await fetch(`${ECOMMERCE_API_BASE}/api/marketplace/products?storeId=${activeStoreId}&limit=100`, {
          credentials: "include",
        });
      }

      if (res.ok) {
        const data = await res.json();
        const list = data.products || data.data || [];
        setProducts(list);
      }
    } catch (err) {
      console.error("Failed to load products for POS:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [activeStoreId]);

  // Fetch Past POS Orders for Returns & Receipts
  const fetchPastOrders = useCallback(async () => {
    if (!activeStoreId) return;
    try {
      setLoadingOrders(true);
      const res = await fetch(`${ECOMMERCE_API_BASE}/api/stores/${activeStoreId}/orders/pos?limit=50`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPastOrders(data.orders || data.data || []);
      }
    } catch (err) {
      console.error("Failed to load past POS orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (currentView === "returns") {
      fetchPastOrders();
    }
  }, [currentView, fetchPastOrders]);

  // Set shell action for manual refresh
  useEffect(() => {
    setShellActions({
      showRefresh: true,
      onRefresh: () => {
        fetchProducts();
        if (currentView === "returns") fetchPastOrders();
      },
    });
    return () => setShellActions({ showRefresh: false, onRefresh: null });
  }, [fetchProducts, fetchPastOrders, currentView, setShellActions]);

  // Build exact barcode index from products
  const productLookupIndex = useMemo(() => {
    return buildExactProductLookupIndex(products);
  }, [products]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const cat = p.category?.name || p.category || p.marketplaceCategory;
      if (cat) set.add(cat);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (p.category?.name || p.category || p.marketplaceCategory) === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // ── 2. Cart Operations ────────────────────────────────────────────────────
  const addToCart = useCallback((product, qty = 1, variantId = null) => {
    const selectedVariant = variantId
      ? (product.variants || []).find((v) => v.id === variantId)
      : null;
    const effectiveStock = selectedVariant
      ? (selectedVariant.stockQuantity ?? product.stockQuantity)
      : (product.stockQuantity ?? 0);
    const trackInventory = selectedVariant
      ? (selectedVariant.trackInventory ?? product.trackInventory)
      : product.trackInventory;

    if (trackInventory && effectiveStock <= 0) {
      alert(`"${product.name}${selectedVariant?.title ? ' - ' + selectedVariant.title : ''}" is out of stock.`);
      return;
    }

    const cartItemId = variantId ? `${product.id}__${variantId}` : product.id;

    setCart((prev) => {
      const existing = prev.find((item) => (item.cartItemId || item.productId) === cartItemId);
      const currentQty = existing ? existing.quantity : 0;
      if (
        trackInventory &&
        effectiveStock !== undefined &&
        effectiveStock !== null &&
        currentQty + qty > effectiveStock
      ) {
        alert(`Cannot add more than available stock (${effectiveStock} in stock).`);
        return prev;
      }
      if (existing) {
        return prev.map((item) =>
          (item.cartItemId || item.productId) === cartItemId ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          productId: product.id,
          variantId: variantId || null,
          variantName: selectedVariant?.title || null,
          name: selectedVariant?.title ? `${product.name} (${selectedVariant.title})` : product.name,
          price: parseDecimal(selectedVariant?.price ?? product.basePrice ?? product.price ?? 0),
          quantity: qty,
          sku: selectedVariant?.sku || product.sku || "",
          barcode: selectedVariant?.barcode || product.barcode || "",
          image: selectedVariant?.image || product.image || product.images?.[0]?.url || product.imageUrl || "",
          taxRate: product.taxRate || 0,
          stockQuantity: effectiveStock,
          trackInventory,
          productType: product.productType || "physical",
        },
      ];
    });
  }, []);

  const updateCartQuantity = useCallback((cartKey, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const key = item.cartItemId || item.productId;
          if (key === cartKey) {
            const nextQty = item.quantity + delta;
            if (
              delta > 0 &&
              item.trackInventory &&
              item.stockQuantity !== undefined &&
              item.stockQuantity !== null &&
              nextQty > item.stockQuantity
            ) {
              alert(`Cannot exceed available stock (${item.stockQuantity} in stock).`);
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const removeFromCart = useCallback((cartKey) => {
    setCart((prev) => prev.filter((item) => (item.cartItemId || item.productId) !== cartKey));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountPercent(0);
    setCustomer(DEFAULT_WALK_IN);
    const nextKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pos-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSaleAttemptKey(nextKey);
    setUncertainOutcome(null);
  }, []);

  // ── 3. Totals Calculation ────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const totalUSD = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalKHR = useMemo(() => {
    return Math.round(totalUSD * (exchangeRate || 4100));
  }, [totalUSD, exchangeRate]);

  // ── 4. Barcode Scan Handling ─────────────────────────────────────────────
  const handleBarcodeLookup = useCallback(
    (code) => {
      const match = resolveExactProductLookupFromIndex(code, productLookupIndex);
      if (match?.product) {
        addToCart(match.product, 1, match.variantId || null);
        setSearchQuery("");
        return true;
      }
      return false;
    },
    [productLookupIndex, addToCart]
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

    if (shouldAutoSubmitScan(val) && shouldTreatAsLikelyScannerInput(val)) {
      scanTimerRef.current = setTimeout(() => {
        handleBarcodeLookup(val);
      }, POS_SCAN_AUTO_SUBMIT_DELAY_MS);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      const matched = handleBarcodeLookup(searchQuery.trim());
      if (matched) setSearchQuery("");
    }
  };

  // ── 5. Park / Hold Tickets ────────────────────────────────────────────────
  const handleParkTicket = () => {
    if (cart.length === 0) return;
    const ticket = {
      id: `ticket-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cart,
      customer,
      subtotal,
      totalUSD,
      totalKHR,
    };
    const nextTickets = [ticket, ...parkedTickets];
    setParkedTickets(nextTickets);
    localStorage.setItem(`rentify.pos.tickets.${activeStoreId}`, JSON.stringify(nextTickets));
    clearCart();
  };

  const handleResumeTicket = (ticketId) => {
    const ticket = parkedTickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    setCart(ticket.cart || []);
    setCustomer(ticket.customer || DEFAULT_WALK_IN);
    const remaining = parkedTickets.filter((t) => t.id !== ticketId);
    setParkedTickets(remaining);
    localStorage.setItem(`rentify.pos.tickets.${activeStoreId}`, JSON.stringify(remaining));
    navigate("/sell");
  };

  const handleDiscardTicket = (ticketId) => {
    const remaining = parkedTickets.filter((t) => t.id !== ticketId);
    setParkedTickets(remaining);
    localStorage.setItem(`rentify.pos.tickets.${activeStoreId}`, JSON.stringify(remaining));
  };

  // ── 6. Checkout & Order Completion ────────────────────────────────────────
  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setCashTendered(totalUSD.toFixed(2));
    setPaymentMethod("cash");
    setPaymentModalOpen(true);
  };

  const finalizePOSOrder = async () => {
    if (cart.length === 0 || !activeStoreId) return;
    if (user?.type === "staff" && !hasPosPermission) {
      alert("Unauthorized: You do not have permission to process POS transactions.");
      return;
    }
    setProcessingPayment(true);

    const isUuid = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const payload = {
      storeId: activeStoreId,
      checkoutKey: saleAttemptKey,
      idempotencyKey: saleAttemptKey,
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.price,
        productType: item.productType || "physical",
        sku: item.sku || "",
        name: item.name || "",
      })),
      paymentMethod: paymentMethod === "khqr" ? "WALLET" : paymentMethod === "card" ? "CARD" : "cash",
      currency: "USD",
      cashierId: isUuid(user?.id) ? user.id : null,
      customerInfo: {
        name: customer.name || "Walk-In Customer",
        phone: customer.phoneNumber || "",
      },
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

    try {
      const res = await fetch(`${ECOMMERCE_API_BASE}/api/stores/${activeStoreId}/orders/pos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": saleAttemptKey,
        },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to process POS transaction on server.");
      }

      const result = await res.json();
      const orderRecord = result.order || result.data || result;
      const khqrInfo = result.khqrData || result.khqr;

      // Check if KHQR needs to be displayed
      if (paymentMethod === "khqr" && khqrInfo) {
        setKhqrData(khqrInfo);
        setKhqrPolling(true);
        // Start polling payment status
        pollPaymentStatus(result.payment?.id || orderRecord.id);
        return;
      }

      // Record cash in till
      if (paymentMethod === "cash") {
        const cashEvent = {
          id: `till-${Date.now()}`,
          type: "cash_in_sale",
          amount: totalUSD,
          reason: `POS Sale #${orderRecord.orderNumber || orderRecord.id?.slice(0, 8)}`,
          timestamp: new Date().toISOString(),
        };
        const nextTill = [cashEvent, ...tillEvents];
        setTillEvents(nextTill);
        localStorage.setItem(`rentify.pos.till.${activeStoreId}`, JSON.stringify(nextTill));
      }

      setCompletedOrder({
        ...orderRecord,
        isIdempotentReplay: Boolean(result.idempotentReplay),
        items: cart,
        subtotal,
        discountAmount,
        totalUSD,
        totalKHR,
        cashTendered: parseDecimal(cashTendered, totalUSD),
        changeDue: Math.max(0, parseDecimal(cashTendered, totalUSD) - totalUSD),
        paymentMethod,
        cashierName: user?.name || "Cashier",
        storeName: activeStoreName,
        createdAt: new Date().toISOString(),
      });

      setPaymentModalOpen(false);
      clearCart();
      setReceiptModalOpen(true);

      // Omnichannel sync: Refresh products to update shelf inventory immediately!
      fetchProducts();
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("POS Checkout error:", err);
      const isAbort = err.name === "AbortError";
      const isNetworkError = isAbort || !window.navigator.onLine || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
      if (isNetworkError) {
        setUncertainOutcome({
          key: saleAttemptKey,
          payload,
          error: isAbort ? "Transaction timed out after 15 seconds." : err.message || "Network connection interrupted.",
        });
      } else {
        alert(err.message || "Failed to process POS transaction on server.");
        if (err.message?.includes("stock") || err.message?.includes("Stock")) {
          fetchProducts();
        }
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // Return submission handler
  const handleConfirmReturn = async () => {
    if (!selectedOrderForReturn || !activeStoreId) return;
    if (user?.type === "staff" && !hasPosPermission) {
      alert("Unauthorized: You do not have permission to process POS returns.");
      return;
    }
    setProcessingReturn(true);
    try {
      const res = await fetch(`${ECOMMERCE_API_BASE}/api/stores/${activeStoreId}/orders/pos/${selectedOrderForReturn.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: returnReason }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to process return.");
      }

      // If cash sale, log till payout
      if (selectedOrderForReturn.paymentMethod?.toLowerCase().includes("cash")) {
        const refundEvent = {
          id: `till-${Date.now()}`,
          type: "cash_out_refund",
          amount: selectedOrderForReturn.totalAmount,
          reason: `POS Return #${selectedOrderForReturn.id.slice(0, 8)}`,
          timestamp: new Date().toISOString(),
        };
        const nextTill = [refundEvent, ...tillEvents];
        setTillEvents(nextTill);
        localStorage.setItem(`rentify.pos.till.${activeStoreId}`, JSON.stringify(nextTill));
      }

      alert("Return completed successfully. Inventory restored to store catalog.");
      setReturnModalOpen(false);
      setSelectedOrderForReturn(null);
      fetchPastOrders();
      fetchProducts();
    } catch (err) {
      alert(err.message || "Failed to process return.");
    } finally {
      setProcessingReturn(false);
    }
  };

  // Poll KHQR status
  const pollPaymentStatus = async (paymentId) => {
    if (!paymentId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${ECOMMERCE_API_BASE}/api/payments/${paymentId}/status`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed" || data.status === "paid") {
            clearInterval(interval);
            setKhqrPolling(false);
            setPaymentModalOpen(false);
            clearCart();
            setReceiptModalOpen(true);
            fetchProducts();
          }
        }
      } catch {
        // continue polling
      }
    }, 2500);

    setTimeout(() => {
      clearInterval(interval);
      setKhqrPolling(false);
    }, 120000);
  };

  // Till drawer event handlers
  const handleSaveTillEvent = () => {
    const amt = parseFloat(tillEventAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    const evt = {
      id: `till-${Date.now()}`,
      type: tillEventType,
      amount: amt,
      reason: tillEventReason.trim() || (tillEventType === "cash_in" ? "Cash In" : "Cash Out"),
      timestamp: new Date().toISOString(),
    };
    const nextTill = [evt, ...tillEvents];
    setTillEvents(nextTill);
    localStorage.setItem(`rentify.pos.till.${activeStoreId}`, JSON.stringify(nextTill));
    setTillEventAmount("");
    setTillEventReason("");
    setTillModalOpen(false);
  };

  // Offline Sync handler
  const handleSyncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !activeStoreId) return;
    setSyncingOffline(true);
    let remaining = [...offlineQueue];
    let syncedCount = 0;

    for (const item of offlineQueue) {
      try {
        const res = await fetch(`${ECOMMERCE_API_BASE}/api/stores/${activeStoreId}/orders/pos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(item.payload?.checkoutKey ? { "Idempotency-Key": item.payload.checkoutKey } : {}),
          },
          credentials: "include",
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          remaining = remaining.filter((q) => q.id !== item.id);
          syncedCount++;
        }
      } catch (err) {
        console.error("Failed to sync offline order:", item.id, err);
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem(`rentify.pos.offlineQueue.${activeStoreId}`, JSON.stringify(remaining));
    setSyncingOffline(false);
    alert(`Synced ${syncedCount} offline transaction(s). ${remaining.length} remaining.`);
    fetchProducts();
    if (currentView === "returns") {
      fetchPastOrders();
    }
  };

  // Past order receipt preview handler
  const handleViewPastOrderReceipt = (order) => {
    setCompletedOrder({
      id: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      items: order.items?.map((i) => ({
        name: i.product?.name || "Product Item",
        quantity: i.quantity,
        price: i.price,
      })) || [],
      subtotal: order.totalAmount,
      discountAmount: 0,
      totalUSD: order.totalAmount,
      totalKHR: Math.round(order.totalAmount * (exchangeRate || 4100)),
      paymentMethod: order.paymentMethod || "cash",
      cashierName: user?.name || "Cashier",
      storeName: activeStoreName,
      createdAt: order.orderDate || new Date().toISOString(),
    });
    setReceiptModalOpen(true);
  };

  // Print Thermal Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // ── 7. Render Views ───────────────────────────────────────────────────────
  if (loadingStore) {
    return <LoadingState title="Connecting to Register" description="Loading merchant session and products..." />;
  }

  if (user?.type === "staff" && !hasPosPermission) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-slate-50/60">
        <div className="rounded-3xl border border-amber-200 bg-white p-8 max-w-md shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <ShieldAlert className="h-7 w-7 text-amber-600" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">Access Denied: POS Terminal</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your staff account does not have permission to access the Point of Sale terminal. Please contact your store administrator to request POS access.
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl text-xs font-semibold" onClick={() => navigate("/")}>
            Return to Terminal Entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50/60">
      {/* ── Sub-view: TICKETS ─────────────────────────────────────────────── */}
      {currentView === "tickets" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Held & Parked Tickets</h2>
              <p className="text-xs text-muted-foreground">Restore suspended customer carts to finish sale</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/sell")}>
              Back to Register
            </Button>
          </div>

          {parkedTickets.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No Held Tickets"
              description="When a customer needs extra time at checkout, click 'Park Ticket' in the sell view to hold their cart."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {parkedTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{ticket.customer?.name || "Walk-In"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {ticket.cart?.length || 0} items
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs py-1">
                    {ticket.cart?.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1.5">
                        <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-base font-bold text-foreground">{formatCurrency(ticket.totalUSD)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => handleDiscardTicket(ticket.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl px-4 font-semibold"
                        onClick={() => handleResumeTicket(ticket.id)}
                      >
                        Resume Sale
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sub-view: REGISTER / TILL ─────────────────────────────────────── */}
      {currentView === "register" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Cash Register & Till Drawer</h2>
              <p className="text-xs text-muted-foreground">Monitor drawer balance, payouts, and reconcile shift totals</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setTillEventType("cash_in");
                  setTillModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Cash In
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setTillEventType("cash_out");
                  setTillModalOpen(true);
                }}
              >
                <Minus className="mr-1.5 h-3.5 w-3.5" />
                Payout Cash Out
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Opening Float</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">{formatCurrency(openingFloat)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Shift start cash</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Till Drawer Activity</p>
              <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                +{formatCurrency(
                  tillEvents.reduce((sum, e) => (e.type.includes("in") ? sum + e.amount : sum - e.amount), 0)
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{tillEvents.length} till drawer events</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Expected Drawer Balance</p>
              <p className="mt-2 text-2xl font-bold font-mono text-primary">
                {formatCurrency(
                  openingFloat +
                    tillEvents.reduce((sum, e) => (e.type.includes("in") ? sum + e.amount : sum - e.amount), 0)
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Current total in till</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Shift Till Activity Log</h3>
            {tillEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No cash in or out events recorded for this shift.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {tillEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{evt.reason || evt.type}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span
                      className={`text-sm font-bold font-mono ${
                        evt.type.includes("in") ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {evt.type.includes("in") ? "+" : "-"}
                      {formatCurrency(evt.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-view: RETURNS & PREVIOUS SALES ──────────────────────────── */}
      {currentView === "returns" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Returns & Sales History</h2>
              <p className="text-xs text-muted-foreground">Look up previous receipts to inspect transactions and process returns</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchPastOrders()} disabled={loadingOrders}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/sell")}>
                Back to Register
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, receipt #, payment method, or item name..."
                className="pl-9 h-10"
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
              />
            </div>
            {returnSearch && (
              <Button variant="ghost" size="sm" onClick={() => setReturnSearch("")}>
                Clear
              </Button>
            )}
          </div>

          {loadingOrders ? (
            <LoadingState title="Loading Receipts" description="Retrieving past store transactions..." />
          ) : pastOrders.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No Sales Records Found"
              description="Completed sales from this register will appear here for receipt lookup and refunds."
            />
          ) : (
            <div className="space-y-3">
              {pastOrders
                .filter((o) => {
                  if (!returnSearch.trim()) return true;
                  const q = returnSearch.toLowerCase();
                  return (
                    o.id?.toLowerCase().includes(q) ||
                    o.paymentMethod?.toLowerCase().includes(q) ||
                    o.status?.toLowerCase().includes(q) ||
                    o.items?.some((i) => i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q))
                  );
                })
                .map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge
                          variant={order.status === "completed" ? "default" : "secondary"}
                          className={`text-[10px] font-semibold uppercase ${
                            order.status === "completed" ? "bg-emerald-600 text-white" : ""
                          }`}
                        >
                          {order.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {order.paymentMethod || "CASH"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {order.orderDate ? new Date(order.orderDate).toLocaleString() : "Recent"}
                        <span>•</span>
                        <span>{order.items?.length || 0} line item(s)</span>
                      </p>
                      <div className="text-xs text-slate-600 flex flex-wrap gap-2 pt-1">
                        {order.items?.map((item, idx) => (
                          <span key={idx} className="bg-slate-50 border rounded-md px-2 py-0.5 text-[11px]">
                            {item.quantity}x {item.product?.name || "Item"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="text-right">
                        <p className="text-base font-bold font-mono text-slate-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {formatCurrency(order.totalAmount * (exchangeRate || 4100), "KHR")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-semibold"
                          onClick={() => handleViewPastOrderReceipt(order)}
                        >
                          <Receipt className="mr-1.5 h-3.5 w-3.5" />
                          Receipt
                        </Button>
                        {order.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedOrderForReturn(order);
                              setReturnReason("Customer Return");
                              setReturnModalOpen(true);
                            }}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Return
                          </Button>
                        )}
                        {order.status === "refunded" && (
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] font-bold uppercase self-center">
                            Refunded & Stock Restored
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sub-view: RECOVERY ────────────────────────────────────────────── */}
      {currentView === "recovery" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Offline Recovery Queue</h2>
              <p className="text-xs text-muted-foreground">Stored transactions queued for background sync</p>
            </div>
            <div className="flex gap-2">
              {offlineQueue.length > 0 && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  size="sm"
                  onClick={handleSyncOfflineQueue}
                  disabled={syncingOffline}
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
                  {syncingOffline ? "Syncing..." : "Sync All Now"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/sell")}>
                Back to Register
              </Button>
            </div>
          </div>

          {offlineQueue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All Transactions Synced"
              description="There are currently no pending offline transactions. All orders have been recorded to the Rentify commerce server."
            />
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-center justify-between">
                <span>
                  <strong>{offlineQueue.length}</strong> offline transaction(s) pending sync to server.
                </span>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
                  onClick={handleSyncOfflineQueue}
                  disabled={syncingOffline}
                >
                  Sync Now
                </Button>
              </div>

              {offlineQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs">{item.id}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {item.summary?.paymentMethod || "CASH"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.createdAt).toLocaleString()} • {item.summary?.customerName || "Walk-In"}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {item.summary?.itemsCount} item(s) • Total: <strong>{formatCurrency(item.summary?.totalUSD)}</strong>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 text-xs"
                    onClick={() => {
                      const rem = offlineQueue.filter((q) => q.id !== item.id);
                      setOfflineQueue(rem);
                      localStorage.setItem(`rentify.pos.offlineQueue.${activeStoreId}`, JSON.stringify(rem));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Sub-view: SELL WORKSPACE ─────────────────────────────────── */}
      {currentView === "sell" && (
        <div className="flex h-full w-full overflow-hidden">
          {/* Left Column: Catalog & Barcode Scanner */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-border bg-white">
            {/* Search & Scanner Header */}
            <div className="p-3 sm:p-4 border-b border-border space-y-3 bg-white">
              <div className="relative">
                <Barcode className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={scanInputRef}
                  placeholder="Scan barcode or search products by name, SKU..."
                  className="pl-10 h-11 text-sm bg-slate-50/70 border-slate-200 focus-visible:bg-white rounded-xl"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "all" ? "All Products" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loadingProducts ? (
                <LoadingState title="Loading Catalog" description="Fetching store inventory..." />
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  icon={PackageSearch}
                  title="No Products Found"
                  description={
                    searchQuery
                      ? `No items matching "${searchQuery}" in this store.`
                      : "No products currently available in this store's catalog."
                  }
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((p) => {
                    const price = parseDecimal(p.basePrice ?? p.price ?? 0);
                    const inCartItem = cart.find((c) => c.productId === p.id);
                    const isOutOfStock = p.trackInventory && ((p.stockQuantity ?? 0) <= 0 || p.status === 'out_of_stock');

                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => !isOutOfStock && addToCart(p, 1)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border text-left transition select-none bg-white p-3 ${
                          isOutOfStock
                            ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50/50"
                            : inCartItem
                            ? "border-primary ring-1 ring-primary cursor-pointer hover:shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer"
                        }`}
                      >
                        {isOutOfStock ? (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold">
                              Out of stock
                            </span>
                          </div>
                        ) : inCartItem ? (
                          <div className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow">
                            {inCartItem.quantity}
                          </div>
                        ) : null}

                        <div className="aspect-square w-full rounded-xl bg-slate-50 overflow-hidden mb-2.5 flex items-center justify-center">
                          {p.images?.[0]?.url || p.imageUrl || p.image ? (
                            <img
                              src={p.images?.[0]?.url || p.imageUrl || p.image}
                              alt={p.name}
                              className={`h-full w-full object-cover transition duration-200 ${
                                isOutOfStock ? "grayscale" : "group-hover:scale-105"
                              }`}
                              loading="lazy"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-slate-300" />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight">
                            {p.name}
                          </p>
                          {p.sku ? <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.sku}</p> : null}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="font-bold text-sm text-slate-900 font-mono">
                            {formatCurrency(price)}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] text-rose-600 font-semibold">0 in stock</span>
                          ) : p.trackInventory ? (
                            <span className="text-[10px] text-emerald-600 font-medium">{p.stockQuantity} in stock</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">In Stock</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Cart Drawer */}
          <div className="flex w-80 sm:w-96 flex-col overflow-hidden bg-white shadow-xl border-l border-border">
            {/* Cart Header */}
            <div className="p-3 sm:p-4 border-b border-border bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-slate-900">Current Order</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </Badge>
                </div>
                {cart.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={clearCart}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              {/* Customer Selector */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{customer.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Default
                </Badge>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 text-slate-200 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Cart is empty</p>
                  <p className="text-xs mt-1">Scan a barcode or tap products from the catalog to add to order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartItemId || item.productId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        onClick={() => updateCartQuantity(item.cartItemId || item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                        onClick={() => updateCartQuantity(item.cartItemId || item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="w-16 text-right shrink-0 pl-2">
                      <p className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer & Checkout */}
            <div className="border-t border-border p-3 sm:p-4 bg-slate-50/80 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Order Discount</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    onClick={() => {
                      setTempDiscount(String(discountPercent));
                      setDiscountModalOpen(true);
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {discountPercent > 0 ? (
                      <span className="text-emerald-600 font-bold">
                        {discountPercent}% (-{formatCurrency(discountAmount)})
                      </span>
                    ) : (
                      "Add Discount"
                    )}
                  </button>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Total (USD)</span>
                  <span className="font-mono text-base">{formatCurrency(totalUSD)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Khmer Riel (៛)</span>
                  <span>{formatCurrency(totalKHR, "KHR")}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold col-span-1"
                  disabled={cart.length === 0}
                  onClick={handleParkTicket}
                >
                  Hold Ticket
                </Button>
                <Button
                  type="button"
                  className="rounded-xl h-11 text-sm font-bold col-span-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={cart.length === 0}
                  onClick={openPaymentModal}
                >
                  Pay {formatCurrency(totalUSD)}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Select Payment Method</DialogTitle>
            <DialogDescription className="text-xs">
              Complete transaction for {formatCurrency(totalUSD)} ({formatCurrency(totalKHR, "KHR")})
            </DialogDescription>
          </DialogHeader>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 my-2">
            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                paymentMethod === "cash"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => setPaymentMethod("cash")}
            >
              <Banknote className="h-5 w-5 mb-1 text-emerald-600" />
              Cash
            </button>
            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                paymentMethod === "khqr"
                  ? "border-red-600 bg-red-50 text-red-900 ring-2 ring-red-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => setPaymentMethod("khqr")}
            >
              <QrCode className="h-5 w-5 mb-1 text-red-600" />
              Bakong KHQR
            </button>
            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                paymentMethod === "card"
                  ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => setPaymentMethod("card")}
            >
              <CreditCard className="h-5 w-5 mb-1 text-blue-600" />
              Card
            </button>
          </div>

          {/* Cash Tender Details */}
          {paymentMethod === "cash" && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="tendered" className="text-xs">Amount Tendered ($ USD)</Label>
                <Input
                  id="tendered"
                  type="number"
                  step="0.01"
                  className="text-lg font-mono font-bold"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
              </div>

              {/* Quick USD Denominations */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CASH_DENOMINATIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono font-semibold hover:bg-slate-100"
                    onClick={() => setCashTendered(amt.toFixed(2))}
                  >
                    ${amt}
                  </button>
                ))}
                <button
                  type="button"
                  className="h-8 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  onClick={() => setCashTendered(totalUSD.toFixed(2))}
                >
                  Exact (${totalUSD.toFixed(2)})
                </button>
              </div>

              {/* Change Calculation */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Change Due (USD):</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {formatCurrency(Math.max(0, parseDecimal(cashTendered, totalUSD) - totalUSD))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Change Due (KHR):</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {formatCurrency(
                      Math.max(0, parseDecimal(cashTendered, totalUSD) - totalUSD) * (exchangeRate || 4100),
                      "KHR"
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KHQR View */}
          {paymentMethod === "khqr" && (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
              <div className="h-44 w-44 rounded-2xl border-2 border-red-500/30 bg-white p-3 shadow-inner flex items-center justify-center">
                {khqrData?.rawQR ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      khqrData.rawQR
                    )}`}
                    alt="Bakong KHQR"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <QrCode className="h-28 w-28 text-red-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Customer scans with Bakong or any Cambodian bank mobile app
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              disabled={processingPayment}
              onClick={finalizePOSOrder}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Pay {formatCurrency(totalUSD)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RECEIPT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Sale Completed Successfully
            </DialogTitle>
            <DialogDescription className="text-xs">
              Order #{completedOrder?.orderNumber || completedOrder?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {/* Printable Receipt Card */}
          <div
            id="pos-receipt-print-area"
            className="rounded-2xl border border-slate-200 bg-white p-5 font-mono text-xs space-y-3 shadow-inner max-h-96 overflow-y-auto"
          >
            {completedOrder?.isIdempotentReplay && (
              <div className="flex justify-center pb-1">
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] font-bold uppercase">
                  Verified Replay (Idempotent)
                </Badge>
              </div>
            )}
            <div className="text-center space-y-0.5 border-b pb-2">
              <h4 className="font-bold text-sm uppercase text-slate-900">{activeStoreName || "Rentify Store"}</h4>
              <p className="text-[10px] text-muted-foreground">Official Sales Receipt</p>
              <p className="text-[10px] text-muted-foreground">
                Date: {completedOrder?.createdAt ? new Date(completedOrder.createdAt).toLocaleString() : ""}
              </p>
              <p className="text-[10px] text-muted-foreground">Cashier: {completedOrder?.cashierName || "Staff"}</p>
            </div>

            <div className="divide-y divide-dashed divide-slate-200">
              {completedOrder?.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1.5">
                  <div className="pr-2">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.quantity} x {formatCurrency(item.price)}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-2 space-y-1 text-right">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(completedOrder?.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>TOTAL USD:</span>
                <span>{formatCurrency(completedOrder?.totalUSD || 0)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>TOTAL KHR:</span>
                <span>{formatCurrency(completedOrder?.totalKHR || 0, "KHR")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t text-[11px]">
                <span>Payment Method:</span>
                <span className="uppercase">{completedOrder?.paymentMethod || "Cash"}</span>
              </div>
              {completedOrder?.changeDue > 0 ? (
                <div className="flex justify-between text-[11px]">
                  <span>Change Given:</span>
                  <span>{formatCurrency(completedOrder.changeDue)}</span>
                </div>
              ) : null}
            </div>

            <div className="text-center pt-3 border-t text-[10px] text-muted-foreground">
              <p>Thank you for shopping with us!</p>
              <p>Powered by Rentify Unified POS</p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
              Done & Next Sale
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold" onClick={handlePrintReceipt}>
              <Printer className="mr-1.5 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TILL EVENT MODAL ─────────────────────────────────────────────── */}
      <Dialog open={tillModalOpen} onOpenChange={setTillModalOpen}>
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {tillEventType === "cash_in" ? "Add Cash In (Till Float)" : "Payout Cash Out (Expense / Drop)"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record cash movement directly into or out of the register drawer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tillAmount" className="text-xs">Amount ($ USD)</Label>
              <Input
                id="tillAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="font-mono text-base font-bold"
                value={tillEventAmount}
                onChange={(e) => setTillEventAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tillReason" className="text-xs">Reason / Note</Label>
              <Input
                id="tillReason"
                placeholder={tillEventType === "cash_in" ? "e.g. Morning Float, Change Addition" : "e.g. Vendor delivery, Till drop"}
                className="text-xs"
                value={tillEventReason}
                onChange={(e) => setTillEventReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setTillModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold" onClick={handleSaveTillEvent}>
              Save Till Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DISCOUNT MODAL ────────────────────────────────────────────────── */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent className="max-w-sm rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Apply Order Discount</DialogTitle>
            <DialogDescription className="text-xs">
              Set a percentage discount applied to the current cart subtotal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              {[0, 5, 10, 15, 20, 25, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`h-9 px-3 rounded-xl border text-xs font-semibold font-mono transition ${
                    Number(tempDiscount) === pct
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                  }`}
                  onClick={() => setTempDiscount(String(pct))}
                >
                  {pct === 0 ? "No Discount (0%)" : `${pct}%`}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="customDiscount" className="text-xs">Custom Percentage (%)</Label>
              <Input
                id="customDiscount"
                type="number"
                min="0"
                max="100"
                className="font-mono text-base font-bold"
                value={tempDiscount}
                onChange={(e) => setTempDiscount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDiscountModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => {
                const val = Math.min(100, Math.max(0, parseFloat(tempDiscount) || 0));
                setDiscountPercent(val);
                setDiscountModalOpen(false);
              }}
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RETURN CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Process POS Return
            </DialogTitle>
            <DialogDescription className="text-xs">
              Order #{selectedOrderForReturn?.id?.slice(0, 8).toUpperCase()} • Total {formatCurrency(selectedOrderForReturn?.totalAmount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800">Return Policy & Inventory Effect:</p>
              <p className="text-slate-600">• All line items will be restored to store inventory.</p>
              <p className="text-slate-600">• Order and payment records will be marked as refunded.</p>
              {selectedOrderForReturn?.paymentMethod?.toLowerCase().includes("cash") && (
                <p className="text-slate-600 font-medium text-amber-800">• Cash refund will be recorded in the register till float.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="return-reason-input" className="text-xs font-semibold">Reason for Return</Label>
              <Input
                id="return-reason-input"
                placeholder="e.g. Defective, wrong size, customer change of mind..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setReturnModalOpen(false)} disabled={processingReturn}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleConfirmReturn}
              disabled={processingReturn}
            >
              {processingReturn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
              Confirm Return & Restore Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── UNCERTAIN NETWORK OUTCOME MODAL ─────────────────────────────────── */}
      <Dialog open={Boolean(uncertainOutcome)} onOpenChange={(open) => { if (!open) setUncertainOutcome(null); }}>
        <DialogContent className="max-w-md rounded-[28px] p-6 border-amber-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Uncertain Network Outcome
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-800">
              Connection timed out or network was interrupted during checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-700">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
              <p className="font-semibold text-amber-950">Safety Guidance:</p>
              <p>• Do NOT create another sale — retrying will safely verify the transaction without duplicate charges or stock deduction.</p>
              <p>• Retrying with the same key will either confirm the committed order or safely place it once.</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground break-all">
              Attempt Key: {uncertainOutcome?.key}
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (uncertainOutcome?.payload) {
                  const offlineOrder = {
                    id: `offline-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    payload: uncertainOutcome.payload,
                    summary: {
                      itemsCount: cart.reduce((s, i) => s + i.quantity, 0),
                      totalUSD,
                      paymentMethod,
                      customerName: customer.name || "Walk-In Customer",
                    },
                  };
                  const nextQueue = [offlineOrder, ...offlineQueue];
                  setOfflineQueue(nextQueue);
                  localStorage.setItem(`rentify.pos.offlineQueue.${activeStoreId}`, JSON.stringify(nextQueue));
                  setUncertainOutcome(null);
                  setPaymentModalOpen(false);
                  clearCart();
                  alert("Transaction safely queued in Offline Recovery with original idempotency key.");
                }
              }}
            >
              Queue for Offline Sync
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => {
                setUncertainOutcome(null);
                finalizePOSOrder();
              }}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry Safe Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
