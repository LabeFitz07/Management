import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import {
  MAX_TASK_SUBMISSION_FILE_BYTES,
  MAX_TASK_SUBMISSION_FILES,
} from "@/lib/task-file-storage";
import { getTaskDetailById, type TaskReferenceFile, type TaskSubmission } from "@/lib/task-store";
import {
  TASK_STATUS_META,
  formatTaskDate,
  formatTaskDateTime,
  formatTaskFileSize,
  getTaskDueClass,
  getTaskDueLabel,
} from "@/lib/task-ui";
import { submitTaskForReview, updateTaskStatus } from "@/app/task-actions";

type StaffTaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
  searchParams?: Promise<{
    status?: string;
  }>;
};

const STATUS_MESSAGES: Record<string, { className: string; text: string }> = {
  submitted: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Your work was submitted for review. Wait for reviewer feedback or approval.",
  },
  files: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    text: "Upload up to 5 supported files, each under 25 MB.",
  },
};

const FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.wps,.zip,.txt,.csv,.mp4,.mov,.webm";

function WorkspaceStatusBanner({
  status,
  latestReviewNote,
}: {
  status: string;
  latestReviewNote: string;
}) {
  if (status === "submitted") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Your work is waiting for review. The reviewer will approve it or request changes from this task record.
      </section>
    );
  }

  if (status === "approved") {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
        This task has been approved. Your submission history and attachments remain available below.
      </section>
    );
  }

  if (status === "changes_requested") {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-700">
        Changes were requested on your latest submission.
        {latestReviewNote ? ` Reviewer note: ${latestReviewNote}` : " Open the submission history below, update your work, then resubmit."}
      </section>
    );
  }

  return null;
}

function ReferenceFilesPanel({
  files,
}: {
  files: TaskReferenceFile[];
}) {
  if (!files || files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-950">No manager files yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          If the admin or HR reviewer uploads forms, papers, or reference documents, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{file.originalName}</p>
            <p className="text-xs text-slate-500">
              {file.mimeType} | {formatTaskFileSize(file.sizeBytes)}
            </p>
          </div>
          {file.downloadUrl ? (
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              Open File
            </a>
          ) : (
            <span className="text-xs text-slate-400">File preview unavailable</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SubmissionHistory({
  submissions,
}: {
  submissions: TaskSubmission[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-950">No submissions yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add your work note and attachments below when you are ready to submit for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <article
          key={submission.id}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-950">Submission v{submission.version}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${TASK_STATUS_META[submission.reviewStatus].badgeClass}`}
                >
                  {TASK_STATUS_META[submission.reviewStatus].label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Submitted by {submission.submittedByName} on {formatTaskDateTime(submission.submittedAt)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {submission.submissionNote}
          </div>

          {submission.files.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Attachments
              </p>
              <div className="mt-3 space-y-2">
                {submission.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{file.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {file.mimeType} | {formatTaskFileSize(file.sizeBytes)}
                      </p>
                    </div>
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      >
                        Open File
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">File preview unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {submission.reviewedAt ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Reviewer Decision
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {submission.reviewedByName} reviewed this on {formatTaskDateTime(submission.reviewedAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {submission.reviewNote || "No additional reviewer note."}
              </p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default async function StaffTaskDetailPage({
  params,
  searchParams,
}: StaffTaskDetailPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  const { taskId } = await params;

  if (accessProfile.roles.includes("admin") || accessProfile.roles.includes("hr")) {
    redirect(`/dashboard/tasks/${taskId}`);
  }

  const detail = await getTaskDetailById(taskId);

  if (!detail) {
    redirect("/staff");
  }

  const paramsState = (await searchParams) ?? {};
  const message = paramsState.status ? STATUS_MESSAGES[paramsState.status] : null;
  const latestSubmission = detail.submissions[0] ?? null;
  const latestReviewNote =
    latestSubmission?.reviewStatus === "changes_requested" ? latestSubmission.reviewNote : "";
  const canSubmitForReview =
    detail.task.status === "in_progress" || detail.task.status === "changes_requested";

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Task Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {detail.task.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Upload work evidence, describe what was completed, and submit it for reviewer approval.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/staff"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Back to Queue
              </Link>
              <Link
                href="/notifications"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Notifications
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <section className={`rounded-2xl border p-5 text-sm leading-6 ${message.className}`}>
            {message.text}
          </section>
        ) : null}

        <WorkspaceStatusBanner status={detail.task.status} latestReviewNote={latestReviewNote} />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${TASK_STATUS_META[detail.task.status].badgeClass}`}
                >
                  {TASK_STATUS_META[detail.task.status].label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getTaskDueClass(detail.task)}`}
                >
                  {getTaskDueLabel(detail.task)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reviewer
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{detail.task.reviewerName}</p>
                  <p className="mt-1 text-sm text-slate-600">{detail.task.reviewerEmail || "No email available"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Due Date
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {detail.task.dueDate ? formatTaskDate(detail.task.dueDate) : "Not set"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Keep uploads and notes tied to the assigned work.</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Assignment Brief
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {detail.task.description || "No additional instructions were added for this task."}
                </p>
              </div>

              {detail.task.status !== "submitted" && detail.task.status !== "approved" ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {detail.task.status !== "in_progress" ? (
                    <form action={updateTaskStatus}>
                      <input type="hidden" name="id" value={detail.task.id} />
                      <input type="hidden" name="status" value="in_progress" />
                      <button
                        type="submit"
                        className="min-h-12 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        {detail.task.status === "changes_requested" ? "Resume Task" : "Start Task"}
                      </button>
                    </form>
                  ) : (
                    <a
                      href="#submit-work"
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Continue to Work Log
                    </a>
                  )}

                  {detail.task.status !== "todo" ? (
                    <form action={updateTaskStatus}>
                      <input type="hidden" name="id" value={detail.task.id} />
                      <input type="hidden" name="status" value="todo" />
                      <button
                        type="submit"
                        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Move to To Do
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Manager Files
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Task references</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Open the files the admin or HR reviewer attached when assigning this work.
              </p>
              <div className="mt-5">
                <ReferenceFilesPanel files={detail.referenceFiles} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Submission History
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Work record</h2>
              <div className="mt-5">
                <SubmissionHistory submissions={detail.submissions} />
              </div>
            </section>
          </div>

          <section
            id="submit-work"
            className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Submit Work
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Send for review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Describe what you completed, attach photos or documents, then submit this task so the reviewer can approve it.
            </p>

            {canSubmitForReview ? (
              <form action={submitTaskForReview} className="mt-6 space-y-5">
                <input type="hidden" name="taskId" value={detail.task.id} />

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Work Description</span>
                  <textarea
                    name="submissionNote"
                    rows={8}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    placeholder="Explain what you completed, where the work happened, what files are attached, and anything the reviewer should check."
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Attachments</span>
                  <input
                    type="file"
                    name="taskFiles"
                    multiple
                    accept={FILE_ACCEPT}
                    className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Upload up to {MAX_TASK_SUBMISSION_FILES} files. Each file must be under{" "}
                    {Math.round(MAX_TASK_SUBMISSION_FILE_BYTES / (1024 * 1024))} MB. Supported files include images,
                    PDF, Office documents, text, ZIP, and MP4/MOV/WebM videos.
                  </p>
                </label>

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Submit for Review
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {detail.task.status === "todo"
                  ? "Start the task first before sending work for review."
                  : detail.task.status === "submitted"
                  ? "A submission is already waiting for review. You can submit again after the reviewer requests changes."
                  : "This task is already approved. No further submission is needed unless a manager reopens the task."}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
