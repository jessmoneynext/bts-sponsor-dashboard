// Reference data that doesn't change mid-event. Edit here, redeploy.

export const SPONSORS = [
  { name: 'Airia', tier: 'gold' }, { name: 'Amdocs', tier: 'gold' }, { name: 'Broadridge', tier: 'gold' },
  { name: 'Cognition AI (Organizations)', tier: 'gold' }, { name: 'ElevenLabs', tier: 'gold' },
  { name: 'EXL', tier: 'gold' }, { name: 'Hewlett Packard Enterprise', tier: 'gold' },
  { name: 'Kyndryl', tier: 'gold' }, { name: 'OutSystems', tier: 'gold' }, { name: 'Pometry', tier: 'gold' },
  { name: 'Prosci', tier: 'gold' }, { name: 'Rackspace Technology', tier: 'gold' }, { name: 'Sage', tier: 'gold' },
  { name: 'Salesforce', tier: 'gold' }, { name: 'Skan AI', tier: 'gold' }, { name: 'Temenos', tier: 'gold' },
  { name: 'Tieto', tier: 'gold' },
  { name: 'Adesso', tier: 'silver' }, { name: 'Alinia', tier: 'silver' }, { name: 'Atombit', tier: 'silver' },
  { name: 'Credera', tier: 'silver' }, { name: 'Element', tier: 'silver' }, { name: 'Flowable', tier: 'silver' },
  { name: 'Gradient Labs', tier: 'silver' }, { name: 'Moneyhub', tier: 'silver' }, { name: 'Worldline', tier: 'silver' },
  { name: 'Cogence AI', tier: 'exhibitor' }, { name: 'Creatio', tier: 'exhibitor' }, { name: 'ERI', tier: 'exhibitor' },
  { name: 'Impetus', tier: 'exhibitor' }, { name: 'NTT Data', tier: 'exhibitor' }, { name: 'Oxford Risk', tier: 'exhibitor' },
  { name: 'Smart Communications', tier: 'exhibitor' }, { name: 'tts digital adoption solutions', tier: 'exhibitor' },
  { name: 'NextWave Consulting', tier: 'panel-partner' }, { name: 'Started PR', tier: 'pr-partner' },
  { name: 'Forest Bikes', tier: 'transport-partner' },
];

export const ALIASES = {
  'Airia': ['Airia'], 'Amdocs': ['Amdocs', 'amdocs'], 'Broadridge': ['Broadridge'],
  'Cognition AI (Organizations)': ['Cognition AI', 'Cognition', 'Cognition.AI', 'cognition.ai'],
  'ElevenLabs': ['ElevenLabs', 'Eleven Labs'], 'EXL': ['EXL', 'EXL Service'],
  'Hewlett Packard Enterprise': ['Hewlett Packard Enterprise', 'HPE', 'Hewlett Packard'],
  'Kyndryl': ['Kyndryl'], 'OutSystems': ['OutSystems', 'Outsystems'],
  'Pometry': ['Pometry'], 'Prosci': ['Prosci'],
  'Rackspace Technology': ['Rackspace Technology', 'Rackspace'],
  'Sage': ['Sage'], 'Salesforce': ['Salesforce'],
  'Skan AI': ['Skan AI', 'Skan', 'SkanAI'], 'Temenos': ['Temenos'],
  'Tieto': ['Tieto', 'Tietoevry', 'TietoEVRY'], 'Adesso': ['Adesso', 'adesso'],
  'Alinia': ['Alinia'], 'Atombit': ['Atombit'], 'Credera': ['Credera'],
  'Element': ['Element', 'TryElement'], 'Flowable': ['Flowable'],
  'Gradient Labs': ['Gradient Labs', 'Gradient-Labs'], 'Moneyhub': ['Moneyhub', 'MoneyHub'],
  'Worldline': ['Worldline'], 'Cogence AI': ['Cogence AI', 'Cogence.AI', 'Cogence'],
  'Creatio': ['Creatio'], 'ERI': ['ERI'], 'Impetus': ['Impetus', 'Impetus Technologies', 'Impetus Technologies, Inc'],
  'NTT Data': ['NTT Data', 'NTT DATA'], 'Oxford Risk': ['Oxford Risk'],
  'Smart Communications': ['Smart Communications'],
  'tts digital adoption solutions': ['tts', 'TTS', 'tts digital adoption solutions'],
  'NextWave Consulting': ['NextWave Consulting', 'NextWave'],
  'Started PR': ['Started PR'], 'Forest Bikes': ['Forest Bikes', 'HumanForest', 'Human Forest'],
};

// Session titles below are the exact strings used in Grip's session records,
// as confirmed by the agenda export on 22 May 2026.
// - The 8 Vision Stage sessions had zero check-ins recorded (scanner not operated).
//   These are recovered via recovery.js by reattributing the temp scanner's
//   misconfigured stand scans by timestamp.
// - 5 additional sessions added after cross-checking the sponsor-level totals
//   from Grip. Marked "added 22 May" below.
// Total: 36 sponsor-session entries.
export const SPONSOR_SESSIONS = [
  { sponsor: 'ElevenLabs', session: "Where are We Now? The Great Reinvention of Banking" },
  { sponsor: 'Salesforce', session: "Beyond the Bot: Conquering Banking's Hardest Frontiers with Agentic AI" },
  { sponsor: 'Pometry', session: "What Banks Can Learn About Transformation from the Defence & Intelligence Communities" },
  { sponsor: 'Prosci', session: "Digital Investment is Live. Why Isn't Adoption Keeping Up?" },
  { sponsor: 'EXL', session: "Reimagining Banking Operations using Data & AI: From Contact Centers to Experience Centers" }, // Vision Stage — recovered
  { sponsor: 'Rackspace Technology', session: "Behind the Screens: How Banks Make Their Digital Backbone Tick" },
  { sponsor: 'Sage', session: "Embedded Finance & Invisible Services: Who Owns the Customer Now?" },
  { sponsor: 'Oxford Risk', session: "People, Purpose and Personalisation: The New CX in Banking" },
  { sponsor: 'Flowable', session: "Real AI: Operational Use Cases Delivering Impact Today" }, // Vision Stage — recovered
  { sponsor: 'Cognition AI (Organizations)', session: "The Future of Software Engineering" },
  { sponsor: 'Kyndryl', session: "Trust Is the Real Bottleneck: Implementing agentic workflows in Banking" },
  { sponsor: 'ElevenLabs', session: "What 22 Million AI Banking Calls Taught us About Trust" }, // Vision Stage — no scans even from temp scanner
  { sponsor: 'Gradient Labs', session: "Data You Can Defend: Building Decision-Grade Information" },
  { sponsor: 'Adesso', session: "The AI Act Reality Check: From Principle to Practice" }, // Vision Stage — recovered
  { sponsor: 'Atombit', session: "Next-Gen CX Automation: Personalisation in Real Time" },
  { sponsor: 'Alinia', session: "Responsible AI at Scale: From Pilots to Bank-Wide Execution" }, // Vision Stage — recovered
  { sponsor: 'Temenos', session: "The Value Road Map to Become an AI-ready Bank" },
  { sponsor: 'Amdocs', session: "From Automation to Autonomy: Transforming Banking Operations with Agentic GenAI" },
  { sponsor: 'Broadridge', session: "From Output to Outcome: The Race to Reinvent Customer Communications" },
  { sponsor: 'Airia', session: "Out of the Shadows: A Strategic Framework for AI Governance in Financial Services" }, // Vision Stage — recovered
  { sponsor: 'Worldline', session: "The Moving Pound: Reinventing Payments and the Architecture of Value" },
  { sponsor: 'Kyndryl', session: "Building Banks That Bend: AI, Infrastructure and the Adaptive Edge" },
  { sponsor: 'Moneyhub', session: "People Deposit Trust, Not Just Money" },
  { sponsor: 'Hewlett Packard Enterprise', session: "Building Trust-Ready Infrastructure: Powering Secure, Real-Time Banking with AI" },
  { sponsor: 'Skan AI', session: "Why AI Pilots Stall in Banking: Bridging Probabilistic AI and Deterministic Execution with the Context Graph" },
  { sponsor: 'Tieto', session: "Multi-Rail Banking at Scale: Beating Margin through Volume" },
  { sponsor: 'Started PR', session: "After Hours Live Lounge: Banking Unfiltered" }, // Vision Stage — no scans even from temp scanner
  { sponsor: 'Credera', session: "Breakfast Boardroom: Building Trustworthy AI for Banking" },
  { sponsor: 'Element', session: "Promises vs Platforms: Can Modernisation Actually Deliver Momentum?" }, // Vision Stage — recovered
  { sponsor: 'Sage', session: "From ESG Promises to Real Change: Can Banking Deliver?" },
  { sponsor: 'NextWave Consulting', session: "The Agentic Bank: What's really working" },
  // Added 22 May after cross-check with sponsor-level totals from Grip
  { sponsor: 'OutSystems', session: "From Concept to Production: Reimagining Wealth Management with AI" }, // added 22 May
  { sponsor: 'Pometry', session: "Pometry is the context layer for enterprise." }, // added 22 May
  { sponsor: 'Impetus', session: "Modernise siloed data assets into trusted, AI-accessible knowledge with Impetus LeapLogic™ Suite" }, // added 22 May
  { sponsor: 'Rackspace Technology', session: "AI in Production: Control, Infrastructure and the Reality of Scaling" }, // added 22 May
  { sponsor: 'Temenos', session: "The Go-Live Imperative: De-Risking Transformation Whilst Accelerating Value" }, // added 22 May
];
