// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Bot, LifeBuoy, Map, Send, Settings2, SquareTerminal, ShieldQuestion, LucideIcon,
  Bell, Info, X, AlertTriangle, CheckCircle2, ChevronsUp, ChevronUp,
  PlusCircle, ChevronDown, Archive, Check, Loader2 
} from "lucide-react";
import { toast } from "sonner"; 

import { NavMain, NavMainItemProps } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar"; // Assuming this path is correct for your project
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AppLogo2 } from "@/app/onboarding/AppLogo";
import { APP_NAME } from "@/config/constants";
import { cn, formatRelativeTime } from "@/lib/utils"; 
import Link from "next/link";

// --- Type Definitions ---
export enum UserRole { ADMIN = 'admin', OPERATOR = 'operator', VIEWER = 'viewer' }
export interface User { 
  email: string; 
  role: UserRole; 
  name?: string; 
}
export type AlertCriticality = 'high' | 'medium' | 'low';
export type UpdateCriticality = 'minor' | 'major';

export interface NavAlertUpdateItemProps {
  id: string; name: string; type: 'alert' | 'update'; criticality: AlertCriticality | UpdateCriticality;
  details: string; timestamp: string; read?: boolean; acknowledged?: boolean; sectionId: "Alerts & Updates";
}
// --- End Type Definitions ---

// --- Initial Static Data ---
const initialStaticNavData = { 
  navMain: [ 
    { title: "Control Panel", url: "/control", icon: SquareTerminal, sectionId: "Control Panel", colorKey: "control" },
    { title: "Dashboard", url: "/dashboard", icon: Bot, sectionId: "Dashboard", colorKey: "dashboard" },
    { title: "Circuit Layouts", url: "/circuit", icon: BookOpen, sectionId: "Circuit Layouts", colorKey: "circuit" },
    { title: "System Settings", url: "/settings", icon: Settings2, sectionId: "Settings", colorKey: "settings" },
  ] as NavMainItemProps[],
  alertsUpdates: [
    { id: "alert-init-1", name: "Welcome to the Portal!", type: 'update' as 'update', criticality: 'minor' as 'minor', details: "Find important alerts and updates here.", timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString() },
    { id: "alert-init-2", name: "High Priority: System Check Needed", type: 'alert' as 'alert', criticality: 'high' as 'high', details: "A routine system integrity check is due. Please review logs.", timestamp: new Date().toISOString() },
    { id: "alert-init-3", name: "User Onboarding Guide Updated", type: 'update' as 'update', criticality: 'minor' as 'minor', details: "The user onboarding guide has been updated with new examples.", timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString() },
    { id: "alert-init-4", name: "Low: Scheduled Maintenance", type: 'alert' as 'alert', criticality: 'low' as 'low', details: "Scheduled maintenance tonight from 2 AM to 3 AM. Minor disruptions expected.", timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString() },
  ] as Omit<NavAlertUpdateItemProps, 'sectionId'>[],
  navSecondary: [ 
    { title: "Help Center", url: "/help", icon: ShieldQuestion, sectionId: "Help Center", colorKey: "help" },
    { title: "Privacy Policy", url: "/privacy-policy", icon: LifeBuoy, sectionId: "Privacy Policy", colorKey: "settings" },
    { title: "Terms of Service", url: "/terms-of-service", icon: Map, sectionId: "Terms of Service", colorKey: "dashboard" },
    { title: "Report Issue", url: "/report-issue", icon: Send, sectionId: "Report Issue", colorKey: "report" },
  ] as {title: string, url:string, icon: LucideIcon, sectionId:string, colorKey: string}[],
};
// --- End Initial Static Data ---

// --- Mock In-Memory Store ---
const useAppStore = () => {
    const [alertsUpdates, setAlertsUpdates] = React.useState<NavAlertUpdateItemProps[]>([]);
    const [currentUser, setCurrentUser] = React.useState<User | null>(null); 
    const [isLoadingData, setIsLoadingData] = React.useState(true); 
    const [storeInitialized, setStoreInitialized] = React.useState(false); 

    const initializeAlerts = React.useCallback(() => {
        setIsLoadingData(true); // Ensure loading state is true during initialization
        setTimeout(() => {
            const initialAlerts = initialStaticNavData.alertsUpdates.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                timestamp: item.timestamp || new Date().toISOString(),
                read: item.read === undefined ? Math.random() > 0.5 : item.read,
                sectionId: "Alerts & Updates" as "Alerts & Updates",
                ...(item.type === 'alert' && item.criticality === 'high' && { acknowledged: Math.random() > 0.7 })
            }));
            setAlertsUpdates(initialAlerts);
            setCurrentUser({ role: UserRole.ADMIN, email: 'admin@example.com', name: 'Administrator' });
            
            setIsLoadingData(false); 
            setStoreInitialized(true);
        }, 150); 
    }, []); 
    

    const markAlertAsRead = (id: string) => {
        setAlertsUpdates(prev => prev.map(item => item.id === id && !item.read ? { ...item, read: true } : item));
    };

    const acknowledgeSystemAlert = (id: string) => {
        let itemAcknowledged = false;
        setAlertsUpdates(prev => {
            return prev.map(item => {
                if (item.id === id && item.type === 'alert' && item.criticality === 'high' && !item.acknowledged) {
                    itemAcknowledged = true;
                    return { ...item, acknowledged: true };
                }
                return item;
            });
        });
        
        if (itemAcknowledged) {
            toast.success("Alert Acknowledged", { description: `Alert ${id.substring(0,6)} acknowledged.`});
            playSound('success');
        }
    };

    const addSystemAlertUpdate = (newItemData: Omit<NavAlertUpdateItemProps, 'id' | 'timestamp' | 'read' | 'sectionId' | 'acknowledged'>) => {
        const fullNewItem: NavAlertUpdateItemProps = { 
            ...newItemData, 
            id: crypto.randomUUID(), 
            timestamp: new Date().toISOString(), 
            read: false, 
            sectionId: "Alerts & Updates", 
            ...(newItemData.type === 'alert' && newItemData.criticality === 'high' && { acknowledged: false }) 
        };
        setAlertsUpdates(prev => [fullNewItem, ...prev]);
        toast.info(`New ${fullNewItem.type}: ${fullNewItem.name}`, { 
            description: `Criticality: ${fullNewItem.criticality}.`,
            duration: 7000,
        });
        playSound(fullNewItem.type === 'alert' && (fullNewItem.criticality === 'high' || fullNewItem.criticality === 'medium') ? 'warning' : 'info');
    };
    
    const playSound = (type: 'success' | 'error' | 'warning' | 'info') => {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          const baseVolume = 0.05; 
          const frequencies = { success: 600, info: 440, warning: 300, error: 200 };
          const types = { success: 'sine', info: 'sine', warning: 'square', error: 'sawtooth' };
          
          gainNode.gain.setValueAtTime(baseVolume * (type === 'error' ? 1.5 : 1), audioContext.currentTime);
          oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
          oscillator.type = types[type] as OscillatorType;
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + (type === 'success' || type === 'info' ? 0.15 : 0.25));
        } catch (err) { console.warn("Error playing sound:", err); }
      } else { console.log(`Mock playing sound: ${type}`); }
    };

    return {
        alertsUpdates, currentUser, isLoadingData, initializeAlerts,
        markAlertAsRead, acknowledgeSystemAlert, addSystemAlertUpdate, playSound,
        _storeInitialized: storeInitialized 
    };
};
// --- End Mock In-Memory Store ---

export interface ActiveAccents { [key: string]: string; default: string; }
const activeAccents: ActiveAccents = { 
    dashboard: "text-sky-600 dark:text-sky-400 border-sky-500 bg-sky-100 dark:bg-sky-900/50 bg-sky-500", control: "text-indigo-600 dark:text-indigo-400 border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 bg-indigo-500", circuit: "text-purple-600 dark:text-purple-400 border-purple-500 bg-purple-100 dark:bg-purple-900/50 bg-purple-500", settings: "text-pink-600 dark:text-pink-400 border-pink-500 bg-pink-100 dark:bg-pink-900/50 bg-pink-500", help: "text-teal-600 dark:text-teal-400 border-teal-500 bg-teal-100 dark:bg-teal-900/50 bg-teal-500", report: "text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-100 dark:bg-amber-900/50 bg-amber-500", "alert-high": "text-red-600 dark:text-red-400 border-red-500 bg-red-100 dark:bg-red-900/50 bg-red-500", "alert-medium": "text-yellow-600 dark:text-yellow-400 border-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 bg-yellow-500", "alert-low": "text-green-600 dark:text-green-400 border-green-500 bg-green-100 dark:bg-green-900/50 bg-green-500", "update-minor": "text-sky-600 dark:text-sky-400 border-sky-500 bg-sky-100 dark:bg-sky-900/50 bg-sky-500", "update-major": "text-blue-700 dark:text-blue-500 border-blue-600 bg-blue-100 dark:bg-blue-900/60 bg-blue-600", default: "text-primary dark:text-primary-dark border-primary bg-slate-100 dark:bg-slate-800 bg-slate-500"
};
interface NavChildItemForSectionLogic { title?: string; name?: string; url?: string; sectionId: string; id?: string; }
interface NavSecondaryItemProps { title: string; url: string; icon: LucideIcon; sectionId: string; colorKey: string;}

const getItemStyleProps = (item: Pick<NavAlertUpdateItemProps, 'type' | 'criticality'>): { icon: LucideIcon; colorKey: keyof typeof activeAccents; } => { 
  if (item.type === 'alert') { switch (item.criticality as AlertCriticality) { case 'high': return { icon: Bell, colorKey: 'alert-high' }; case 'medium': return { icon: AlertTriangle, colorKey: 'alert-medium' }; case 'low': return { icon: CheckCircle2, colorKey: 'alert-low' }; default: return { icon: Bell, colorKey: 'alert-medium' }; } } else { switch (item.criticality as UpdateCriticality) { case 'minor': return { icon: Info, colorKey: 'update-minor' };  case 'major': return { icon: ChevronsUp, colorKey: 'update-major' }; default: return { icon: Info, colorKey: 'update-minor' }; } }
};

const headerVariants = { collapsed: { height: 68, paddingTop: "0.5rem", paddingBottom: "0.5rem" }, expanded: { height: 88, paddingTop: "1rem", paddingBottom: "1rem" }};
const logoContainerVariants = { collapsed: { scale: 0.75, x: -2, y: 0 }, expanded: { scale: 1, x: 0, y: 0 }};
const appNameVariants = { collapsed: { opacity: 0, width: 0, marginLeft: 0, transition: { duration: 0.1 } }, expanded: { opacity: 1, width: "auto", marginLeft: "0.625rem", transition: { delay: 0.1, duration: 0.2 } }};

const AlertUpdatePopup: React.FC<{
  itemData: NavAlertUpdateItemProps | null; isOpen: boolean; onClose: () => void; onAcknowledge: (id: string) => void;
}> = ({ itemData, isOpen, onClose, onAcknowledge }) => { 
    if (!isOpen || !itemData) return null;
    const item = itemData; 
    const { icon: Icon, colorKey } = getItemStyleProps(item);
    const styleProps = activeAccents[colorKey] || activeAccents.default;
    const [textColor, , , popupIconBg, darkPopupIconBg, unreadDotBg] = styleProps.split(' ');
    const titleTextClasses = `${textColor} ${styleProps.split(' ')[1] || ''}`; 
    const iconBgClasses = `${popupIconBg} ${darkPopupIconBg}`;
    const handleAcknowledgeClick = () => { onAcknowledge(item.id); onClose(); };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-800 shadow-2xl w-full max-w-lg border-slate-200 dark:border-slate-700 p-0 data-[state=open]:animate-contentShow" onInteractOutside={onClose} >
        <motion.div initial={{height:0}} animate={{height:'0.375rem'}} className={cn("w-full rounded-t-xl", unreadDotBg)} />
        <DialogHeader className="p-6 pb-4">
            <div className="flex items-start space-x-4">
            <motion.div initial={{scale:0.7, opacity:0}} animate={{scale:1, opacity:1, transition:{delay:0.1, type:'spring', stiffness:260, damping:15}}} className={cn("p-3 rounded-full", iconBgClasses)} >
                <Icon size={28} className={cn(titleTextClasses, "w-7 h-7")} />
            </motion.div>
            <div>
                <DialogTitle className={cn("text-xl font-semibold tracking-tight", titleTextClasses)}>{item.name}</DialogTitle>
                {item.timestamp && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatRelativeTime(item.timestamp)} ({item.type} - {item.criticality})
                    {item.type === 'alert' && item.criticality === 'high' && item.acknowledged && <span className="ml-2 text-green-600 dark:text-green-400">(Acknowledged)</span>}
                </p>
                )}
            </div>
            </div>
        </DialogHeader>
        <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 p-1">
                <X size={20} /><span className="sr-only">Close</span>
            </Button>
        </DialogClose>
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0, transition:{delay:0.15}}} className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-primary/20 max-h-[40vh] overflow-y-auto" >
            {item.details}
        </motion.div>
        <DialogFooter className="px-6 py-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
           {item.type === 'alert' && item.criticality === 'high' && !item.acknowledged && (
             <Button onClick={handleAcknowledgeClick} className={cn( "text-white", styleProps.split(' ')[5], `hover:brightness-110 focus-visible:ring-${styleProps.split(' ')[0]?.split('-')[1] || 'primary'}-500` )} >
                <Check className="mr-2 h-4 w-4" /> Acknowledge
              </Button>
           )}
          <Button variant="outline" onClick={onClose}>Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddNewAlertDialog: React.FC<{
    isOpen: boolean; onClose: () => void;
    onAddItem: (item: Omit<NavAlertUpdateItemProps, 'id' | 'timestamp' | 'read' | 'sectionId' | 'acknowledged'>) => void;
}> = ({ isOpen, onClose, onAddItem }) => { 
    const [name, setName] = React.useState(""); const [details, setDetails] = React.useState(""); const [type, setType] = React.useState<'alert' | 'update'>('alert'); const [criticality, setCriticality] = React.useState<AlertCriticality | UpdateCriticality>('medium');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name || !details) { toast.error("Missing Fields", { description: "Name and details are required." }); return; } onAddItem({ name, details, type, criticality }); setName(""); setDetails(""); setType('alert'); setCriticality('medium'); onClose(); };
    const criticalitiesForType = type === 'alert' ? (['high', 'medium', 'low'] as const) : (['major', 'minor'] as const);
    React.useEffect(() => {  if (type === 'alert' && !(['high', 'medium', 'low'] as const).includes(criticality as AlertCriticality)) { setCriticality('medium'); } else if (type === 'update' && !(['major', 'minor'] as const).includes(criticality as UpdateCriticality)) { setCriticality('minor'); } }, [type, criticality]);
    return ( <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}> <DialogContent className="sm:max-w-[525px] data-[state=open]:animate-contentShow"> <DialogHeader> <DialogTitle className="text-lg font-semibold">Add New Alert or Update</DialogTitle> <DialogDescription>Fill in the details for the new item.</DialogDescription> </DialogHeader> <form onSubmit={handleSubmit} className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="name" className="text-right">Name</Label> <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g., System Maintenance Alert"/> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="details" className="text-right">Details</Label> <Textarea id="details" value={details} onChange={e => setDetails(e.target.value)} className="col-span-3 min-h-[80px]" placeholder="Provide detailed information..."/> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="type" className="text-right">Type</Label> <Select value={type} onValueChange={(value) => setType(value as 'alert' | 'update')}> <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="alert">Alert</SelectItem> <SelectItem value="update">Update</SelectItem> </SelectContent> </Select> </div> <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="criticality" className="text-right">Criticality</Label> <Select value={criticality} onValueChange={(value) => setCriticality(value as AlertCriticality | UpdateCriticality)}> <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger> <SelectContent> {criticalitiesForType.map(crit => ( <SelectItem key={crit} value={crit}>{crit.charAt(0).toUpperCase() + crit.slice(1)}</SelectItem> ))} </SelectContent> </Select> </div> <DialogFooter className="mt-2"> <Button type="button" variant="outline" onClick={onClose}>Cancel</Button> <Button type="submit">Add Item</Button> </DialogFooter> </form> </DialogContent> </Dialog> );
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar();
  const isCollapsed = !isMobile && sidebarState === "collapsed";
  
  const store = useAppStore(); 
  
  React.useEffect(() => {
    // FIX: Corrected condition to initialize the store.
    // Call initializeAlerts only if the store has not been initialized yet.
    if (!store._storeInitialized) {
      store.initializeAlerts();
    }
    // Dependencies: initializeAlerts is stable, _storeInitialized changes once from false to true.
  }, [store.initializeAlerts, store._storeInitialized]);


  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const [selectedAlertUpdate, setSelectedAlertUpdate] = React.useState<NavAlertUpdateItemProps | null>(null);
  const [showAllAlerts, setShowAllAlerts] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  const MAX_VISIBLE_ALERTS = 5;

  const handleAlertUpdateClick = React.useCallback((item: NavAlertUpdateItemProps) => {
    setSelectedAlertUpdate(item);
    setIsPopupOpen(true);
    if (!item.read && store.markAlertAsRead) {
        store.markAlertAsRead(item.id); 
    }
  }, [store]); 

  const sortedAlertsUpdates = React.useMemo(() => {
    // This check might be slightly redundant if the top-level check handles loading state,
    // but it's safe for ensuring sortedAlertsUpdates isn't computed prematurely.
    if (store.isLoadingData || !store._storeInitialized) return []; 
    return store.alertsUpdates ? [...store.alertsUpdates].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
  }, [store.alertsUpdates, store._storeInitialized, store.isLoadingData]);

  const visibleAlerts = showAllAlerts ? sortedAlertsUpdates : sortedAlertsUpdates.slice(0, MAX_VISIBLE_ALERTS);
  const unreadCount = React.useMemo(() => sortedAlertsUpdates.filter(item => !item.read).length, [sortedAlertsUpdates]);

  const activeSection = React.useMemo(() => {
    if (pathname === "/") return "Dashboard";
    const allNavItems: NavChildItemForSectionLogic[] = [ 
      ...initialStaticNavData.navMain.map(i => ({...i, sectionId: i.sectionId || i.title || ''})), 
      ...sortedAlertsUpdates.map(item => ({ id: item.id, name: item.name, sectionId: "Alerts & Updates", url: `#/alerts-updates/${item.id}`})), 
      ...initialStaticNavData.navSecondary.map(i => ({...i, sectionId: i.sectionId || i.title || ''})) 
    ];
    const findActive = (items: NavChildItemForSectionLogic[]) => { let bestMatch: NavChildItemForSectionLogic | undefined = undefined; let bestMatchLength = 0; for (const navItem of items) { if (!navItem.url) continue; if (pathname === navItem.url) return navItem.sectionId; if (pathname.startsWith(navItem.url) && navItem.url.length > 0 && (pathname.length === navItem.url.length || pathname[navItem.url.length] === '/')) { if (navItem.url.length > bestMatchLength) { bestMatch = navItem; bestMatchLength = navItem.url.length; } } } return bestMatch?.sectionId; };
    let currentSection = findActive(allNavItems);
    if (!currentSection) { const segments = pathname.split('/').filter(Boolean); if (segments.length > 0) { const firstSegment = segments[0].toLowerCase(); const mappedSectionItem = allNavItems.find( navItem => navItem.url?.substring(1).toLowerCase().startsWith(firstSegment) ); if (mappedSectionItem) return mappedSectionItem.sectionId; return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1); } } return currentSection || "Dashboard";
   }, [pathname, sortedAlertsUpdates]);
  
  // This is the main loading condition for the entire sidebar content.
  if (store.isLoadingData || !store._storeInitialized) { 
    return ( 
      <div className="contents"> 
        <Sidebar variant="inset" {...props} className="animate-pulse !bg-transparent dark:!bg-transparent pointer-events-none">
          <motion.div variants={headerVariants} animate={isCollapsed ? "collapsed" : "expanded"} className="flex items-center px-2.5 border-b border-slate-200/80 dark:border-slate-800 overflow-hidden"> <motion.div variants={logoContainerVariants} className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0" /> <motion.div variants={appNameVariants} className="flex-1"> <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div> <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div> </motion.div> </motion.div>
          <SidebarContent className="py-3 flex flex-col items-center justify-center"> <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> <p className="text-sm text-muted-foreground">Loading Portal Data...</p> </SidebarContent>
          <SidebarFooter className="p-2.5 border-t border-slate-200/80 dark:border-slate-800"> <div className={`h-12 rounded-md bg-slate-200 dark:bg-slate-700 ${isCollapsed ? 'w-10 !mx-auto h-10' : ''}`}></div> </SidebarFooter>
        </Sidebar>
      </div>
    );
  }
  
  const processedAlertsUpdatesWithStyles = visibleAlerts.map(itemBase => {
    const { icon, colorKey } = getItemStyleProps(itemBase);
    return { ...itemBase, icon, colorKey };
  });

  return (
    <div className="contents">
      <Sidebar variant="inset" {...props} className={cn("transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", isCollapsed ? "shadow-none" : "shadow-xl dark:shadow-slate-900/50")}>
        <motion.div variants={headerVariants} animate={isCollapsed ? "collapsed" : "expanded"} className="flex items-center border-b border-slate-200/80 dark:border-slate-800 overflow-hidden px-2.5">
             <SidebarMenu className="w-full"> <SidebarMenuItem className="hover:!bg-transparent dark:hover:!bg-transparent focus-visible:!ring-0"> <SidebarMenuButton size="lg" asChild className={cn("!bg-transparent !p-0 hover:!bg-slate-100/60 dark:hover:!bg-slate-800/60 focus-visible:!ring-2 focus-visible:!ring-sky-500 dark:focus-visible:!ring-sky-500 rounded-lg transition-colors", isCollapsed && "!justify-center !w-auto")}> <Link href="/" className="flex items-center w-full py-2 px-1.5"> <motion.div variants={logoContainerVariants} className="flex flex-shrink-0 aspect-square size-12 items-center justify-center rounded-lg p-0.5 border-2 border-slate-300/80 dark:border-slate-600" whileHover={{ scale: 1.08, rotate: 5, transition: { type: "spring", stiffness: 300, damping: 10 } }}> <AppLogo2 className="max-h-full max-w-full h-auto w-auto text-white" /> </motion.div> <motion.div variants={appNameVariants} className="grid flex-1 text-left text-sm leading-tight"> <span className="truncate font-bold text-md text-slate-800 dark:text-slate-100">{APP_NAME}</span> <span className="truncate text-xs text-slate-500 dark:text-slate-400">Energy Portal</span> </motion.div> </Link> </SidebarMenuButton> </SidebarMenuItem> </SidebarMenu>
        </motion.div>

        <SidebarContent className="py-2.5 transition-opacity duration-150 flex flex-col" style={{ opacity: isCollapsed ? 0.4 : 1 }}>
          <div className="flex-grow overflow-y-auto thin-scrollbar"> 
            <NavMain items={initialStaticNavData.navMain} activeSection={activeSection} activeAccents={activeAccents} />
            <div className="px-2.5 pt-3 pb-1">
                {!isCollapsed && (
                <div className="flex justify-between items-center mb-1">
                    <motion.h4 initial={{opacity:0, y: -5}} animate={{opacity:1, y:0}} transition={{delay:0.2}}
                        className="rounded-md px-2 py-1 text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center">
                        Alerts & Updates
                        {unreadCount > 0 && (
                            <motion.span initial={{scale:0}} animate={{scale:1}} transition={{delay:0.4, type:'spring', stiffness:200, damping:12}}
                                className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold size-4 rounded-full flex items-center justify-center">
                                {unreadCount}
                            </motion.span>
                        )}
                    </motion.h4>
                    {store.currentUser?.role === UserRole.ADMIN && (
                       <Button variant="ghost" size="icon" onClick={() => setIsAddDialogOpen(true)} className="h-7 w-7 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary">
                           <PlusCircle size={16}/> <span className="sr-only">Add new alert/update</span>
                       </Button>
                    )}
                </div>
                )}
                {isCollapsed && ( <div className="my-2 border-t border-border/20 dark:border-slate-700/50 w-3/4 mx-auto" /> )}
            </div>
            
            <SidebarMenu className="flex flex-col">
                <AnimatePresence initial={false}>
                {processedAlertsUpdatesWithStyles.map((item, index) => {
                    const { icon: Icon, colorKey } = item;
                    const itemStyleProps = activeAccents[colorKey as keyof typeof activeAccents] || activeAccents.default;
                    const [textColor, darkTextColorMaybe, , , , unreadDotBg] = itemStyleProps.split(' '); 
                    const iconTextClasses = `${textColor} ${darkTextColorMaybe || ''}`;
                    const isUnread = !item.read;
                    const needsAcknowledgement = item.type === 'alert' && item.criticality === 'high' && !item.acknowledged;

                    return (
                        <motion.div key={item.id} layout="position" initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y:0, transition: { type:'spring', stiffness:260, damping:25, delay: index * 0.03} }}
                            exit={{ opacity: 0, x:-10, transition:{duration:0.2} }}
                            className="px-1.5" >
                        <SidebarMenuItem className="my-0.5"> 
                            <SidebarMenuButton 
                              onClick={() => handleAlertUpdateClick(item as NavAlertUpdateItemProps)}
                              className={cn("relative group w-full", (isUnread || needsAcknowledgement) && "font-semibold")}
                              tooltip={isCollapsed ? `${item.name} (${item.criticality}) - ${formatRelativeTime(item.timestamp)}` : undefined}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center min-w-0 flex-1">
                                    <Icon className={cn("size-5 shrink-0 mr-2.5", iconTextClasses, (isUnread && needsAcknowledgement) ? "animate-pulse-attention" : "")} />
                                    <span className="truncate flex-1 text-sm group-hover:text-primary dark:group-hover:text-primary-dark transition-colors">{item.name}</span>
                                </div>
                                {!isCollapsed && (<span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">{formatRelativeTime(item.timestamp)}</span> )}
                                {(isUnread || needsAcknowledgement) && !isCollapsed && (
                                    <motion.span layoutId={`dot-${item.id}`} initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} transition={{delay:0.1, type: "spring", stiffness: 300, damping: 15}}
                                    className={cn("absolute right-2 top-1/2 -translate-y-1/2 ml-auto size-2.5 rounded-full ring-2 ring-white dark:ring-slate-800", unreadDotBg, needsAcknowledgement && "ring-offset-1 ring-red-500 dark:ring-red-400 animate-ping-slow" )} 
                                    aria-label={needsAcknowledgement ? "needs acknowledgement" : "unread"} />
                                )}
                              </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        </motion.div>
                    );
                })}
                </AnimatePresence>
            </SidebarMenu>

            {sortedAlertsUpdates.length > MAX_VISIBLE_ALERTS && !isCollapsed && (
                <motion.div layout initial={{opacity:0}} animate={{opacity:1}} className="px-2.5 mt-1.5 mb-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-dark" onClick={() => setShowAllAlerts(!showAllAlerts)}>
                        {showAllAlerts ? "Show Less" : `Show ${sortedAlertsUpdates.length - MAX_VISIBLE_ALERTS} More`}
                        <motion.div animate={{rotate: showAllAlerts ? 180: 0}}><ChevronDown className="ml-1.5 h-3.5 w-3.5"/></motion.div>
                    </Button>
                </motion.div>
            )}
             {sortedAlertsUpdates.length > 0 && visibleAlerts.length === 0 && !isCollapsed && ( 
                <motion.div layout initial={{opacity:0}} animate={{opacity:1}} className="px-4 py-3 text-center"> <Archive size={24} className="mx-auto text-slate-400 dark:text-slate-500 mb-1.5"/> <p className="text-xs text-slate-500 dark:text-slate-400">All older items hidden.</p> </motion.div>
            )}
            {sortedAlertsUpdates.length === 0 && !isCollapsed && (
                 <motion.div layout initial={{opacity:0}} animate={{opacity:1}} className="px-4 py-3 text-center"> <Archive size={24} className="mx-auto text-slate-400 dark:text-slate-500 mb-1.5"/> <p className="text-xs text-slate-500 dark:text-slate-400">No alerts or updates yet.</p> </motion.div>
            )}
          </div>
          
          <NavSecondary items={initialStaticNavData.navSecondary} activeSection={activeSection} activeAccents={activeAccents} className="mt-auto pt-2.5 border-t border-border/20 dark:border-slate-700/50 shrink-0" />
        </SidebarContent>
        
        <SidebarFooter className={cn("border-t border-border/20 dark:border-slate-700/50 p-2.5 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-all duration-200 shrink-0", isCollapsed && "!py-2")}>
          <NavUser /> 
        </SidebarFooter>
      </Sidebar>

      <AlertUpdatePopup 
        itemData={selectedAlertUpdate} 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
        onAcknowledge={store.acknowledgeSystemAlert}
      />
      {store.currentUser?.role === UserRole.ADMIN && ( 
        <AddNewAlertDialog 
            isOpen={isAddDialogOpen} 
            onClose={() => setIsAddDialogOpen(false)} 
            onAddItem={store.addSystemAlertUpdate}
        /> 
      )}
    </div>
  );
}