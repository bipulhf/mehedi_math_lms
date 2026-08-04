/**
 * Content for `seed-demo-data.ts`, kept apart so the script stays readable as
 * logic and this stays readable as prose.
 *
 * Mixed Bangla and English on purpose — real courses will arrive in both, and a
 * catalogue seeded entirely in one language hides every place the layout only
 * fits the other. Bangla runs roughly 20% longer.
 *
 * Every lesson points at a real, public YouTube video (an actual educator's
 * upload, not a placeholder file), every course has a real cover photo, and
 * every chapter test has real multiple-choice questions with four distinct
 * options — the seed used to insert `test_questions` with a bare
 * `correctAnswer` string and no `question_options` rows at all, which meant
 * every seeded exam had nothing a student could select and nothing the
 * grader (which reads `question_options.is_correct`) could grade.
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
  readonly imageSeed: string;
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
    imageSeed: "genex-teacher-tanvir",
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
    imageSeed: "genex-teacher-nusrat",
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
    imageSeed: "genex-teacher-rafiul",
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
    imageSeed: "genex-teacher-sadia",
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

export interface QuestionOptionFixture {
  readonly isCorrect: boolean;
  readonly text: string;
}

export interface QuestionFixture {
  readonly options: readonly QuestionOptionFixture[];
  readonly text: string;
}

export interface TestFixture {
  readonly questions: readonly QuestionFixture[];
  readonly title: string;
}

export interface LessonFixture {
  readonly durationSeconds: number;
  readonly isPreview: boolean;
  /** A real, public YouTube video id — stored as a full watch URL. */
  readonly youtubeVideoId: string;
  readonly title: string;
}

export interface ChapterFixture {
  readonly lessons: readonly LessonFixture[];
  readonly test?: TestFixture | undefined;
  readonly title: string;
}

export interface CourseFixture {
  readonly chapters: readonly ChapterFixture[];
  readonly description: string;
  readonly enrolledStudentCount: number;
  readonly imageSeed: string;
  readonly isExamOnly: boolean;
  readonly price: string;
  readonly reviewComments: readonly string[];
  readonly slug: string;
  readonly status: "DRAFT" | "PENDING" | "PUBLISHED";
  readonly subjectSlug: string;
  readonly teacherSlug: string;
  readonly title: string;
}

/** Four options, exactly one correct — matches what the grader actually reads. */
function q(text: string, options: readonly [string, string, string, string], correctIndex: 0 | 1 | 2 | 3): QuestionFixture {
  return {
    options: options.map((optionText, index) => ({
      isCorrect: index === correctIndex,
      text: optionText
    })),
    text
  };
}

function test(title: string, questions: readonly QuestionFixture[]): TestFixture {
  return { questions, title };
}

function lesson(title: string, youtubeVideoId: string, isPreview: boolean, index: number): LessonFixture {
  return { durationSeconds: 1080 + index * 240, isPreview, title, youtubeVideoId };
}

function chapter(
  title: string,
  lessons: readonly LessonFixture[],
  chapterTest?: TestFixture
): ChapterFixture {
  return { lessons, test: chapterTest, title };
}

// Real, publicly published YouTube videos, grouped by subject and reused
// across lessons in that subject — the same way a real catalogue links back
// to a handful of reference videos rather than commissioning one per lesson.
const PHYSICS_VIDEOS = ["MYt6P5eomRw", "EwSHKuSxX_8", "r4IMnzevBng", "gUOzLpnZfn4"] as const;
const CHEMISTRY_VIDEOS = ["o9ezTCjZsME", "V4Qztw-_BT8", "kK5Oib2UPW8", "FF4WceYk1YA"] as const;
const CALCULUS_VIDEOS = ["WUvTyaaNkzM", "9vKqVkMQHKk", "kfF40MiS7zA", "CfW845LNObM"] as const;
const BIOLOGY_VIDEOS = ["3wEU_G3ry9g", "3NLRsS4TlR0", "CMiPYHNNg28", "Yxm-WMYEpHg"] as const;
const PROGRAMMING_VIDEOS = ["a_iQb1lnAEQ", "916GWv2Qs08", "zJSY8tbf_ys", "kAiX0itnonM"] as const;
const FREELANCING_VIDEOS = ["X9HzntPbFdg", "MyTC0IRohcM", "DnetNoirovA", "W9EpApR6NXs"] as const;

function lessons(
  titles: readonly string[],
  pool: readonly string[],
  freeCount: number
): readonly LessonFixture[] {
  return titles.map((title, index) =>
    lesson(title, pool[index % pool.length]!, index < freeCount, index)
  );
}

export const demoCourses: readonly CourseFixture[] = [
  {
    chapters: [
      chapter(
        "ভেক্টর",
        lessons(["ভেক্টরের ধারণা", "যোগ ও বিয়োগ", "স্কেলার গুণন", "সমস্যা সমাধান"], PHYSICS_VIDEOS, 2),
        test("ভেক্টর — অধ্যায় পরীক্ষা", [
          q("ভেক্টর রাশি কোনটি?", ["দ্রুতি", "সরণ", "ভর", "সময়"], 1),
          q(
            "দুইটি ভেক্টরের লব্ধি সর্বোচ্চ হয় যখন তাদের মধ্যবর্তী কোণ কত?",
            ["0°", "90°", "180°", "270°"],
            0
          ),
          q("একক ভেক্টরের মান কত?", ["0", "1", "অসীম", "ভেক্টরের উপর নির্ভরশীল"], 1),
          q("নিচের কোনটি স্কেলার রাশি?", ["বল", "ভরবেগ", "কাজ", "ত্বরণ"], 2)
        ])
      ),
      chapter(
        "নিউটনীয় বলবিদ্যা",
        lessons(["প্রথম সূত্র", "দ্বিতীয় সূত্র", "তৃতীয় সূত্র", "ঘর্ষণ", "সমস্যা"], PHYSICS_VIDEOS, 1),
        test("নিউটনীয় বলবিদ্যা — অধ্যায় পরীক্ষা", [
          q("নিউটনের দ্বিতীয় সূত্র অনুযায়ী বল F = ?", ["ma", "mv", "m/a", "a/m"], 0),
          q("ঘর্ষণ বল কোন দিকে কাজ করে?", ["গতির দিকে", "গতির বিপরীত দিকে", "উপরের দিকে", "নিচের দিকে"], 1),
          q(
            "নিউটনের তৃতীয় সূত্র অনুযায়ী প্রতিটি ক্রিয়ার—",
            ["কোনো প্রতিক্রিয়া নেই", "সমান ও বিপরীতমুখী প্রতিক্রিয়া আছে", "দ্বিগুণ প্রতিক্রিয়া আছে", "অর্ধেক প্রতিক্রিয়া আছে"],
            1
          ),
          q("বলের একক কী?", ["জুল", "নিউটন", "ওয়াট", "প্যাসকেল"], 1)
        ])
      ),
      chapter(
        "তাপগতিবিদ্যা",
        lessons(["তাপ ও তাপমাত্রা", "প্রথম সূত্র", "এনট্রপি"], PHYSICS_VIDEOS, 0),
        test("তাপগতিবিদ্যা — অধ্যায় পরীক্ষা", [
          q(
            "তাপগতিবিদ্যার প্রথম সূত্র কোন রাশির সংরক্ষণ নীতি প্রকাশ করে?",
            ["ভরবেগ", "শক্তি", "চার্জ", "ভর"],
            1
          ),
          q("এনট্রপি কিসের পরিমাপ?", ["তাপমাত্রা", "বিশৃঙ্খলা", "চাপ", "আয়তন"], 1),
          q("পরম শূন্য তাপমাত্রা কত কেলভিন?", ["0 K", "100 K", "273 K", "373 K"], 0),
          q("সমোষ্ণ প্রক্রিয়ায় কোন রাশি স্থির থাকে?", ["চাপ", "তাপমাত্রা", "আয়তন", "এনট্রপি"], 1)
        ])
      )
    ],
    description:
      "বুয়েট, চুয়েট ও কুয়েট ভর্তি পরীক্ষার ফিজিক্স অংশের পূর্ণাঙ্গ প্রস্তুতি। প্রতিটি অধ্যায় শেষে পরীক্ষা, আর প্রশ্ন করার সুযোগ তো আছেই।",
    enrolledStudentCount: 6,
    imageSeed: "genex-course-physics",
    isExamOnly: false,
    price: "5900.00",
    reviewComments: [
      "স্যারের পড়ানোর ধরনটা অন্যরকম। তাপগতিবিদ্যা এতদিনে বুঝলাম।",
      "ভেক্টর নিয়ে এত সহজ করে আগে কেউ বোঝায়নি।",
      "প্রশ্ন করলে সাথে সাথে উত্তর পাই, এটাই সবচেয়ে ভালো লাগে।"
    ],
    slug: "engineering-admission-physics",
    status: "PUBLISHED",
    subjectSlug: "physics",
    teacherSlug: "tanvir-hasan",
    title: "ইঞ্জিনিয়ারিং ভর্তি — ফিজিক্স"
  },
  {
    chapters: [
      chapter(
        "পরমাণুর গঠন",
        lessons(["পরমাণু মডেল", "কোয়ান্টাম সংখ্যা", "ইলেকট্রন বিন্যাস"], CHEMISTRY_VIDEOS, 2),
        test("পরমাণুর গঠন — পরীক্ষা", [
          q("ইলেকট্রনের আবিষ্কারক কে?", ["রাদারফোর্ড", "জে জে থমসন", "নীলস বোর", "চ্যাডউইক"], 1),
          q(
            "একটি পরমাণুর নিউক্লিয়াসে কী থাকে?",
            ["শুধু ইলেকট্রন", "প্রোটন ও নিউট্রন", "শুধু প্রোটন", "শুধু নিউট্রন"],
            1
          ),
          q(
            "কোয়ান্টাম সংখ্যা l কী নির্দেশ করে?",
            ["শক্তিস্তর", "উপশক্তিস্তরের আকৃতি", "স্পিন", "ইলেকট্রন সংখ্যা"],
            1
          ),
          q("সোডিয়াম (Na) এর ইলেকট্রন বিন্যাস কোনটি?", ["2,8,1", "2,8,2", "2,8,8", "2,7,2"], 0)
        ])
      ),
      chapter(
        "রাসায়নিক বন্ধন",
        lessons(["আয়নিক বন্ধন", "সমযোজী বন্ধন", "ধাতব বন্ধন", "সংকরায়ন"], CHEMISTRY_VIDEOS, 1),
        test("রাসায়নিক বন্ধন — পরীক্ষা", [
          q("NaCl কোন ধরনের বন্ধনের উদাহরণ?", ["সমযোজী", "আয়নিক", "ধাতব", "হাইড্রোজেন"], 1),
          q(
            "সমযোজী বন্ধনে ইলেকট্রন কীভাবে থাকে?",
            ["স্থানান্তরিত হয়", "ভাগাভাগি হয়", "মুক্ত থাকে", "ধ্বংস হয়"],
            1
          ),
          q("H₂O অণুতে অক্সিজেনের সংকরায়ন কী?", ["sp", "sp²", "sp³", "sp³d"], 2),
          q("ধাতব বন্ধনে কী মুক্তভাবে চলাচল করে?", ["প্রোটন", "ইলেকট্রন", "নিউট্রন", "আয়ন"], 1)
        ])
      )
    ],
    description: "এইচএসসি রসায়ন প্রথম পত্রের পূর্ণ সিলেবাস, বোর্ড প্রশ্নের ধরন ধরে ধরে।",
    enrolledStudentCount: 5,
    imageSeed: "genex-course-chemistry",
    isExamOnly: false,
    price: "3200.00",
    reviewComments: [
      "নোটগুলো খুব কাজে দিয়েছে।",
      "বন্ধন অধ্যায়টা এখন আর ভয় লাগে না।",
      "ম্যামের বোঝানোর ধরন খুব গোছানো।"
    ],
    slug: "hsc-chemistry-first-paper",
    status: "PUBLISHED",
    subjectSlug: "chemistry",
    teacherSlug: "nusrat-jahan",
    title: "এইচএসসি কেমিস্ট্রি — ১ম পত্র"
  },
  {
    chapters: [
      chapter(
        "Limits and continuity",
        lessons(["What a limit means", "One-sided limits", "Continuity"], CALCULUS_VIDEOS, 2),
        test("Limits — chapter test", [
          q("What is lim(x→0) sin(x)/x?", ["0", "1", "∞", "undefined"], 1),
          q(
            "A function is continuous at a point if...",
            [
              "it is defined there",
              "the limit exists there",
              "the limit equals the function value there",
              "it is differentiable there"
            ],
            2
          ),
          q("lim(x→∞) 1/x equals?", ["1", "∞", "0", "undefined"], 2),
          q(
            "A one-sided limit from the left is written as?",
            ["lim(x→a+)", "lim(x→a−)", "lim(x→a)", "lim(x→−a)"],
            1
          )
        ])
      ),
      chapter(
        "Differentiation",
        lessons(
          ["The derivative", "Product and quotient rules", "Chain rule", "Applications"],
          CALCULUS_VIDEOS,
          1
        ),
        test("Differentiation — chapter test", [
          q("d/dx(xⁿ) = ?", ["nx^(n−1)", "x^(n−1)", "nxⁿ", "xⁿ/n"], 0),
          q("The derivative of a constant is?", ["1", "the constant itself", "0", "undefined"], 2),
          q("The product rule states d/dx(uv) = ?", ["u'v + uv'", "u'v'", "u'v − uv'", "u'/v"], 0),
          q("The derivative of sin(x) is?", ["−sin(x)", "cos(x)", "−cos(x)", "sin(x)"], 1)
        ])
      ),
      chapter(
        "Integration",
        lessons(["Antiderivatives", "Definite integrals", "Area under a curve"], CALCULUS_VIDEOS, 0)
      )
    ],
    description:
      "Calculus from the definition of a limit to definite integrals, with every step written out. Built for students who have been told they are 'not maths people'.",
    enrolledStudentCount: 4,
    imageSeed: "genex-course-calculus",
    isExamOnly: false,
    price: "4500.00",
    reviewComments: [
      "Finally understood the chain rule. Worth every taka.",
      "The pacing is perfect for someone who's always struggled with maths.",
      "Wish I'd found this before my first attempt at the exam."
    ],
    slug: "calculus-from-scratch",
    status: "PUBLISHED",
    subjectSlug: "mathematics",
    teacherSlug: "rafiul-karim",
    title: "Calculus from scratch"
  },
  {
    chapters: [
      chapter(
        "HTML ও CSS",
        lessons(["ট্যাগ ও স্ট্রাকচার", "লেআউট", "রেসপন্সিভ ডিজাইন"], PROGRAMMING_VIDEOS, 2),
        test("HTML ও CSS — পরীক্ষা", [
          q(
            "HTML এর পূর্ণরূপ কী?",
            ["HyperText Markup Language", "HighText Machine Language", "HyperTransfer Markup Language", "HomeTool Markup Language"],
            0
          ),
          q("CSS দিয়ে কী নিয়ন্ত্রণ করা হয়?", ["স্ট্রাকচার", "স্টাইল ও ডিজাইন", "লজিক", "ডেটাবেজ"], 1),
          q("<a> ট্যাগ কী কাজে ব্যবহৃত হয়?", ["ছবি দেখানো", "লিংক তৈরি", "টেবিল তৈরি", "ফর্ম তৈরি"], 1),
          q(
            "একটি HTML এলিমেন্টের CSS class সিলেক্ট করতে কোন সিম্বল ব্যবহার হয়?",
            ["#", ".", "@", "&"],
            1
          )
        ])
      ),
      chapter(
        "JavaScript",
        lessons(["ভেরিয়েবল ও ফাংশন", "DOM", "ফেচ ও API", "প্রজেক্ট"], PROGRAMMING_VIDEOS, 1),
        test("JavaScript — পরীক্ষা", [
          q(
            "JavaScript এ ভেরিয়েবল ঘোষণা করতে কোনটি ব্যবহার হয়?",
            ["var / let / const", "int", "string", "def"],
            0
          ),
          q(
            "DOM এর পূর্ণরূপ কী?",
            ["Document Object Model", "Data Object Model", "Document Oriented Model", "Digital Object Model"],
            0
          ),
          q(
            "== এবং === এর মধ্যে পার্থক্য কী?",
            ["কোনো পার্থক্য নেই", "=== টাইপ চেক করে", "== টাইপ চেক করে", "=== শুধু সংখ্যার জন্য"],
            1
          ),
          q(
            "fetch() ফাংশন কী কাজে ব্যবহৃত হয়?",
            ["DOM পরিবর্তন", "API থেকে ডেটা আনা", "ভেরিয়েবল ঘোষণা", "লুপ চালানো"],
            1
          )
        ])
      )
    ],
    description:
      "শূন্য থেকে শুরু করে একটা চালু ওয়েবসাইট — প্রতিটা ক্লাস শেষে হাতে কিছু একটা থাকবে যা সত্যিই চলে।",
    enrolledStudentCount: 6,
    imageSeed: "genex-course-webdev",
    isExamOnly: false,
    price: "2900.00",
    reviewComments: [
      "প্রজেক্টগুলো সত্যিই কাজে লেগেছে, পোর্টফোলিওতে দিয়েছি।",
      "একদম শূন্য থেকে শুরু করেও এখন নিজে নিজে সাইট বানাতে পারি।",
      "ম্যাম প্রতিটা লাইন কোড বুঝিয়ে বুঝিয়ে লেখান, এটাই সবচেয়ে ভালো।"
    ],
    slug: "web-development-bangla",
    status: "PUBLISHED",
    subjectSlug: "programming",
    teacherSlug: "sadia-rahman",
    title: "ওয়েব ডেভেলপমেন্ট — বাংলায়"
  },
  {
    chapters: [
      chapter(
        "মক টেস্ট রাউন্ড ১",
        lessons(["পরীক্ষার নিয়ম", "সময় ব্যবস্থাপনা"], PHYSICS_VIDEOS, 1),
        test("মক টেস্ট ১", [
          q("আলোর বেগ কত (প্রায়)?", ["৩×১০⁵ km/s", "৩×১০⁸ km/s", "৩×১০³ km/s", "৩×১০¹⁰ km/s"], 0),
          q("পানির রাসায়নিক সংকেত কী?", ["CO₂", "H₂O", "O₂", "NaCl"], 1),
          q("মানবদেহে হৃৎপিণ্ডের কয়টি প্রকোষ্ঠ থাকে?", ["২", "৩", "৪", "৫"], 2),
          q("১ কিলোমিটার সমান কত মিটার?", ["১০", "১০০", "১০০০", "১০০০০"], 2)
        ])
      ),
      chapter(
        "মক টেস্ট রাউন্ড ২",
        lessons(["ভুল বিশ্লেষণ"], PHYSICS_VIDEOS, 0),
        test("মক টেস্ট ২", [
          q("পিথাগোরাসের উপপাদ্য কোন ত্রিভুজের জন্য প্রযোজ্য?", ["সমবাহু", "সমকোণী", "সমদ্বিবাহু", "বিষমবাহু"], 1),
          q("অম্লের pH মান কত এর নিচে?", ["৭ এর নিচে", "৭ এর উপরে", "ঠিক ৭", "১৪ এর উপরে"], 0),
          q(
            "সালোকসংশ্লেষণে উদ্ভিদ কোন গ্যাস গ্রহণ করে?",
            ["অক্সিজেন", "কার্বন ডাই অক্সাইড", "নাইট্রোজেন", "হাইড্রোজেন"],
            1
          ),
          q("১ বছরে কত সপ্তাহ (প্রায়)?", ["৪২", "৫২", "৪৮", "৬০"], 1)
        ])
      )
    ],
    description:
      "প্রতি সপ্তাহে একটা পূর্ণাঙ্গ মক টেস্ট, সাথে ভুলগুলোর বিশ্লেষণ। কোনো লেকচার নেই — শুধু পরীক্ষা।",
    enrolledStudentCount: 3,
    imageSeed: "genex-course-mocktest",
    isExamOnly: true,
    price: "1500.00",
    reviewComments: [
      "প্রতি সপ্তাহে পরীক্ষা দেওয়ার অভ্যাসটা হয়ে গেছে।",
      "ভুল বিশ্লেষণ অংশটা সবচেয়ে বেশি কাজে দেয়।"
    ],
    slug: "weekly-mock-test-batch",
    status: "PUBLISHED",
    subjectSlug: "mock-tests",
    teacherSlug: "rafiul-karim",
    title: "সাপ্তাহিক মক টেস্ট ব্যাচ"
  },
  {
    chapters: [
      chapter("Getting started", lessons(["Choosing a platform", "Writing a profile"], FREELANCING_VIDEOS, 1)),
      chapter(
        "Winning work",
        lessons(["Reading a brief", "Pricing", "Proposals that get replies"], FREELANCING_VIDEOS, 0)
      )
    ],
    description:
      "Finding clients on Upwork and Fiverr, pricing work so it is worth doing, and delivering it without losing the client.",
    enrolledStudentCount: 2,
    imageSeed: "genex-course-freelancing",
    isExamOnly: false,
    price: "1900.00",
    reviewComments: ["Got my first client in three weeks.", "The pricing module alone paid for the course."],
    slug: "freelancing-first-client",
    status: "PUBLISHED",
    subjectSlug: "freelancing",
    teacherSlug: "sadia-rahman",
    title: "Freelancing: your first client"
  },
  {
    chapters: [
      chapter(
        "উদ্ভিদবিজ্ঞান",
        lessons(["কোষ", "সালোকসংশ্লেষণ"], BIOLOGY_VIDEOS, 1),
        test("উদ্ভিদবিজ্ঞান — পরীক্ষা", [
          q(
            "উদ্ভিদ কোষে কোন অঙ্গাণু সালোকসংশ্লেষণ করে?",
            ["মাইটোকন্ড্রিয়া", "ক্লোরোপ্লাস্ট", "নিউক্লিয়াস", "রাইবোজোম"],
            1
          ),
          q("উদ্ভিদ কোষপ্রাচীর কী দিয়ে তৈরি?", ["প্রোটিন", "সেলুলোজ", "লিপিড", "চিটিন"], 1),
          q("সালোকসংশ্লেষণে উৎপন্ন গ্যাস কোনটি?", ["CO₂", "O₂", "N₂", "H₂"], 1),
          q(
            "উদ্ভিদকোষ ও প্রাণীকোষের প্রধান পার্থক্য কী?",
            ["নিউক্লিয়াসের উপস্থিতি", "কোষপ্রাচীর ও ক্লোরোপ্লাস্টের উপস্থিতি", "মাইটোকন্ড্রিয়ার উপস্থিতি", "রাইবোজোমের উপস্থিতি"],
            1
          )
        ])
      )
    ],
    description: "এইচএসসি জীববিজ্ঞান প্রথম পত্র — এখনো তৈরি হচ্ছে।",
    enrolledStudentCount: 0,
    imageSeed: "genex-course-biology",
    isExamOnly: false,
    price: "3400.00",
    reviewComments: [],
    slug: "hsc-biology-first-paper",
    status: "DRAFT",
    subjectSlug: "biology",
    teacherSlug: "nusrat-jahan",
    title: "এইচএসসি বায়োলজি — ১ম পত্র"
  },
  {
    chapters: [chapter("Admission overview", lessons(["What the exam asks", "A study plan"], PHYSICS_VIDEOS, 1))],
    description:
      "A combined admission preparation track. Submitted for review and waiting on approval.",
    enrolledStudentCount: 0,
    imageSeed: "genex-course-admission",
    isExamOnly: false,
    price: "6500.00",
    reviewComments: [],
    slug: "medical-admission-track",
    status: "PENDING",
    subjectSlug: "admission-prep",
    teacherSlug: "tanvir-hasan",
    title: "Medical admission track"
  }
];
