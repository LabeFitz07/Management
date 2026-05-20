import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccessProfile } from "@/lib/authz";
import { getTaskDetailById, type TaskReferenceFile, type TaskSubmission } from "@/lib/task-store";
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  formatTaskDate,
  formatTaskDateTime,
  formatTaskFileSize,
  getTaskDueClass,
  getTaskDueLabel,
} from "@/lib/task-ui";
import { reviewTaskSubmissionAction } from "@/app/task-actions";

type DashboardTaskDetailPageProps = {
  params: Promise<{
    taskId: string;
  }>;
  searchParams?: Promise<{
    status?: string;
  }>;
};

const STATUS_MESSAGES: Record<string, { className: string; text: string }> = {
  approved: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    text: "Task approved. The staff member has been notified that the work was accepted.",
  },
  changes_requested: {
    className: "border-rose-200 bg-rose-50 text-rose-700",
    text: "Changes requested. The staff member has been notified to revise and resubmit the task.",
  },
};

function ReferenceFilesPanel({ files }: { files: TaskReferenceFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-950">No assignment files yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload forms, papers, or reference documents from the task editor so the staff member can open them.
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

function SubmissionHistory({ submissions }: { submissions: TaskSubmission[] }) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-950">No staff submissions yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The assignee will upload work notes and files here once they submit for review.
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
                Review Result
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

export default async function DashboardTaskDetailPage({
  params,
  searchParams,
}: DashboardTaskDetailPageProps) {
  const accessProfile = await getCurrentUserAccessProfile();

  if (!accessProfile?.isActive) {
    redirect("/");
  }

  const { taskId } = await params;

  if (!accessProfile.roles.includes("admin") && !accessProfile.roles.includes("hr")) {
    redirect(`/staff/tasks/${taskId}`);
  }

  const detail = await getTaskDetailById(taskId);

  if (!detail) {
    redirect("/dashboard");
  }

  const paramsState = (await searchParams) ?? {};
  const message = paramsState.status ? STATUS_MESSAGES[paramsState.status] : null;
  const latestPendingSubmission =
    detail.submissions.find((submission) => submission.reviewStatus === "submitted") ?? null;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#e0f2fe_48%,_#ecfdf5_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_90px_rgba(15,23,42,0.22)] lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Review Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {detail.task.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Inspect the staff submission, verify the uploaded work evidence, and approve or return it with changes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:border-cyan-200 hover:bg-white/15"
              >
                Back to Board
              </Link>
              <Link
                href={`/dashboard?edit=${detail.task.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Edit Assignment
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <section className={`rounded-2xl border p-5 text-sm leading-6 ${message.className}`}>
            {message.text}
          </section>
        ) : null}

        {latestPendingSubmission ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            A staff submission is waiting for review. Use the decision form below to approve it or request changes.
          </section>
        ) : null}

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
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${TASK_PRIORITY_META[detail.task.priority].className}`}
                >
                  {TASK_PRIORITY_META[detail.task.priority].label}
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
                    Assignee
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{detail.task.assigneeName}</p>
                  <p className="mt-1 text-sm text-slate-600">{detail.task.assigneeEmail || "No email available"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reviewer
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{detail.task.reviewerName}</p>
                  <p className="mt-1 text-sm text-slate-600">{detail.task.reviewerEmail || "No email available"}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Due Date
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {detail.task.dueDate ? formatTaskDate(detail.task.dueDate) : "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Submitted
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {detail.task.submittedAt ? formatTaskDateTime(detail.task.submittedAt) : "Not yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Approved
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {detail.task.approvedAt ? formatTaskDateTime(detail.task.approvedAt) : "Not yet"}
                  </p>
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
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Assignment Files
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Reference documents</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These are the files the manager attached for the staff member to use while doing the task.
              </p>
              <div className="mt-5">
                <ReferenceFilesPanel files={detail.referenceFiles} />
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Submission History
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Staff evidence</h2>
              <div className="mt-5">
                <SubmissionHistory submissions={detail.submissions} />
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Review Decision
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Approve or return</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Approve the latest valid submission if the work is correct. If the work needs revision, request changes and explain what the staff member should fix.
            </p>

            {latestPendingSubmission ? (
              <form action={reviewTaskSubmissionAction} className="mt-6 space-y-5">
                <input type="hidden" name="submissionId" value={latestPendingSubmission.id} />

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Reviewer Note</span>
                  <textarea
                    name="reviewNote"
                    rows={8}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    placeholder="Add approval notes or explain the corrections required before resubmission."
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    A note is optional for approval and required if you request changes.
                  </p>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="min-h-12 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve Task
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="changes_requested"
                    className="min-h-12 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Request Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {detail.submissions.length === 0
                  ? "There is no submission to review yet."
                  : "The latest submission has already been reviewed. Wait for a new resubmission if more work is needed."}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
