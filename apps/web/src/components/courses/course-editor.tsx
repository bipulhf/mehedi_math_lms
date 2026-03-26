import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { 
  Info, 
  Image as ImageIcon, 
  Users, 
  SearchCheck, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  ShieldAlert, 
  AlertCircle,
  X,
  Send,
  Layers3,
  ArrowRight
} from "lucide-react";

import { CategorySelector } from "@/components/categories/category-selector";
import { FadeIn } from "@/components/common/fade-in";
import { ImageCropUploader } from "@/components/uploads/image-crop-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryNode } from "@/lib/api/categories";
import type { CourseTeacherOption, CreateCourseInput } from "@/lib/api/courses";
import { uploadCourseCover } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

export interface CourseEditorValues extends CreateCourseInput {
  teacherIds: readonly string[];
}

type EditorAction = "save" | "submit";

interface CourseEditorProps {
  categories: readonly CategoryNode[];
  description: string;
  initialValues: CourseEditorValues;
  isSaving: boolean;
  onCommit: (values: CourseEditorValues, action: EditorAction) => Promise<void>;
  teachers: readonly CourseTeacherOption[];
  title: string;
}

interface CourseEditorErrors {
  categoryId?: string | undefined;
  description?: string | undefined;
  price?: string | undefined;
  teacherIds?: string | undefined;
  title?: string | undefined;
}

const editorSteps = [
  {
    description: "Definition of academic fundamentals",
    id: "basics",
    title: "Basic Details",
    icon: Info
  },
  {
    description: "Visual identity and indexing",
    id: "cover",
    title: "Cover Imagery",
    icon: ImageIcon
  },
  {
    description: "Instructional leadership assignment",
    id: "teachers",
    title: "Leadership",
    icon: Users
  },
  {
    description: "Consolidated curatorial review",
    id: "review",
    title: "Full Audit",
    icon: SearchCheck
  }
] as const;

function flattenCategories(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function validate(values: CourseEditorValues): CourseEditorErrors {
  const errors: CourseEditorErrors = {};
  if (values.title.trim().length < 3) errors.title = "At least 3 characters required for academic title";
  if (values.description.trim().length < 24) errors.description = "Provide a comprehensive description (24+ chars)";
  if (!values.categoryId) errors.categoryId = "A valid academic category must be selected";
  if (Number.isNaN(values.price) || values.price < 0) errors.price = "Tuition fee cannot be negative";
  if (values.teacherIds.length === 0) errors.teacherIds = "At least one lead instructor is required";
  return errors;
}

function Required() {
  return <span className="text-red-500 ml-1 font-black">*</span>;
}

export function CourseEditor({
  categories,
  initialValues,
  isSaving,
  onCommit,
  teachers,
}: CourseEditorProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<CourseEditorErrors>({});
  const [values, setValues] = useState<CourseEditorValues>(initialValues);

  useEffect(() => { setValues(initialValues); }, [initialValues]);

  const selectedTeachers = useMemo(
    () => teachers.filter((teacher) => values.teacherIds.includes(teacher.id)),
    [teachers, values.teacherIds]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 0) {
      return values.title.trim().length >= 3 && !!values.categoryId && values.description.trim().length >= 24;
    }
    if (currentStep === 1) {
      return !!values.coverImageUrl;
    }
    if (currentStep === 2) {
      return values.teacherIds.length > 0;
    }
    return true;
  }, [currentStep, values]);

  const handleToggleTeacher = (teacherId: string): void => {
    setValues((currentValues) => ({
      ...currentValues,
      teacherIds: currentValues.teacherIds.includes(teacherId)
        ? currentValues.teacherIds.filter((id) => id !== teacherId)
        : [...currentValues.teacherIds, teacherId]
    }));
  };

  const handleNext = () => {
    if (!canContinue) return;
    setCurrentStep(s => Math.min(s + 1, editorSteps.length - 1));
  };

  const handleCommit = async (action: EditorAction): Promise<void> => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("The proposal has integrity errors. Review before submission.");
      return;
    }
    await onCommit(values, action);
  };

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-3xl rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-1000 min-h-160 flex flex-col">
      {/* Horizontal Top Stepper */}
      <nav className="bg-surface-container-low/30 border-b border-outline-variant/10 p-6 sm:p-8">
         <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
               {editorSteps.map((step, index) => {
                 const Icon = step.icon;
                 const isActive = index === currentStep;
                 const isCompleted = index < currentStep;

                 return (
                   <div key={step.id} className="flex items-center group/step shrink-0 last:flex-1 last:justify-end">
                      <button
                        onClick={() => {
                          // Allow clicking back or jump to any step IF previous steps are valid (or just simpler: allow clicking back)
                          if (index < currentStep) setCurrentStep(index);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 transition-all duration-300",
                          isActive ? "opacity-100" : isCompleted ? "opacity-80" : "opacity-40"
                        )}
                        disabled={index > currentStep}
                      >
                         <div className={cn(
                           "size-10 sm:size-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                           isActive ? "bg-primary text-white shadow-lg scale-110" : isCompleted ? "bg-green-500/10 text-green-500" : "bg-surface-container-highest/50 text-on-surface/30"
                         )}>
                            {isCompleted ? <CheckCircle2 className="size-5 sm:size-6" /> : <Icon className="size-5 sm:size-6" />}
                         </div>
                         <span className={cn("text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-widest hidden sm:block", isActive ? "text-primary" : "text-on-surface")}>
                            {step.title}
                         </span>
                      </button>
                      
                      {index < editorSteps.length - 1 && (
                         <div className="mx-4 sm:mx-8 w-8 sm:w-16 h-px bg-outline-variant/20 relative">
                            <div 
                              className={cn("absolute inset-y-0 left-0 bg-primary transition-all duration-700", isCompleted ? "w-full" : "w-0")}
                            />
                         </div>
                      )}
                   </div>
                 );
               })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                  <Badge tone="violet" className="rounded-full px-4 py-1.5 text-[0.6rem] bg-violet-500/10 font-black border-violet-500/20 uppercase tracking-widest">LAYER 0{currentStep + 1}</Badge>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-32 sm:w-48 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                     <div 
                       className="h-full bg-primary transition-all duration-700" 
                       style={{ width: `${((currentStep + 1) / editorSteps.length) * 100}%` }}
                     />
                  </div>
                  <span className="text-xs font-bold font-mono text-primary text-right min-w-[3ch]">{Math.round(((currentStep + 1) / editorSteps.length) * 100)}%</span>
               </div>
            </div>
         </div>
      </nav>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 sm:p-12 flex-1 max-w-5xl mx-auto w-full">
           <div className="mb-10 text-center sm:text-left">
              <h4 className="text-2xl sm:text-3xl font-headline font-extrabold text-on-surface tracking-tight mb-2 leading-tight">
                {editorSteps[currentStep]!.description}
              </h4>
              <p className="text-sm text-on-surface/40 font-medium italic">All fields marked with <Required /> are required for curatorial clearance.</p>
           </div>

           <div className="mt-8">
              {currentStep === 0 && (
                 <FadeIn className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="course-title" className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                        Scientific Offer Title <Required />
                      </Label>
                      <Input 
                        id="course-title" 
                        error={errors.title} 
                        placeholder="e.g. Higher Math: The Final Sprint 2024" 
                        className="h-14 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body text-base" 
                        value={values.title} 
                        onChange={(e) => setValues(cv => ({ ...cv, title: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="course-category" className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                         Subject Classification <Required />
                      </Label>
                      <CategorySelector categories={categories} error={errors.categoryId} id="course-category" includeRootOption={false} value={values.categoryId} onChange={(v) => setValues(cv => ({ ...cv, categoryId: v }))}  />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="course-price" className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                         Course Tuition (BDT) <Required />
                      </Label>
                      <Input id="course-price" error={errors.price} min={0} step="100" type="number" placeholder="0 for curated free courses" className="h-14 rounded-2xl bg-surface-container-low/50 border-outline-variant/30 font-body text-base" value={values.price} onChange={(e) => setValues(cv => ({ ...cv, price: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="course-description" className="text-[0.65rem] font-bold uppercase tracking-widest ml-1 opacity-50">
                         Academic Brief <Required />
                      </Label>
                      <Textarea id="course-description" error={errors.description} placeholder="Detail the syllabus, outcomes, and prerequisites for the approval committee... (min 24 chars)" className="min-h-40 rounded-3xl bg-surface-container-low/50 border-outline-variant/30 font-body text-base leading-relaxed p-6" value={values.description} onChange={(e) => setValues(cv => ({ ...cv, description: e.target.value }))} />
                    </div>
                    
                    <div className="md:col-span-2">
                       <label className="flex items-start gap-4 p-6 rounded-3xl border border-outline-variant/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={values.isExamOnly} 
                            onChange={(e) => setValues(cv => ({ ...cv, isExamOnly: e.target.checked }))} 
                            className="size-5 mt-1 accent-primary transition-all"
                          />
                          <div className="flex flex-col gap-1">
                             <span className="text-sm font-bold text-on-surface">Enactive Assessment Mode</span>
                             <span className="text-xs text-on-surface/50 font-medium">When active, students bypass regular lessons for direct specialized examination.</span>
                          </div>
                       </label>
                    </div>
                 </FadeIn>
              )}

              {currentStep === 1 && (
                 <FadeIn className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-6">
                       <div className="bg-surface-container-low/40 rounded-4xl p-8 border border-outline-variant/20 relative overflow-hidden flex flex-col items-center text-center">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl z-[-1]" />
                          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                             <ImageIcon className="size-8" />
                          </div>
                          <h5 className="font-headline text-lg font-bold mb-2">Visual Signifier <Required /></h5>
                          <p className="text-xs text-on-surface/40 max-w-xs leading-relaxed mb-6">Anchor your offering with a high-resolution 16:9 cover image optimized for the public catalog.</p>
                          
                          <ImageCropUploader
                            aspect={16 / 9}
                            buttonLabel={values.coverImageUrl ? "Modify Visual" : "Assign Coverage"}
                            description="1280x720 recommended."
                            label="Signifier Upload"
                            previewAlt="Course signify"
                            successMessage="Coverage updated"
                            value={values.coverImageUrl ?? ""}
                            onUploadFile={uploadCourseCover}
                            onValueChange={(url) => setValues(cv => ({ ...cv, coverImageUrl: url || undefined }))}
                          />

                          {values.coverImageUrl && (
                             <Button variant="ghost" size="sm" className="mt-4 text-red-500/60 hover:text-red-500" onClick={() => setValues(cv => ({ ...cv, coverImageUrl: undefined }))}>
                                <X className="size-4 mr-2" /> Discard
                             </Button>
                          )}
                       </div>
                    </div>

                    <div className="relative group">
                       <div className={cn(
                         "aspect-video w-full rounded-4xl border overflow-hidden bg-surface-container-low transition-all duration-500",
                         values.coverImageUrl ? "border-outline-variant/40 shadow-2xl" : "border-outline-variant/10 border-dashed"
                       )}>
                          {values.coverImageUrl ? (
                            <img src={values.coverImageUrl} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Preview" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-primary/5 to-secondary/5 opacity-40">
                               <span className="font-display font-black text-4xl sm:text-6xl tracking-tighter text-on-surface/10">PREVIEW</span>
                            </div>
                          )}
                       </div>
                       <div className="absolute -bottom-4 -left-4 px-6 py-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl flex items-center gap-4">
                          <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                             <ShieldAlert className="size-5" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[0.6rem] font-bold uppercase tracking-widest text-on-surface/40">Audit Note</span>
                             <span className="text-[0.7rem] font-extrabold text-on-surface leading-none">Catalog Alignment Enabled</span>
                          </div>
                       </div>
                    </div>
                 </FadeIn>
              )}

              {currentStep === 2 && (
                 <FadeIn className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-6">
                       <div>
                          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary mb-2">Lead Instructors <Required /></p>
                          <h5 className="text-xl font-headline font-extrabold text-on-surface leading-tight">Assign Academic Leadership</h5>
                       </div>
                       <Badge tone="gray" className="rounded-xl px-4 py-2 font-bold text-[0.65rem] border border-outline-variant/20">{values.teacherIds.length} Selected</Badge>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {teachers.map((teacher) => {
                        const isSelected = values.teacherIds.includes(teacher.id);
                        return (
                          <button
                            key={teacher.id}
                            onClick={() => handleToggleTeacher(teacher.id)}
                            className={cn(
                              "group p-6 rounded-4xl border text-left transition-all duration-300 relative overflow-hidden",
                              isSelected 
                                ? "bg-primary/5 border-primary/40 shadow-xl" 
                                : "bg-surface-container-low/20 border-outline-variant/10 hover:border-primary/20 hover:bg-surface-container-low/30"
                            )}
                          >
                            {isSelected && <div className="absolute top-4 right-4 text-primary"><CheckCircle2 className="size-5 shadow-sm" /></div>}
                            <div className="flex items-center gap-4 mb-4">
                               <div className="size-12 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center font-headline font-bold text-primary group-hover:scale-110 transition-transform shrink-0">
                                  {teacher.name.charAt(0)}
                               </div>
                               <div className="flex flex-col min-w-0">
                                  <span className="font-headline font-bold text-on-surface leading-none mb-1 truncate">{teacher.name}</span>
                                  <span className="text-xs text-on-surface/40 italic truncate">{teacher.email}</span>
                               </div>
                            </div>
                            {teacher.bio && <p className="text-xs leading-relaxed text-on-surface/60 line-clamp-2">{teacher.bio}</p>}
                          </button>
                        );
                      })}
                    </div>
                 </FadeIn>
              )}

              {currentStep === 3 && (
                 <FadeIn className="grid gap-8 lg:grid-cols-2 items-start">
                    <div className="space-y-6">
                      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-4xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                         <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/2 rounded-full blur-2xl z-[-1]" />
                         <p className="text-[0.6rem] font-bold uppercase tracking-widest text-primary mb-6">Proposed Curriculum Snapshot</p>
                         
                         <div className="space-y-8">
                            <section>
                               <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-on-surface/40 mb-3">Academic Nomenclature</h6>
                               <p className="font-headline text-xl sm:text-2xl font-extrabold text-on-surface leading-tight">{values.title || "Untitled curriculum"}</p>
                            </section>

                            <div className="grid grid-cols-2 gap-8">
                               <section>
                                  <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-on-surface/40 mb-2">Subject Classification</h6>
                                  <div className="flex items-center gap-2">
                                     <Layers3 className="size-3.5 text-primary/60" />
                                     <span className="text-sm font-bold text-on-surface/80">{flattenCategories(categories).find(c => c.id === values.categoryId)?.name ?? "Unspecified"}</span>
                                  </div>
                               </section>
                               <section>
                                  <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-on-surface/40 mb-2">Tuition Model</h6>
                                  <div className="flex items-center gap-2">
                                     <Badge tone="blue" className="rounded-full text-[0.65rem] px-3 font-black">
                                        {values.price > 0 ? `BDT ${values.price.toLocaleString()}` : "Gratuitous"}
                                     </Badge>
                                  </div>
                               </section>
                            </div>

                            <section className="bg-surface-container-low/30 p-5 rounded-3xl border border-outline-variant/10">
                               <h6 className="text-[0.6rem] uppercase font-bold tracking-[0.2em] text-on-surface/40 mb-3">Instructional Leadership</h6>
                               <div className="flex flex-wrap gap-2">
                                  {selectedTeachers.length > 0 ? (
                                     selectedTeachers.map(t => <Badge key={t.id} tone="gray" className="rounded-xl px-2.5 py-1 text-[0.65rem] bg-white border border-outline-variant/30">{t.name}</Badge>)
                                  ) : (
                                     <span className="text-xs text-red-500 font-bold flex items-center gap-1.5"><AlertCircle className="size-3.5" /> No instructors assigned</span>
                                  )}
                               </div>
                            </section>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                       <div className="bg-primary shadow-2xl rounded-4xl p-6 sm:p-8 text-white relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                         <div className="relative z-10">
                            <h5 className="font-headline text-xl sm:text-2xl font-extrabold mb-3 leading-tight">Curatorial Authorization</h5>
                            <p className="text-sm text-white/70 font-light leading-relaxed mb-8">Save this curriculum as an internal draft for ongoing edits, or push it into the operational review queue for validation.</p>
                            
                            <div className="flex flex-col gap-3">
                               <Button 
                                 className="h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-headline font-extrabold shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" 
                                 onClick={() => handleCommit("submit")}
                                 disabled={isSaving}
                               >
                                  <Send className="size-5 mr-3" />
                                  Submit for Peer Review
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 className="h-14 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white font-bold transition-all border border-white/10" 
                                 onClick={() => handleCommit("save")}
                                 disabled={isSaving}
                               >
                                  Save Internal Draft
                               </Button>
                            </div>
                         </div>
                       </div>

                       <div className="bg-surface-container-lowest border border-dashed border-outline-variant/40 rounded-3xl p-6">
                          <div className="flex items-center gap-3 text-on-surface/40 mb-2">
                             <Info className="size-4" />
                             <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em]">Operational Note</span>
                          </div>
                          <p className="text-xs text-on-surface/50 font-medium italic leading-relaxed">By submitting, you acknowledge that our board will review the curation index, syllabus depth, and instructional readiness.</p>
                       </div>
                    </div>
                 </FadeIn>
              )}
           </div>
        </div>

        {/* Navigation Bar */}
        <footer className="p-6 sm:p-8 sm:px-12 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-between sticky bottom-0 z-50 backdrop-blur-md">
           <Button
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => Math.max(s - 1, 0))}
              className="h-12 rounded-2xl px-6 sm:px-8 font-bold text-on-surface/60 border-outline-variant/30 hover:bg-surface-container-low transition-all"
            >
              <ChevronLeft className="size-5 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Previous Layer</span>
            </Button>

            {currentStep < editorSteps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canContinue}
                className={cn(
                  "h-12 rounded-2xl px-8 sm:px-10 font-headline font-extrabold shadow-lg transition-all",
                  canContinue 
                    ? "bg-primary hover:bg-primary-hover hover:scale-[1.05] active:scale-[0.95]" 
                    : "bg-surface-container-highest text-on-surface/30 cursor-not-allowed border border-outline-variant/10"
                )}
              >
                Continuum
                <ChevronRight className="size-5 ml-2" />
              </Button>
            ) : (
              <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-widest text-primary animate-pulse py-2">
                 Audit in Progress <ArrowRight className="size-4" />
              </div>
            )}
        </footer>
      </div>
    </div>
  );
}

export function CourseEditorSkeleton(): JSX.Element {
  return (
    <div className="bg-surface-container-lowest rounded-4xl border border-outline-variant/40 shadow-xl overflow-hidden min-h-160 flex flex-col">
       <div className="p-8 border-b border-outline-variant/10 flex justify-between">
          <Skeleton className="h-12 w-48 bg-surface-container-high rounded-2xl" />
          <Skeleton className="h-12 w-48 bg-surface-container-high rounded-2xl" />
       </div>
       <div className="p-12 space-y-10 flex-1">
          <div className="space-y-4 max-w-sm mx-auto sm:mx-0">
             <Skeleton className="h-5 w-32 bg-surface-container-high rounded-full" />
             <Skeleton className="h-10 w-full bg-surface-container-high rounded-xl" />
          </div>
          <div className="grid gap-8 md:grid-cols-2">
             <Skeleton className="h-14 w-full bg-surface-container-high rounded-2xl md:col-span-2" />
             <Skeleton className="h-14 w-full bg-surface-container-high rounded-2xl" />
             <Skeleton className="h-14 w-full bg-surface-container-high rounded-2xl" />
             <Skeleton className="h-40 w-full bg-surface-container-high rounded-3xl md:col-span-2" />
          </div>
       </div>
       <div className="p-8 border-t border-outline-variant/10 flex justify-between">
          <Skeleton className="h-12 w-32 bg-surface-container-high rounded-2xl" />
          <Skeleton className="h-12 w-32 bg-surface-container-high rounded-2xl" />
       </div>
    </div>
  );
}
