import { flag } from "flags/next"
import { vercelAdapter } from "@flags-sdk/vercel"

export const pricingFlag = flag<boolean>({
  key: "pricing",
  description: "to toggle the visibility of pricing page",
  options: [
    { value: false, label: "Off" },
    { value: true, label: "On" },
  ],
  adapter: vercelAdapter(),
})

export const betaFlag = flag<boolean>({
  key: "beta",
  description: "add ons cards on club dashboard, waitlist, club memberships for the coaches invited via waitlist",
  options: [
    { value: false, label: "Off" },
    { value: true, label: "On" },
  ],
  adapter: vercelAdapter(),
})
