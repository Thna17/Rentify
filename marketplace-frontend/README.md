# Marketplace Frontend

## Rentify marketplace development flow

Normal Angular routes use the designed Rentify Marketplace UI with Core identity
and Commerce catalog and COD checkout. Local Compose enables `MARKETPLACE_COD_CHECKOUT_ENABLED` for
development. KhmerCraft's Express/Mongoose API is not used. Local Angular
development runs on `http://localhost:4500`; Core and Commerce must allow that
origin for credentialed requests, and Auth must allow it as a return URL.

Before serving the Angular app outside localhost, replace the blank public
Core, Commerce, Auth, and merchant dashboard URLs in
`public/marketplace-config.js`. The local fallback URLs are for a developer
machine only. The obsolete product-only preview page has been removed.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4500/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

## Type checking

To verify TypeScript types without emitting output:

```bash
npm run typecheck
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
