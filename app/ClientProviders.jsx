"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Context from "@/context/Context";
import { TooltipProvider } from "@/components/ui/tooltip";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";

export default function ClientProviders({ children }) {
  const pathname = usePathname();
  const [scrollDirection, setScrollDirection] = useState("down");

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("bootstrap/dist/js/bootstrap.esm").then(() => {});
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector("header");
      if (header) {
        if (window.scrollY > 100) {
          header.classList.add("header-bg");
        } else {
          header.classList.remove("header-bg");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setScrollDirection("up");
    const lastScrollY = { current: window.scrollY };
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 250) {
        setScrollDirection(currentScrollY > lastScrollY.current ? "down" : "up");
      } else {
        setScrollDirection("down");
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    const bootstrap = require("bootstrap");
    const modalElements = document.querySelectorAll(".modal.show");
    modalElements.forEach((modal) => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) modalInstance.hide();
    });
    const offcanvasElements = document.querySelectorAll(".offcanvas.show");
    offcanvasElements.forEach((offcanvas) => {
      const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvas);
      if (offcanvasInstance) offcanvasInstance.hide();
    });
  }, [pathname]);

  // Hide-on-scroll for the sticky header.
  //
  // This used to write `header.style.top` directly. That node is rendered by
  // React (components/headers/Header1), so on a client-side navigation React
  // re-hydrated the subtree, compared the freshly streamed HTML (no inline
  // style) against a DOM it had not written (style="top:-185px") and logged a
  // hydration mismatch on every page change.
  //
  // Writing a CSS variable on <html> instead keeps the mutation off any element
  // React diffs; the header reads it in CSS. Same behaviour, nothing for React
  // to disagree with.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--header-offset",
      scrollDirection === "up" ? "0px" : "-185px"
    );
  }, [scrollDirection]);

  useEffect(() => {
    const WOW = require("@/utlis/wow");
    const wow = new WOW.default({ mobile: false, live: false });
    wow.init();
  }, [pathname]);

  return (
    <Context>
      <ReactQueryProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ReactQueryProvider>
    </Context>
  );
}
