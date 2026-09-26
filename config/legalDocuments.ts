export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  version: string;
  effectiveDate: string;
  acceptanceRequired?: boolean;
  audience: "everyone" | "passenger" | "driver";
  sections: LegalSection[];
};

const companyName =
  process.env.EXPO_PUBLIC_LEGAL_COMPANY_NAME || "MOTA operating company";
const privacyEmail =
  process.env.EXPO_PUBLIC_PRIVACY_EMAIL ||
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ||
  "support@mota.rw";
const legalAddress =
  process.env.EXPO_PUBLIC_LEGAL_ADDRESS || "Registered address available from MOTA support";

export const LEGAL_VERSION = "2026.09";
export const LEGAL_EFFECTIVE_DATE = "26 September 2026";

export const legalDocuments: Record<string, LegalDocument> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How MOTA handles account, identity, ride, payment, device, support and location data.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    acceptanceRequired: true,
    audience: "everyone",
    sections: [
      { heading: "Who is responsible", body: `${companyName} is responsible for the personal information described in this policy. Registered address: ${legalAddress}. Privacy questions and rights requests may be sent to ${privacyEmail}. Country-specific notices may apply where MOTA operates.` },
      { heading: "Information we collect", body: "We may collect account and verified contact details; identity and KYC records; driver, vehicle, licence, permit and insurance records; pickup, destination, live and background location; route and ride events; payment references and wallet records; device, app, network and security data; support communications; emergency-contact details; ratings, reports and dispute evidence." },
      { heading: "Why we use information", body: "We use information to create and secure accounts, verify passengers and drivers, match and operate rides, show live arrival information, process and reconcile ride payments, provide support, investigate incidents and fraud, meet legal duties, maintain service reliability and enforce MOTA rules. We do not use information for an unrelated purpose without notice and an appropriate lawful basis." },
      { heading: "Location information", body: "Location is used to select pickup and destination points, find nearby drivers, calculate routes and arrival estimates, support active-ride safety and investigate ride disputes. Drivers may need background location while online or during an active ride. Permission can be changed in device settings, but some ride features will then stop working. Location must not be collected when it is not needed for an enabled service." },
      { heading: "Who receives information", body: "Only the information needed for a task is shared with the matched passenger or driver, authorized MOTA personnel, payment, maps, hosting, communications, document-storage, verification and security providers, insurers where applicable, professional advisers, and public authorities when disclosure is lawfully required. MOTA does not sell personal information." },
      { heading: "International processing", body: "Some service providers may process information outside the user's country. MOTA must use required contracts, safeguards and regulatory approvals before transferring protected information across borders." },
      { heading: "Retention", body: "Account, ride, payment, safety, KYC and support records are retained only for documented operational, safety, fraud-prevention and legal periods. Retention differs by record and country. When retention is no longer required, information is deleted or irreversibly anonymized. A deletion request may not erase records that MOTA must preserve by law or for an unresolved payment, ride, safety or legal case." },
      { heading: "Your rights", body: "Depending on applicable law, users may request access, correction, a portable copy, restriction, objection, consent withdrawal or deletion. Users may also complain to the relevant data-protection authority. Identity verification may be required before fulfilling a request." },
      { heading: "Security and incidents", body: "MOTA uses access controls, secure transport, audit records and operational safeguards appropriate to the information handled. No system is completely risk-free. Suspected privacy or security incidents should be reported immediately through support. MOTA will investigate and make legally required notifications." },
      { heading: "Children", body: "MOTA is not intended for people who cannot legally enter the applicable transport and payment agreement in their country unless an approved guardian process is available. MOTA does not knowingly request children's data outside such a lawful process." },
      { heading: "Changes", body: "The current version and effective date appear on this screen. Material changes will be communicated in the app or through verified contact details, and renewed acceptance will be requested when required." },
    ],
  },
  "passenger-terms": {
    slug: "passenger-terms",
    title: "Passenger Terms",
    summary: "Rules for requesting, taking, paying for and resolving MOTA rides.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    acceptanceRequired: true,
    audience: "passenger",
    sections: [
      { heading: "Eligibility and account", body: "Use your own account, provide accurate information, protect access credentials and keep verified contact details current. Do not create duplicate or misleading accounts or allow another person to use your identity." },
      { heading: "Ride requests", body: "Confirm the pickup, destination, requested time, passenger needs and displayed fare information before submitting. A request is not accepted until the app confirms an assigned driver. Arrival and route estimates are estimates, not guarantees." },
      { heading: "Passenger responsibilities", body: "Be at the agreed pickup point, confirm the correct driver and vehicle, use seat belts or required protective equipment, follow lawful safety instructions, treat drivers respectfully and do not request unlawful or unsafe conduct." },
      { heading: "Prices and payment", body: "The app displays the applicable fare, adjustments and payment state. A pending, held or failed payment is not completed. MOTA may place an authorized hold and release, capture or refund it according to the ride state and applicable policy. Never pay through an unapproved channel presented as MOTA." },
      { heading: "Cancellation", body: "The app will show any known cancellation charge before confirmation. Cancellation may be restricted during invalid ride states. The record identifies who cancelled, the reason and the resulting payment or refund state." },
      { heading: "Safety and conduct", body: "Verify the plate and driver shown in the app before entering a vehicle. Use in-app support for safety concerns. Emergency features do not replace police, ambulance, fire or other public emergency services." },
      { heading: "Reports and disputes", body: "Submit accurate reports promptly and preserve relevant evidence. MOTA may hold disputed funds while reviewing a case. Decisions may depend on ride records, payment records, communications and applicable law, with an available support or appeal process." },
      { heading: "Suspension and termination", body: "MOTA may restrict or close an account for safety, fraud, abusive conduct, repeated non-payment, unlawful use or material violation of these terms. Where appropriate, the user will receive a reason and a way to contact support." },
      { heading: "Service limitations", body: "MOTA provides a technology and operational service whose exact legal role may vary by country. Nothing in these terms excludes rights or responsibilities that cannot legally be excluded. Country-specific transport and consumer rules prevail where they conflict with these general terms." },
    ],
  },
  "driver-terms": {
    slug: "driver-terms",
    title: "Driver Partner Agreement",
    summary: "Operational, verification, payment and conduct requirements for drivers.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    acceptanceRequired: true,
    audience: "driver",
    sections: [
      { heading: "Approval to drive", body: "A driver may go online only after required identity, licence, permit, vehicle and insurance checks are approved. Documents must remain genuine, current and valid for the vehicle and country of operation." },
      { heading: "Driver responsibilities", body: "Use only the approved account and vehicle, obey road and transport laws, keep the vehicle roadworthy, confirm ride stages truthfully, follow the displayed route unless safety or passenger agreement requires otherwise, and never operate while impaired, dangerously tired or legally unfit to drive." },
      { heading: "Accepting and performing rides", body: "Review pickup, destination, distance and fare information before accepting. Do not mark arrival before reaching the permitted arrival area. Start only after the passenger and vehicle are verified and required confirmations are complete. End the ride at the actual destination or agreed safe stopping point." },
      { heading: "Location and availability", body: "When online or completing a ride, the app may send location, heading, speed, freshness and availability information needed for matching, tracking and safety. Going offline stops new matching. Tampering with location or ride records is prohibited." },
      { heading: "Earnings and settlement", body: "The backend ride and ledger records determine completed fares, platform charges, holds, adjustments and settlements. Pending earnings are not withdrawable. Drivers should report a discrepancy through support and must not demand an amount inconsistent with the confirmed ride record." },
      { heading: "Passenger data", body: "Passenger identity, phone, pickup, destination and location information may be used only to perform the assigned ride and address an authorized support case. It must not be copied, published, retained for personal use or used to contact a passenger outside a legitimate ride or support purpose." },
      { heading: "Safety and incidents", body: "Drivers must stop in a safe and lawful manner when necessary, contact public emergency services for an immediate emergency, notify MOTA promptly, cooperate with lawful investigations and preserve relevant records. MOTA emergency tools do not replace public emergency services." },
      { heading: "Status and enforcement", body: "Expired documents, serious safety reports, suspected fraud, unlawful conduct or material breaches may prevent the driver going online while reviewed. MOTA should provide the recorded reason and a support or appeal route where permitted." },
      { heading: "Legal relationship", body: "The legal relationship, licences, taxes, insurance duties and worker classification must be stated in the country-specific driver addendum and cannot be determined by this general document alone." },
    ],
  },
  payments: {
    slug: "payments",
    title: "Ride Payments Policy",
    summary: "Fare authorization, holds, settlement, failed payments and receipts.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    audience: "everyone",
    sections: [
      { heading: "Payment scope", body: "At initial public launch, MOTA payment features are limited to ride payments, approved refunds and driver ride settlements. Savings and lending services must remain unavailable until separately approved and documented." },
      { heading: "Authorization", body: "A ride request may require sufficient wallet balance or provider authorization. The app must show the amount and state before confirmation. MOTA will not treat a timeout or unknown provider response as a successful payment without reconciliation." },
      { heading: "Holds and settlement", body: "Authorized ride funds may be held while a ride is active or disputed. After valid completion, the confirmed fare is settled according to the ledger. A hold is not a completed charge or driver earning." },
      { heading: "Failures and retries", body: "Failed transactions display a failure state and retry option. A payment is retried only with a unique idempotency reference so the same instruction cannot be charged twice." },
      { heading: "Receipts and corrections", body: "Completed rides provide a receipt showing ride, fare and payment references. Users should report an error promptly. Corrections and refunds remain visible in transaction history rather than silently changing the original record." },
    ],
  },
  cancellation: {
    slug: "cancellation",
    title: "Cancellation, Refund and Dispute Policy",
    summary: "How cancellations, held funds, complaints, evidence and refunds are handled.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    audience: "everyone",
    sections: [
      { heading: "Before cancelling", body: "The app identifies the current ride stage and displays any known cancellation fee before confirmation. A reason is required. A ride cannot be cancelled through a state transition the backend considers invalid." },
      { heading: "After cancellation", body: "The ride history records who cancelled, the reason, time, fee and payment state. Where money is held, the app shows whether it is pending review, released, refunded or charged." },
      { heading: "Safety-related cancellation", body: "A safety-related reason creates a support case for authorized review. Funds may remain on hold while the case is assessed. For immediate danger, contact public emergency services first." },
      { heading: "Disputes and evidence", body: "A passenger or driver may select a category, explain the issue and attach relevant evidence. MOTA records replies and status changes. False, altered or abusive reports may result in account action." },
      { heading: "Refund decisions", body: "Refund eligibility depends on the verified ride and payment state, applicable law and the documented reason. Approved refunds are returned through an available supported method and remain visible in transaction history." },
    ],
  },
  safety: {
    slug: "safety",
    title: "Safety and Emergency Policy",
    summary: "Practical steps before, during and after a ride and limits of MOTA support.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    audience: "everyone",
    sections: [
      { heading: "Before a ride", body: "Check the displayed name, photo, vehicle and plate. Drivers must verify the correct passenger and pickup. Do not proceed when the information does not match. Choose a safe pickup point and keep emergency contacts current." },
      { heading: "During a ride", body: "Follow applicable seat-belt, helmet and road-safety rules. The app may show route progress and location freshness. If location becomes stale, use the textual ride information and contact support when safe to do so." },
      { heading: "Emergency assistance", body: "For an immediate emergency, contact the appropriate local public emergency service. MOTA support and SOS tools can create an incident record, share available ride details with authorized responders and notify configured contacts, but they are not a substitute for emergency services." },
      { heading: "Reporting", body: "Report safety concerns from the active ride, ride history or support center. Include the ride, category and accurate details. Authorized staff restrict access to sensitive reports and record every administrative action." },
      { heading: "Investigations", body: "MOTA may preserve relevant ride, location, communication, account and payment records, temporarily restrict an account, contact involved users and cooperate with lawful authorities or insurers. Reports are not assumed true or false before review." },
      { heading: "No retaliation", body: "A user must not threaten, harass or retaliate against another person for making a good-faith safety report or participating in an investigation." },
    ],
  },
  community: {
    slug: "community",
    title: "Community Guidelines",
    summary: "Standards for respectful, lawful and reliable use of MOTA.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    audience: "everyone",
    sections: [
      { heading: "Respect", body: "Treat passengers, drivers, support staff and the public respectfully. Harassment, discrimination, threats, unwanted contact and abusive communications are prohibited." },
      { heading: "Honesty", body: "Do not impersonate another person, falsify KYC or vehicle records, manipulate GPS, create false rides, submit false evidence or interfere with payment and safety systems." },
      { heading: "Safety", body: "Do not request or perform unlawful, reckless or unsafe activity. Drivers must use an approved roadworthy vehicle and comply with applicable licensing and safety requirements." },
      { heading: "Privacy", body: "Do not publish or misuse another user's name, contact details, location, route, images, documents or support communications." },
      { heading: "Enforcement", body: "MOTA may warn, restrict, suspend or close accounts based on severity, repetition, legal duties and safety risk. Users may contact support regarding an action or available appeal." },
    ],
  },
  "data-rights": {
    slug: "data-rights",
    title: "Account and Data Rights",
    summary: "Access, correction, export, consent withdrawal and account deletion.",
    version: LEGAL_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    audience: "everyone",
    sections: [
      { heading: "Access and correction", body: "Users may review common profile information in the app and request access to other personal information. Incorrect information can be corrected unless the original record must be preserved for audit or legal reasons." },
      { heading: "Export", body: "A verified user may request a structured export of eligible account, ride, transaction, consent and support information. Information about another person may be redacted." },
      { heading: "Account deletion", body: "Deletion can be initiated from Security & Account. MOTA verifies the request and explains unresolved rides, balances, disputes or legal records that prevent immediate completion. Eligible information is deleted or anonymized; legally required records are restricted and retained for the applicable period." },
      { heading: "Consent", body: "Where processing depends on consent, it may be withdrawn for future processing. Withdrawal does not invalidate earlier lawful processing and may disable the related optional feature." },
      { heading: "Contact", body: `Send privacy and data-rights questions to ${privacyEmail}. MOTA may request reasonable identity verification before acting on a request.` },
    ],
  },
};

export const legalMenu = [
  "privacy",
  "passenger-terms",
  "driver-terms",
  "payments",
  "cancellation",
  "safety",
  "community",
  "data-rights",
] as const;
