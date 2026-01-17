/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#554AF0",
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    200: "#c7d2fe",
                    300: "#a5b4fc",
                    400: "#818cf8",
                    500: "#6366f1",
                    600: "#554AF0",
                    700: "#4338ca",
                    800: "#3730a3",
                    900: "#312e81",
                    950: "#1e1b4b",
                },
                "background-light": "#F3F4F6",
                "background-dark": "#111827",
                "card-light": "#FFFFFF",
                "card-dark": "#1F2937",
                "input-light": "#F9FAFB",
                "input-dark": "#374151",
                "text-light": "#111827",
                "text-dark": "#F9FAFB",
                "secondary-text-light": "#6B7280",
                "secondary-text-dark": "#9CA3AF",
                "accent-green": "#10B981",
                "accent-red": "#EF4444",
                "accent-blue": "#6366F1",
                "success": "#10B981",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                display: ["Inter", "sans-serif"],
                body: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.75rem",
                'xl': "1rem",
                '2xl': "1.5rem",
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
}
