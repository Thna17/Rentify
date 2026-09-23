import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useMemo } from "react";


const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/products", label: "Browse", Icon: Search },
  { to: "/cart", label: "Cart", Icon: ShoppingBag },
  { to: "/profile", label: "Account", Icon: User },
];

export function MobileBottomNav({ cartCount = 0 }) {
  const location = useLocation();

  const activeIndex = useMemo(() => {
    const path = location.pathname;
    const idx = items.findIndex((it) => (it.to === "/" ? path === "/" : path.startsWith(it.to)));
    return idx === -1 ? 0 : idx;
  }, [location.pathname]);

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto max-w-md px-3"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        <div className="relative rounded-t-2xl border bg-background/70 backdrop-blur-xl shadow-xl">
          {/* Sliding underline indicator */}
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-primary/70 transition-transform duration-300 ease-out"
            style={{
              width: "25%",
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />

          <ul className="grid grid-cols-4 h-16">
            {items.map(({ to, label, Icon }, i) => (
              <li key={to} className="contents">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    [
                      "group relative flex flex-col items-center justify-center gap-1",
                      "text-muted-foreground transition-colors duration-200",
                      isActive ? "text-primary" : "hover:text-foreground/80",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="absolute inset-x-3 -top-1 h-8 rounded-full bg-primary/10 opacity-0 transition-opacity duration-300 group-[.active]:opacity-100"
                        aria-hidden
                        style={{ opacity: isActive ? 1 : 0 }}
                      />

                      <div className="relative">
                        <Icon
                          className="transition-transform duration-200"
                          size={isActive ? 26 : 22}
                          strokeWidth={isActive ? 2.4 : 2}
                        />
                        {label === "Cart" && cartCount > 0 && (
                          <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] px-1">
                            {cartCount > 99 ? "99+" : cartCount}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] leading-none">{label}</span>

                      {/* Active dot */}
                      <span
                        className="absolute bottom-2 h-1 w-1 rounded-full bg-primary transition-opacity"
                        style={{ opacity: isActive ? 1 : 0 }}
                        aria-hidden
                      />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
