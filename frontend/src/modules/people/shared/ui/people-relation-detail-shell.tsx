"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { uploadPeopleAttachment } from "@/features/uploads/api";
import {
  addPeopleRecordAttachment,
  addPeopleRecordComment,
  deletePeopleRecordAttachment,
  deletePeopleRecordComment,
  getPeopleRecordMetadata,
  getPerson,
  setPeopleRecordTags,
} from "@/modules/people/api";
import {
  buildPeopleDetailTabPath,
  type PeopleDetailTabValue,
} from "@/modules/people/shared/domain/people-relation-routes";
import {
  mapApiPeopleRecordMetadata,
} from "@/modules/people/shared/domain/people-module.helpers";
import type {
  PeopleRecordMetadata,
  PeopleRecordType,
} from "@/modules/people/shared/domain/types";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import {
  buildAuditHistoryItems,
} from "@/web-client/detail/audit-feed-utils";
import {
  resumeDetailAutoSave,
  suspendDetailAutoSave,
} from "@/web-client/detail/detail-media-autosave-guard";
import { useDetailAuditFeed } from "@/web-client/detail/useDetailAuditFeed";
import type { AuditFeedConfig } from "@/web-client/registry/types";
import { defineRelationDetailModule } from "@/web-client/starter";
import { resolveMediaUrl } from "@/lib/api";

type PeopleRelationDetailShellProps = {
  personId: string;
  recordType: PeopleRecordType;
  tab: Exclude<PeopleDetailTabValue, "atendimentos" | "resumo">;
  title: string;
  subtitle?: string;
  mode?: "create" | "edit";
  saving?: boolean;
  headerActionsSlot?: React.ReactNode;
  notes?: string | null;
  onNotesChange?: (next: string | null) => void;
  onNotesCommit?: (next: string | null) => void;
  auditConfig?: AuditFeedConfig<{ relationId: string }>;
  relationId?: string | null;
  children: React.ReactNode;
};

type PeopleRelationDetailShellContext = {
  relationId: string | null;
};

const peopleRelationDetailModuleDefinition =
  defineRelationDetailModule<PeopleRelationDetailShellContext>({
    moduleId: "people.relation.detail",
    basePath: "/people",
    actionKey: "people.relation.detail.screen",
    favoriteKey: "people.relation.detail.favorites",
    permissions: {
      canRead: "people.read",
    },
  });

export function PeopleRelationDetailShell({
  personId,
  recordType,
  tab,
  title,
  subtitle,
  mode = "edit",
  saving = false,
  headerActionsSlot,
  notes,
  onNotesChange,
  onNotesCommit,
  auditConfig,
  relationId = null,
  children,
}: PeopleRelationDetailShellProps) {
  const { token } = useAuth();
  const { users: mentionableUsers } = useMentionableUsers("people.read");
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const [personName, setPersonName] = React.useState("Pessoa");
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [commentDraft, setCommentDraft] = React.useState({
    body: "",
    mentionUserIds: [] as string[],
  });
  const [metadata, setMetadata] = React.useState<PeopleRecordMetadata>({
    comments: [],
    attachments: [],
    tags: [],
  });
  const [metadataLoading, setMetadataLoading] = React.useState(false);
  const [metadataError, setMetadataError] = React.useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!token || !personId) return;
    let cancelled = false;

    void getPerson(token, personId)
      .then((person) => {
        if (!cancelled) {
          setPersonName(person.fullName || "Pessoa");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [personId, token]);

  const refreshMetadata = React.useCallback(async () => {
    if (!token || !relationId || mode !== "edit") {
      setMetadata({ comments: [], attachments: [], tags: [] });
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }

    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const response = await getPeopleRecordMetadata(token, personId, recordType, relationId);
      setMetadata(mapApiPeopleRecordMetadata(response));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar metadata do registro.";
      setMetadataError(message);
    } finally {
      setMetadataLoading(false);
    }
  }, [mode, personId, recordType, relationId, token]);

  React.useEffect(() => {
    void refreshMetadata();
  }, [refreshMetadata]);

  const backHref = withTenantPath(buildPeopleDetailTabPath(personId, tab), tenantSlug);
  const detailAudit = useDetailAuditFeed({
    dataProvider,
    auditAdapter: { model: "audit.logs" },
    auditConfig,
    context: { relationId: relationId ?? "" },
    enabled: Boolean(relationId && auditConfig && token),
  });
  const historyItems = React.useMemo(
    () => buildAuditHistoryItems(detailAudit?.logs ?? []),
    [detailAudit?.logs],
  );
  const relationNotesReadOnly = !onNotesChange || !onNotesCommit;

  const handleSubmitComment = React.useCallback(async () => {
    if (!token || !relationId || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    setMetadataError(null);
    try {
      const response = await addPeopleRecordComment(
        token,
        personId,
        recordType,
        relationId,
        commentDraft,
      );
      setMetadata(mapApiPeopleRecordMetadata(response));
      setCommentDraft({ body: "", mentionUserIds: [] });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao registrar comentario.";
      setMetadataError(message);
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, personId, recordType, relationId, token]);

  const handleDeleteComment = React.useCallback(
    async (commentId: string) => {
      if (!token || !relationId) return;
      if (!window.confirm("Excluir este comentario?")) return;
      setCommentSubmitting(true);
      setMetadataError(null);
      try {
        const response = await deletePeopleRecordComment(
          token,
          personId,
          recordType,
          relationId,
          commentId,
        );
        setMetadata(mapApiPeopleRecordMetadata(response));
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao excluir comentario.";
        setMetadataError(message);
      } finally {
        setCommentSubmitting(false);
      }
    },
    [personId, recordType, relationId, token],
  );

  const handleUploadAttachment = React.useCallback(() => {
    if (!relationId || mode !== "edit") return;
    suspendDetailAutoSave();
    attachmentInputRef.current?.click();
  }, [mode, relationId]);

  const handleSelectAttachment = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !token || !relationId) {
        resumeDetailAutoSave();
        return;
      }

      setAttachmentUploading(true);
      setMetadataError(null);
      try {
        const uploaded = await uploadPeopleAttachment(token, file);
        const response = await addPeopleRecordAttachment(
          token,
          personId,
          recordType,
          relationId,
          {
            label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
            filePath: uploaded.path,
            mimeType: uploaded.mimeType ?? file.type ?? null,
            fileSizeBytes: uploaded.size ?? file.size,
          },
        );
        setMetadata(mapApiPeopleRecordMetadata(response));
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao enviar anexo.";
        setMetadataError(message);
      } finally {
        setAttachmentUploading(false);
        resumeDetailAutoSave();
      }
    },
    [personId, recordType, relationId, token],
  );

  const handleDeleteAttachment = React.useCallback(
    async (attachmentId: string) => {
      if (!token || !relationId) return;
      if (!window.confirm("Excluir este anexo?")) return;
      setAttachmentUploading(true);
      setMetadataError(null);
      try {
        const response = await deletePeopleRecordAttachment(
          token,
          personId,
          recordType,
          relationId,
          attachmentId,
        );
        setMetadata(mapApiPeopleRecordMetadata(response));
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao excluir anexo.";
        setMetadataError(message);
      } finally {
        setAttachmentUploading(false);
      }
    },
    [personId, recordType, relationId, token],
  );

  const handleCommitTags = React.useCallback(
    async (nextTags: string[]) => {
      if (!token || !relationId) return;
      setMetadata((previous) => ({ ...previous, tags: nextTags }));
      try {
        const response = await setPeopleRecordTags(
          token,
          personId,
          recordType,
          relationId,
          nextTags,
        );
        setMetadata(mapApiPeopleRecordMetadata(response));
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao salvar tags.";
        setMetadataError(message);
      }
    },
    [personId, recordType, relationId, token],
  );

  return (
    <>
      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectAttachment}
      />
      <DetailShellEngine
        moduleDefinition={peopleRelationDetailModuleDefinition}
        context={{ relationId }}
        breadcrumbTitle={title}
        breadcrumbItems={[
          { label: "Pessoas", href: "/people" },
          { label: personName, href: buildPeopleDetailTabPath(personId, tab) },
          { label: title },
        ]}
        mode={mode}
        headerTitle={title}
        saving={saving || commentSubmitting || attachmentUploading}
        readOnly={false}
        loading={false}
        headerActionsSlot={headerActionsSlot}
        onClose={() => router.push(backHref)}
        fallbackSideSlot={
          <StandardDetailMetadataSide
            mode={mode}
            readOnly={false}
            detailAudit={detailAudit}
            auditVisibleCount={auditVisibleCount}
            onAuditVisibleCountChange={setAuditVisibleCount}
            canAudit
            comments={{
              items: metadata.comments,
              draft: commentDraft,
              users: mentionableUsers,
              onDraftChange: setCommentDraft,
              onSubmit: handleSubmitComment,
              onDelete: mode === "edit" ? handleDeleteComment : undefined,
              submitting: commentSubmitting,
              readOnly: mode !== "edit" || !relationId,
              emptyLabel:
                mode === "create"
                  ? "Indisponível."
                  : metadataLoading
                    ? "Carregando..."
                    : "Nenhum comentário.",
            }}
            notes={{
              value: notes,
              onChange: (next) => onNotesChange?.(next),
              onBlur: () => onNotesCommit?.(notes ?? null),
              readOnly: relationNotesReadOnly,
            }}
            tags={{
              value: metadata.tags,
              onChange: (next) =>
                setMetadata((previous) => ({ ...previous, tags: next })),
              onCommit: handleCommitTags,
              readOnly: mode !== "edit" || !relationId,
              emptyLabel:
                mode === "create"
                  ? "Indisponível."
                  : "Nenhuma tag.",
            }}
            attachments={{
              items: metadata.attachments.map((attachment) => ({
                id: attachment.id,
                label: attachment.label,
                href: resolveMediaUrl(attachment.filePath),
                description: attachment.uploadedBy?.name
                  ? `Enviado por ${attachment.uploadedBy.name}`
                  : "Anexo do registro",
                mimeType: attachment.mimeType ?? null,
                sizeLabel:
                  typeof attachment.fileSizeBytes === "number" && attachment.fileSizeBytes > 0
                    ? attachment.fileSizeBytes >= 1024 * 1024
                      ? `${(attachment.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                      : attachment.fileSizeBytes >= 1024
                        ? `${Math.round(attachment.fileSizeBytes / 1024)} KB`
                        : `${attachment.fileSizeBytes} B`
                    : null,
                statusLabel: attachment.createdAt
                  ? attachment.createdAt.slice(0, 16).replace("T", ", ")
                  : null,
              })),
              onUpload: mode === "edit" ? handleUploadAttachment : undefined,
              onDelete: mode === "edit" ? handleDeleteAttachment : undefined,
              readOnly: mode !== "edit" || !relationId,
              emptyLabel:
                mode === "create"
                  ? "Indisponível."
                  : attachmentUploading
                    ? "Enviando..."
                    : "Nenhum anexo.",
            }}
            history={{
              items: historyItems,
              emptyLabel:
                mode === "create"
                  ? "Sem histórico."
                  : "Nenhum histórico.",
            }}
            contextItems={[
              { key: "person", label: "Pessoa", value: personName },
              { key: "type", label: "Registro", value: title },
              { key: "relationId", label: "Id", value: relationId ?? "Não salvo" },
              { key: "comments", label: "Comentários", value: metadata.comments.length },
              { key: "attachments", label: "Anexos", value: metadata.attachments.length },
              { key: "tags", label: "Tags", value: metadata.tags.length },
            ]}
            defaultTab="activity"
          />
        }
        fallbackMainSlot={
          <div className="space-y-4">
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            {metadataError ? (
              <div className="text-sm text-destructive">{metadataError}</div>
            ) : null}
            {children}
          </div>
        }
      />
    </>
  );
}
