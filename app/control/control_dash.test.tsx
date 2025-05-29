import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedDashboardPage from './control_dash'; // The main page component
import { useCurrentUser, useAppStore } from '@/stores/appStore';
import { UserRole } from '@/types/auth';
import { toast } from 'sonner';
import * as idbStore from '@/lib/idb-store';
import * as constants from '@/config/constants';
import * as appConfig from '@/config/appConfig';

// --- Mocks ---

// localStorage Mock
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// window.location.reload Mock
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { reload: jest.fn() },
});

// URL.createObjectURL and URL.revokeObjectURL Mocks
window.URL.createObjectURL = jest.fn(() => 'mock-url');
window.URL.revokeObjectURL = jest.fn();

// sonner (toast) Mock
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  },
}));

// next/navigation Mocks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/control/control_dashboard', // Example path
}));

// next-themes Mock
jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    setTheme: jest.fn(),
  }),
}));

// @/stores/appStore Mocks
jest.mock('@/stores/appStore', () => ({
  useCurrentUser: jest.fn(),
  useAppStore: jest.fn(),
  useIsEditMode: jest.fn(() => false), // Default mock
}));
const mockLogoutUser = jest.fn();
const mockSetIsEditMode = jest.fn();

// lib/idb-store Mocks
jest.mock('@/lib/idb-store', () => ({
  getOnboardingData: jest.fn(),
  saveOnboardingData: jest.fn(),
  clearOnboardingData: jest.fn(),
  initDB: jest.fn().mockResolvedValue(undefined), // from control_dash
  ensureAppConfigIsSaved: jest.fn(), // from control_dash
}));


// Config constants Mocks (ensure these align with actual usage in component)
jest.mock('@/config/constants', () => ({
  ...jest.requireActual('@/config/constants'), // Import and retain default behavior for unmocked parts
  VERSION: '1.0.0-test',
  PLANT_NAME: 'Test Plant',
  USER_DASHBOARD_CONFIG_KEY: 'userDashboardLayout_Test_Plant_v2_control_dashboard',
  PAGE_SLUG: 'control_dashboard', // Used in exportCurrentLayout filename logic
  APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT: [
    'app-storage', 
    'user', 
    'userDashboardLayout_Test_Plant_v2_control_dashboard', // needs to match the key used
    'dashboardSoundEnabled'
  ],
  EXPECTED_BACKUP_SCHEMA_VERSION: "1.0.0",
  AVAILABLE_SLD_LAYOUT_IDS: ['default_sld'],
  WS_URL: 'ws://localhost:1234', // Add any other constants used
}));

jest.mock('@/config/appConfig', () => ({
  ...jest.requireActual('@/config/appConfig'),
  APP_NAME: 'TestApp',
}));

// Mock child components to simplify testing
jest.mock('@/app/DashboardData/PlcConnectionStatus', () => () => <div data-testid="plc-status-mock"></div>);
jest.mock('@/app/DashboardData/WebSocketStatus', () => () => <div data-testid="ws-status-mock"></div>);
jest.mock('@/app/DashboardData/SoundToggle', () => () => <div data-testid="sound-toggle-mock"></div>);
jest.mock('@/app/DashboardData/ThemeToggle', () => () => <div data-testid="theme-toggle-mock"></div>);
jest.mock('@/app/circuit/sld/SLDWidget', () => () => <div data-testid="sld-widget-mock"></div>);
jest.mock('./PowerTimelineGraph', () => () => <div data-testid="power-timeline-graph-mock"></div>);
jest.mock('@/components/DashboardItemConfigurator', () => () => <div data-testid="item-configurator-mock"></div>);
jest.mock('./PowerTimelineGraphConfigurator', () => () => <div data-testid="graph-configurator-mock"></div>);
jest.mock('@/app/DashboardData/DashboardSection', () => ({ items }: { items: any[] }) => <div data-testid="dashboard-section-mock">{items.length} items</div>);


// Global document.createElement mock for specific 'a' tag scenario
const actualCreateElement = document.createElement;
let mockLink: HTMLAnchorElement;

describe('UnifiedDashboardPage - Import/Export Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();

    // Default user to admin for most tests
    (useCurrentUser as jest.Mock).mockReturnValue({ 
        role: UserRole.ADMIN, 
        email: 'admin@example.com' 
    });
    (useAppStore as jest.Mock).mockImplementation((selector: any) => {
        if (selector.name === 'logout') return mockLogoutUser;
        if (selector.toString().includes('isEditMode')) return false; // Default for isEditMode from useAppStore
        if (selector.toString().includes('toggleEditMode')) return mockSetIsEditMode; // Default for toggleEditMode from useAppStore
        if (selector.name === 'bound logoutUser') return mockLogoutUser; // For the direct selector
        if (selector.name === 'isEditMode') return false;
        if (selector.name === 'toggleEditMode') return mockSetIsEditMode;
        return jest.fn()
    });
    (useAppStore as any).persist = {
        hasHydrated: jest.fn(() => true), // Ensure store is hydrated
        rehydrate: jest.fn(),
      };


    // Mock for the download link
    mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      setAttribute: jest.fn(), // if setAttribute is used
    } as unknown as HTMLAnchorElement;
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockLink;
      }
      return actualCreateElement.call(document, tagName);
    });
    jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
    jest.spyOn(document.body, 'removeChild').mockImplementation(jest.fn());

  });

  // --- Test Suites will go here ---

  describe('Export Functionality', () => {
    it('should export current layout correctly', async () => {
      const mockLayoutData = { setting1: 'value1', setting2: 'value2' };
      localStorageMock.setItem(constants.USER_DASHBOARD_CONFIG_KEY, JSON.stringify(mockLayoutData));
      
      render(<UnifiedDashboardPage />);
      
      const exportButton = await screen.findByTitle('Export Data');
      fireEvent.click(exportButton);
      
      const exportCurrentLayoutButton = await screen.findByText('Export Current Layout');
      fireEvent.click(exportCurrentLayoutButton);

      await waitFor(() => {
        expect(mockLink.download).toBe('control_dashboard_current_layout.json');
        expect(JSON.parse(mockLink.href.replace('blob:', ''))).toEqual( // Simplified check for blob content
          expect.objectContaining({
            layoutName: `current_layout_${constants.PLANT_NAME.replace(/\s+/g, '_')}_${constants.PAGE_SLUG}`,
            data: mockLayoutData,
          })
        );
        expect(mockLink.click).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Export Successful", expect.anything());
      });
    });

    it('should show info toast if no current layout to export', async () => {
        render(<UnifiedDashboardPage />);
        const exportButton = await screen.findByTitle('Export Data');
        fireEvent.click(exportButton);
        const exportCurrentLayoutButton = await screen.findByText('Export Current Layout');
        fireEvent.click(exportCurrentLayoutButton);

        await waitFor(() => {
            expect(toast.info).toHaveBeenCalledWith("No current layout to export.");
        });
    });

    it('should export all layouts (backup) correctly', async () => {
        const mockDashboardLayout = { dashboard: 'data' };
        const mockOnboardingData = { setupComplete: true };
        const mockLocalStorageData = {
          'app-storage': JSON.stringify({ someAppSetting: 'true' }),
          'user': JSON.stringify({ name: 'Admin User' }),
          [constants.USER_DASHBOARD_CONFIG_KEY]: JSON.stringify(mockDashboardLayout),
          'dashboardSoundEnabled': 'true',
          'theme': 'dark',
          'react-flow-custom': JSON.stringify({ flow: 'data' }),
        };
  
        Object.entries(mockLocalStorageData).forEach(([key, value]) => {
          localStorageMock.setItem(key, value);
        });
        (idbStore.getOnboardingData as jest.Mock).mockResolvedValue(mockOnboardingData);
  
        render(<UnifiedDashboardPage />);
        const exportButton = await screen.findByTitle('Export Data');
        fireEvent.click(exportButton);
        const exportAllButton = await screen.findByText('Export All Layouts (Backup)');
        fireEvent.click(exportAllButton);
  
        await waitFor(() => {
          expect(toast.info).toHaveBeenCalledWith("Preparing full backup export...", expect.anything());
        });
        
        await waitFor(() => {
            expect(mockLink.download).toBe('full_backup_control_dashboard.json');
            const exportedData = JSON.parse(mockLink.href.replace('blob:', '')); // Simplified check
            
            expect(exportedData.backupSchemaVersion).toBe(constants.EXPECTED_BACKUP_SCHEMA_VERSION);
            expect(exportedData.application).toEqual({ name: appConfig.APP_NAME, version: constants.VERSION });
            expect(exportedData.plant).toEqual({ name: constants.PLANT_NAME, location: "", capacity: "" });
            expect(exportedData.userSettings.dashboardLayout).toEqual(mockDashboardLayout);
            expect(exportedData.browserStorage.indexedDB.onboardingData).toEqual(mockOnboardingData);
            expect(exportedData.sldLayouts).toEqual({}); // Mocked
            
            // Check localStorage items
            constants.APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.forEach(key => {
              if (mockLocalStorageData[key]) {
                expect(exportedData.browserStorage.localStorage[key]).toEqual(JSON.parse(mockLocalStorageData[key]));
              }
            });
            expect(exportedData.browserStorage.localStorage['theme']).toEqual('dark');
            expect(exportedData.browserStorage.localStorage['react-flow-custom']).toEqual({ flow: 'data' });
  
            expect(mockLink.click).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Export Successful", expect.anything());
            expect(toast.info).toHaveBeenCalledWith("SLD Layouts Not Included", expect.anything());
        }, { timeout: 2000 }); // Increased timeout for potentially slower CI
      });
  });

  // --- More test suites for Import and UI will be added here ---

});
