import React, { createContext, useContext, useMemo, useState } from "react";
import {
  LockKeyhole,
  MoreVertical,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  Store,
  Monitor,
  Maximize2,
  Minimize2,
  ExternalLink,
  User,
  WalletCards,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import useStorePOS from "@/hooks/useStorePOS.js";
import {
  buildPosTerminalScope,
  formatPosDeviceLabel,
  getPosDeviceId,
  revokePosWorkspaceAccess,
} from "@/lib/posTerminalAccess.js";
import { DASHBOARD_URL } from "@rentify/shared/config/urls";

const PRIMARY_POS_NAV = [
  { to: "/sell", label: "Sell", icon: ShoppingBag },
  { to: "/tickets", label: "Tickets", icon: ReceiptText },
  { to: "/returns", label: "Returns", icon: RotateCcw },
  { to: "/register", label: "Register", icon: WalletCards },
];

const POSShellContext = createContext({
  setShellActions: () => {},
});

export function usePOSShell() {
  return useContext(POSShellContext);
}

export default function POSLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeStore, user } = useStorePOS();
  const deviceId = getPosDeviceId();
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

  const isEntryScreen = location.pathname === "/" || location.pathname === "/entry";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shellActions, setShellActions] = useState({
    onRefresh: null,
    showRefresh: false,
  });

  const handleLock = () => {
    revokePosWorkspaceAccess(scope);
    navigate("/", { replace: true });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      {!isEntryScreen ? (
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
            {/* Store & Terminal info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                <Store className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeStore?.name || "Rentify Store"}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-[11px] text-muted-foreground font-mono">
                <Monitor className="h-3 w-3" />
                <span>{formatPosDeviceLabel(deviceId)}</span>
              </div>
            </div>

            {/* Main Navigation pills */}
            <nav className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {PRIMARY_POS_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs sm:text-sm font-semibold transition",
                      isActive
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-white text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Actions & Tools */}
            <div className="flex shrink-0 items-center gap-2">
              {shellActions.showRefresh && shellActions.onRefresh ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={shellActions.onRefresh}
                  title="Refresh catalog"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden md:inline-flex h-9 w-9 rounded-full"
                onClick={handleToggleFullscreen}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant={location.pathname === "/recovery" ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-full px-3.5 text-xs font-medium"
                  >
                    <MoreVertical className="mr-1.5 h-3.5 w-3.5" />
                    Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/sell", { replace: true })}>
                    <ShoppingBag className="mr-2 h-4 w-4" /> Sell
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/tickets")}>
                    <ReceiptText className="mr-2 h-4 w-4" /> Held Tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/returns")}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Returns & Refunds
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/register")}>
                    <WalletCards className="mr-2 h-4 w-4" /> Cash Register
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/recovery")}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Recovery & Offline
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.open(DASHBOARD_URL, "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Merchant Dashboard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-700 hover:text-red-600 hover:border-red-200"
                onClick={handleLock}
              >
                <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />
                Lock
              </Button>
            </div>
          </div>
        </header>
      ) : null}

      <POSShellContext.Provider value={{ setShellActions }}>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </POSShellContext.Provider>
    </div>
  );
}
