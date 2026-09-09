/**
 * Policy documents.
 *
 * Written as structured content rather than a CMS so the pages are versioned
 * with the code and reviewable in a diff. THESE ARE A STARTING POINT, NOT
 * LEGAL ADVICE — have a lawyer review them before you rely on them, and set
 * VITE_COMPANY_NAME / VITE_SUPPORT_EMAIL so they name a real entity.
 */
export const COMPANY = import.meta.env.VITE_COMPANY_NAME || 'Jamz';
export const CONTACT = import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com';
export const LAST_UPDATED = '9 September 2026';

export interface PolicySection {
  heading: string;
  body: string[];
}

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  sections: PolicySection[];
}

export const TERMS: Policy = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: `The agreement between you and ${COMPANY} when you use this service.`,
  sections: [
    {
      heading: 'Your account',
      body: [
        `You must be able to form a binding contract to use ${COMPANY}. You are responsible for what happens under your account and for keeping your password secure.`,
        'You can delete your account at any time from Settings. Deleting removes your songs, audio files and profile, and cancels any active subscription.',
      ],
    },
    {
      heading: 'Credits and generation',
      body: [
        'Generating a song spends credits. Free plans refill daily; paid plans are granted credits at the start of each billing period.',
        'If a generation fails or you cancel it, the credits are returned to your balance automatically. Credits have no cash value and are not refundable or transferable.',
      ],
    },
    {
      heading: 'Your content and ownership',
      body: [
        'You keep ownership of the prompts and lyrics you write.',
        'Rights to the audio you generate depend on your plan. Paid plans include commercial-use rights for songs generated while that plan is active; the free plan does not. A song records the rights it was created under, and changing plans later does not change a song already made.',
        `You are responsible for making sure what you submit does not infringe anyone else's rights.`,
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        'Do not use the service to create material that infringes copyright, impersonates a real person’s voice or likeness without permission, is unlawful, or is intended to harass or deceive.',
        'We may suspend accounts or remove content that breaches these terms, and may report unlawful activity.',
      ],
    },
    {
      heading: 'Service availability',
      body: [
        'The service is provided as-is. We do not guarantee uninterrupted availability, and features may change.',
        'To the extent the law allows, our liability is limited to the amount you paid us in the twelve months before the claim.',
      ],
    },
    {
      heading: 'Changes and contact',
      body: [
        'We will give notice of material changes to these terms. Continuing to use the service after a change means you accept it.',
        `Questions: ${CONTACT}.`,
      ],
    },
  ],
};

export const PRIVACY: Policy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'What we collect, why, and what you can do about it.',
  sections: [
    {
      heading: 'What we collect',
      body: [
        'Account details: your email address, display name and any profile information you add.',
        'Content: the prompts, lyrics and settings you submit, and the audio generated from them.',
        'Usage: credit transactions, generation history, plays and likes.',
        'Billing: handled by Stripe. We store a customer reference, subscription status and invoice records — never your card number.',
      ],
    },
    {
      heading: 'Why we use it',
      body: [
        'To generate the music you ask for, to meter credits accurately, to bill you correctly, and to keep the service secure.',
        'We do not sell your personal data.',
      ],
    },
    {
      heading: 'Who else sees it',
      body: [
        'Our infrastructure and model providers process data on our behalf under contract.',
        'Songs are private by default. A song is only visible to others if you set it to unlisted (reachable by link) or public (listed in Discover).',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You can access, correct or export your data, and delete your account outright from Settings — which removes your songs, audio files and profile.',
        `To make a request, contact ${CONTACT}.`,
      ],
    },
    {
      heading: 'Retention',
      body: [
        'We keep account and content data while your account is open. Billing records are kept as long as tax and accounting law requires.',
      ],
    },
  ],
};

export const AI_DISCLOSURE: Policy = {
  slug: 'ai-disclosure',
  title: 'AI Disclosure',
  summary: 'How the music is made, and what that means for you.',
  sections: [
    {
      heading: 'The music is generated',
      body: [
        'Every track on this service is produced by a machine learning model from the brief you provide. No human performance is involved unless you upload one.',
        'Lyrics written with the "Write with AI" button are also model-generated. You can edit them before generating, and we recommend you do.',
      ],
    },
    {
      heading: 'What that means for you',
      body: [
        'Generated output is not always original by accident of statistics — check anything you intend to release commercially.',
        'Copyright in AI-generated audio is unsettled in many jurisdictions and varies by country. Your plan grants you the rights we are able to grant; it cannot guarantee a particular legal outcome.',
        'If you publish or distribute a track, disclose that it was AI-generated where the platform or the law requires it.',
      ],
    },
    {
      heading: 'Voices and likeness',
      body: [
        'Do not use this service to imitate a specific real person’s voice without their permission. Uploads that do so will be removed.',
      ],
    },
    {
      heading: 'Reporting a problem',
      body: [
        `If you believe a track infringes your rights, report it from the song page or contact ${CONTACT}. See the takedown process in our Terms.`,
      ],
    },
  ],
};

export const POLICIES = [TERMS, PRIVACY, AI_DISCLOSURE];
