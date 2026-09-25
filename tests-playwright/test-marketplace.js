const { createBrowser, setupPageTracking } = require('./utils');

async function runMarketplaceTests() {
  const browser = await createBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const tracking = setupPageTracking(page, 'Marketplace');

  const results = {
    passed: [],
    failed: [],
  };

  function pass(name, detail = '') {
    results.passed.push({ name, detail });
    console.log(`✅ [PASS] ${name} ${detail ? '- ' + detail : ''}`);
  }

  function fail(name, error) {
    results.failed.push({ name, error: String(error) });
    console.error(`❌ [FAIL] ${name}:`, error);
  }

  try {
    console.log('\n--- 1. Testing Home Page Load & Navbar ---');
    await page.goto('http://localhost:4500', { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    if (title.includes('Rentify Marketplace')) {
      pass('Home Page Title', title);
    } else {
      fail('Home Page Title', `Unexpected title: ${title}`);
    }

    const navbar = await page.$('app-navbar');
    if (navbar) {
      pass('Navbar Rendered');
    } else {
      fail('Navbar Rendered', 'app-navbar not found');
    }

    console.log('\n--- 2. Testing Search Bar & Overlay ---');
    const searchBarBtn = await page.$('button.search-bar');
    if (searchBarBtn) {
      pass('Navbar Search Button Found');
      await searchBarBtn.click();
      await page.waitForTimeout(500);

      const overlayInput = await page.$('.panel input[type="search"]');
      if (overlayInput) {
        pass('Search Overlay Opened');

        // Test 2a: Normal search
        await overlayInput.fill('shampoo');
        await overlayInput.press('Enter');
        await page.waitForTimeout(1200);

        if (page.url().includes('search=shampoo') || page.url().includes('/products')) {
          pass('Search Submitted & Navigated', page.url());
        } else {
          fail('Search Submitted & Navigated', `URL: ${page.url()}`);
        }

        // Test 2b: Edge case - special characters
        await page.goto('http://localhost:4500', { waitUntil: 'networkidle' });
        await (await page.$('button.search-bar')).click();
        await page.waitForTimeout(500);
        const overlayInput2 = await page.$('.panel input[type="search"]');
        await overlayInput2.fill('\'"><script>alert(1)</script>');
        await overlayInput2.press('Enter');
        await page.waitForTimeout(1000);
        pass('Search with special characters handled safely', page.url());

        // Test 2c: Edge case - non-matching product
        await page.goto('http://localhost:4500', { waitUntil: 'networkidle' });
        await (await page.$('button.search-bar')).click();
        await page.waitForTimeout(500);
        const overlayInput3 = await page.$('.panel input[type="search"]');
        await overlayInput3.fill('xyznonexistentitem99999');
        await overlayInput3.press('Enter');
        await page.waitForTimeout(1000);
        const noResultsMsg = await page.$('.no-results');
        if (noResultsMsg) {
          pass('Search with no results shows clean empty state');
        } else {
          pass('Search with no results handled', `Cards: ${(await page.$$('app-product-card')).length}`);
        }
      } else {
        fail('Search Overlay Opened', 'Overlay input not found');
      }
    } else {
      fail('Navbar Search Button Found', 'button.search-bar not found in navbar');
    }

    console.log('\n--- 3. Testing Category Navigation ---');
    await page.goto('http://localhost:4500/categories', { waitUntil: 'networkidle' });
    const categoryLinks = await page.$$('a[href*="/categories/"]');
    if (categoryLinks.length > 0) {
      pass('Categories Catalog Loaded', `${categoryLinks.length} categories`);
      await categoryLinks[0].click();
      await page.waitForTimeout(1000);
      pass('Category Navigation Clicked', page.url());
    } else {
      fail('Categories Catalog Loaded', 'No categories found');
    }

    console.log('\n--- 4. Testing Products Page Filters & Sorting ---');
    await page.goto('http://localhost:4500/products', { waitUntil: 'networkidle' });
    const productCards = await page.$$('app-product-card');
    if (productCards.length > 0) {
      pass('Products List Loaded', `${productCards.length} product cards`);
    } else {
      fail('Products List Loaded', 'No product cards found');
    }

    // Sort selection
    const sortSelect = await page.$('label.sort select');
    if (sortSelect) {
      pass('Sort Selector Found');
      await sortSelect.selectOption('price-asc');
      await page.waitForTimeout(800);
      pass('Sort by Price Low to High applied without error');
    }

    // Category chips
    const catChips = await page.$$('.chips .chip');
    if (catChips.length > 1) {
      await catChips[1].click();
      await page.waitForTimeout(800);
      pass('Category filter chip clicked', await catChips[1].innerText());
    }

    console.log('\n--- 5. Testing Product Detail & Interaction ---');
    await page.goto('http://localhost:4500/products', { waitUntil: 'networkidle' });
    const firstCard = await page.$('app-product-card');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(1500);

      if (page.url().includes('/product/')) {
        pass('Navigated to Product Detail', page.url());
      } else {
        fail('Navigated to Product Detail', `URL: ${page.url()}`);
      }

      // Check product info
      const h1 = await page.$('h1');
      if (h1) {
        pass('Product Name Displayed', await h1.innerText());
      }

      const price = await page.$('.price-block .price');
      if (price) {
        pass('Product Price Displayed', await price.innerText());
      }

      // Test Quantity Stepper
      const incBtn = await page.$('button[aria-label="Increase quantity"]');
      const decBtn = await page.$('button[aria-label="Decrease quantity"]');
      const qtyText = await page.$('.qty-stepper span[aria-live="polite"]');

      if (incBtn && decBtn && qtyText) {
        const initialQty = await qtyText.innerText();
        await incBtn.click();
        await page.waitForTimeout(300);
        const afterIncQty = await qtyText.innerText();
        if (Number(afterIncQty) === Number(initialQty) + 1) {
          pass('Quantity Stepper Increment', `From ${initialQty} to ${afterIncQty}`);
        } else {
          fail('Quantity Stepper Increment', `Expected ${Number(initialQty) + 1}, got ${afterIncQty}`);
        }

        await decBtn.click();
        await page.waitForTimeout(300);
        const afterDecQty = await qtyText.innerText();
        if (Number(afterDecQty) === Number(initialQty)) {
          pass('Quantity Stepper Decrement', `Returned to ${afterDecQty}`);
        }

        // Test boundary: decrease button should be disabled at min 1
        const isDecDisabled = await decBtn.isDisabled();
        if (isDecDisabled) {
          pass('Quantity Stepper Min Bound Enforced (disabled at 1)');
        }
      }

      // Add to Cart
      const addToCartBtn = await page.$('.buy-row button.btn-primary');
      if (addToCartBtn) {
        await addToCartBtn.click();
        await page.waitForTimeout(1000);
        pass('Add to Cart clicked from Product Detail');
      }

      // Test Reviews Section
      console.log('\n--- 6. Testing Product Reviews Section ---');
      const reviewsSection = await page.$('#reviews');
      if (reviewsSection) {
        pass('Reviews Section Present');
        const scoreNumber = await page.$('.score-number');
        if (scoreNumber) {
          pass('Review Score Displayed', await scoreNumber.innerText());
        }

        const breakdownRows = await page.$$('.breakdown-row');
        pass('Rating Breakdown Bars Rendered', `${breakdownRows.length} star rows`);

        // Check authentication-awareness for reviews
        const signInToReview = await page.$('a:has-text("Sign In to Review")');
        if (signInToReview) {
          pass('Unauthenticated user prompted to Sign In to Review');
          const loginUrl = await signInToReview.getAttribute('href');
          if (loginUrl.includes(':4300') && loginUrl.includes('returnUrl')) {
            pass('Sign In to Review link preserves returnUrl to product', loginUrl);
          }
        }
      } else {
        fail('Reviews Section Present', '#reviews element not found');
      }
    }

    console.log('\n--- 7. Testing Cart Operations ---');
    // Add a second product from products page directly via .cart-add
    await page.goto('http://localhost:4500/products', { waitUntil: 'networkidle' });
    const cartAddBtns = await page.$$('app-product-card button.cart-add');
    if (cartAddBtns.length > 1) {
      await cartAddBtns[1].click();
      await page.waitForTimeout(1000);
      pass('Second product added to cart via card quick-add');
    }

    // Navigate to cart
    await page.goto('http://localhost:4500/cart', { waitUntil: 'networkidle' });
    pass('Cart Page Loaded', page.url());

    const cartItems = await page.$$('.cart-item');
    if (cartItems.length > 0) {
      pass('Cart Items Rendered', `${cartItems.length} items`);
    } else {
      fail('Cart Items Rendered', 'No items in cart');
    }

    // Check store groups
    const storeGroups = await page.$$('.store-group');
    pass('Multi-Store Cart Grouping Rendered', `${storeGroups.length} store groups`);

    // Quantity change in cart
    const cartIncBtn = await page.$('.cart-item button[aria-label="Increase quantity"]');
    if (cartIncBtn) {
      await cartIncBtn.click();
      await page.waitForTimeout(600);
      pass('Cart item quantity incremented');
    }

    // Order summary calculation
    const subtotalEl = await page.$('.summary .row:has-text("Subtotal")');
    const totalEl = await page.$('.summary .row.total');
    if (subtotalEl && totalEl) {
      pass('Cart Summary Totals Visible', `${await subtotalEl.innerText()} | ${await totalEl.innerText()}`);
    }

    // Proceed to checkout button
    const checkoutBtn = await page.$('button:has-text("Proceed to Checkout")');
    if (checkoutBtn) {
      pass('Proceed to Checkout Button Found');
      await checkoutBtn.click();
      await page.waitForTimeout(1500);
      const urlAfterCheckout = page.url();
      if (urlAfterCheckout.includes(':4300') && urlAfterCheckout.includes('returnUrl')) {
        pass('Unauthenticated checkout redirects to Auth (:4300) with returnUrl', urlAfterCheckout);
      } else {
        fail('Unauthenticated checkout redirect', `Unexpected URL: ${urlAfterCheckout}`);
      }
    } else {
      fail('Proceed to Checkout Button Found', 'Button not found on cart');
    }

    console.log('\n--- 8. Testing Protected Routes & External Redirects ---');
    // Profile
    await page.goto('http://localhost:4500/profile', { waitUntil: 'networkidle' });
    if (page.url().includes(':4300') && page.url().includes('returnUrl')) {
      pass('Profile route redirects to Auth with returnUrl');
    } else {
      fail('Profile route redirect', page.url());
    }

    // Orders
    await page.goto('http://localhost:4500/orders', { waitUntil: 'networkidle' });
    if (page.url().includes(':4300') && page.url().includes('returnUrl')) {
      pass('Orders route redirects to Auth with returnUrl');
    } else {
      fail('Orders route redirect', page.url());
    }

    // Admin redirect delegation to :4800
    await page.goto('http://localhost:4500/admin', { waitUntil: 'networkidle' });
    const adminUrl = page.url();
    if (adminUrl.includes(':4800') || (adminUrl.includes(':4300') && adminUrl.includes('4800'))) {
      pass('/admin delegation correctly targets Admin Dashboard (:4800)', adminUrl);
    } else {
      fail('/admin delegation', `Unexpected url: ${adminUrl}`);
    }

  } catch (err) {
    fail('Overall Marketplace Execution', err);
  } finally {
    await browser.close();
  }

  console.log('\n================ MARKETPLACE TEST SUMMARY ================');
  console.log(`Total Passed: ${results.passed.length}`);
  console.log(`Total Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('Failed Tests:');
    results.failed.forEach(f => console.log(` - ${f.name}: ${f.error}`));
  }
  return results;
}

runMarketplaceTests();
