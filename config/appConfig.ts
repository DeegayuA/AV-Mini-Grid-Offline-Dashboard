// src/config/appConfig.ts
import logo from "@/AV_logo.png"; // This is a StaticImageData object from next/image
import logoSvg from "@/av_logo.svg"; // This is also a StaticImageData object if imported similarly
import { useAppStore } from "@/stores/appStore";
// Plant and Application Configuration - These are now fetched from DB via appStore
// Import the hook to access app constants from the store

// Helper function to get app constants (use this in components)
export const useAppConstants = () => {
    const { appConstants, isLoadingAppConstants } = useAppStore();
    
    return {
        APP_NAME: appConstants.APP_NAME || "AV Mini Grid Dashboard", // Fallback
        APP_AUTHOR: appConstants.APP_AUTHOR || "Alta Vision", // Fallback
        PLANT_NAME: appConstants.PLANT_NAME || "Sample Plant", // Fallback
        PLANT_LOCATION: appConstants.PLANT_LOCATION || "Sample Location", // Fallback
        PLANT_CAPACITY: appConstants.PLANT_CAPACITY || "1 MW", // Fallback
        isLoading: isLoadingAppConstants
    };
};

// For server-side or static contexts where hooks can't be used, keep fallbacks
export const APP_NAME_FALLBACK = "AV Mini Grid Dashboard";
export const APP_AUTHOR_FALLBACK = "Alta Vision";
export const PLANT_NAME_FALLBACK = "Sample Plant";
export const PLANT_LOCATION_FALLBACK = "Sample Location";
export const PLANT_CAPACITY_FALLBACK = "1 MW";


// URLs - IMPORTANT: For SEO/OG tags, BASE_URL should be your production domain
export const APP_BASE_URL = "https://yourwebsite.com"; // Your actual production domain. NO TRAILING SLASH.
// For local development, you might use process.env.NEXT_PUBLIC_VERCEL_URL or http://localhost:3000
// For `og:image`, ensure it's an absolute URL.
// `logo.src` will be something like "/_next/static/media/AV_logo.xxxxxxxx.png"
export const APP_LOGO_PNG_SRC = logo.src;
export const APP_LOGO_PNG_WIDTH = logo.width;
export const APP_LOGO_PNG_HEIGHT = logo.height;
export const APP_LOGO_SVG_SRC = logoSvg.src; // If you plan to use SVG for OG (less common, PNG/JPG preferred)

export const APP_OG_IMAGE_URL = `${APP_BASE_URL}${APP_LOGO_PNG_SRC}`;
export const APP_URL = APP_BASE_URL; // Canonical URL for the app's homepage

// SEO and Display Metadata
export const APP_DEFAULT_TITLE = `${APP_NAME} | ${PLANT_NAME}`;
export const APP_TITLE_TEMPLATE = `%s | ${APP_NAME}`; // For Next.js metadata object to add page specific titles
export const APP_DESCRIPTION = `A web-based plant monitoring system for ${PLANT_NAME} at ${PLANT_LOCATION}. Real-time data visualization and control. Capacity: ${PLANT_CAPACITY}.`;
export const APP_KEYWORDS = `solar, mini-grid, ${PLANT_NAME}, ${PLANT_LOCATION}, monitoring, control, energy, management, real-time, data visualization`;
export const APP_FAVICON = logoSvg.src;
export const APP_APPLE_TOUCH_ICON = APP_LOGO_PNG_SRC; // Often reuse the main logo, or have a dedicated one

// Author and Copyright
export const APP_AUTHOR_URL = "https://www.altavision.com"; // Example: Corrected placeholder
export const APP_PUBLISHER = APP_AUTHOR; // Often the same as author
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_AUTHOR}. All rights reserved.`;
export const APP_COPYRIGHT_URL = `${APP_AUTHOR_URL}/copyright`; // Example path
export const APP_PRIVACY_POLICY_URL = `${APP_AUTHOR_URL}/privacy-policy`;
export const APP_TERMS_OF_SERVICE_URL = `${APP_AUTHOR_URL}/terms-of-service`;

// Theming (for PWA or mobile browser chrome)
export const APP_THEME_COLOR_LIGHT = "#FFFFFF";
export const APP_THEME_COLOR_DARK = "#000000"; // Or your dark theme primary bg
