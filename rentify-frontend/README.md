# Rentify Convention Guide

## Run locally

Use Node.js 18.20.4, then install the locked dependency set. This project uses
Nx 21, whose post-install step can loop on this Mac with Node 22.

```bash
PATH="/opt/homebrew/opt/node@18/bin:$PATH" npm ci --ignore-scripts
```

Start each frontend independently. These commands use Vite directly and avoid
the Nx native resolver, which can stall on some macOS installations:

```bash
npm run dev:auth                    # http://localhost:4300
npm run dev:marketing               # http://localhost:4200
npm run dev:merchant                # http://localhost:4400
npm run dev:ecommerce-template-1    # http://localhost:4700
npm run dev:ecommerce-template-2    # http://localhost:4600
```

**Author:** Hong Than Brathna  
**Creation Date:** December 23, 2024  
**Document Type:** Guidelines  
**Team:** Convention Guide  

## Objective
To establish a set of conventions and guidelines for consistent and high-quality code, design, and collaboration across the project. This ensures seamless integration between team members and maintains professional standards.

---

## General Principles
- **Consistency Over Preference:** Always prioritize team standards over individual preferences.
- **Readability is Key:** Write code and design elements that are easy to understand for others.
- **Comment Strategically:** Provide comments where necessary but avoid over-commenting.
- **Collaboration and Accountability:** Regularly review and update your work, and communicate proactively.

---

## Coding Conventions

### 1. Folder Structure
Organize folders clearly and logically. Use the following structure for a React project:

```
Rentify/
│
├── .nx/
├── .vscode/
│
├── apps/
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── utils/
│   │   │   └── app.tsx
│   │   ├── assets/
│   │   │   └── .gitkeep
│   │   ├── layouts/
│   │   │   └── main.tsx
│   │   └── styles.css
│   ├── templates/
│       ├── ecommerce/
│       │   └── ecommerce-template-1/
│       └── food/
│           └── food-template-1/
│
├── libs/
├── node_modules/
│
├── .editorconfig
├── .gitignore
├── .prettierignore
├── .prettierrc
├── .eslint.config.cjs
├── jest.config.ts
├── jest.preset.js
├── nx.json
├── package-lock.json
├── package.json
└── tsconfig.base.json
```
- **Files and Folders:** Use camelCase (e.g., `userProfile.js`, `productDetail`).
- **Components:** Use PascalCase for React components (e.g., `UserProfile`).
- **Variables:** Use camelCase for variables and functions (e.g., `fetchUserData`).
- **Constants:** Use UPPER_SNAKE_CASE for constants (e.g., `MAX_LIMIT`).

### 2. Guidelines for Usage
- **Install Dependencies:** `npm install`
- **Run the Application:**  
  - `nx serve <application-name>`  
  - Run Core-page (Homepage, Template Browse, Customization): `nx serve apps`
- **Run the Template:**  
  - `nx serve ecommerce-template-1`  
  - `nx serve food-template-1`
- **Build the Application:** `nx build <application-name>`
- **Add New Applications or Templates:**  
  Example:  
  `nx generate @nx/react:application food-template-2 --directory=apps/templates/food/food-template-2`

### 3. Code Formatting
- Use **Prettier** for consistent code formatting.
- **Indentation:** 2 spaces per level.
- **Line Length:** Limit to 80–100 characters.

### 4. React-Specific Conventions
- **Functional Components Only:** Avoid using class components.
- **Props:** Destructure props in the component declaration.
- **State Management:** Use React Context or Redux Toolkit for global state.
- **Hooks:** Place all hooks at the top of the component and follow the `use` prefix (e.g., `useFetchData`).

---

## Git Workflow

### Branch Naming
- `feature/<description>` for new features.
- `refactor/<description>` for changes.
- `bugfix/<description>` for bug fixes.
- `hotfix/<description>` for urgent fixes in production.

### Commits
- Write clear, concise commit messages.  
  Format:  
Examples:
- `feat: Add payment gateway integration`
- `fix: Correct product detail page layout`

### Pull Requests (PRs)
- Use descriptive titles and provide a summary of changes.
- Assign at least one reviewer.
- Resolve merge conflicts before requesting a review.

---

## Design Conventions

### 1. File Naming
- Name Figma files clearly with project and page names (e.g., `Ecommerce_Homepage_V1`).

### 2. Color and Typography
- Use a predefined design system.
- Maintain a central color palette and typography guidelines in a shared Figma file.  
Example:  
- **Primary Color:** `#FF5733`  
- **Secondary Color:** `#C70039`  
- **Fonts:** Use Roboto for body and Poppins for headings.

### 3. Components
- Design reusable components (e.g., buttons, cards) and organize them into Figma libraries.

### 4. Responsive Design
- Provide designs for desktop, tablet, and mobile views for all pages.

---

## Testing Conventions

### 1. Frontend Testing
- Use **Jest** and **React Testing Library** for unit and integration tests.
- Write test cases for all reusable components and key functionalities.

### 2. Backend Testing
- Use **Mocha/Chai** for API testing.
- Write tests for:
- Endpoint validation.
- Business logic.

---

## Collaboration Practices

### 1. Communication Tools
- Use Telegram group for daily communication.
- Use Notion workspace for task tracking and updates.

### 2. Meeting Guidelines
- Daily standups to discuss progress and blockers (max 15 minutes).
- Weekly sync to review completed tasks and plan for the next week.

### 3. Documentation
- Update the project document for any significant changes.
- Use Markdown for documentation in GitHub.

---

## Quality Assurance (QA)

- **Code Reviews:** Every PR must be reviewed by at least one other team member.
- **Design Reviews:** Ensure designs meet user requirements and follow conventions before handing them to developers.
- **Pre-Deployment Checks:** Run automated tests and conduct a manual review of critical paths before deployment.
