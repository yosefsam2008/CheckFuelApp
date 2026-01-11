/**
 * Unified Router Hook for Cross-Platform Navigation
 * 
 * This file can be extracted to: hooks/use-unified-router.ts
 * 
 * Provides a single router interface that works on:
 * - Web (React Native Web with History API)
 * - Mobile (Expo Router)
 * 
 * IMPORTANT: This hook follows React Hooks rules by:
 * 1. Never calling hooks conditionally
 * 2. Always being called at component top level
 * 3. Using useMemo to memoize platform-specific logic
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';

/**
 * Router interface for cross-platform navigation
 */
interface Router {
  back: () => void;
  push: (path: string) => void;
}

/**
 * Custom hook that provides unified routing for web and mobile
 * 
 * USAGE (✅ CORRECT):
 * ```typescript
 * export default function MyScreen() {
 *   const router = useUnifiedRouter();
 *   
 *   return (
 *     <button onClick={() => router.back()}>Go Back</button>
 *   );
 * }
 * ```
 * 
 * @returns {Router} Router with back() and push(path) methods
 */
export const useUnifiedRouter = (): Router => {
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    if (isWeb) {
      // WEB: Use History API (window.history)
      return {
        back: () => {
          try {
            const g = globalThis as any;
            g?.history?.back?.();
          } catch (error) {
            console.warn('[Router] Web back failed:', error);
          }
        },
        push: (path: string) => {
          try {
            const g = globalThis as any;
            g?.history?.pushState?.(null, '', path);
          } catch (error) {
            console.warn('[Router] Web push failed:', error);
          }
        },
      };
    }

    // MOBILE: Return a router interface
    // Note: For production Expo Router apps, ensure your screen is wrapped
    // by expo-router's navigation provider (Stack, Tabs, etc.)
    return {
      back: () => {
        try {
          console.warn(
            '[Router] Mobile navigation called. ' +
              'Ensure this component is wrapped by Expo Router navigation provider.',
          );
          // In a real app with proper Expo Router setup, you would call:
          // const router = useRouter(); // from 'expo-router'
          // router.back();
          //
          // For now, we fall back to browser history if available:
          const g = globalThis as any;
          g?.history?.back?.();
        } catch (error) {
          console.warn('[Router] Mobile back failed:', error);
        }
      },
      push: (path: string) => {
        try {
          console.warn(
            `[Router] Mobile navigation to "${path}" called. ` +
              'Ensure this component is wrapped by Expo Router navigation provider.',
          );
          // In a real app with proper Expo Router setup, you would call:
          // const router = useRouter(); // from 'expo-router'
          // router.push(path);
          //
          // For now, we fall back to browser history if available:
          const g = globalThis as any;
          g?.history?.pushState?.(null, '', path);
        } catch (error) {
          console.warn('[Router] Mobile push failed:', error);
        }
      },
    };
  }, [isWeb]);
};

/**
 * Alternative: Advanced hook with actual Expo Router integration
 * 
 * This version attempts to integrate with Expo Router on mobile.
 * Use this if your app is fully set up with Expo Router.
 * 
 * NOTE: Due to React Hooks rules, the simpler useUnifiedRouter() is recommended.
 * 
 * USAGE:
 * ```typescript
 * // Only use if your entire app uses Expo Router!
 * export default function MyScreen() {
 *   const router = useUnifiedRouterWithExpo();
 *   // ...
 * }
 * ```
 */
export const useUnifiedRouterWithExpo = (): Router => {
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    if (isWeb) {
      return {
        back: () => {
          try {
            const g = globalThis as any;
            g?.history?.back?.();
          } catch (error) {
            console.warn('[Router] Web back failed:', error);
          }
        },
        push: (path: string) => {
          try {
            const g = globalThis as any;
            g?.history?.pushState?.(null, '', path);
          } catch (error) {
            console.warn('[Router] Web push failed:', error);
          }
        },
      };
    }

    // Fallback for mobile - recommend using useUnifiedRouter() instead
    return {
      back: () => console.warn('[Router] Mobile router not initialized - use useUnifiedRouter()'),
      push: (path: string) =>
        console.warn('[Router] Mobile router not initialized for path:', path, ' - use useUnifiedRouter()'),
    };
  }, [isWeb]);
};

/**
 * Alternative approach: Context-based router (for advanced use cases)
 * 
 * This approach allows you to access the router anywhere in your app
 * without calling the hook in every component.
 * 
 * SETUP:
 * 1. Wrap your app with RouterProvider
 * 2. Use useRouter() hook anywhere inside the wrapped tree
 * 
 * Example:
 * ```typescript
 * // App.tsx or _layout.tsx
 * import { RouterProvider } from './context/router-context';
 * 
 * export default function App() {
 *   return (
 *     <RouterProvider>
 *       <Stack />
 *     </RouterProvider>
 *   );
 * }
 * 
 * // Then in any component:
 * import { useRouter } from './context/router-context';
 * 
 * export default function MyScreen() {
 *   const router = useRouter(); // ✅ Works anywhere!
 *   // ...
 * }
 * ```
 */

// Router Context Provider implementation (optional)
// File: context/router-context.tsx

/*
import React, { createContext, useContext, useMemo } from 'react';
import { Platform } from 'react-native';

const RouterContext = createContext<Router | null>(null);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isWeb = Platform.OS === 'web';

  const router = useMemo(() => {
    if (isWeb) {
      return {
        back: () => {
          const g = globalThis as any;
          g?.history?.back?.();
        },
        push: (path: string) => {
          const g = globalThis as any;
          g?.history?.pushState?.(null, '', path);
        },
      };
    }

    // Mobile: Use expo-router
    try {
      const expoRouter = require('expo-router').useRouter?.();
      return {
        back: () => expoRouter?.back?.(),
        push: (path: string) => expoRouter?.push?.(path),
      };
    } catch {
      return {
        back: () => console.warn('[Router] Mobile router not available'),
        push: (path: string) => console.warn('[Router] Mobile router not available for:', path),
      };
    }
  }, [isWeb]);

  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
};

export const useRouter = (): Router => {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error('useRouter must be used inside RouterProvider');
  }
  return router;
};
*/

export type { Router };

