import React, { createContext, useContext, useEffect, useState, useMemo, type PropsWithChildren } from 'react';

export type Language = 'EN' | 'KH';

export interface AuthLanguageContextValue {
  language: Language;
  isKhmer: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  EN: {
    // Brand & Header
    'brand.name': 'Rentify',
    'brand.tagline': 'Modern commerce for Cambodia and beyond',
    'lang.en': 'English',
    'lang.kh': 'ភាសាខ្មែរ',
    'nav.backToStore': 'Back to store',
    'nav.backToMarket': 'Back to marketplace',
    'nav.backToHome': 'Back to home',
    'nav.backToLogin': 'Back to sign in',

    // Hero Panel Value Props
    'hero.badge': 'Unified E-Commerce & Marketplace',
    'hero.title.merchant': 'Scale your business across Cambodia and globally',
    'hero.subtitle.merchant': 'Manage storefronts, POS, inventory, and receive instant payments in one unified platform.',
    'hero.title.customer': 'Shop authentic products with trusted local stores',
    'hero.subtitle.customer': 'Sign in to track orders, save delivery addresses, and pay easily via KHQR.',
    'hero.title.marketplace': 'Explore thousands of Cambodian and global brands',
    'hero.subtitle.marketplace': 'One unified account for seamless shopping across all verified merchants.',
    'hero.feature.khqr': 'Instant Bakong KHQR & Card Payments',
    'hero.feature.khqrDesc': 'Fast, zero-friction checkout for all Cambodian mobile banking apps.',
    'hero.feature.security': 'Bank-Grade Security',
    'hero.feature.securityDesc': 'Encrypted sessions, fraud protection, and strict privacy controls.',
    'hero.feature.channels': 'Storefront & Marketplace in One',
    'hero.feature.channelsDesc': 'Seamlessly sync products, stock, and orders across web and marketplace.',

    // Common Actions
    'action.signIn': 'Sign in',
    'action.signingIn': 'Signing in…',
    'action.signUp': 'Create account',
    'action.signingUp': 'Creating account…',
    'action.continue': 'Continue',
    'action.verify': 'Verify',
    'action.verifying': 'Verifying…',
    'action.resendCode': 'Resend code',
    'action.sendCode': 'Send verification code',
    'action.sendingCode': 'Sending code…',
    'action.resetPassword': 'Reset password',
    'action.resettingPassword': 'Updating password…',

    // Shorthand Auth Field Keys
    'auth.email': 'Email',
    'auth.phone': 'Phone number',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.phonePlaceholder': '012 345 678',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password',

    // Login Page
    'login.title.merchant': 'Sign in to Rentify Merchant',
    'login.subtitle.merchant': 'Access your store dashboard, inventory, and sales',
    'login.title.customer': 'Sign in to {storeName}',
    'login.subtitle.customer': 'Complete your checkout and manage your orders',
    'login.title.marketplace': 'Sign in to Rentify Marketplace',
    'login.subtitle.marketplace': 'Continue shopping and track your orders across stores',
    'login.title.default': 'Welcome back',
    'login.subtitle.default': 'Sign in to continue to your account',
    'login.label.contact': 'Phone number or Email',
    'login.placeholder.email': 'you@example.com',
    'login.placeholder.phone': '012 345 678',
    'login.tab.phone': 'Phone number',
    'login.tab.email': 'Email address',
    'login.label.password': 'Password',
    'login.placeholder.password': 'Enter your password',
    'login.forgotPassword': 'Forgot password?',
    'login.rememberMe': 'Remember this device for 30 days',
    'login.noAccount': "Don't have an account?",
    'login.createAccount': 'Create an account',
    'login.securityFootnote': 'Secured by 256-bit encryption • PCI DSS Compliant',
    'login.continueTelegram': 'Continue with Telegram',
    'login.orContinueWith': 'or sign in with email or phone',
    'login.verifyNow': 'Verify now',

    // Sign Up Page
    'signup.title.merchant': 'Start Selling with Rentify',
    'signup.subtitle.merchant': 'Launch your online storefront, sync POS, and accept KHQR payments',
    'signup.title.customer': 'Create your Customer Account',
    'signup.subtitle.customer': 'Fast checkout, order tracking, and member rewards',
    'signup.title.marketplace': 'Join Rentify Marketplace',
    'signup.subtitle.marketplace': 'Discover verified Cambodian shops and international brands',
    'signup.label.name': 'Full name',
    'signup.placeholder.name': 'e.g. Sokha Chan',
    'signup.label.confirmPassword': 'Confirm password',
    'signup.placeholder.confirmPassword': 'Re-enter your password',
    'signup.passwordStrength': 'Password strength',
    'signup.strength.weak': 'Weak',
    'signup.strength.fair': 'Fair',
    'signup.strength.good': 'Good',
    'signup.strength.strong': 'Strong',
    'signup.tip.length': 'At least 8 characters',
    'signup.tip.uppercase': '1 uppercase letter',
    'signup.tip.number': '1 number or symbol',
    'signup.telegramOptIn': 'Receive order updates via Telegram',
    'signup.termsPrefix': 'By signing up, you agree to our',
    'signup.termsOfService': 'Terms of Service',
    'signup.and': 'and',
    'signup.privacyPolicy': 'Privacy Policy',
    'signup.terms': 'By signing up, you agree to our Terms of Service and Privacy Policy.',
    'signup.hasAccount': 'Already have an account?',
    'signup.passwordMatchSuccess': 'Passwords match',
    'signup.passwordMatchError': 'Passwords do not match',

    // Verification & OTP
    'verify.title': 'Enter Verification Code',
    'verify.subtitle': 'We have sent a 6-digit code to {destination}',
    'verify.didNotReceive': "Didn't receive the code?",
    'verify.resendIn': 'Resend available in {seconds}s',
    'verify.telegramVerify': 'Verify instantly with Telegram',
    'verify.changeContact': 'Change number or email',
    'verify.success': 'Account verified successfully! Redirecting…',

    'action.sendRecoveryCode': 'Send Recovery Code',
    'action.updatePassword': 'Update Password',
    'action.requestNewLink': 'Request a New Link',
    'action.signInNow': 'Sign In Now',

    // Forgot & Reset Password
    'forgot.title': 'Forgot your password?',
    'forgot.subtitle': 'Enter your registered email or phone number to receive recovery instructions.',
    'forgot.instruction': 'We will send a secure verification code to reset your password.',
    'forgot.successTitleEmail': 'Check your inbox',
    'forgot.successTitlePhone': 'Check your phone',
    'forgot.successSubtitle': "We've sent recovery instructions and a 6-digit code to {contact}.",
    'forgot.enterCode': 'Enter Verification Code',
    'forgot.tryAnother': 'Try another phone number or email',
    'reset.title': 'Set a new password',
    'reset.subtitle': 'Ensure your new password is at least 8 characters with a mix of letters and numbers.',
    'reset.label.newPassword': 'New password',
    'reset.success': 'Your password has been reset successfully.',
    'reset.invalidTokenTitle': 'Invalid or Expired Link',
    'reset.invalidTokenMessage': 'This password reset link or verification code has expired or is invalid. Please request a new recovery link.',
    'reset.countdownRedirect': 'Redirecting to sign in in {seconds}s…',

    // Validation & Errors
    'error.invalidContact': 'Please enter a valid email or phone number',
    'error.invalidPhone': 'Please enter a valid Cambodian phone number (e.g. 012 345 678)',
    'error.invalidEmail': 'Please enter a valid email address',
    'error.passwordRequired': 'Password is required',
    'error.passwordMatch': 'Passwords do not match',
    'error.otpRequired': 'Please enter the 6-digit code',
    'error.phoneNotFound': 'No account found with this phone number. Please check or sign up.',
    'error.emailNotFound': 'No account found with this email address. Please check or sign up.',
    'error.incorrectPassword': 'Incorrect password or account details. Please try again.',
    'error.invalidCredentials': 'Invalid phone/email or password. Please try again.',
    'error.accountDisabled': 'Your account has been suspended or deactivated. Contact support for help.',
    'error.general': 'An unexpected error occurred. Please try again.',

    // Security & Footer
    'footer.security': 'Bank-grade 256-bit encryption • KHQR Bakong compatible • PCI DSS compliant',
    'footer.copyright': '© 2026 Rentify. All rights reserved.',
  },
  KH: {
    // Brand & Header
    'brand.name': 'Rentify',
    'brand.tagline': 'ដំណោះស្រាយពាណិជ្ជកម្មអេឡិចត្រូនិកទំនើបសម្រាប់កម្ពុជា',
    'lang.en': 'English',
    'lang.kh': 'ភាសាខ្មែរ',
    'nav.backToStore': 'ត្រឡប់ទៅហាងវិញ',
    'nav.backToMarket': 'ត្រឡប់ទៅផ្សារ Rentify',
    'nav.backToHome': 'ត្រឡប់ទៅទំព័រដើម',
    'nav.backToLogin': 'ត្រឡប់ទៅការចូលគណនី',

    // Hero Panel Value Props
    'hero.badge': 'វេទិកាហាងអនឡាញ និងផ្សាររួម',
    'hero.title.merchant': 'ពង្រីកអាជីវកម្មរបស់អ្នកនៅកម្ពុជា និងទីផ្សារអន្តរជាតិ',
    'hero.subtitle.merchant': 'គ្រប់គ្រងហាងអនឡាញ ប្រព័ន្ធ POS ស្តុកទំនិញ និងទទួលការទូទាត់ប្រាក់ភ្លាមៗក្នុងប្រព័ន្ធតែមួយ។',
    'hero.title.customer': 'ទិញទំនិញពីហាងក្នុងស្រុកដែលទុកចិត្តបាន',
    'hero.subtitle.customer': 'ចូលគណនីដើម្បីតាមដានការកុម្ម៉ង់ រក្សាទុកអាសយដ្ឋានដឹកជញ្ជូន និងទូទាត់តាម KHQR យ៉ាងងាយស្រួល។',
    'hero.title.marketplace': 'ស្វែងរកផលិតផលរាប់ពាន់មុខពីម៉ាកល្បីៗនៅកម្ពុជា',
    'hero.subtitle.marketplace': 'គណនីតែមួយសម្រាប់ទិញទំនិញពីគ្រប់ហាងដែលមានការទទួលស្គាល់ត្រឹមត្រូវ។',
    'hero.feature.khqr': 'ទូទាត់ប្រាក់រហ័សតាម KHQR បាគង និងកាតធនាគារ',
    'hero.feature.khqrDesc': 'ទូទាត់ប្រាក់ដោយមិនគិតថ្លៃសេវា គាំទ្រគ្រប់កម្មវិធីធនាគារចល័តនៅកម្ពុជា។',
    'hero.feature.security': 'ប្រព័ន្ធសុវត្ថិភាពកម្រិតស្តង់ដារធនាគារ',
    'hero.feature.securityDesc': 'ការពារទិន្នន័យផ្ទាល់ខ្លួន និងការសម្ងាត់ជាមួយការអ៊ិនគ្រីបកម្រិតខ្ពស់។',
    'hero.feature.channels': 'ហាងផ្ទាល់ខ្លួន និងផ្សាររួមក្នុងប្រព័ន្ធតែមួយ',
    'hero.feature.channelsDesc': 'ធ្វើសមកាលកម្មទំនិញ ស្តុក និងការកុម្ម៉ង់ដោយស្វ័យប្រវត្ត។',

    // Common Actions
    'action.signIn': 'ចូលគណនី',
    'action.signingIn': 'កំពុងចូលគណនី…',
    'action.signUp': 'ចុះឈ្មោះបង្កើតគណនី',
    'action.signingUp': 'កំពុងបង្កើតគណនី…',
    'action.continue': 'បន្តទៅមុខ',
    'action.verify': 'ផ្ទៀងផ្ទាត់',
    'action.verifying': 'កំពុងផ្ទៀងផ្ទាត់…',
    'action.resendCode': 'ផ្ញើលេខកូដម្តងទៀត',
    'action.sendCode': 'ផ្ញើលេខកូដផ្ទៀងផ្ទាត់',
    'action.sendingCode': 'កំពុងផ្ញើលេខកូដ…',
    'action.resetPassword': 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ',
    'action.resettingPassword': 'កំពុងផ្លាស់ប្តូរពាក្យសម្ងាត់…',

    // Shorthand Auth Field Keys
    'auth.email': 'អ៊ីមែល',
    'auth.phone': 'លេខទូរស័ព្ទ',
    'auth.emailPlaceholder': 'ឈ្មោះអ្នកប្រើ@email.com',
    'auth.phonePlaceholder': '012 345 678',
    'auth.password': 'ពាក្យសម្ងាត់',
    'auth.passwordPlaceholder': 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',

    // Login Page
    'login.title.merchant': 'ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងអាជីវកម្ម',
    'login.subtitle.merchant': 'សូមបញ្ចូលគណនីរបស់អ្នកដើម្បីចូលគ្រប់គ្រងហាង និងការលក់',
    'login.title.customer': 'ចូលទៅកាន់ហាង {storeName}',
    'login.subtitle.customer': 'ចូលគណនីដើម្បីបញ្ចប់ការទិញទំនិញ និងពិនិត្យការកុម្ម៉ង់',
    'login.title.marketplace': 'ចូលទៅកាន់ផ្សារ Rentify',
    'login.subtitle.marketplace': 'បន្តការទិញទំនិញ និងតាមដានកញ្ចប់ទំនិញរបស់អ្នក',
    'login.title.default': 'សូមស្វាគមន៍ការត្រឡប់មកវិញ',
    'login.subtitle.default': 'សូមចូលគណនីដើម្បីបន្ត',
    'login.label.contact': 'លេខទូរស័ព្ទ ឬ អ៊ីមែល',
    'login.placeholder.email': 'ឈ្មោះអ្នកប្រើ@email.com',
    'login.placeholder.phone': '012 345 678',
    'login.tab.phone': 'លេខទូរស័ព្ទ',
    'login.tab.email': 'អ៊ីមែល',
    'login.label.password': 'ពាក្យសម្ងាត់',
    'login.placeholder.password': 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',
    'login.forgotPassword': 'ភ្លេចពាក្យសម្ងាត់?',
    'login.rememberMe': 'ចងចាំឧបករណ៍នេះរយៈពេល ៣០ ថ្ងៃ',
    'login.noAccount': 'មិនទាន់មានគណនីមែនទេ?',
    'login.createAccount': 'ចុះឈ្មោះគណនីថ្មី',
    'login.securityFootnote': 'ការពារដោយប្រព័ន្ធអ៊ិនគ្រីប 256-bit • អនុលោមតាម PCI DSS',
    'login.continueTelegram': 'បន្តជាមួយ Telegram',
    'login.orContinueWith': 'ឬចូលដោយអ៊ីមែល ឬលេខទូរស័ព្ទ',
    'login.verifyNow': 'ផ្ទៀងផ្ទាត់ឥឡូវនេះ',

    // Sign Up Page
    'signup.title.merchant': 'បង្កើតគណនីលក់លើ Rentify',
    'signup.subtitle.merchant': 'បង្កើតហាងអនឡាញ គ្រប់គ្រងស្តុក និងទទួលការទូទាត់ KHQR ភ្លាមៗ',
    'signup.title.customer': 'បង្កើតគណនីទិញទំនិញ',
    'signup.subtitle.customer': 'ទិញទំនិញកាន់តែលឿន និងតាមដានការកុម្ម៉ង់របស់អ្នកយ៉ាងងាយស្រួល',
    'signup.title.marketplace': 'ចូលរួមជាមួយផ្សារ Rentify',
    'signup.subtitle.marketplace': 'ស្វែងរកទំនិញគុណភាពខ្ពស់ពីហាងនានានៅកម្ពុជា',
    'signup.label.name': 'ឈ្មោះពេញ',
    'signup.placeholder.name': 'ឧទាហរណ៍៖ ចាន់ សុខា',
    'signup.label.confirmPassword': 'បញ្ជាក់ពាក្យសម្ងាត់',
    'signup.placeholder.confirmPassword': 'បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត',
    'signup.passwordStrength': 'កម្រិតសុវត្ថិភាពពាក្យសម្ងាត់',
    'signup.strength.weak': 'ខ្សោយ',
    'signup.strength.fair': 'មធ្យម',
    'signup.strength.good': 'ល្អ',
    'signup.strength.strong': 'ខ្លាំង',
    'signup.tip.length': 'យ៉ាងតិច ៨ តួអក្សរ',
    'signup.tip.uppercase': 'មានអក្សរធំយ៉ាងតិច ១',
    'signup.tip.number': 'មានលេខ ឬសញ្ញាពិសេសយ៉ាងតិច ១',
    'signup.telegramOptIn': 'ទទួលការជូនដំណឹងពីការកុម្ម៉ង់តាម Telegram',
    'signup.termsPrefix': 'តាមរយៈការចុះឈ្មោះ អ្នកយល់ព្រមតាម',
    'signup.termsOfService': 'លក្ខខណ្ឌប្រើប្រាស់',
    'signup.and': 'និង',
    'signup.privacyPolicy': 'គោលការណ៍ឯកជនភាព',
    'signup.terms': 'តាមរយៈការចុះឈ្មោះ អ្នកយល់ព្រមតាមលក្ខខណ្ឌប្រើប្រាស់ និងគោលការណ៍ឯកជនភាពរបស់យើង។',
    'signup.hasAccount': 'មានគណនីរួចហើយមែនទេ?',
    'signup.passwordMatchSuccess': 'ពាក្យសម្ងាត់ត្រូវគ្នា',
    'signup.passwordMatchError': 'ពាក្យសម្ងាត់ទាំងពីរមិនត្រូវគ្នាទេ',

    // Verification & OTP
    'verify.title': 'បញ្ចូលលេខកូដផ្ទៀងផ្ទាត់',
    'verify.subtitle': 'យើងបានផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់ {destination}',
    'verify.didNotReceive': 'មិនទាន់ទទួលបានលេខកូដមែនទេ?',
    'verify.resendIn': 'អាចផ្ញើឡើងវិញក្នុងរយៈពេល {seconds}វិនាទី',
    'verify.telegramVerify': 'ផ្ទៀងផ្ទាត់ភ្លាមៗតាម Telegram Bot',
    'verify.changeContact': 'ប្តូរលេខទូរស័ព្ទ ឬអ៊ីមែល',
    'action.sendRecoveryCode': 'ផ្ញើលេខកូដសង្គ្រោះ',
    'action.updatePassword': 'ផ្លាស់ប្តូរពាក្យសម្ងាត់',
    'action.requestNewLink': 'ស្នើសុំតំណភ្ជាប់ថ្មី',
    'action.signInNow': 'ចូលគណនីឥឡូវនេះ',

    // Forgot & Reset Password
    'forgot.title': 'ភ្លេចពាក្យសម្ងាត់របស់អ្នកមែនទេ?',
    'forgot.subtitle': 'បញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែលដែលបានចុះឈ្មោះ ដើម្បីទទួលការណែនាំផ្លាស់ប្តូរ។',
    'forgot.instruction': 'យើងនឹងផ្ញើលេខកូដផ្ទៀងផ្ទាត់ដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មី។',
    'forgot.successTitleEmail': 'សូមពិនិត្យប្រអប់សំបុត្ររបស់អ្នក',
    'forgot.successTitlePhone': 'សូមពិនិត្យទូរស័ព្ទរបស់អ្នក',
    'forgot.successSubtitle': 'យើងបានផ្ញើការណែនាំ និងលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់ {contact}។',
    'forgot.enterCode': 'បញ្ចូលលេខកូដផ្ទៀងផ្ទាត់',
    'forgot.tryAnother': 'ប្រើលេខទូរស័ព្ទ ឬអ៊ីមែលផ្សេង',
    'reset.title': 'កំណត់ពាក្យសម្ងាត់ថ្មី',
    'reset.subtitle': 'សូមបញ្ចូលពាក្យសម្ងាត់ថ្មីយ៉ាងតិច ៨ តួអក្សរ ដោយរួមបញ្ចូលទាំងអក្សរ និងលេខ។',
    'reset.label.newPassword': 'ពាក្យសម្ងាត់ថ្មី',
    'reset.success': 'ពាក្យសម្ងាត់របស់អ្នកត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ។',
    'reset.invalidTokenTitle': 'តំណភ្ជាប់មិនត្រឹមត្រូវ ឬផុតកំណត់',
    'reset.invalidTokenMessage': 'តំណភ្ជាប់ ឬលេខកូដផ្ទៀងផ្ទាត់នេះបានផុតកំណត់ ឬមិនត្រឹមត្រូវទេ។ សូមស្នើសុំតំណភ្ជាប់ថ្មី។',
    'reset.countdownRedirect': 'កំពុងបញ្ជូនទៅការចូលគណនីក្នុងរយៈពេល {seconds}វិនាទី…',

    // Validation & Errors
    'error.invalidContact': 'សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទដែលត្រឹមត្រូវ',
    'error.invalidPhone': 'សូមបញ្ចូលលេខទូរស័ព្ទកម្ពុជាដែលត្រឹមត្រូវ (ឧទាហរណ៍៖ 012 345 678)',
    'error.invalidEmail': 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលដែលត្រឹមត្រូវ',
    'error.passwordRequired': 'សូមបញ្ចូលពាក្យសម្ងាត់',
    'error.passwordMatch': 'ពាក្យសម្ងាត់ទាំងពីរមិនត្រូវគ្នាទេ',
    'error.otpRequired': 'សូមបញ្ចូលលេខកូដសម្ងាត់ ៦ ខ្ទង់',
    'error.phoneNotFound': 'មិនមានគណនីដែលប្រើលេខទូរស័ព្ទនេះទេ។ សូមពិនិត្យ ឬចុះឈ្មោះគណនីថ្មី។',
    'error.emailNotFound': 'មិនមានគណនីដែលប្រើអ៊ីមែលនេះទេ។ សូមពិនិត្យ ឬចុះឈ្មោះគណនីថ្មី។',
    'error.incorrectPassword': 'ពាក្យសម្ងាត់ ឬព័ត៌មានគណនីមិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្តងទៀត។',
    'error.invalidCredentials': 'លេខទូរស័ព្ទ/អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។',
    'error.accountDisabled': 'គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ។ សូមទាក់ទងផ្នែកបម្រើអតិថិជន។',
    'error.general': 'មានបញ្ហាមិនរំពឹងទុកមួយបានកើតឡើង។ សូមព្យាយាមម្តងទៀត។',

    // Security & Footer
    'footer.security': 'ប្រព័ន្ធសុវត្ថិភាពអ៊ិនគ្រីប 256-bit • គាំទ្រ KHQR បាគង • អនុលោមតាម PCI DSS',
    'footer.copyright': '© ២០២៦ Rentify. រក្សាសិទ្ធិគ្រប់យ៉ាង។',
  },
};

const AuthLanguageContext = createContext<AuthLanguageContextValue | undefined>(undefined);

export const AuthLanguageProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rentify_auth_lang');
      if (saved === 'KH' || saved === 'EN') return saved;
      // Auto-detect Khmer browser preference
      if (typeof navigator !== 'undefined' && navigator.language && /^k[mh]/i.test(navigator.language)) {
        return 'KH';
      }
    }
    return 'EN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rentify_auth_lang', lang);
      document.documentElement.lang = lang === 'KH' ? 'km' : 'en';
      if (lang === 'KH') {
        document.body.classList.add('font-khmer');
      } else {
        document.body.classList.remove('font-khmer');
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'KH' : 'EN');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'KH' ? 'km' : 'en';
      if (language === 'KH') {
        document.body.classList.add('font-khmer');
      } else {
        document.body.classList.remove('font-khmer');
      }
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.EN;
    let template = dict[key] || translations.EN[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return template;
  };

  const value = useMemo(
    () => ({ language, isKhmer: language === 'KH', setLanguage, toggleLanguage, t }),
    [language]
  );

  return (
    <AuthLanguageContext.Provider value={value}>
      {children}
    </AuthLanguageContext.Provider>
  );
};

export const useAuthLanguage = (): AuthLanguageContextValue => {
  const ctx = useContext(AuthLanguageContext);
  if (!ctx) {
    throw new Error('useAuthLanguage must be used within an AuthLanguageProvider');
  }
  return ctx;
};
