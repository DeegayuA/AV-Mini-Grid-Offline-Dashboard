// components/UpdateDetailsModal.tsx
import React, { Fragment } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, CheckCircle, Wrench, ExternalLink } from "lucide-react";

export interface UpdateSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: string[];
}

export interface UpdateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: string;
  version?: string;
  imageUrl?: string; // Optional stunning image/gif for the update
  videoUrl?: string; // Or video
  description: string;
  sections?: UpdateSection[]; // For structured lists like "New Features", "Fixes"
  cta?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  accentColor?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25, delay: 0.1 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10, 
    transition: { duration: 0.2, ease: "easeIn" } 
  },
};

export function UpdateDetailsModal({
  isOpen,
  onClose,
  title,
  date,
  version,
  imageUrl,
  videoUrl,
  description,
  sections = [],
  cta,
  accentColor = "sky",
}: UpdateDetailsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogPrimitive.Portal forceMount>
            {/* Overlay */}
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 z-40"
            >
              <DialogPrimitive.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            </motion.div>

            {/* Content */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`relative w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-slate-100 dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800`}
              >
                <DialogPrimitive.Content className="outline-none max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className={`relative p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-${accentColor}-500/10 to-transparent dark:from-${accentColor}-500/5`}>
                    <DialogPrimitive.Title className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                      {title}
                    </DialogPrimitive.Title>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      <span>{date}{version && `  ·  Version ${version}`}</span>
                    </div>
                    <DialogPrimitive.Close asChild>
                      <button
                        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-${accentColor}-500"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {videoUrl && (
                        <div className="aspect-video rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-lg">
                           <iframe 
                                src={videoUrl} // Ensure this is an embeddable URL (e.g. YouTube embed)
                                title={title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerPolicy="strict-origin-when-cross-origin" 
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    )}
                    {imageUrl && !videoUrl && (
                      <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-lg">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}

                    <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {description}
                    </p>

                    {sections.map((section) => (
                      <div key={section.id} className="pt-4">
                        <div className={`flex items-center mb-3 text-lg font-semibold text-${accentColor}-600 dark:text-${accentColor}-400`}>
                          <section.icon className="h-5 w-5 mr-2.5 flex-shrink-0" />
                          <h4 >{section.title}</h4>
                        </div>
                        <ul className="space-y-2 pl-2">
                          {section.items.map((item, index) => (
                            <motion.li 
                              key={index} 
                              className="flex items-start text-sm text-slate-600 dark:text-slate-300"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0, transition: { delay: 0.1 + index * 0.05 } }}
                            >
                              <CheckCircle className={`h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0 text-${accentColor}-500`} />
                              <span>{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Footer with CTA */}
                  {(cta || !sections.length) && ( // Show Got It if no CTA and no sections
                    <div className="p-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row-reverse gap-3">
                       <button
                        onClick={cta?.onClick || onClose}
                        className={`w-full sm:w-auto py-2.5 px-6 text-sm font-semibold rounded-lg 
                                    bg-${accentColor}-500 hover:bg-${accentColor}-600 dark:bg-${accentColor}-600 dark:hover:bg-${accentColor}-500
                                    text-white transition-all duration-300 shadow-md hover:shadow-lg
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-${accentColor}-500`}
                      >
                        {cta?.text || "Got It!"}
                        {cta?.href && <ExternalLink className="ml-2 h-4 w-4 inline-block"/>}
                      </button>
                      {!cta && sections.length > 0 && // Only show close as secondary if there's no specific primary CTA and there are sections
                        <DialogPrimitive.Close asChild>
                            <button
                                className="w-full sm:w-auto py-2.5 px-6 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-slate-500"
                            >
                                Close
                            </button>
                        </DialogPrimitive.Close>
                      }
                    </div>
                  )}
                </DialogPrimitive.Content>
              </motion.div>
            </div>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}