import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { SellerService, SellerStore } from '../../../../core/api/seller.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { FlyToCartService } from '../../../../core/cart/fly-to-cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';
import { RentifyMarketplaceService } from '../../../../core/rentify/rentify-marketplace.service';
import { IconComponent } from '../../ui/icon/icon.component';
import { CategoryMenuComponent } from '../category-menu/category-menu.component';
import { SearchOverlayComponent } from '../../../user/search/search-overlay/search-overlay.component';
import { CartDrawerComponent } from '../../cart/cart-drawer.component';
import { CatalogService } from '../../../../core/catalog/catalog.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconComponent, SearchOverlayComponent, CategoryMenuComponent, CartDrawerComponent, NgTemplateOutlet],
  template: `
    <!-- Announcement bar: scrolls away with the page (not sticky) — only the
         actual navigation below it stays pinned while browsing. -->
    <div class="announce">
      <div class="container announce-inner">
        @if (sellerArea()) {
          <span><ui-icon name="store" [size]="13" /> Rentify for sellers</span>
          <span class="dot">·</span>
          <span><ui-icon name="banknote" [size]="13" /> Seller plans from $0</span>
        } @else {
          <span><ui-icon name="truck" [size]="13" /> Seller-grouped delivery</span>
          <span class="dot">·</span>
          <span><ui-icon name="shield" [size]="13" /> Secure checkout</span>
        }
        <div class="announce-links">
          @if (sellerArea()) {
            <a [href]="merchantDashboardUrl">Seller dashboard</a>
            <a routerLink="/help">Seller support</a>
          } @else {
            <a routerLink="/orders">Track order</a>
            <a routerLink="/help">Support</a>
            <a [href]="merchantDashboardUrl" target="_blank" rel="noopener">Seller portal</a>
          }
        </div>
      </div>
    </div>

    <header class="navbar" [class.scrolled]="scrolled()" [class.nav-hidden]="hidden()" [class.home]="is('home')" [class.home-top]="is('home') && homeTop()">
      <div class="navbar-inner container">
        <a routerLink="/" class="logo">
          <img
            src="/assets/rentify-logo.webp"
            alt="Rentify Marketplace"
            class="logo-mark"
          />
          Rentify Marketplace
        </a>

        <div class="search-group">
          @if (!sellerArea()) {
            <button
              type="button"
              class="search-bar"
              (click)="searchOpen.set(true)"
              aria-label="Search"
              [attr.aria-expanded]="searchOpen()"
            >
              <ui-icon name="search" [size]="16" />
              <span class="search-placeholder">Search products, brands...</span>
            </button>
          }

          <div class="lang-wrap">
            <button
              type="button"
              class="icon-btn lang-btn"
              (click)="langMenuOpen.set(!langMenuOpen()); $event.stopPropagation()"
              aria-label="Language"
              [attr.aria-expanded]="langMenuOpen()"
            >
              <ui-icon name="globe" [size]="18" />
            </button>
            @if (langMenuOpen()) {
              <div
                class="lang-menu"
                animate.enter="kc-pop-enter"
                animate.leave="kc-pop-leave"
                (click)="$event.stopPropagation()"
              >
                <button
                  type="button"
                  [class.active]="language() === 'en'"
                  (click)="selectLanguage('en')"
                >
                  English
                </button>
                <button
                  type="button"
                  disabled
                  title="Khmer translation is being prepared"
                >
                  ភាសាខ្មែរ · Coming soon
                </button>
              </div>
            }
          </div>
        </div>

        <div class="nav-actions">
          @if (!sellerArea()) {
          <span class="deliver-to" title="Delivery area">
            <ui-icon name="map-pin" [size]="18" />
            <span><small>Deliver to</small><strong>Phnom Penh</strong></span>
          </span>
          <a class="icon-btn wishlist-btn" routerLink="/wishlist" aria-label="Wishlist">
            <ui-icon
              name="heart"
              [size]="19"
              [filled]="wishlistCount() > 0"
              [color]="wishlistCount() > 0 ? '#d1453b' : undefined"
            />
            @if (wishlistCount()) {
              <span class="wishlist-badge">{{ wishlistCount() }}</span>
            }
          </a>

          <button class="icon-btn cart-btn" #cartBtn type="button" aria-label="Open shopping bag" [attr.aria-expanded]="cartOpen()" aria-haspopup="dialog" (click)="openCart()">
            <ui-icon name="cart" [size]="19" />
            @if (cartCount()) {
              <span class="cart-badge">{{ cartCount() }}</span>
            }
          </button>
          }

          @if (user(); as currentUser) {
            <div class="account-wrap">
              <button
                type="button"
                class="signin-btn account-btn"
                [class.is-seller]="isSeller()"
                [attr.aria-expanded]="accountOpen()"
                aria-haspopup="menu"
                [attr.aria-label]="'Account menu for ' + currentUser.name"
                (click)="toggleAccount(); $event.stopPropagation()"
              >
                <span class="avatar" aria-hidden="true">{{ initial(currentUser.name) }}</span>
                <span class="signin-label">{{ firstName(currentUser.name) }}</span>
                @if (isAdmin()) {
                  <span class="role-chip">Admin</span>
                } @else if (isSeller()) {
                  <span class="role-chip">Seller</span>
                }
                <ui-icon name="chevron-down" [size]="13" />
              </button>

              @if (accountOpen()) {
                <div
                  class="account-menu"
                  role="menu"
                  animate.enter="kc-pop-enter"
                  animate.leave="kc-pop-leave"
                  (click)="$event.stopPropagation()"
                >
                  <div class="account-head">
                    <span class="avatar lg" aria-hidden="true">{{ initial(currentUser.name) }}</span>
                    <div class="account-id">
                      <strong>{{ currentUser.name }}</strong>
                      <span class="account-email">{{ currentUser.email }}</span>
                      <span class="account-role" [class.seller]="isSeller() || isAdmin()">
                        {{ isAdmin() ? 'Administrator' : isSeller() ? 'Seller & buyer account' : 'Buyer account' }}
                      </span>
                    </div>
                  </div>

                  <!-- A seller account is a buyer account too: the same person
                       shops here. So this is an extra section rather than a
                       replacement, and the shopping links below stay. -->
                  @if (isSeller()) {
                    <p class="account-section">Your store</p>
                    <a [href]="merchantDashboardUrl" role="menuitem" (click)="accountOpen.set(false)">
                      <ui-icon name="grid" [size]="16" /> Seller dashboard
                    </a>
                    <a [href]="merchantOrdersUrl" role="menuitem" (click)="accountOpen.set(false)">
                      <ui-icon name="package" [size]="16" /> Incoming orders
                    </a>
                    @if (myStore(); as store) {
                      <a [routerLink]="['/stores', store.id]" role="menuitem" (click)="accountOpen.set(false)">
                        <ui-icon name="store" [size]="16" /> View my store
                        <span class="hint">as shoppers see it</span>
                      </a>
                    }
                  }

                  @if (isAdmin()) {
                    <p class="account-section">Administration</p>
                    <a [href]="adminDashboardUrl" role="menuitem" (click)="accountOpen.set(false)">
                      <ui-icon name="shield" [size]="16" /> Marketplace overview
                    </a>
                  }

                  <p class="account-section">Your shopping</p>
                  <a routerLink="/profile" role="menuitem" (click)="accountOpen.set(false)">
                    <ui-icon name="user" [size]="16" /> My profile
                  </a>
                  <a routerLink="/orders" role="menuitem" (click)="accountOpen.set(false)">
                    <ui-icon name="box" [size]="16" /> My orders
                  </a>
                  <a routerLink="/wishlist" role="menuitem" (click)="accountOpen.set(false)">
                    <ui-icon name="heart" [size]="16" /> Wishlist
                  </a>

                  <button type="button" class="sign-out" role="menuitem" (click)="signOut()">
                    <ui-icon name="arrow-right" [size]="16" /> Sign out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a
              class="signin-btn"
              [href]="authLoginUrl(sellerArea() ? 'seller' : undefined)"
            >
              <ui-icon name="user" [size]="15" />
              <span class="signin-label">Sign In</span>
            </a>
          }

          <div class="menu-slot nav-menu-slot" [class.keep]="sellerArea()">
            <ng-container [ngTemplateOutlet]="menuBlock" />
          </div>
        </div>
      </div>

      <!-- Shopper navigation. A seller has no use for the category tree, so
           the row is replaced with their own links. -->
      @if (!sellerArea()) {
        <!-- On the home page the hero's vertical sidebar is the category nav
             while at the top; this row slides in (overlaid, so nothing below
             shifts) once the shopper scrolls past it. -->
        <div class="cat-wrap">
          <app-category-menu>
            <div nav-lead class="menu-slot row-menu-slot">
              <ng-container [ngTemplateOutlet]="menuBlock" />
            </div>
          </app-category-menu>
        </div>
      } @else {
        <nav class="seller-row">
          <div class="seller-row-inner container">
            <span class="seller-badge">
              <ui-icon name="store" [size]="13" /> Seller portal
            </span>
            @if (isSeller()) {
              <a routerLink="/seller/dashboard" [class.on]="isPath('/seller/dashboard')">
                Dashboard
              </a>
              <a routerLink="/seller/orders" [class.on]="isPath('/seller/orders')">
                Incoming orders
              </a>
              <a routerLink="/become-a-seller" [class.on]="isPath('/become-a-seller')">
                Selling guide
              </a>
            } @else {
              <a routerLink="/become-a-seller" [class.on]="isPath('/become-a-seller')">
                Why sell with us
              </a>
            }
            <a class="back-to-shop" routerLink="/">
              <ui-icon name="arrow-left" [size]="13" /> Back to shopping
            </a>
          </div>
        </nav>
      }
    </header>

    @if (searchOpen()) {
      <app-search-overlay
        animate.leave="kc-fade-leave"
        (close)="searchOpen.set(false)"
      />
    }
    @if (cartOpen()) {
      <app-cart-drawer animate.leave="kc-fade-leave" (closed)="closeCart()" />
    }

    <!--
      The menu lives in one template and is mounted twice: up in the navbar
      actions on wide screens, and down at the left of the category row on a
      phone. Defining it once keeps the button and its dropdown together —
      the panel anchors to whichever slot is showing — without maintaining two
      copies of the same eight links.
    -->
    <ng-template #menuBlock>
      <div class="menu-wrap">
            <button
              type="button"
              class="menu-btn"
              aria-label="Menu"
              [attr.aria-expanded]="menuOpen()"
              (click)="menuOpen.set(!menuOpen()); $event.stopPropagation()"
            >
              <ui-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="20" />
            </button>
            @if (menuOpen()) {
              <nav
                class="mobile-menu"
                animate.enter="kc-pop-enter"
                animate.leave="kc-pop-leave"
                (click)="$event.stopPropagation()"
              >
                <a routerLink="/" (click)="menuOpen.set(false)">Home</a>
                <a routerLink="/products" (click)="menuOpen.set(false)">All products</a>
                <a routerLink="/categories" (click)="menuOpen.set(false)">Categories</a>
                <a routerLink="/stores" (click)="menuOpen.set(false)">All stores</a>
                <p class="menu-section">Shop by category</p>
                @for (c of categories; track c.slug) {
                  <a class="menu-cat" [routerLink]="['/categories', c.slug]" (click)="menuOpen.set(false)">
                    <ui-icon [name]="c.icon" [size]="16" /> {{ c.name }}
                  </a>
                }
                <p class="menu-section">Collections</p>
                <!-- Same shortcuts the category bar shows on wide screens —
                     the bar hides them below 1400px since there isn't room
                     to fit them without clipping off-screen. -->
                <a routerLink="/products" [queryParams]="{ collection: 'new-arrivals' }" (click)="menuOpen.set(false)">New Arrivals</a>
                <a routerLink="/products" [queryParams]="{ collection: 'best-sellers' }" (click)="menuOpen.set(false)">Best Sellers</a>
                <a routerLink="/categories/arts-culture" [queryParams]="{ sub: 'souvenirs-gifts' }" (click)="menuOpen.set(false)">Gifts</a>
                <a class="sale" routerLink="/products" [queryParams]="{ sale: '1' }" (click)="menuOpen.set(false)">Sale</a>
              </nav>
            }
          </div>
    </ng-template>
  `,
  styles: [
    `
      .navbar {
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: blur(22px) saturate(1.25);
        -webkit-backdrop-filter: blur(22px) saturate(1.25);
        border-bottom: 1px solid transparent;
        position: sticky;
        top: 0;
        z-index: 50;
        transform: translateY(0);
        transition:
          border-color var(--dur-base) var(--ease-standard),
          box-shadow var(--dur-base) var(--ease-standard),
          transform 550ms ease;
      }
      .navbar.scrolled {
        background: rgba(255, 255, 255, 0.9);
        border-bottom-color: var(--color-border);
        box-shadow: 0 6px 20px rgba(15, 23, 42, .05);
      }
      .navbar-inner { transition: height 220ms var(--ease-standard); }
      .navbar.scrolled .navbar-inner { height: calc(var(--header-h) - 8px); }

      /* Home: category row is overlaid under the header so showing/hiding
         it never moves the page content. */
      .navbar.home .cat-wrap {
        position: absolute; left: 0; right: 0; top: 100%;
        background: rgba(255, 255, 255, .94);
        backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        border-bottom: 1px solid var(--color-border);
        box-shadow: 0 8px 20px rgba(15, 23, 42, .05);
        transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard), visibility 0s;
      }
      @media (min-width: 1024px) {
        .navbar.home-top .cat-wrap {
          opacity: 0; visibility: hidden; transform: translateY(-8px); pointer-events: none;
          transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard), visibility 0s 220ms;
        }
      }
      .deliver-to {
        display: inline-flex; align-items: center; gap: 8px;
        margin-right: 10px; color: var(--color-text); white-space: nowrap;
      }
      .deliver-to span { display: flex; flex-direction: column; line-height: 1.15; }
      .deliver-to small { font-size: 11px; color: var(--color-muted); }
      .deliver-to strong { font-size: 13px; font-weight: 600; }
      @media (max-width: 1180px) { .deliver-to { display: none; } }
      .menu-section {
        margin: 8px 0 2px; padding: 6px 12px 0; border-top: 1px solid var(--color-border);
        font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--color-muted);
      }
      .mobile-menu a.menu-cat { display: flex; align-items: center; gap: 10px; }
      /* Hidden while scrolling down, revealed the instant the user scrolls
         back up — see NavbarComponent.onScroll(). Always visible near the
         top regardless of direction. */
      .navbar.nav-hidden {
        transform: translateY(-100%);
      }
      @media (prefers-reduced-motion: reduce) {
        .navbar {
          transition: none;
        }
      }
      .seller-row {
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-alt);
      }
      .seller-row-inner {
        display: flex;
        align-items: center;
        gap: clamp(14px, 1.6vw, 28px);
        height: 40px;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
      .seller-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-full);
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-size: 11.5px;
        font-weight: 700;
      }
      .seller-row-inner a:hover,
      .seller-row-inner a.on {
        color: var(--color-text);
      }
      .seller-row-inner a.on {
        font-weight: 650;
      }
      .back-to-shop {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        color: var(--color-accent);
        font-weight: 600;
      }
      @media (max-width: 700px) {
        .seller-row-inner {
          overflow-x: auto;
          scrollbar-width: none;
        }
        .back-to-shop {
          margin-left: 0;
        }
      }

      .announce {
        background: #0f172a;
        color: rgba(255, 255, 255, 0.86);
        font-size: 10.5px;
      }
      .announce-inner {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 26px;
      }
      .announce-inner span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .announce .dot {
        opacity: 0.5;
      }
      .announce-links {
        display: flex;
        gap: 16px;
        margin-left: auto;
      }
      .announce-links a:hover {
        text-decoration: underline;
      }
      .navbar-inner {
        /* Three tracks, outer two equal (1fr), so the middle one — the
           search bar — sits dead centre no matter how wide the logo or the
           actions on the right happen to be. */
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: clamp(18px, 2.4vw, 42px);
        padding-top: 6px;
        padding-bottom: 6px;
        height: var(--header-h);
      }
      .search-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .logo {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 21px;
        color: var(--color-text);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        letter-spacing: -0.02em;
      }
      .logo-mark {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        object-fit: contain;
        display: block;
        flex-shrink: 0;
      }
      .nav-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      .search-bar {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        width: clamp(320px, 40vw, 640px);
        height: 44px;
        padding: 0 16px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-bg-alt);
        color: var(--color-muted);
        font-size: 13.5px;
        font-weight: 400;
      }
      .search-placeholder {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .search-bar:hover {
        background: rgba(255,255,255,.78);
        border-color: rgba(142,48,33,.28);
        color: var(--color-text);
        box-shadow: var(--shadow-xs);
      }
      .lang-wrap {
        position: relative;
      }
      .lang-btn {
        border: 1px solid var(--color-border);
      }
      .lang-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        display: flex;
        flex-direction: column;
        min-width: 140px;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: #fff;
        box-shadow: var(--shadow-sm);
        z-index: 60;
      }
      .lang-menu button {
        padding: 8px 10px;
        border-radius: var(--radius-xs, 6px);
        font-size: 13px;
        text-align: left;
        color: var(--color-text-secondary);
      }
      .lang-menu button:hover {
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .lang-menu button.active {
        color: var(--color-accent);
        font-weight: 600;
      }
      .lang-menu button:disabled { color: var(--color-muted-2); cursor: not-allowed; opacity: .7; }
      .lang-menu button:disabled:hover { background: transparent; }
      .icon-btn {
        background: none;
        border: none;
        position: relative;
        color: var(--color-text-secondary);
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-btn:hover {
        background: var(--color-bg-alt);
        color: var(--color-accent);
      }
      .icon-btn { transition: background 180ms ease, color 180ms ease; }
      .wishlist-btn:hover {
        color: var(--color-danger);
      }
      .wishlist-badge,
      .cart-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        color: #fff;
        font-size: 9.5px;
        font-weight: 700;
        border-radius: 50%;
        min-width: 17px;
        height: 17px;
        padding: 0 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #fff;
      }
      .wishlist-badge {
        background: var(--color-danger);
      }
      .cart-badge {
        background: var(--color-accent);
      }
      .signin-btn {
        background: rgba(142, 48, 33, .08);
        color: var(--color-accent);
        border: 1px solid rgba(142, 48, 33, .18);
        border-radius: var(--radius-full);
        min-height: 40px;
        padding: 9px 17px;
        font-size: 13.5px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 7px;
        margin-left: 6px;
        white-space: nowrap;
      }
      .signin-btn:hover {
        background: rgba(142, 48, 33, .14);
        border-color: rgba(142, 48, 33, .3);
      }

      /* ---------------------------------------------------- account menu */
      .account-wrap {
        position: relative;
      }
      .account-btn {
        cursor: pointer;
        padding-left: 6px;
      }
      /* A seller signs in with the same account they shop with, so the header
         is the only place that can say which they are. Without this the
         button was just a first name, identical to a buyer's, with no hint
         that a dashboard existed at all. */
      .account-btn.is-seller {
        background: rgba(38, 60, 49, .08);
        border-color: rgba(38, 60, 49, .2);
        color: var(--color-forest);
      }
      .account-btn.is-seller:hover {
        background: rgba(38, 60, 49, .14);
        border-color: rgba(38, 60, 49, .32);
      }
      .avatar {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        flex: 0 0 26px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      }
      .account-btn.is-seller .avatar {
        background: var(--color-forest);
      }
      .avatar.lg {
        width: 38px;
        height: 38px;
        flex-basis: 38px;
        font-size: 16px;
      }
      .role-chip {
        border-radius: var(--radius-full);
        background: var(--color-forest);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .05em;
        text-transform: uppercase;
        padding: 3px 7px;
        line-height: 1;
      }
      .account-menu {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        z-index: 60;
        width: 268px;
        max-width: calc(100vw - 24px);
        padding: 8px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface-raised);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .account-head {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 8px 12px;
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 6px;
      }
      .account-id {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .account-id strong {
        font-size: 13.5px;
        color: var(--color-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-email {
        font-size: 11.5px;
        color: var(--color-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-role {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: var(--color-muted-2);
      }
      .account-role.seller {
        color: var(--color-forest);
      }
      .account-section {
        margin: 8px 0 3px;
        padding-inline: 8px;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: .07em;
        text-transform: uppercase;
        color: var(--color-muted-2);
      }
      .account-menu a,
      .account-menu .sign-out {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 9px 8px;
        border: 0;
        border-radius: var(--radius-sm);
        background: none;
        color: var(--color-text);
        font: inherit;
        font-size: 13.5px;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
      }
      .account-menu a:hover,
      .account-menu .sign-out:hover {
        background: var(--color-bg-hover);
      }
      .account-menu ui-icon {
        color: var(--color-muted);
        flex: 0 0 auto;
      }
      .account-menu .hint {
        margin-left: auto;
        font-size: 10.5px;
        color: var(--color-muted-2);
        white-space: nowrap;
      }
      .sign-out {
        margin-top: 6px;
        border-top: 1px solid var(--color-border) !important;
        border-radius: 0 0 var(--radius-sm) var(--radius-sm) !important;
        padding-top: 12px !important;
        color: var(--color-accent) !important;
      }
      .sign-out ui-icon {
        color: var(--color-accent) !important;
      }
      /* One of these two slots is showing at any width; the other is display
         none, so the menu exists once in the accessibility tree. */
      .nav-menu-slot { display: block; }
      .row-menu-slot { display: none; }
      @media (max-width: 980px) {
        .nav-menu-slot { display: none; }
        .row-menu-slot { display: block; }
        /* Seller pages replace the category row with their own, so the slot
           the hamburger moves into does not exist there. Without this the
           menu had nowhere to render at all on those pages. */
        .nav-menu-slot.keep { display: block; }
      }
      .menu-wrap {
        position: relative;
      }
      .menu-btn {
        display: flex;
        background: none;
        border: none;
        color: var(--color-text);
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
      }
      .menu-btn:hover {
        background: var(--color-bg-alt);
      }
      /* A compact dropdown anchored to the button, matching .lang-menu —
         not a full-width bar that pushes the page down. */
      .mobile-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 60;
        display: flex;
        flex-direction: column;
        min-width: 220px;
        max-height: min(70vh, 560px);
        overflow-y: auto;
        padding: 6px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: #fff;
        box-shadow: var(--shadow-sm);
      }
      /* right: 0 is correct in the navbar, where the button sits at the right
         edge. In the category row the button is at the LEFT edge, so anchoring
         the panel's right edge to it threw the whole 180px panel off-screen —
         it rendered as an empty white sliver. */
      .row-menu-slot .mobile-menu {
        right: auto;
        left: 0;
      }
      .mobile-menu a {
        padding: 9px 10px;
        border-radius: var(--radius-xs, 6px);
        font-size: 13.5px;
        font-weight: 550;
        color: var(--color-text-secondary);
      }
      .mobile-menu a:hover {
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .mobile-menu a.sale {
        color: var(--color-danger, #b92a2a);
      }
      .mobile-menu a.sale:hover {
        color: var(--color-danger, #b92a2a);
      }
      @media (max-width: 1380px) {
        .navbar-inner {
          gap: 14px;
        }
        .announce-links {
          display: none;
        }
      }
      @media (max-width: 1180px) {
        .navbar-inner { grid-template-columns: auto minmax(0, 1fr) auto; }
        .search-group { min-width: 0; }
        .search-bar { width: 100%; min-width: 0; }
        .search-bar > ui-icon, .lang-wrap { flex-shrink: 0; }
      }
      @media (max-width: 700px) {
        .navbar-inner { grid-template-columns: 1fr auto 1fr; }
        .search-placeholder {
          display: none;
        }
        /* Once it is just a magnifier, the pill border and fill around it are
           a box drawn around an icon — and the wishlist and cart beside it are
           bare icons, so the search looked like a different kind of control
           for no reason. */
        .search-bar {
          /* flex, not width alone: the 1180px rule sets min-width: 0 so the
             bar can shrink with the viewport, and at phone width that let it
             collapse to 0 with its icon spilling outside. Fixing the basis and
             refusing to shrink keeps the tap target intact. */
          flex: 0 0 36px;
          width: 36px;
          min-width: 36px;
          padding: 0;
          justify-content: center;
          border: 0;
          background: none;
          border-radius: var(--radius-sm);
        }
        .search-bar:hover {
          background: var(--color-bg-hover);
          border-color: transparent;
          box-shadow: none;
        }
        .lang-menu {
          right: -8px;
        }
      }
      /* Below ~420px the icon row plus a labelled Sign In button overflows the
         viewport, so the button collapses to its icon. */
      @media (max-width: 430px) {
        .signin-label {
          display: none;
        }
        .signin-btn {
          padding: 9px 11px;
          margin-left: 0;
        }
        /* The name goes before the chip does. "Srey" is something a seller
           already knows; that this account can reach a dashboard is the part
           the header exists to tell them, and colour alone is too weak a cue
           to carry it on its own. */
        .account-btn {
          padding-left: 6px;
          padding-right: 8px;
        }
        .nav-actions {
          gap: 2px;
        }
      }
      @media (max-width: 560px) {
        .announce-inner { justify-content: center; font-size: 10.5px; }
        .announce .dot, .announce-inner > span:nth-of-type(2) { display: none; }
        .logo { font-size: 18px; }
        .logo-mark { width: 28px; height: 28px; }
        .signin-label { display: none; }
        .signin-btn { padding-inline: 11px; margin-left: 0; }
        /* Avatar + chip only. The chevron is the first thing to go: at this
           width the whole row is 21px too wide for the viewport and it was
           clipping the hamburger off the right edge, and a disclosure arrow
           earns less than the word it sits next to. */
        .account-btn {
          gap: 5px;
          padding-left: 5px;
          padding-right: 8px;
        }
        .account-btn > ui-icon { display: none; }
        .role-chip { font-size: 9.5px; padding: 3px 6px; }
        .wishlist-btn { display: none; }
        .menu-btn { width: 38px; }
      }
    `,
  ],
})
export class NavbarComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly sellers = inject(SellerService);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly flyToCart = inject(FlyToCartService);

  get merchantDashboardUrl(): string {
    return this.rentify.merchantDashboard;
  }

  get merchantOrdersUrl(): string {
    return `${this.rentify.merchantDashboard}/orders`;
  }

  get adminDashboardUrl(): string {
    return this.rentify.adminDashboard;
  }

  @ViewChild('cartBtn') private readonly cartBtn?: ElementRef<HTMLElement>;

  protected readonly menuOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly cartOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly hidden = signal(false);
  /** Home page, scrolled less than ~120px: the hero sidebar is the category nav. */
  protected readonly homeTop = signal(true);
  protected readonly categories = inject(CatalogService).categories;
  protected readonly langMenuOpen = signal(false);
  protected readonly accountOpen = signal(false);
  protected readonly language = signal<'en' | 'km'>('en');

  /**
   * The signed-in seller's own store, used for the "View my store" link so
   * they can see the public storefront a shopper sees. Loaded once, lazily,
   * the first time the menu is opened by a seller — putting it in the
   * constructor would fire a seller-only request for every anonymous visitor
   * who ever loads the header.
   */
  protected readonly myStore = signal<SellerStore | null>(null);
  private myStoreRequested = false;

  protected readonly cartCount = this.cart.count;
  protected readonly wishlistCount = this.wishlist.count;
  protected readonly user = this.auth.user;

  protected openCart(): void {
    this.menuOpen.set(false);
    this.searchOpen.set(false);
    this.cartOpen.set(true);
  }

  protected closeCart(): void {
    this.cartOpen.set(false);
    queueMicrotask(() => this.cartBtn?.nativeElement.focus());
  }

  /** Active nav item, derived from the URL rather than passed in by each page. */
  private readonly url = signal(this.router.url);
  private readonly section = computed(() => {
    const path = this.url().split('?')[0];
    if (path === '/') return 'home';
    if (path.startsWith('/products') || path.startsWith('/product/'))
      return 'products';
    if (path.startsWith('/categories')) return 'categories';
    if (path.startsWith('/stores')) return 'stores';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/become-a-seller')) return 'seller';
    return '';
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.url.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
        this.searchOpen.set(false);
        this.accountOpen.set(false);
      });

    // Resolve the session once so the header can show a profile link instead
    // of "Sign In" for a user who is already authenticated.
    this.auth.loadCurrentUser().subscribe();
  }

  ngAfterViewInit(): void {
    if (this.cartBtn) {
      this.flyToCart.registerCartTarget(
        this.cartBtn.nativeElement,
        () => this.revealForCartFlight(),
      );
    }
  }

  private cartFlightVisibleUntil = 0;

  /** Keep the bag target visible for the entire fly-to-cart interaction. */
  private revealForCartFlight(): boolean {
    const wasHidden = this.hidden();
    this.cartFlightVisibleUntil = Date.now() + 2600;
    this.hidden.set(false);
    return wasHidden;
  }

  /**
   * True on the seller side of the marketplace.
   *
   * The two sides want different chrome: a shopper needs categories, a cart
   * and a wishlist, while a seller needs their orders and listings and has no
   * use for a basket. Derived from the URL so no page has to declare it.
   */
  protected readonly sellerArea = computed(() => {
    const path = this.url().split('?')[0];
    return path.startsWith('/seller') || path.startsWith('/become-a-seller');
  });

  /** Signed in with a seller (or admin) account. */
  /**
   * Strictly SELLER. This drives the "Seller" chip and the Your store links,
   * and an admin has no store — including ADMIN here gave them a chip they had
   * not earned and a "View my store" link to a storefront that does not exist.
   * Admins still reach seller screens through sellerGuard; they just do not get
   * a seller's chrome.
   */
  protected readonly isSeller = computed(() => this.user()?.role === 'SELLER');

  protected readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  protected authLoginUrl(target?: 'seller'): string {
    const returnPath = target === 'seller' ? '/seller/dashboard' : this.url();
    const returnUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${returnPath}`
      : returnPath;
    return this.auth.getLoginUrl(returnUrl);
  }

  protected isPath(path: string): boolean {
    return this.url().split('?')[0].startsWith(path);
  }

  protected is(name: string): boolean {
    return this.section() === name;
  }

  protected firstName(name: string): string {
    return name.split(' ')[0];
  }

  protected initial(name: string): string {
    return (name.trim()[0] ?? '?').toUpperCase();
  }

  protected toggleAccount(): void {
    const opening = !this.accountOpen();
    this.accountOpen.set(opening);
    if (opening) {
      this.menuOpen.set(false);
      this.langMenuOpen.set(false);
      this.loadMyStore();
    }
  }

  /** First open only; a seller's store does not change while they browse. */
  private loadMyStore(): void {
    if (!this.isSeller() || this.myStoreRequested) return;
    this.myStoreRequested = true;
    this.sellers.getMyStores().subscribe({
      next: (stores) => this.myStore.set(stores[0] ?? null),
      // A missing store is not an error worth surfacing in the header: the
      // link simply does not render, and the dashboard still gets them there.
      error: () => this.myStore.set(null),
    });
  }

  protected signOut(): void {
    this.accountOpen.set(false);
    this.myStore.set(null);
    this.myStoreRequested = false;
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/'));
  }

  /** No translation system yet — this just remembers the choice for the badge. */
  protected selectLanguage(lang: 'en' | 'km'): void {
    this.language.set(lang);
    this.langMenuOpen.set(false);
  }

  private lastScrollY = 0;

  /**
   * Hides the header while scrolling down (reading/browsing), reveals it
   * the instant the user scrolls up (they want navigation back) — the
   * standard mobile-nav pattern. Near the very top it always stays visible;
   * a small dead zone (4px) avoids flicker from sub-pixel scroll jitter.
   */
  @HostListener('window:scroll')
  onScroll() {
    const y = window.scrollY || 0;
    this.scrolled.set(y > 4);
    this.homeTop.set(y < 120);

    // Home keeps its header pinned so the category row stays reachable.
    if (this.is('home')) {
      this.hidden.set(false);
      this.lastScrollY = y;
      return;
    }

    if (y < 80) {
      this.hidden.set(false);
    } else if (y > this.lastScrollY + 4 && Date.now() >= this.cartFlightVisibleUntil) {
      this.hidden.set(true);
    } else if (y < this.lastScrollY - 4) {
      this.hidden.set(false);
    }
    this.lastScrollY = y;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.langMenuOpen.set(false);
    this.menuOpen.set(false);
    this.accountOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.accountOpen.set(false);
    this.langMenuOpen.set(false);
    this.menuOpen.set(false);
  }
}
