import { getPrismaClient } from "./prisma.js";
import { defaultSettings } from "./settings-defaults.js";
import type { Settings } from "../types.js";
import type {
  Campaign,
  CampaignStatus,
  Prisma,
  RunLog,
  UploadedAsset,
  UploadedAssetKind,
  User,
  Workspace
} from "@prisma/client";

export const DEFAULT_USER_EMAIL = "local@scoutclaw.dev";
export const DEFAULT_WORKSPACE_NAME = "Default Workspace";

export interface WorkspaceRecord {
  user: User;
  workspace: Workspace;
}

export async function getDefaultWorkspaceRecord(): Promise<WorkspaceRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: DEFAULT_USER_EMAIL },
      create: {
        email: DEFAULT_USER_EMAIL,
        name: "Local ScoutClaw User",
        subscriptions: {
          create: {
            plan: "FREE",
            status: "ACTIVE"
          }
        }
      },
      update: {}
    });

    const existing = await prisma.workspace.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" }
    });

    if (existing) {
      return { user, workspace: existing };
    }

    const workspace = await prisma.workspace.create({
      data: {
        ownerId: user.id,
        name: DEFAULT_WORKSPACE_NAME,
        settings: defaultSettings() as unknown as Prisma.InputJsonValue
      }
    });

    return { user, workspace };
  } catch {
    return null;
  }
}

export interface UploadedAssetInput {
  path: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: UploadedAssetKind;
}

export async function recordUploadedAsset({
  path,
  filename,
  mimeType,
  sizeBytes,
  kind
}: UploadedAssetInput): Promise<UploadedAsset | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  const record = await getDefaultWorkspaceRecord();
  if (!record) {
    return null;
  }

  try {
    return await prisma.uploadedAsset.create({
      data: {
        userId: record.user.id,
        workspaceId: record.workspace.id,
        path,
        filename,
        mimeType,
        sizeBytes,
        kind
      }
    });
  } catch {
    return null;
  }
}

export async function createCampaignSnapshot(settings: Settings): Promise<Campaign | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  const record = await getDefaultWorkspaceRecord();
  if (!record) {
    return null;
  }

  const mode = settings.mode === "hire" ? "HIRE" : "GET_HIRED";
  const title = mode === "HIRE" ? "Hiring campaign" : "Job outreach campaign";

  try {
    return await prisma.campaign.create({
      data: {
        workspaceId: record.workspace.id,
        mode,
        status: "RUNNING",
        title,
        sourceUrl: settings.jobOpeningUrl || null,
        sourcePath: settings.resumePath || null,
        filters: settings.filters || [],
        advancedPrompt: settings.extraPrompt || null,
        startedAt: new Date()
      }
    });
  } catch {
    return null;
  }
}

export interface RunLogInput {
  campaignId: string | null;
  sessionKey: string;
  status: string;
  payload: Prisma.InputJsonValue;
}

export async function recordRunLog({
  campaignId,
  sessionKey,
  status,
  payload
}: RunLogInput): Promise<RunLog | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    return await prisma.runLog.create({
      data: {
        campaignId: campaignId || null,
        sessionKey,
        status,
        payload
      }
    });
  } catch {
    return null;
  }
}

export interface UpdateCampaignStatusInput {
  campaignId: string | null;
  status: CampaignStatus;
  finishedAt?: Date | null;
}

export async function updateCampaignStatus({
  campaignId,
  status,
  finishedAt = null
}: UpdateCampaignStatusInput): Promise<Campaign | null> {
  const prisma = getPrismaClient();
  if (!prisma || !campaignId) {
    return null;
  }

  try {
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        finishedAt
      }
    });
  } catch {
    return null;
  }
}
