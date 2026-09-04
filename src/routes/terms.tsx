import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalBlock, LegalLayout } from "~/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms of Service — Toonify" }],
  }),
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 4, 2026">
      <p className="mb-8 text-muted">
        These terms cover the Toonify website, the free cartoon generator, and the product
        previews on this page. If you do not agree, do not use the site.
      </p>

      <LegalBlock title="1. Who we are">
        <p>
          Toonify is a small storefront that turns a photo into a cartoon and lets you preview
          that cartoon on merch. Checkout is not live yet. Until it is, nothing on this site is
          an offer to sell a physical product.
        </p>
      </LegalBlock>

      <LegalBlock title="2. The free cartoon">
        <p>
          You may upload a photo and generate a cartoon at no charge. We can change, throttle, or
          stop the generator at any time. The result is a stylized version of your photo — not a
          guarantee that it will look like a hand-drawn caricature or that anyone will recognize
          the person in it.
        </p>
      </LegalBlock>

      <LegalBlock title="3. Your photo">
        <p>
          You must own the photo or have permission to use it. Do not upload pictures of other
          people without their consent, and do not upload anything illegal or that you do not have
          the right to process. By uploading, you give Toonify a limited license to send the photo
          through our cartoon pipeline and return the result to you.
        </p>
      </LegalBlock>

      <LegalBlock title="4. What you can do with the cartoon">
        <p>
          You keep your original photo. The cartoon we generate is yours for personal use,
          including printing it yourself. Using it as a trademark, selling it as stock, or
          claiming we drew it by hand is not allowed. If you print it on goods you sell, you are
          responsible for those goods — Toonify is not a party to that sale until checkout exists
          here.
        </p>
      </LegalBlock>

      <LegalBlock title="5. Product previews">
        <p>
          T-shirt, mug, and phone-case images are mockups. Colors, print size, and placement will
          differ on a real product. Prices shown are placeholders. The Add to cart button does
          not charge you and does not create an order.
        </p>
      </LegalBlock>

      <LegalBlock title="6. Acceptable use">
        <p>
          Do not try to break, scrape, or overload the generator. Do not use it to create sexual
          content involving minors, to impersonate someone in order to harm them, or to generate
          content you intend to pass off as an official ID or endorsement.
        </p>
      </LegalBlock>

      <LegalBlock title="7. No warranty">
        <p>
          The site is provided as-is. We do not warrant that the cartoon will be accurate, that
          the service will be up, or that files will be free of defects. To the fullest extent
          the law allows, Toonify is not liable for lost profits, lost data, or indirect damages
          arising from your use of the site.
        </p>
      </LegalBlock>

      <LegalBlock title="8. Changes">
        <p>
          We may update these terms. The date at the top is the current version. Continued use
          after a change means you accept the new terms.
        </p>
      </LegalBlock>

      <p className="text-muted">
        How we handle photos is in the{" "}
        <Link to="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
