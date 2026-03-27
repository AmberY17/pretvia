import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Pretvia collects, uses, and protects your personal information.",
}

export default function PrivacyPage() {
  const effectiveDate = "March 27, 2025"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Pretvia
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">
          <section>
            <p>
              Pretvia (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Pretvia
              platform at <strong>pretvia.com</strong> (the &quot;Service&quot;). This Privacy
              Policy explains how we collect, use, disclose, and protect information about you when
              you use our Service.
            </p>
            <p className="mt-4">
              By using Pretvia, you agree to the collection and use of information as described in
              this policy. If you are a parent or guardian creating an account for a child under 13,
              please read the{" "}
              <a href="#coppa" className="text-primary underline underline-offset-2">
                Children&apos;s Privacy (COPPA)
              </a>{" "}
              section carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <h3 className="font-medium mb-2">Account information</h3>
            <p>
              When you register, we collect your first and last name, email address, password
              (stored as a one-way hash), role (athlete, coach, or parent), and — optionally — date
              of birth. Coaches require a waitlist invite to sign up.
            </p>
            <h3 className="font-medium mt-4 mb-2">Training logs and activity</h3>
            <p>
              We store training log entries you create, including emoji selections, text notes,
              tags, visibility settings, and timestamps. We also store group memberships, coach
              relationships, comments, announcements, check-ins, and attendance records.
            </p>
            <h3 className="font-medium mt-4 mb-2">Google sign-in</h3>
            <p>
              If you sign in with Google, we receive your name and email address from Google. We do
              not receive your Google password or access to other Google services.
            </p>
            <h3 className="font-medium mt-4 mb-2">Usage and device information</h3>
            <p>
              We use Vercel Analytics (cookieless) and Vercel Speed Insights to collect anonymized
              performance and usage data such as page views, load times, and referrer URLs. This
              data cannot be used to identify you individually.
            </p>
            <h3 className="font-medium mt-4 mb-2">Feedback</h3>
            <p>
              If you submit feedback through the in-app feedback button, we receive your message
              along with your account email address.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To provide, operate, and maintain the Service</li>
              <li>To authenticate your identity and manage your session</li>
              <li>To send transactional emails (account verification, password reset, invites)</li>
              <li>
                To display your training logs and progress to authorized coaches and group members
              </li>
              <li>To improve the performance and reliability of the Service</li>
              <li>To respond to your feedback and support requests</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information. We do not use your data for behavioral
              advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Share Your Information</h2>
            <p>We share information only in these limited circumstances:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>
                <strong>Within your group:</strong> Your training logs (subject to visibility
                settings you control), name, and activity are visible to coaches and group members
                you are connected to.
              </li>
              <li>
                <strong>Service providers:</strong> We use the following third-party services to
                operate Pretvia. Each is bound by its own privacy policy:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>MongoDB Atlas — cloud database hosting (data storage)</li>
                  <li>Resend — transactional email delivery</li>
                  <li>Google OAuth — optional sign-in provider</li>
                  <li>Vercel — hosting, analytics, and speed insights</li>
                  <li>Upstash — rate limiting (IP addresses only, not personal data)</li>
                </ul>
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information if required by law,
                court order, or governmental authority.
              </li>
              <li>
                <strong>Business transfer:</strong> If Pretvia is acquired or merges with another
                company, your information may be transferred. We will notify you in advance.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your
              account, we will delete your personal information and associated data within 30 days,
              except where we are required to retain it for legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies and Tracking</h2>
            <p>
              We use a single session cookie (httpOnly, secure) to keep you signed in. This cookie
              is strictly necessary for the Service to function and does not track you across other
              websites.
            </p>
            <p className="mt-3">
              Vercel Analytics is cookieless and does not set tracking cookies. No third-party
              advertising cookies are used.
            </p>
          </section>

          <section id="coppa">
            <h2 className="text-xl font-semibold mb-3">6. Children&apos;s Privacy (COPPA)</h2>
            <p>
              Pretvia is intended for use in sports and coaching programs that may include athletes
              under 13 years of age. We comply with the Children&apos;s Online Privacy Protection
              Act (&quot;COPPA&quot;).
            </p>
            <h3 className="font-medium mt-4 mb-2">Parental consent</h3>
            <p>
              We do not knowingly collect personal information from children under 13 without
              verifiable parental consent. When a coach invites an athlete who is under 13, we
              require a parent or guardian to create an account and consent on the child&apos;s
              behalf before any account is created for the child.
            </p>
            <h3 className="font-medium mt-4 mb-2">What we collect from children under 13</h3>
            <p>
              With parental consent, we collect the child&apos;s name, email address, date of birth,
              and training activity within the Service. We do not collect more information from
              children than is necessary to provide the Service.
            </p>
            <h3 className="font-medium mt-4 mb-2">Parental rights</h3>
            <p>Parents and guardians may at any time:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Review the personal information we have collected from their child</li>
              <li>Request that we delete their child&apos;s personal information</li>
              <li>Refuse to permit further collection or use of their child&apos;s information</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:support@mail.pretvia.com"
                className="text-primary underline underline-offset-2"
              >
                support@mail.pretvia.com
              </a>
              .
            </p>
            <h3 className="font-medium mt-4 mb-2">No advertising to children</h3>
            <p>
              We never use the personal information of children under 13 for advertising, and we do
              not allow third parties to do so.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Privacy Rights</h2>
            <p>Depending on where you live, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate personal information</li>
              <li>Delete your account and associated personal data</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing of your data</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email us at{" "}
              <a
                href="mailto:support@mail.pretvia.com"
                className="text-primary underline underline-offset-2"
              >
                support@mail.pretvia.com
              </a>
              . We will respond within 30 days. You can also delete your account from your account
              settings, which will remove your personal information from our systems within 30 days.
            </p>
            <h3 className="font-medium mt-4 mb-2">California residents (CCPA)</h3>
            <p>
              California residents have the right to know what personal information we collect, the
              right to delete it, and the right to opt out of the sale of personal information. We
              do not sell personal information.
            </p>
            <h3 className="font-medium mt-4 mb-2">EU/UK residents (GDPR/UK GDPR)</h3>
            <p>
              If you are in the European Economic Area or United Kingdom, our legal basis for
              processing your personal information is the performance of our contract with you
              (providing the Service) and our legitimate interest in operating a secure and reliable
              platform. You have the right to lodge a complaint with your local data protection
              authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data Security</h2>
            <p>
              We use industry-standard security measures including HTTPS, httpOnly cookies, bcrypt
              password hashing, JWT tokens with expiration, and rate limiting on authentication
              endpoints. No method of transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page and updating the effective date.
              Continued use of the Service after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please
              contact us at:
            </p>
            <p className="mt-3">
              <strong>Pretvia</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:support@mail.pretvia.com"
                className="text-primary underline underline-offset-2"
              >
                support@mail.pretvia.com
              </a>
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 flex gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Back to Pretvia
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
