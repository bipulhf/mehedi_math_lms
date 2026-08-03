/**
 * Content for `seed-demo-data.ts`, kept apart so the script stays readable as
 * logic and this stays readable as prose.
 *
 * Mixed Bangla and English on purpose — real courses will arrive in both, and a
 * catalogue seeded entirely in one language hides every place the layout only
 * fits the other. Bangla runs roughly 20% longer.
 */

/** Every demo account shares it. Development only; the script refuses to run elsewhere. */
export const DEMO_PASSWORD = "genex-demo-2026";

export interface LevelFixture {
  readonly description: string;
  readonly name: string;
  readonly slug: string;
}

/** Root categories. The browsing axis — লেভেল in the design. */
export const levelCategories: readonly LevelFixture[] = [
  {
    description: "নবম থেকে দ্বাদশ শ্রেণির নিয়মিত পড়াশোনা।",
    name: "স্কুল ও কলেজ",
    slug: "school-college"
  },
  {
    description: "বিশ্ববিদ্যালয় ও মেডিকেল ভর্তি পরীক্ষার প্রস্তুতি।",
    name: "ভর্তি পরীক্ষা",
    slug: "admission"
  },
  {
    description: "নিয়মিত মক টেস্ট আর বিষয়ভিত্তিক পরীক্ষা।",
    name: "পরীক্ষা ব্যাচ",
    slug: "exam-batch"
  },
  {
    description: "Practical, job-ready skills taught in Bangla.",
    name: "জব স্কিল",
    slug: "job-skills"
  }
];

export interface SubjectFixture {
  readonly description: string;
  readonly levelSlug: string;
  readonly name: string;
  readonly slug: string;
}

/** Child categories. The subject axis — বিষয় in the design. */
export const demoSubjects: readonly SubjectFixture[] = [
  {
    description: "গতি, বল, তাপ আর তড়িৎ — বোর্ড ও ভর্তি দুইটার জন্যই।",
    levelSlug: "school-college",
    name: "ফিজিক্স",
    slug: "physics"
  },
  {
    description: "বিক্রিয়া মুখস্থ না করে বোঝার কোর্স।",
    levelSlug: "school-college",
    name: "কেমিস্ট্রি",
    slug: "chemistry"
  },
  {
    description: "ক্যালকুলাস, ভেক্টর আর ম্যাট্রিক্স — ধাপে ধাপে।",
    levelSlug: "school-college",
    name: "গণিত",
    slug: "mathematics"
  },
  {
    description: "উদ্ভিদ ও প্রাণিবিজ্ঞান, ছবিসহ ব্যাখ্যা।",
    levelSlug: "school-college",
    name: "বায়োলজি",
    slug: "biology"
  },
  {
    description: "ইঞ্জিনিয়ারিং ও মেডিকেল ভর্তির পূর্ণাঙ্গ প্রস্তুতি।",
    levelSlug: "admission",
    name: "ভর্তি প্রস্তুতি",
    slug: "admission-prep"
  },
  {
    description: "Weekly mock tests with ranked results.",
    levelSlug: "exam-batch",
    name: "মক টেস্ট",
    slug: "mock-tests"
  },
  {
    description: "Web development, from HTML to a deployed app.",
    levelSlug: "job-skills",
    name: "প্রোগ্রামিং",
    slug: "programming"
  },
  {
    description: "Client hunting, pricing and delivery on Upwork and Fiverr.",
    levelSlug: "job-skills",
    name: "ফ্রিল্যান্সিং",
    slug: "freelancing"
  }
];

export interface TeacherFixture {
  readonly bio: string;
  readonly email: string;
  readonly name: string;
  readonly phone: string;
  readonly qualifications: string;
  readonly slug: string;
  readonly socialLinks: string;
  readonly specializations: string;
}

export const demoTeachers: readonly TeacherFixture[] = [
  {
    bio: "নয় বছর ধরে ফিজিক্স পড়াচ্ছি। সূত্র মুখস্থ করানোর চেয়ে কেন সূত্রটা এমন, সেটা বোঝানোতেই বেশি সময় দিই — একবার বুঝে গেলে আর ভুলবে না।",
    email: "tanvir.hasan@genex.demo",
    name: "তানভীর হাসান",
    phone: "01711-000001",
    qualifications: "বুয়েট, মেকানিক্যাল ইঞ্জিনিয়ারিং",
    slug: "tanvir-hasan",
    socialLinks: "https://facebook.com/genex.demo/tanvir",
    specializations: "ফিজিক্স · ভর্তি পরীক্ষা"
  },
  {
    bio: "রসায়ন ভয়ের বিষয় না। বিক্রিয়াগুলোর পেছনে একটা গল্প আছে, সেটা ধরতে পারলে বাকিটা সহজ।",
    email: "nusrat.jahan@genex.demo",
    name: "নুসরাত জাহান",
    phone: "01711-000002",
    qualifications: "ঢাকা বিশ্ববিদ্যালয়, রসায়ন",
    slug: "nusrat-jahan",
    socialLinks: "https://facebook.com/genex.demo/nusrat",
    specializations: "কেমিস্ট্রি · বায়োলজি"
  },
  {
    bio: "I teach mathematics the way I wish someone had taught me: slowly, with every step written down, and no jumps that only make sense to the person already holding the answer.",
    email: "rafiul.karim@genex.demo",
    name: "Rafiul Karim",
    phone: "01711-000003",
    qualifications: "MSc Mathematics, University of Dhaka",
    slug: "rafiul-karim",
    socialLinks: "https://linkedin.com/in/genex-demo-rafiul",
    specializations: "গণিত · মক টেস্ট"
  },
  {
    bio: "Six years building software, four of them teaching it. Every lesson ends with something that runs.",
    email: "sadia.rahman@genex.demo",
    name: "Sadia Rahman",
    phone: "01711-000004",
    qualifications: "BSc CSE, SUST · Senior Engineer",
    slug: "sadia-rahman",
    socialLinks: "https://github.com/genex-demo-sadia",
    specializations: "প্রোগ্রামিং · ফ্রিল্যান্সিং"
  }
];

export interface StudentFixture {
  readonly classOrGrade: string;
  readonly email: string;
  readonly institution: string;
  readonly name: string;
  readonly phone: string;
  readonly slug: string;
}

export const demoStudents: readonly StudentFixture[] = [
  {
    classOrGrade: "দ্বাদশ",
    email: "sabbir.ahmed@genex.demo",
    institution: "নটর ডেম কলেজ",
    name: "সাব্বির আহমেদ",
    phone: "01811-000001",
    slug: "sabbir-ahmed"
  },
  {
    classOrGrade: "একাদশ",
    email: "ayesha.siddika@genex.demo",
    institution: "ভিকারুননিসা নূন স্কুল অ্যান্ড কলেজ",
    name: "আয়েশা সিদ্দিকা",
    phone: "01811-000002",
    slug: "ayesha-siddika"
  },
  {
    classOrGrade: "দ্বাদশ",
    email: "mahin.chowdhury@genex.demo",
    institution: "চট্টগ্রাম কলেজ",
    name: "মাহিন চৌধুরী",
    phone: "01811-000003",
    slug: "mahin-chowdhury"
  },
  {
    classOrGrade: "Class 12",
    email: "tania.akter@genex.demo",
    institution: "Holy Cross College",
    name: "Tania Akter",
    phone: "01811-000004",
    slug: "tania-akter"
  },
  {
    classOrGrade: "দশম",
    email: "imran.hossain@genex.demo",
    institution: "রাজশাহী কলেজিয়েট স্কুল",
    name: "ইমরান হোসেন",
    phone: "01811-000005",
    slug: "imran-hossain"
  },
  {
    classOrGrade: "Graduate",
    email: "faria.noor@genex.demo",
    institution: "BRAC University",
    name: "Faria Noor",
    phone: "01811-000006",
    slug: "faria-noor"
  }
];

export interface LessonFixture {
  readonly durationSeconds: number;
  readonly isPreview: boolean;
  readonly title: string;
}

export interface ChapterFixture {
  readonly lessons: readonly LessonFixture[];
  readonly test?:
    | {
        readonly questions: readonly { readonly correctAnswer: string; readonly text: string }[];
        readonly title: string;
      }
    | undefined;
  readonly title: string;
}

export interface CourseFixture {
  readonly chapters: readonly ChapterFixture[];
  readonly description: string;
  readonly enrolledStudentCount: number;
  readonly isExamOnly: boolean;
  readonly price: string;
  readonly reviewComment: string;
  readonly slug: string;
  readonly status: "DRAFT" | "PENDING" | "PUBLISHED";
  readonly subjectSlug: string;
  readonly teacherSlug: string;
  readonly title: string;
}

function chapter(title: string, lessonTitles: readonly string[], freeCount: number): ChapterFixture {
  return {
    lessons: lessonTitles.map((lessonTitle, index) => ({
      durationSeconds: 1200 + index * 260,
      isPreview: index < freeCount,
      title: lessonTitle
    })),
    title
  };
}

const mcq = (title: string): ChapterFixture["test"] => ({
  questions: [
    { correctAnswer: "খ", text: "নিচের কোনটি সঠিক?" },
    { correctAnswer: "ক", text: "সংজ্ঞাটি কোন ক্ষেত্রে প্রযোজ্য?" },
    { correctAnswer: "গ", text: "একক কোনটি?" }
  ],
  title
});

export const demoCourses: readonly CourseFixture[] = [
  {
    chapters: [
      {
        ...chapter("ভেক্টর", ["ভেক্টরের ধারণা", "যোগ ও বিয়োগ", "স্কেলার গুণন", "সমস্যা সমাধান"], 2),
        test: mcq("ভেক্টর — অধ্যায় পরীক্ষা")
      },
      chapter("নিউটনীয় বলবিদ্যা", ["প্রথম সূত্র", "দ্বিতীয় সূত্র", "তৃতীয় সূত্র", "ঘর্ষণ", "সমস্যা"], 1),
      {
        ...chapter("তাপগতিবিদ্যা", ["তাপ ও তাপমাত্রা", "প্রথম সূত্র", "এনট্রপি"], 0),
        test: mcq("তাপগতিবিদ্যা — অধ্যায় পরীক্ষা")
      }
    ],
    description:
      "বুয়েট, চুয়েট ও কুয়েট ভর্তি পরীক্ষার ফিজিক্স অংশের পূর্ণাঙ্গ প্রস্তুতি। প্রতিটি অধ্যায় শেষে পরীক্ষা, আর প্রশ্ন করার সুযোগ তো আছেই।",
    enrolledStudentCount: 6,
    isExamOnly: false,
    price: "5900.00",
    reviewComment: "স্যারের পড়ানোর ধরনটা অন্যরকম। তাপগতিবিদ্যা এতদিনে বুঝলাম।",
    slug: "engineering-admission-physics",
    status: "PUBLISHED",
    subjectSlug: "physics",
    teacherSlug: "tanvir-hasan",
    title: "ইঞ্জিনিয়ারিং ভর্তি — ফিজিক্স"
  },
  {
    chapters: [
      {
        ...chapter("পরমাণুর গঠন", ["পরমাণু মডেল", "কোয়ান্টাম সংখ্যা", "ইলেকট্রন বিন্যাস"], 2),
        test: mcq("পরমাণুর গঠন — পরীক্ষা")
      },
      chapter("রাসায়নিক বন্ধন", ["আয়নিক বন্ধন", "সমযোজী বন্ধন", "ধাতব বন্ধন", "সংকরায়ন"], 1)
    ],
    description:
      "এইচএসসি রসায়ন প্রথম পত্রের পূর্ণ সিলেবাস, বোর্ড প্রশ্নের ধরন ধরে ধরে।",
    enrolledStudentCount: 5,
    isExamOnly: false,
    price: "3200.00",
    reviewComment: "নোটগুলো খুব কাজে দিয়েছে।",
    slug: "hsc-chemistry-first-paper",
    status: "PUBLISHED",
    subjectSlug: "chemistry",
    teacherSlug: "nusrat-jahan",
    title: "এইচএসসি কেমিস্ট্রি — ১ম পত্র"
  },
  {
    chapters: [
      {
        ...chapter("Limits and continuity", ["What a limit means", "One-sided limits", "Continuity"], 2),
        test: mcq("Limits — chapter test")
      },
      chapter("Differentiation", ["The derivative", "Product and quotient rules", "Chain rule", "Applications"], 1),
      chapter("Integration", ["Antiderivatives", "Definite integrals", "Area under a curve"], 0)
    ],
    description:
      "Calculus from the definition of a limit to definite integrals, with every step written out. Built for students who have been told they are 'not maths people'.",
    enrolledStudentCount: 4,
    isExamOnly: false,
    price: "4500.00",
    reviewComment: "Finally understood the chain rule. Worth every taka.",
    slug: "calculus-from-scratch",
    status: "PUBLISHED",
    subjectSlug: "mathematics",
    teacherSlug: "rafiul-karim",
    title: "Calculus from scratch"
  },
  {
    chapters: [
      {
        ...chapter("HTML ও CSS", ["ট্যাগ ও স্ট্রাকচার", "লেআউট", "রেসপন্সিভ ডিজাইন"], 2),
        test: mcq("HTML ও CSS — পরীক্ষা")
      },
      chapter("JavaScript", ["ভেরিয়েবল ও ফাংশন", "DOM", "ফেচ ও API", "প্রজেক্ট"], 1)
    ],
    description:
      "শূন্য থেকে শুরু করে একটা চালু ওয়েবসাইট — প্রতিটা ক্লাস শেষে হাতে কিছু একটা থাকবে যা সত্যিই চলে।",
    enrolledStudentCount: 6,
    isExamOnly: false,
    price: "2900.00",
    reviewComment: "প্রজেক্টগুলো সত্যিই কাজে লেগেছে, পোর্টফোলিওতে দিয়েছি।",
    slug: "web-development-bangla",
    status: "PUBLISHED",
    subjectSlug: "programming",
    teacherSlug: "sadia-rahman",
    title: "ওয়েব ডেভেলপমেন্ট — বাংলায়"
  },
  {
    chapters: [
      {
        ...chapter("মক টেস্ট রাউন্ড ১", ["পরীক্ষার নিয়ম", "সময় ব্যবস্থাপনা"], 1),
        test: mcq("মক টেস্ট ১")
      },
      {
        ...chapter("মক টেস্ট রাউন্ড ২", ["ভুল বিশ্লেষণ"], 0),
        test: mcq("মক টেস্ট ২")
      }
    ],
    description:
      "প্রতি সপ্তাহে একটা পূর্ণাঙ্গ মক টেস্ট, সাথে ভুলগুলোর বিশ্লেষণ। কোনো লেকচার নেই — শুধু পরীক্ষা।",
    enrolledStudentCount: 3,
    isExamOnly: true,
    price: "1500.00",
    reviewComment: "প্রতি সপ্তাহে পরীক্ষা দেওয়ার অভ্যাসটা হয়ে গেছে।",
    slug: "weekly-mock-test-batch",
    status: "PUBLISHED",
    subjectSlug: "mock-tests",
    teacherSlug: "rafiul-karim",
    title: "সাপ্তাহিক মক টেস্ট ব্যাচ"
  },
  {
    chapters: [
      chapter("Getting started", ["Choosing a platform", "Writing a profile"], 1),
      chapter("Winning work", ["Reading a brief", "Pricing", "Proposals that get replies"], 0)
    ],
    description:
      "Finding clients on Upwork and Fiverr, pricing work so it is worth doing, and delivering it without losing the client.",
    enrolledStudentCount: 2,
    isExamOnly: false,
    price: "1900.00",
    reviewComment: "Got my first client in three weeks.",
    slug: "freelancing-first-client",
    status: "PUBLISHED",
    subjectSlug: "freelancing",
    teacherSlug: "sadia-rahman",
    title: "Freelancing: your first client"
  },
  {
    chapters: [chapter("উদ্ভিদবিজ্ঞান", ["কোষ", "সালোকসংশ্লেষণ"], 1)],
    description: "এইচএসসি জীববিজ্ঞান প্রথম পত্র — এখনো তৈরি হচ্ছে।",
    enrolledStudentCount: 0,
    isExamOnly: false,
    price: "3400.00",
    reviewComment: "",
    slug: "hsc-biology-first-paper",
    status: "DRAFT",
    subjectSlug: "biology",
    teacherSlug: "nusrat-jahan",
    title: "এইচএসসি বায়োলজি — ১ম পত্র"
  },
  {
    chapters: [chapter("Admission overview", ["What the exam asks", "A study plan"], 1)],
    description:
      "A combined admission preparation track. Submitted for review and waiting on approval.",
    enrolledStudentCount: 0,
    isExamOnly: false,
    price: "6500.00",
    reviewComment: "",
    slug: "medical-admission-track",
    status: "PENDING",
    subjectSlug: "admission-prep",
    teacherSlug: "tanvir-hasan",
    title: "Medical admission track"
  }
];
