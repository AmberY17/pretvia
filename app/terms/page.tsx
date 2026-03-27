import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions governing your use of Pretvia.",
}

export default function TermsPage() {
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

        <h1 className="mb-2 text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of Pretvia
              (&quot;Service&quot;), operated by Pretvia (&quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;). By creating an account or using the Service, you agree to be bound
              by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Eligibility and Age Requirements</h2>
            <p>
              You must be at least 13 years old to create your own account on Pretvia. If you are
              under 13, a parent or guardian must create and manage an account on your behalf and
              must provide verified parental consent in accordance with COPPA before your account is
              created.
            </p>
            <p className="mt-3">
              By creating an account, you represent that you are at least 13 years old, or that you
              are a parent or guardian acting on behalf of a child under 13 with proper consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activity that occurs under your account. You agree to notify us
              immediately at{" "}
              <a
                href="mailto:support@mail.pretvia.com"
                className="text-primary underline underline-offset-2"
              >
                support@mail.pretvia.com
              </a>{" "}
              if you suspect unauthorized access.
            </p>
            <p className="mt-3">
              You may not share your account with others, create accounts on behalf of others
              without authorization, or use automated tools to create accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes. You must not:</p>
            <ul className="list-disc list-inside space-y-1 mt-3">
              <li>Post content that is harassing, abusive, threatening, or discriminatory</li>
              <li>Upload malware, viruses, or malicious code</li>
              <li>
                Attempt to gain unauthorized access to the Service or other users&apos; accounts
              </li>
              <li>Scrape or harvest data from the Service without permission</li>
              <li>Use the Service to send spam or unsolicited messages</li>
              <li>Impersonate any person or entity</li>
              <li>
                Violate any applicable law, including laws regarding privacy, data protection, and
                the rights of children
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Coaches and Groups</h2>
            <p>
              Coaches are responsible for the groups they create and manage on Pretvia. By inviting
              athletes (including athletes under 13), coaches represent that they have appropriate
              authorization and, for athletes under 13, that a parent or guardian has provided or
              will provide consent through Pretvia&apos;s parental consent flow.
            </p>
            <p className="mt-3">
              Coaches must not share invite links publicly in a way that could reach unknown
              individuals. Invite links are intended for known athletes and their families.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Content</h2>
            <p>
              You retain ownership of the content you post to Pretvia (training logs, comments,
              tags, etc.). By posting content, you grant us a limited, non-exclusive, royalty-free
              license to store, display, and transmit your content solely to operate and provide the
              Service.
            </p>
            <p className="mt-3">
              You are responsible for the content you post. Do not post content that infringes
              third-party intellectual property rights or violates any law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
            <p>
              We strive to keep the Service available but do not guarantee uninterrupted access. We
              may modify, suspend, or discontinue the Service at any time, with or without notice.
              We are not liable for any interruption or loss of access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
              WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, PRETVIA SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE
              SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL
              LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE GREATER
              OF $50 OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Pretvia and its officers, directors,
              employees, and agents from any claims, damages, or expenses (including reasonable
              attorneys&apos; fees) arising from your use of the Service, your violation of these
              Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
            <p>
              You may delete your account at any time from your account settings. We may suspend or
              terminate your account at any time if you violate these Terms or for any other reason
              at our discretion. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on this page and updating the effective date. Continued use
              of the Service after changes constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States, without regard to conflict
              of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{" "}
              <a
                href="mailto:support@mail.pretvia.com"
                className="text-primary underline underline-offset-2"
              >
                support@mail.pretvia.com
              </a>
              .
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
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
