import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import './Policy.css';
import SiteHeader from '../components/SiteHeader';
import TopBar from '../components/TopBar';
import SEO from '../components/SEO';
import { useStore } from '../hooks/useStore';
import { getNavPath } from '../services/categoryRoute';

const SiteFooter = lazy(() => import('../components/SiteFooter'));

const LoadingSkeleton = ({ height = '200px' }) => (
  <div style={{ height, background: '#f5f5f5', borderRadius: '8px', margin: '16px 0' }} />
);

export default function Terms() {
  const navigate = useNavigate();
  const categories = useStore((state) => state.categories);

  const handleHeaderLinkClick = (link, subName) => {
    if (link === 'Home') {
      navigate('/');
    } else {
      navigate(getNavPath(link, categories, subName));
    }
  };

  return (
    <div className="policy-root">
      <SEO
        title="Terms & Conditions | FAYWALK"
        description="Read the Terms & Conditions for using the FAYWALK website and purchasing products."
        canonical="https://www.faywalk.com/terms"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Terms & Conditions', path: '/terms' },
        ]}
      />
      <TopBar />
      <SiteHeader activeLink="" onLinkClick={handleHeaderLinkClick} />

      <section className="policy-section">
        <div className="policy-card">
          <span className="policy-badge">Legal</span>
          <h1 className="policy-h1">Terms &amp; Conditions</h1>

          <p className="policy-intro">
            Welcome to Faywalk. These Terms &amp; Conditions govern your access to and use of our website and the
            purchase of products through our platform. By accessing our website or placing an order, you agree
            to the following terms.
          </p>

          <h2 className="policy-h2">1. Website Usage &amp; Eligibility</h2>
          <p className="policy-p">
            1.1. By using this website, you agree to comply with these Terms &amp; Conditions and all applicable
            Indian laws.
          </p>
          <p className="policy-p">
            1.2. Customers must be at least 18 years of age to independently place orders. Minors may use the
            website and make purchases under the supervision of a parent or legal guardian.
          </p>
          <p className="policy-p">
            1.3. You agree to provide accurate and complete information when placing an order or creating an
            account.
          </p>
          <p className="policy-p">
            1.4. Faywalk reserves the right to restrict or terminate access to the website in cases of misuse,
            fraudulent activity or violation of these terms.
          </p>

          <h2 className="policy-h2">2. Products &amp; Pricing</h2>
          <p className="policy-p">
            2.1. Faywalk makes every effort to display accurate product descriptions, images, sizes, colours
            and pricing.
          </p>
          <p className="policy-p">
            2.2. Actual product colours may vary slightly due to screen settings, lighting and device displays.
          </p>
          <p className="policy-p">
            2.3. All prices displayed on the website are in Indian Rupees (INR), unless otherwise specified.
          </p>
          <p className="policy-p">
            2.4. Faywalk reserves the right to modify product prices, descriptions, availability and
            promotional offers without prior notice.
          </p>
          <p className="policy-p">
            2.5. Product availability is subject to stock. An order does not guarantee availability until it is
            accepted and confirmed by Faywalk.
          </p>

          <h2 className="policy-h2">3. Orders &amp; Payments</h2>
          <p className="policy-p">
            3.1. All orders placed through the website are subject to acceptance and confirmation by Faywalk.
          </p>
          <p className="policy-p">
            3.2. Faywalk reserves the right to cancel or refuse orders in cases of incorrect pricing, product
            unavailability, suspected fraudulent transactions or inaccurate customer information.
          </p>
          <p className="policy-p">
            3.3. Customers may cancel an order before it is dispatched by contacting customer support.
            Cancellation requests after dispatch will be governed by the applicable return policy.
          </p>
          <p className="policy-p">
            3.4. Payments must be made through the payment methods made available on the website.
          </p>
          <p className="policy-p">
            3.5. Payment processing may be handled by third-party payment gateways. Faywalk is not responsible
            for payment failures caused by banks, payment providers or technical issues beyond its reasonable
            control.
          </p>
          <p className="policy-p">
            3.6. If an order is cancelled by Faywalk after payment has been received, the applicable refund
            will be initiated to the original payment method.
          </p>

          <h2 className="policy-h2">4. Shipping &amp; Delivery</h2>
          <p className="policy-p">
            4.1. Faywalk aims to deliver products to the shipping address provided by the customer during
            checkout.
          </p>
          <p className="policy-p">
            4.2. Estimated delivery timelines will be communicated during the ordering process or through order
            updates.
          </p>
          <p className="policy-p">
            4.3. Delivery timelines are estimates and may vary due to location, courier delays, weather
            conditions, public holidays or other circumstances beyond our control.
          </p>
          <p className="policy-p">
            4.4. Customers are responsible for providing accurate delivery details, including their address,
            phone number and PIN code.
          </p>
          <p className="policy-p">
            4.5. Faywalk shall not be responsible for delivery failures resulting from incorrect or incomplete
            information provided by the customer.
          </p>

          <h2 className="policy-h2">5. Returns, Exchanges &amp; Refunds</h2>
          <p className="policy-p">
            5.1. Returns and exchanges are subject to Faywalk&apos;s applicable Return &amp; Exchange Policy
            published on the website.
          </p>
          <p className="policy-p">
            5.2. Products must meet the eligibility conditions specified in the Return &amp; Exchange Policy to
            qualify for a return or exchange.
          </p>
          <p className="policy-p">
            5.3. Products that are damaged, used, washed, altered or missing their original tags and packaging
            may not qualify for returns or exchanges, subject to applicable consumer protection laws. If the
            customer orders the wrong product size, the product cannot be refunded, but if the company sends
            the wrong size then it can be refunded provided it complies with the policy.
          </p>
          <p className="policy-p">
            5.4. Inner-wear and other hygiene-sensitive products may be subject to specific return or exchange
            restrictions, the product cannot be returned or refunded once it is used. Only if the product is
            damaged upon arrival, the user must submit appropriate proof and send the product back to be
            eligible for refund.
          </p>
          <p className="policy-p">
            5.5. Approved refunds will be processed by Faywalk within 14 to 21 working days. The time taken for
            the amount to reflect in the customer&apos;s account may depend on the bank or payment provider.
          </p>
          <p className="policy-p">
            5.6. Faywalk reserves the right to reject return or exchange requests that do not satisfy the
            applicable policy requirements.
          </p>

          <h2 className="policy-h2">6. Offers, Discounts &amp; Promotions</h2>
          <p className="policy-p">
            6.1. All promotional offers, discounts, coupon codes and special campaigns are subject to their
            respective terms and conditions.
          </p>
          <p className="policy-p">
            6.2. Offers may be introduced, modified, extended or discontinued at Faywalk&apos;s discretion,
            subject to applicable law.
          </p>
          <p className="policy-p">
            6.3. Unless specifically mentioned, promotional offers cannot be combined with other discounts or
            coupon codes.
          </p>
          <p className="policy-p">
            6.4. Faywalk reserves the right to cancel orders involving coupon misuse, fraudulent promotional
            activity or unauthorised discount usage.
          </p>

          <h2 className="policy-h2">7. Intellectual Property</h2>
          <p className="policy-p">
            7.1. All content available on the website, including logos, brand names, product images, designs,
            graphics, text and other materials, belongs to Faywalk or its respective licensors.
          </p>
          <p className="policy-p">
            7.2. No content may be copied, reproduced, distributed, modified or commercially used without prior
            written permission from Faywalk.
          </p>
          <p className="policy-p">
            7.3. Unauthorised use of Faywalk&apos;s intellectual property may result in appropriate legal
            action.
          </p>

          <h2 className="policy-h2">8. User Responsibilities</h2>
          <p className="policy-p">
            8.1. Customers agree not to use the website for unlawful purposes, fraudulent transactions or
            activities that may disrupt website operations.
          </p>
          <p className="policy-p">
            8.2. Users must not attempt to gain unauthorised access to the website, its systems or other
            customer accounts.
          </p>
          <p className="policy-p">
            8.3. Customers are responsible for maintaining the confidentiality of their account credentials and
            for activities conducted through their accounts.
          </p>

          <h2 className="policy-h2">9. Limitation of Liability</h2>
          <p className="policy-p">
            9.1. Faywalk makes reasonable efforts to ensure that the website operates accurately and reliably.
            However, uninterrupted or error-free website access cannot be guaranteed.
          </p>
          <p className="policy-p">
            9.2. Faywalk shall not be liable for indirect, incidental or consequential losses arising from the
            use of the website, to the extent permitted by applicable law.
          </p>
          <p className="policy-p">
            9.3. Nothing in these Terms &amp; Conditions shall exclude or limit any consumer rights or legal
            protections that cannot be excluded under applicable Indian law.
          </p>

          <h2 className="policy-h2">10. Force Majeure</h2>
          <p className="policy-p">
            Faywalk shall not be held responsible for delays or failure to fulfil obligations caused by
            circumstances beyond its reasonable control, including natural disasters, government restrictions,
            transportation disruptions, strikes, pandemics or other unforeseen events.
          </p>

          <h2 className="policy-h2">11. Governing Law &amp; Jurisdiction</h2>
          <p className="policy-p">
            These Terms &amp; Conditions shall be governed by the laws of India. Any disputes arising from the
            use of the website or purchase of products shall be subject to the jurisdiction of the competent
            courts at <strong>Tirunelveli, Tamil Nadu</strong>, subject to applicable law.
          </p>

          <h2 className="policy-h2">12. Changes to Terms &amp; Conditions</h2>
          <p className="policy-p">
            Faywalk reserves the right to update or modify these Terms &amp; Conditions at any time. Updated
            terms will be published on the website and will become effective from the date of publication.
          </p>

          <div className="policy-contact-block">
            <h2 className="policy-h2">13. Contact Information</h2>
            <p className="policy-p">
              For questions, concerns or assistance regarding these Terms &amp; Conditions, orders or products,
              please contact: <a href="tel:+919486519622" className="policy-link">+91 9486519622</a>
            </p>
            <p className="policy-p" style={{ marginBottom: 0 }}>
              <strong>Faywalk Fashion</strong>
              <br />
              Website:{' '}
              <a href="https://www.faywalk.com" className="policy-link" target="_blank" rel="noopener noreferrer">
                www.faywalk.com
              </a>
              <br />
              Email:{' '}
              <a href="mailto:faywalkvibee@gmail.com" className="policy-link">
                faywalkvibee@gmail.com
              </a>
              <br />
              Phone:{' '}
              <a href="tel:6379838682" className="policy-link">
                6379838682
              </a>
              <br />
              Address: Faywalk vibe, Maharaja nagar, Tirunelveli, Tamil Nadu - 627011.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<LoadingSkeleton height="300px" />}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
