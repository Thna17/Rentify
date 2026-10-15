import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, LockKeyhole, MonitorSmartphone, ShieldCheck, Store, UserCheck, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { LoadingState } from "@/components/ui/feedback-state.jsx";
import useStorePOS from "@/hooks/useStorePOS.js";
import {
  buildPosTerminalScope,
  formatPosDeviceLabel,
  getPosDeviceId,
  grantPosWorkspaceAccess,
  hasPosQuickUnlockPin,
  hasPosWorkspaceAccess,
  savePosQuickUnlockPin,
  supportsPosQuickUnlock,
  verifyPosQuickUnlockPin,
} from "@/lib/posTerminalAccess.js";
import { createRegisterSessionRecord } from "@/lib/posRegisterSession.js";

function EntryShell({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(244,241,234,0.94)_58%,rgba(237,233,224,0.96))] px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}

function ContextPill({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/85 px-3.5 py-1.5 text-xs text-foreground shadow-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground truncate max-w-[160px]">{value}</span>
    </div>
  );
}

export default function POSEntry() {
  const navigate = useNavigate();
  const deviceId = useMemo(() => getPosDeviceId(), []);
  const { activeStore, user, isLoading, activeStoreName } = useStorePOS();

  const [unlockPin, setUnlockPin] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");
  const [openingFloat, setOpeningFloat] = useState("50.00");
  const [entryError, setEntryError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeStoreKey = activeStore?.code || activeStore?.slug || activeStore?.name || "";
  const scope = useMemo(
    () =>
      buildPosTerminalScope({
        cashierId: user?.id,
        storeKey: activeStoreKey,
        deviceId,
      }),
    [activeStoreKey, deviceId, user?.id]
  );

  const hasConfiguredPin = useMemo(() => hasPosQuickUnlockPin(scope), [scope]);

  // If already unlocked in this browser session, navigate straight to sell
  useEffect(() => {
    if (!isLoading && user && hasPosWorkspaceAccess(scope)) {
      navigate("/sell", { replace: true });
    }
  }, [isLoading, user, scope, navigate]);

  if (isLoading) {
    return (
      <EntryShell>
        <LoadingState title="Loading POS Workspace" description="Connecting to Rentify unified session..." />
      </EntryShell>
    );
  }

  const handleUnlockWithPin = async (e) => {
    e.preventDefault();
    setEntryError("");
    setSubmitting(true);

    try {
      const isValid = await verifyPosQuickUnlockPin(scope, unlockPin);
      if (!isValid) {
        setEntryError("Incorrect PIN. Please try again.");
        setSubmitting(false);
        return;
      }

      grantPosWorkspaceAccess(scope);
      navigate("/sell", { replace: true });
    } catch (err) {
      setEntryError(err.message || "Failed to unlock");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupPinAndOpen = async (e) => {
    e.preventDefault();
    setEntryError("");

    if (!setupPin || setupPin.length < 4) {
      setEntryError("PIN must be at least 4 digits.");
      return;
    }

    if (setupPin !== setupPinConfirm) {
      setEntryError("PIN confirmation does not match.");
      return;
    }

    setSubmitting(true);

    try {
      await savePosQuickUnlockPin(scope, setupPin);

      // Create register session record in localStorage
      const registerRecord = createRegisterSessionRecord({
        storeKey: activeStoreKey,
        deviceId,
        cashierId: user?.id,
        cashierName: user?.name || "Cashier",
        cashierRole: user?.role || "staff",
        openingFloat: parseFloat(openingFloat) || 0,
      });

      localStorage.setItem(`rentify.pos.register.${scope}`, JSON.stringify(registerRecord));

      grantPosWorkspaceAccess(scope);
      navigate("/sell", { replace: true });
    } catch (err) {
      setEntryError(err.message || "Failed to configure PIN");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectOpen = () => {
    grantPosWorkspaceAccess(scope);
    navigate("/sell", { replace: true });
  };

  return (
    <EntryShell>
      <div className="rounded-[28px] border border-border bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8 backdrop-blur">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-3">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Point of Sale Register</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fast in-store register with real-time stock sync & KHQR payments
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ContextPill icon={Store} label="Store" value={activeStoreName || "Store"} />
            <ContextPill icon={UserCheck} label="Cashier" value={user?.name || user?.email || "Cashier"} />
            <ContextPill icon={MonitorSmartphone} label="Terminal" value={formatPosDeviceLabel(deviceId)} />
          </div>
        </div>

        {entryError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-800">
            {entryError}
          </div>
        ) : null}

        {hasConfiguredPin ? (
          /* Quick Unlock PIN Form */
          <form onSubmit={handleUnlockWithPin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unlockPin">Terminal Quick-Unlock PIN</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="unlockPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 4-6 digit PIN"
                  className="pl-9 text-center text-lg tracking-widest font-mono"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Unlock Register
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                onClick={handleDirectOpen}
              >
                Skip PIN (Direct Access)
              </button>
            </div>
          </form>
        ) : (
          /* First-time Register Setup & PIN Form */
          <form onSubmit={handleSetupPinAndOpen} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Register Session Setup</h3>
              <div className="space-y-1.5">
                <Label htmlFor="openingFloat" className="text-xs">Opening Cash Float ($ USD)</Label>
                <Input
                  id="openingFloat"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="50.00"
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">Initial cash in till drawer to begin the shift</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="setupPin" className="text-xs">Create Quick-Unlock PIN (4-6 digits)</Label>
                <Input
                  id="setupPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={setupPin}
                  onChange={(e) => setSetupPin(e.target.value)}
                  placeholder="••••"
                  className="text-center font-mono tracking-widest"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setupPinConfirm" className="text-xs">Confirm PIN</Label>
                <Input
                  id="setupPinConfirm"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={setupPinConfirm}
                  onChange={(e) => setSetupPinConfirm(e.target.value)}
                  placeholder="••••"
                  className="text-center font-mono tracking-widest"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Open Register Shift
            </Button>
          </form>
        )}
      </div>
    </EntryShell>
  );
}
