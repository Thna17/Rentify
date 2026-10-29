'use strict';

const CATALOG_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

const contracts = Object.freeze({
  'marketplace.search_performed': Object.freeze({
    properties: Object.freeze(['channel', 'locale', 'hasResults']),
    required: Object.freeze(['channel', 'locale', 'hasResults']),
    measures: Object.freeze(['queryLength', 'filterCount', 'resultCount', 'durationMs']),
  }),
  'marketplace.discovery_viewed': Object.freeze({
    properties: Object.freeze(['channel', 'surface', 'locale']),
    required: Object.freeze(['channel', 'surface', 'locale']),
    measures: Object.freeze(['visibleItems']),
  }),
  'cart.item_added': Object.freeze({
    properties: Object.freeze(['channel', 'locale']),
    required: Object.freeze(['channel']),
    measures: Object.freeze(['quantity', 'cartItemCount']),
  }),
  'cart.item_updated': Object.freeze({
    properties: Object.freeze(['channel', 'locale']),
    required: Object.freeze(['channel']),
    measures: Object.freeze(['quantity', 'cartItemCount']),
  }),
  'checkout.started': Object.freeze({
    properties: Object.freeze(['channel', 'paymentMethod', 'locale']),
    required: Object.freeze(['channel', 'paymentMethod']),
    measures: Object.freeze(['storeCount', 'itemCount']),
  }),
  'checkout.failed': Object.freeze({
    properties: Object.freeze(['channel', 'failureClass', 'locale']),
    required: Object.freeze(['channel', 'failureClass']),
    measures: Object.freeze(['storeCount', 'itemCount']),
  }),
});

module.exports = { CATALOG_VERSION, SCHEMA_VERSION, BROWSER_EVENT_CONTRACTS: contracts };
