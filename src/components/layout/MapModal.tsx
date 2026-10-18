"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MapModal({ open, onOpenChange }: MapModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col items-center">
                <DialogHeader className="w-full flex-shrink-0">
                    <DialogTitle className="text-xl">Mapa de clientes</DialogTitle>
                </DialogHeader>
                <div className="w-full flex-grow rounded-md overflow-hidden bg-muted/30">
                    <iframe
                        src="https://www.google.com/maps/d/u/0/embed?mid=1qbDhDHUg-QgUhXyCoxftHGHyMOQ2pDg&ehbc=2E312F"
                        width="100%"
                        height="100%"
                        allowFullScreen
                        loading="lazy"
                        className="border-0"
                    ></iframe>
                </div>
            </DialogContent>
        </Dialog>
    );
}
