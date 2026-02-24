import React from "react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 sm:px-6 lg:px-20 py-10">
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#07d6a1] mb-2">Fund Flow</h1>
        <h2 className="text-xl font-semibold">Terms of Service</h2>
      </header>

      {/* Content */}
      <main className="space-y-6 max-w-4xl mx-auto">
        <section>
          <h3 className="text-2xl font-bold mb-2">1. Acceptance of Terms</h3>
          <p>
            By accessing or using the Fund Flow platform, you agree to be bound by these Terms of Service, our Privacy Policy, and any other applicable policies. If you do not agree, you may not use our services.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">2. Eligibility</h3>
          <p>
            You must be at least 18 years old to use Fund Flow. By using our services, you represent and warrant that you meet this age requirement.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">3. Account Responsibilities</h3>
          <p>
            Users are responsible for maintaining the confidentiality of their account information, including login credentials. You agree to notify Fund Flow immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">4. User Content</h3>
          <p>
            Any content you post on Fund Flow, including comments, posts, or shared information, must comply with applicable laws and our community guidelines. Fund Flow may remove content that violates these Terms.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">5. Privacy</h3>
          <p>
            Fund Flow collects, stores, and processes personal information as described in our Privacy Policy. By using our platform, you consent to such practices.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">6. Prohibited Conduct</h3>
          <p>
            You may not: 
            <ul className="list-disc list-inside mt-2">
              <li>Use Fund Flow for unlawful purposes.</li>
              <li>Interfere with or disrupt our services.</li>
              <li>Impersonate any person or entity.</li>
              <li>Attempt to gain unauthorized access to other users’ accounts.</li>
            </ul>
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">7. Termination</h3>
          <p>
            Fund Flow reserves the right to suspend or terminate your account at any time, without notice, if you violate these Terms or engage in conduct detrimental to the platform.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">8. Disclaimer of Warranties</h3>
          <p>
            Fund Flow is provided “as is” without warranties of any kind. We do not guarantee the accuracy, reliability, or availability of our services.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">9. Limitation of Liability</h3>
          <p>
            Fund Flow will not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">10. Changes to Terms</h3>
          <p>
            We may update these Terms of Service from time to time. Changes will be effective immediately upon posting, and your continued use constitutes acceptance.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">11. Governing Law</h3>
          <p>
            These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Fund Flow operates, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-2">12. Contact Us</h3>
          <p>
            For questions about these Terms, please contact us at <a href="mailto:support@fundflow.com" className="text-[#07d6a1] underline">support@fundflow.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfService;
