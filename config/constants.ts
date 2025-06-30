// config/constants.ts

import logo from "@/AV_logo.png"; // Ensure these paths are correct if this file is in a different dir
import logo2 from "@/av_logo.svg";

export const WS_PORT = 2001;
export const WS_API_PATH = "/api/opcua"; // This is your existing API route
export const WS_URL = (() => {
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) { // Better check for local/dev
            // For local development, connect to hostname:port
            return `${protocol}//${hostname}:${WS_PORT}`;
        } else {
            // For deployed environments (like Vercel), connect to hostname/path (standard port 443 for wss)
            return `${protocol}//${hostname}${WS_API_PATH}`;
        }
    }
    // Fallback for server-side or non-browser environments (local default)
    return `ws://localhost:${WS_PORT}`;
})();
// OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE are now in DB, fetched by OnboardingContext/appStore if needed.
// PLANT_NAME, PLANT_LOCATION, PLANT_TYPE, PLANT_CAPACITY, PLANT_CAPACITY_WATTS are now in DB.
// APP_NAME, APP_DESCRIPTION, APP_AUTHOR etc. are now in DB (or should be).

export const VERSION = "- Release v2025.06.26 • 16:30 (GMT+5:30)"; // Build-specific, keep here.

// Static assets and client-specific keys remain here.
export const APP_LOGO = logo;
export const APP_LOGO2 = logo2;
export const APP_FAVICON = "/favicon.ico";

// URLs that might be configurable but often are part of deployment/build.
// If these need to be highly dynamic, they can also move to DB. For now, keeping some.
// export const APP_BASE_URL = "https://av-mini-grid-offline-dashboard.vercel.app"; // Example, could be DB
// export const APP_URL = "https://yourwebsite.com"; // Example, could be DB
// export const APP_KEYWORDS = "solar, monitoring, control, energy, management"; // Example, could be DB
// export const APP_AUTHOR_URL = "https://yourwebsite.com"; // Example, could be DB
// export const APP_COPYRIGHT = "© 2025 Synergy Power. All rights reserved."; // Example, could be DB
// export const APP_COPYRIGHT_URL = "https://yourwebsite.com/copyright"; // Example, could be DB
// export const APP_PRIVACY_POLICY = "https://yourwebsite.com/privacy-policy"; // Example, could be DB
// export const APP_TERMS_OF_SERVICE = "https://yourwebsite.com/terms-of-service"; // Example, could be DB


// Potentially in a shared types file or at the top of PowerTimelineGraph.tsx
export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type TimeScale = 'day' | '6h' | '1h' | '30m' | '5m' | '1m';


export const USER = "viewer";
export const LOCAL_STORAGE_KEY_PREFIX = "ranna_2mw_";

export const AVAILABLE_SLD_LAYOUT_IDS: string[] = [
  'ranna_main_sld',
  'Ranna_PLC',
  'PV_Array01',
  'PV_Array02',
  // PV Arrays 3 to 18
  'PV_Array03',
  'PV_Array04',
  'PV_Array05',
  'PV_Array06',
  'PV_Array07',
  'PV_Array08',
  'PV_Array09',
  'PV_Array10',
  'PV_Array11',
  'PV_Array12',
  'PV_Array13',
  'PV_Array14',
  'PV_Array15',
  'PV_Array16',
  'PV_Array17',
  'PV_Array18',
  // Weather and Misc
  'weather',
  'misc1',
  'misc2',
  'misc3',
  'Power_Analyser1',
  'Power_Analyser2',
  'MiCom_Relay',
  'empty_template',
'test_data_nodes_layout',
];

// Keys for API Monitoring feature
export const API_MONITORING_CONFIG_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringConfigs_v1`;
export const API_MONITORING_DOWNTIME_KEY = `${LOCAL_STORAGE_KEY_PREFIX}apiMonitoringDowntimes_v1`;

