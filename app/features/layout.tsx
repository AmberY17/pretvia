import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Pretvia's features for coaches, athletes, and guardians. Group management, emoji logging, session check-ins, and more.",
  openGraph: {
    title: "Pretvia Features",
    description:
      "Explore Pretvia's features for coaches, athletes, and guardians. Group management, emoji logging, session check-ins, and more.",
    url: "https://pretvia.com/features",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
