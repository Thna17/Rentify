export function parseScanPrefixes(value) {
  const entries = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(entries.map((entry) => String(entry || '').trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
}

export function normalizeScanCode(value, options = {}) {
  let normalized = String(value ?? '').trim().replace(/[\r\n\t]+$/g, '').trim();
  const prefixes = parseScanPrefixes(options.prefixes);
  const prefix = prefixes.find((entry) => normalized.startsWith(entry));
  if (prefix) {
    normalized = normalized.slice(prefix.length).trim();
  }
  return normalized.toLowerCase();
}

function addIndexedMatch(index, code, product, variantId) {
  if (!code) return;
  const existing = index.get(code);
  const nextMatch = { product, variantId };
  if (!existing) {
    index.set(code, nextMatch);
    return;
  }

  if (existing?.ambiguous) {
    const alreadyExists = existing.matches.some(
      (match) => match.product?.id === product.id && (match.variantId || null) === (variantId || null)
    );
    if (!alreadyExists) {
      existing.matches.push(nextMatch);
    }
    return;
  }

  if (existing.product?.id === product.id && (existing.variantId || null) === (variantId || null)) {
    return;
  }

  index.set(code, {
    ambiguous: true,
    matches: [existing, nextMatch],
  });
}

function getActiveVariants(product) {
  return (product?.variants || []).filter((variant) => variant?.isActive !== false);
}

function getVariantLabel(variant) {
  if (variant?.title) {
    return variant.title;
  }
  return variant?.sku || "Default";
}

function resolveQuickVariant(product) {
  const variants = getActiveVariants(product);
  if (variants.length === 1) {
    return variants[0];
  }
  const defaultVariant = variants.find(
    (variant) => getVariantLabel(variant).toLowerCase() === "default"
  );
  return variants.length ? defaultVariant || null : null;
}

function collectPriorityMatches(productList, code, selector) {
  const matches = new Map();
  const addMatch = (product, variantId) => {
    matches.set(`${product.id}:${variantId || "default"}`, { product, variantId });
  };

  for (const product of productList || []) {
    const match = selector(product, addMatch, code);
    if (match === true) {
      continue;
    }
  }

  return Array.from(matches.values());
}

function isProductActive(product) {
  return String(product?.status || "ACTIVE").trim().toUpperCase() === "ACTIVE";
}

function getSearchableProductValues(product) {
  const variants = [
    ...getActiveVariants(product),
    product?.defaultVariant,
    product?.selectedVariant,
  ].filter(Boolean);

  return [
    product?.name,
    product?.shortCode,
    product?.sku,
    product?.barcode,
    product?.brand,
    product?.category?.name,
    ...variants.flatMap((variant) => [variant?.title, variant?.sku, variant?.barcode]),
  ]
    .filter(Boolean)
    .map((value) => normalizeScanCode(value));
}

function resolveLookupState(match, code, source) {
  const product = match?.product || null;
  if (!product) {
    return {
      state: "not_found",
      code,
      source,
      product: null,
      variantId: undefined,
      matches: [],
    };
  }

  if (!isProductActive(product)) {
    return {
      state: "inactive",
      code,
      source,
      product,
      variantId: match.variantId,
      matches: [match],
    };
  }

  if (product.trackInventory === false) {
    return {
      state: "untracked",
      code,
      source,
      product,
      variantId: match.variantId,
      matches: [match],
    };
  }

  return {
    state: "resolved",
    code,
    source,
    product,
    variantId: match.variantId,
    matches: [match],
  };
}

function collectTextMatches(rawCode, productList = []) {
  const code = normalizeScanCode(rawCode);
  if (!code) {
    return [];
  }

  const matches = new Map();
  for (const product of productList || []) {
    const searchableValues = getSearchableProductValues(product);
    const matched = searchableValues.some((value) => value.includes(code));
    if (!matched) {
      continue;
    }
    const variantId = resolveQuickVariant(product)?.id || undefined;
    matches.set(`${product.id}:${variantId || "default"}`, { product, variantId });
  }

  return Array.from(matches.values());
}

export function resolveExactProductLookup(rawCode, productList = []) {
  const code = normalizeScanCode(rawCode);
  if (!code) {
    return null;
  }

  const prioritySelectors = [
    (product, addMatch) => {
      const variantCandidates = [
        ...getActiveVariants(product),
        product?.defaultVariant,
        product?.selectedVariant,
      ].filter(Boolean);

      let matchedVariant = false;
      for (const variant of variantCandidates) {
        if (normalizeScanCode(variant?.barcode) === code) {
          matchedVariant = true;
          addMatch(product, variant.id);
        }
      }

      if (!matchedVariant && normalizeScanCode(product?.barcode) === code) {
        addMatch(product, resolveQuickVariant(product)?.id || undefined);
      }
    },
    (product, addMatch) => {
      if (normalizeScanCode(product?.shortCode) === code) {
        addMatch(product, resolveQuickVariant(product)?.id || undefined);
      }
    },
    (product, addMatch) => {
      const variantCandidates = [
        ...getActiveVariants(product),
        product?.defaultVariant,
        product?.selectedVariant,
      ].filter(Boolean);

      for (const variant of variantCandidates) {
        if (normalizeScanCode(variant?.sku) === code) {
          addMatch(product, variant.id);
        }
      }

      if (normalizeScanCode(product?.sku) === code) {
        addMatch(product, resolveQuickVariant(product)?.id || undefined);
      }
    },
  ];

  for (const selector of prioritySelectors) {
    const matches = collectPriorityMatches(productList, code, selector);
    if (!matches.length) {
      continue;
    }
    return matches.length === 1 ? matches[0] : { ambiguous: true, matches };
  }

  return null;
}

export function buildExactProductLookupIndex(productList = []) {
  const barcodeIndex = new Map();
  const shortCodeIndex = new Map();
  const skuIndex = new Map();

  for (const product of productList || []) {
    const variantCandidates = [
      ...getActiveVariants(product),
      product?.defaultVariant,
      product?.selectedVariant,
    ].filter(Boolean);

    let matchedVariantBarcode = false;
    for (const variant of variantCandidates) {
      const variantBarcode = normalizeScanCode(variant?.barcode);
      if (variantBarcode) {
        matchedVariantBarcode = true;
        addIndexedMatch(barcodeIndex, variantBarcode, product, variant.id);
      }
    }

    if (!matchedVariantBarcode) {
      const productBarcode = normalizeScanCode(product?.barcode);
      if (productBarcode) {
        addIndexedMatch(barcodeIndex, productBarcode, product, resolveQuickVariant(product)?.id || undefined);
      }
    } else {
      const productBarcode = normalizeScanCode(product?.barcode);
      if (productBarcode) {
        addIndexedMatch(barcodeIndex, productBarcode, product, resolveQuickVariant(product)?.id || undefined);
      }
    }

    const shortCode = normalizeScanCode(product?.shortCode);
    if (shortCode) {
      addIndexedMatch(shortCodeIndex, shortCode, product, resolveQuickVariant(product)?.id || undefined);
    }

    for (const variant of variantCandidates) {
      const variantSku = normalizeScanCode(variant?.sku);
      if (variantSku) {
        addIndexedMatch(skuIndex, variantSku, product, variant.id);
      }
    }

    const productSku = normalizeScanCode(product?.sku);
    if (productSku) {
      addIndexedMatch(skuIndex, productSku, product, resolveQuickVariant(product)?.id || undefined);
    }
  }

  return {
    barcodeIndex,
    shortCodeIndex,
    skuIndex,
  };
}

export function resolveExactProductLookupFromIndex(rawCode, lookupIndex) {
  const code = normalizeScanCode(rawCode);
  if (!code || !lookupIndex) {
    return null;
  }

  const priorityIndexes = [
    lookupIndex.barcodeIndex,
    lookupIndex.shortCodeIndex,
    lookupIndex.skuIndex,
  ];

  for (const index of priorityIndexes) {
    const match = index?.get(code);
    if (!match) continue;
    return match;
  }

  return null;
}

export function resolveInventoryProductLookup(rawCode, productList = []) {
  const code = normalizeScanCode(rawCode);
  if (!code) {
    return {
      state: "empty",
      code,
      source: "none",
      product: null,
      variantId: undefined,
      matches: [],
    };
  }

  const exactMatch = resolveExactProductLookup(code, productList);
  if (exactMatch?.ambiguous) {
    return {
      state: "multiple",
      code,
      source: "exact",
      product: null,
      variantId: undefined,
      matches: exactMatch.matches,
    };
  }
  if (exactMatch?.product) {
    return resolveLookupState(exactMatch, code, "exact");
  }

  const textMatches = collectTextMatches(code, productList);
  if (textMatches.length === 1) {
    return resolveLookupState(textMatches[0], code, "text");
  }
  if (textMatches.length > 1) {
    return {
      state: "multiple",
      code,
      source: "text",
      product: null,
      variantId: undefined,
      matches: textMatches,
    };
  }

  return {
    state: "not_found",
    code,
    source: "none",
    product: null,
    variantId: undefined,
    matches: [],
  };
}
