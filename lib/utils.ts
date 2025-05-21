import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Basic sound playing function
export const playSound = (url: string, volume: number = 1): Promise<void> => {
  return new Promise((resolve, reject) => {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined' || !window.Audio) {
          // console.warn("Audio playback not supported or not in browser environment.");
          // Don't reject here, just resolve silently if SSR or no Audio
          // Or reject if you want explicit error handling upstream
          return resolve();
          // return reject(new Error("Audio not supported"));
      }
      try {
          const audio = new Audio(url);
          audio.volume = Math.max(0, Math.min(1, volume)); // Clamp volume

          // Play the sound. play() returns a Promise.
          audio.play()
              .then(() => {
                  // Resolve the Promise once playback has begun
                  resolve();
              })
              .catch(err => {
                  // Don't necessarily reject the *outer* promise for play errors,
                  // as we still want the toast to show. Log the error.
                  console.error(`Error playing sound ${url}:`, err);
                  // Resolve anyway, or reject if strict error handling is needed upstream
                  resolve();
                  // reject(err); // Use reject if the caller needs to know playback failed
              });

          // Optional: More robust error handling for loading issues
          audio.onerror = (e) => {
              console.error(`Audio loading/playback error for ${url}:`, e);
              // Potentially reject here if loading fails completely, though play().catch() often covers this.
              // resolve(); // Ensure we resolve even if there's a later error
          };

      } catch (error) {
          console.error(`Failed to create or play audio ${url}:`, error);
          // Resolve even on creation error to not block the toast
          resolve();
          // reject(error); // Use reject if the caller needs to know
      }
  });
};

// Specific sound functions (optional, makes calling easier)
export const playSuccessSound = () => playSound('/sounds/success.mp3', 0.4); 
export const playErrorSound = () => playSound('/sounds/error.mp3', 0.6);
export const playWarningSound = () => playSound('/sounds/warning.mp3', 0.5);
export const playInfoSound = () => playSound('/sounds/info.mp3', 0.3);


// lib/utils.ts (example - you might use a library like date-fns for more robust formatting)
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30.44); // Average days in month

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 5) return `${diffWeeks}w ago`; // Up to 4 weeks
    if (diffMonths < 12) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // "Mar 15"
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); // "Mar 15, 2023"
}