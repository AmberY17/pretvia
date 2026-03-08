import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features | Pretvia",
  description:
    "Explore Pretvia's features for coaches, athletes, and guardians. Group management, emoji logging, session check-ins, and more.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
