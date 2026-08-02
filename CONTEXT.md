# Mehedi's Math Academy

An online learning platform where teachers publish courses and students enrol, study, and are assessed.
This glossary is the project's ubiquitous language. It defines what terms *mean*, never how they are built.

## Language

### People

**Deactivated User**:
An account that can no longer authenticate. It is the only terminal state a user account has — nothing is
ever erased, and every record the person produced is retained.
_Avoid_: Deleted user, soft-deleted user, removed user, banned user

**Staff**:
A Teacher, Accountant, or Admin — someone whose account an Admin creates on their behalf, rather than
someone who signed up. Creating an Admin is the one act that requires the creating Admin to prove who they
are again.
_Avoid_: Employee, internal user, back-office user

**Last Admin**:
The only remaining active Admin. The platform refuses to deactivate them, so the role can never be left
empty and locked out.
_Avoid_: Super admin, owner, root

### Courses

**Withdrawn Course**:
A course pulled from the catalog. It cannot be found or enrolled in, but everyone already enrolled keeps
full access for the life of their enrolment. Withdrawal is reversible; a restored course returns as a
Draft and must be approved again before it can take new enrolments.
_Avoid_: Deleted course, archived course, retired course, unpublished course

**Course Owner**:
A teacher who controls a course: who teaches it, its price, whether it goes for approval, and whether it
is withdrawn or restored. The teacher who created it is its first owner, ownership can be handed to
someone else, and a course is never left without one.
_Avoid_: Course creator, course admin, lead teacher

**Course Teacher**:
A teacher invited to work on a course's content — chapters, lectures, materials, tests, notices. They
cannot change who teaches it, its price, or its place in the catalog.
_Avoid_: Co-teacher, assistant, collaborator, instructor

**Exam-Only Course**:
A course sold as assessment alone: its chapters hold Tests and no Lectures. This is the one place the word
"exam" is used, and it is deliberately outward-facing — it describes what a buyer is purchasing, not what
a teacher builds.
_Avoid_: Assessment-only course, test-only course, practice course

### Enrolment and payment

**Enrolment**:
A student's standing right to study a course. An enrolment exists only once that right is real — for a
priced course that means the money has cleared. Its presence *is* access; no other check is needed.
_Avoid_: Registration, signup, purchase, subscription

**Checkout**:
A student's attempt to buy a priced course. It lives entirely on the payment record and produces no
Enrolment unless it succeeds. An abandoned checkout leaves a payment and nothing else.
_Avoid_: Pending enrolment, provisional enrolment

**Cancelled Enrolment**:
An enrolment whose right to study has been withdrawn, because the payment behind it was refunded.
Cancellation is about entitlement only and says nothing about how far the student got: someone who
finished the course and was later refunded is both Completed and Cancelled. Access ends; their progress,
submissions, comments, and completion record all survive.
_Avoid_: Revoked enrolment, dropped enrolment, expired enrolment

**Completed Enrolment**:
An enrolment where the student has watched every Lecture in the course and passed every published Test.
One rule covers both course kinds: an Exam-Only Course has no lectures, so only its Tests decide.
Completion is always something the student caused — it is reached by finishing a lecture or having work
graded, never by a teacher removing the content that was left. It then latches: a permanent fact about
what they achieved on the day, which adding content later never unmakes and a refund never touches. Their
certificate stays valid.
_Avoid_: Finished enrolment, graduated

**Refund**:
An accountant's record that money was returned for a payment. It is bookkeeping — the money itself moves
through the gateway out of band — and it always cancels the enrolment it paid for.
_Avoid_: Chargeback, reversal, credit

### Announcements

**Notice**:
A durable post a teacher pins to a course's noticeboard, readable by everyone enrolled. It stays until the
teacher removes it.
_Avoid_: Announcement, bulletin, post, notification

**Notification**:
A transient alert in one person's inbox telling them something happened and where to look. It is raised by
a domain event — a Notice being posted, a payment settling, a course being approved or rejected, a bug
report changing status — or by an Admin broadcasting deliberately. New messages are the deliberate
exception: the conversation's own live badge covers them.
_Avoid_: Alert, notice, push, ping

### Messaging

**Conversation**:
The single permanent thread between one teacher and one student. Nobody else can see it, and neither
participant can retract what they said.
_Avoid_: Chat, DM, thread, inbox

**Reported Conversation**:
A conversation a participant has flagged for a reason they give. Reporting is the only thing that grants
an Admin the right to read it, and only that one conversation. Every such read is recorded.
_Avoid_: Flagged chat, escalated thread

**Hidden Message**:
A message an Admin has removed from view after a report. It shows as removed by an administrator; the
original text is retained, because the point is to stop the harm, not to erase the evidence.
_Avoid_: Deleted message, redacted message

### Assessment

**Test**:
The assessable unit a teacher builds inside a chapter, made of MCQ or written Questions. This is the only
word for it, at every layer.
_Avoid_: Assessment, exam, quiz, paper

**Submission**:
One student's attempt at a Test. MCQ answers are graded on submission; written answers wait for a teacher.
Retakes are unlimited, and where a Test's result matters it is the student's best attempt that counts.
_Avoid_: Attempt, entry, response, sitting

**Passing a Test**:
Holding a graded submission whose score reaches the Test's passing score. A Test with no passing score set
is passed by any graded submission — the threshold is opt-in, not a default of zero.
_Avoid_: Clearing, qualifying, achieving
