import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StaffMember = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: string;
  startDate: string;
  createdAt: string;
};

export type StaffInput = Omit<StaffMember, "id" | "createdAt">;

const dataDirectory = path.join(process.cwd(), "data");
const filePath = path.join(dataDirectory, "staff.json");

const seedStaff: StaffMember[] = [
  {
    id: "staff-001",
    employeeId: "EMP-1001",
    fullName: "Alyssa Ramos",
    email: "alyssa.ramos@staffhub.local",
    phone: "+63 917 555 0131",
    department: "Operations",
    role: "Operations Supervisor",
    status: "Active",
    startDate: "2024-02-12",
    createdAt: "2024-02-12T08:00:00.000Z",
  },
  {
    id: "staff-002",
    employeeId: "EMP-1002",
    fullName: "Miguel Santos",
    email: "miguel.santos@staffhub.local",
    phone: "+63 918 555 0174",
    department: "Finance",
    role: "Payroll Specialist",
    status: "On Leave",
    startDate: "2023-09-04",
    createdAt: "2023-09-04T08:00:00.000Z",
  },
  {
    id: "staff-003",
    employeeId: "EMP-1003",
    fullName: "Bianca Flores",
    email: "bianca.flores@staffhub.local",
    phone: "+63 919 555 0126",
    department: "Human Resources",
    role: "Talent Coordinator",
    status: "Active",
    startDate: "2025-01-20",
    createdAt: "2025-01-20T08:00:00.000Z",
  },
];

function normalizeStaffInput(input: StaffInput): StaffInput {
  const normalized = {
    employeeId: input.employeeId.trim(),
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    department: input.department.trim(),
    role: input.role.trim(),
    status: input.status.trim(),
    startDate: input.startDate.trim(),
  };

  const missingField = Object.entries(normalized).find(([, value]) => !value);

  if (missingField) {
    throw new Error(`${missingField[0]} is required.`);
  }

  return normalized;
}

async function ensureStore() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify(seedStaff, null, 2), "utf8");
  }
}

async function readStaffFile() {
  await ensureStore();
  const content = await readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as StaffMember[];

  return parsed.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

async function writeStaffFile(staffMembers: StaffMember[]) {
  await ensureStore();
  await writeFile(filePath, JSON.stringify(staffMembers, null, 2), "utf8");
}

export async function getStaffMembers() {
  return readStaffFile();
}

export async function addStaffMember(input: StaffInput) {
  const staffMembers = await readStaffFile();
  const normalized = normalizeStaffInput(input);

  const newStaffMember: StaffMember = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...normalized,
  };

  staffMembers.push(newStaffMember);
  await writeStaffFile(staffMembers);

  return newStaffMember;
}

export async function updateStaffMemberById(id: string, input: StaffInput) {
  const staffMembers = await readStaffFile();
  const normalized = normalizeStaffInput(input);

  const index = staffMembers.findIndex((member) => member.id === id);

  if (index === -1) {
    throw new Error("Staff member not found.");
  }

  staffMembers[index] = {
    ...staffMembers[index],
    ...normalized,
  };

  await writeStaffFile(staffMembers);
  return staffMembers[index];
}

export async function removeStaffMember(id: string) {
  const staffMembers = await readStaffFile();
  const nextStaffMembers = staffMembers.filter((member) => member.id !== id);

  if (nextStaffMembers.length === staffMembers.length) {
    throw new Error("Staff member not found.");
  }

  await writeStaffFile(nextStaffMembers);
}
