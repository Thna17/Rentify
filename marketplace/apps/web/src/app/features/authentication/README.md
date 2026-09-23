# Authentication features

Role-specific authentication entry points and buyer password workflows.

```text
authentication/
├── buyer/
│   ├── login/             # /login
│   ├── register/          # /register
│   ├── forgot-password/   # /forgot-password
│   ├── reset-password/    # /reset-password
│   └── change-password/   # /account/change-password
└── seller/
    └── login/             # /seller/login
```

The API client, guards, interceptor, and session state stay in `../../core/auth`
because they are infrastructure shared by multiple feature domains.
