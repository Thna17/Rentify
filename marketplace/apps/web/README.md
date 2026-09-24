# Web

## Rentify buyer preview

`/rentify-preview` is a combined Core identity and Commerce catalog/COD
checkout rehearsal. It is disabled by default in
`public/rentify-preview-config.js`. To enable it in an isolated staging
environment, replace that public config with `enabled: true` and the public
Core API, Commerce API, and Auth app URLs. Freeze legacy marketplace writes
before allowing test orders and set Commerce's
`MARKETPLACE_COD_CHECKOUT_ENABLED=true`. The normal Angular routes still use the legacy
marketplace API. Local Angular development runs on `http://localhost:4201`;
Core and Commerce must allow that origin for credentialed requests, and Auth
must allow it as a return URL.

For a staging route rehearsal after those checks, set `cutoverEnabled: true`
alongside `enabled: true` and supply `merchantDashboardUrl`. This makes the
Rentify buyer shell serve `/` and all old deep links, including `/cart`,
`/checkout`, and `/orders`. The old Angular components then cannot create new
Mongo writes. The switch is **off** in the committed public config and is not
a production cutover. Return to `cutoverEnabled: false` on rollback only after
the active writer and outstanding orders are reconciled.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
