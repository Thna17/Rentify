# User features

Buyer-facing account functionality.

```text
user/
└── account/
    ├── orders/   # /orders — buyer order history
    └── profile/  # /profile — buyer profile and account actions
```

Authentication screens are intentionally under `../authentication/buyer` so
account features do not become coupled to session management.
