"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginTab } from "./login-tab";
import { RegisterTab } from "./register-tab";

interface AccountShelfProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountShelf({ open, onOpenChange }: AccountShelfProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("login");
  const [isMobile, setIsMobile] = useState(false);

  // Reset to login tab when shelf closes
  useEffect(() => {
    if (!open) {
      setActiveTab("login");
    }
  }, [open]);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`w-full ${isMobile ? "max-h-[90vh] rounded-t-xl" : "sm:w-[420px]"} overflow-y-auto`}
        aria-label="Account and sign in options"
        aria-modal="true"
        role="dialog"
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Account</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Log In
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <LoginTab
              onClose={() => onOpenChange(false)}
              onSwitchToRegister={() => setActiveTab("register")}
            />
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <RegisterTab
              user={session?.user}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
