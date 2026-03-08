"use client";

import Image from "next/image";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardHeaderProps {
  title: string;
  description: string;
}

export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <CardHeader className="pb-4">
      <Image
        src="/logo.png"
        alt="Pretvia"
        width={44}
        height={44}
        className="mb-2 h-11 w-11 object-contain dark:hidden"
      />
      <Image
        src="/logo_dark_white.png"
        alt="Pretvia"
        width={44}
        height={44}
        className="mb-2 hidden h-11 w-11 object-contain dark:block"
      />
      <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
      <CardDescription className="text-muted-foreground">
        {description}
      </CardDescription>
    </CardHeader>
  );
}
