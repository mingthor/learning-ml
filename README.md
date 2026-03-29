# ML Coding Interview with Jeff Dean

This application is a specialized ML coding interview simulator. It features a persona of Jeff Dean (Principal ML Engineer) who conducts a rigorous, academic-style interview on various machine learning topics.

## Features
- **Jeff Dean Persona:** Academic, rigorous, and professional feedback.
- **Interactive Workspace:** Real-time Python code editor with syntax highlighting.
- **LaTeX Math Support:** Mathematical expressions rendered in chat.
- **Dynamic Questions:** Randomly selected ML challenges (e.g., Multi-Head Attention, Batch Norm).

---

## Local Development & Testing

To run this application on your local machine, follow these steps:

### 1. Prerequisites
- **Node.js:** Version 18 or higher.
- **npm:** Typically bundled with Node.js.

### 2. Setup
1.  **Clone the project:**
    ```bash
    git clone <your-repo-url>
    cd <project-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### 3. Running the App
- **Development Mode:**
  ```bash
  npm run dev
  ```
  The app will be available at `http://localhost:3000`.

- **Linting:**
  ```bash
  npm run lint
  ```

---

## Production Build & Deployment

### 1. Build for Production
To create an optimized production build:
```bash
npm run build
```
This will generate a `dist/` folder containing the static assets.

### 2. Preview Production Build
To test the production build locally:
```bash
npm run preview
```

### 3. Deployment Options
- **AI Studio Build:** Click the **Deploy** button in the AI Studio interface.
- **Static Hosting:** Deploy the `dist/` folder to Vercel, Netlify, or GitHub Pages.
- **Docker:** Use a standard Nginx or Node.js image to serve the `dist/` folder.

---

## Project Structure
- `src/App.tsx`: Main application logic and UI.
- `src/questions.json`: List of interview questions and initial code boilerplates.
- `vite.config.ts`: Vite configuration for environment variables and build settings.
- `index.css`: Global styles using Tailwind CSS.

---

## Troubleshooting
- **Build Errors:** Ensure all dependencies are installed with `npm install`.
