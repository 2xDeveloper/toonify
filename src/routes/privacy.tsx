import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalBlock, LegalLayout } from "~/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: "Privacy Policy — Toonify" }],
  }),
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 4, 2026">
      <p className="mb-8 text-muted">
        This policy explains what happens to a photo you upload and what little else we collect
        while you use Toonify.
      </p>

      <LegalBlock title="1. Photos">
        <p>
          When you generate a cartoon, the photo is sent to Toonify&apos;s server and through our
          cartoon pipeline so the image can be drawn. We use it only to produce the result you
          asked for. We do not sell photos, run ads against them, or use them to train our own
          model. We do not keep a public gallery of uploads. Processed files are discarded after
          the result is returned; they are not kept as a customer album.
        </p>
      </LegalBlock>

      <LegalBlock title="2. What else we might see">
        <p>
          Like most websites, our host may log technical data such as IP address, browser type,
          and the page requested, for security and to keep the site running. We do not use that
          to identify you, and we do not require an account.
        </p>
      </LegalBlock>

      <LegalBlock title="3. Cookies">
        <p>
          Toonify does not set advertising cookies. The site may use whatever storage the
          browser needs to load the page. You can block cookies in your browser; the generator
          still works if you can upload a file.
        </p>
      </LegalBlock>

      <LegalBlock title="4. Children">
        <p>
          The generator is not directed at children under 13. Do not upload photos of children
          unless you are their parent or guardian and you are using the cartoon for a personal
          family purpose.
        </p>
      </LegalBlock>

      <LegalBlock title="5. Sharing">
        <p>
          We do not sell personal information. A photo may pass through the infrastructure that
          hosts Toonify (the app server and the cartoon service) solely to create your result.
          We would share data if the law required it.
        </p>
      </LegalBlock>

      <LegalBlock title="6. Changes">
        <p>
          If this policy changes in a way that affects how photos are handled, we will update
          the date at the top of this page.
        </p>
      </LegalBlock>

      <p className="text-muted">
        Using the generator is also covered by the{" "}
        <Link to="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
