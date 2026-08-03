export const siteConfig = {
  name: "Genex",
  shortName: "Genex",
  domain: "genex.com.bd",
  url: "https://genex.com.bd",
  description:
    "স্কুল-কলেজ থেকে ভর্তি পরীক্ষা পর্যন্ত — দেশের সেরা শিক্ষকদের কোর্স, নোট, পরীক্ষা আর সার্টিফিকেট এক জায়গায়।",
  // Rendered in the marketing header and the footer contact column. Kept here
  // rather than in the components so a change lands in one place.
  contact: {
    address: "চকবাজার, চট্টগ্রাম",
    // Placeholder until the client supplies a real mailbox — see
    // GENEX_MIGRATION.md §10.
    email: "support@genex.com.bd",
    helpline: "01346-056468"
  }
} as const;
