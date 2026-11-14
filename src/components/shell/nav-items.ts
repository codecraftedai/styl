import { Home, Layers, Shirt, User } from "lucide-react";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: Layers },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
