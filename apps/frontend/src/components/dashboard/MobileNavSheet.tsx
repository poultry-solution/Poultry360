"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/common/lib/utils";
import { Button } from "@/common/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/common/components/ui/sheet";
import { NavigationItem } from "@/components/dashboard/Sidebar";
import { useI18n } from "@/i18n/useI18n";



export function MobileNavSheet({
    navigation,
    title = "Menu",
}: {
    navigation: NavigationItem[];
    title?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { t } = useI18n();
    return (
        <>
            {/* Floating Action Button - Bottom Right */}
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 md:hidden"
                size="icon"
            >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
            </Button>

            {/* Sheet (Slide-up Navigation Drawer) */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="flex h-[70vh] flex-col pb-safe">
                    <SheetHeader className="mb-4 flex-shrink-0">
                        <SheetTitle className="text-left">{title}</SheetTitle>
                    </SheetHeader>

                    <nav className="min-h-0 flex-1 flex flex-col gap-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors",
                                        "active:scale-[0.98]", // Touch feedback
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    <span>{t(item.nameKey)}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
