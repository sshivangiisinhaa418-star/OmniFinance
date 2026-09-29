import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { FinancialSnapshot, AuditLogItem, DatasetType } from '@/types';

/**
 * Calculates SHA-256 hash of an uploaded Excel file for duplicate detection
 */
export const calculateFileHash = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('File hashing not available in current environment:', err);
    return '';
  }
};

/**
 * Checks if a file with the exact same SHA-256 hash has already been uploaded for this module
 */
export const checkDuplicateFileHash = async (
  fileHash: string,
  module: DatasetType
): Promise<FinancialSnapshot | null> => {
  if (!fileHash || !isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('module', module)
      .eq('file_hash', fileHash)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const d = data[0];
    return {
      id: d.id,
      module: d.module as DatasetType,
      fileName: d.file_name,
      fileSize: d.file_size,
      uploadedAt: d.uploaded_at,
      uploadedBy: d.uploaded_by,
      recordCount: d.record_count,
      status: d.status as any,
      grandTotalOpening: Number(d.grand_total_opening) || 0,
      grandTotalDebit: Number(d.grand_total_debit) || 0,
      grandTotalCredit: Number(d.grand_total_credit) || 0,
      grandTotalClosing: Number(d.grand_total_closing) || 0,
      storageBucket: d.storage_bucket,
      storagePath: d.storage_path,
      fileHash: d.file_hash,
      archivedAt: d.archived_at,
      archivedBy: d.archived_by,
    };
  } catch (err) {
    console.error('Error checking duplicate file hash:', err);
    return null;
  }
};

/**
 * Stores original Excel file in private Supabase Storage bucket `finance-excel`
 */
export const uploadOriginalExcelToStorage = async (
  file: File,
  module: DatasetType,
  snapshotId: string
): Promise<{ bucket: string; path: string } | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const bucket = 'finance-excel';
  const path = `${module}/${year}/${month}/${snapshotId}/${file.name}`;

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (error) {
      console.warn('Notice: Private storage upload unavailable or bucket needs creation:', error.message);
      return null;
    }

    return { bucket, path: data.path };
  } catch (err) {
    console.warn('Notice: Storage upload skipped or bucket unconfigured:', err);
    return null;
  }
};

/**
 * Generates a secure, short-lived signed URL (60 seconds) for downloading original Excel
 */
export const getSignedDownloadUrl = async (
  bucket: string,
  path: string
): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase || !path) return null;

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      console.error('Signed download URL generation error:', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Failed to create signed URL:', err);
    return null;
  }
};

/**
 * Creates an audit log item in Supabase DB or local log
 */
export const recordAuditLog = async (logItem: {
  action: 'UPLOAD_DATASET' | 'HIDE_DATASET' | 'RESTORE_DATASET' | 'ARCHIVE_DATASET' | 'DOWNLOAD_DATASET' | 'DELETE_DATASET' | string;
  datasetId: string;
  fileName: string;
  module: string;
  details: string;
  userEmail?: string;
  metadata?: Record<string, any>;
}): Promise<void> => {
  const actorEmail = logItem.userEmail || getStoredUserEmail() || 'Finance Executive';

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    await supabase.from('audit_logs').insert([
      {
        actor_email: actorEmail,
        action: logItem.action,
        entity_type: 'snapshot',
        entity_id: logItem.datasetId,
        module: logItem.module,
        file_name: logItem.fileName,
        details: logItem.details,
        metadata: logItem.metadata || {},
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('Audit log notice:', err);
  }
};

/**
 * Updates snapshot lifecycle status ('active' | 'inactive' | 'archived')
 */
export const updateSnapshotStatus = async (
  snapshotId: string,
  newStatus: 'active' | 'inactive' | 'archived',
  snapshotMeta?: { fileName: string; module: string }
): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const actorEmail = getStoredUserEmail();
  const updatePayload: any = {
    status: newStatus,
  };

  if (newStatus === 'archived') {
    updatePayload.archived_at = new Date().toISOString();
    updatePayload.archived_by = actorEmail;
  }

  const { error } = await supabase
    .from('snapshots')
    .update(updatePayload)
    .eq('id', snapshotId);

  if (error) {
    console.error('Failed to update snapshot status:', error);
    throw error;
  }

  const actionName =
    newStatus === 'inactive'
      ? 'HIDE_DATASET'
      : newStatus === 'archived'
      ? 'ARCHIVE_DATASET'
      : 'RESTORE_DATASET';

  await recordAuditLog({
    action: actionName,
    datasetId: snapshotId,
    fileName: snapshotMeta?.fileName || 'Excel Dataset',
    module: snapshotMeta?.module || 'general',
    details: `Dataset state changed to "${newStatus}" by ${actorEmail}.`,
    userEmail: actorEmail,
  });
};

/**
 * Permanently deletes a snapshot metadata header, original file from Storage,
 * and triggers ON DELETE CASCADE for all linked database rows.
 */
export const deleteSnapshotPermanently = async (
  snapshot: FinancialSnapshot
): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const actorEmail = getStoredUserEmail();

  // 1. Remove original Excel file from storage if present
  if (snapshot.storageBucket && snapshot.storagePath) {
    try {
      await supabase.storage.from(snapshot.storageBucket).remove([snapshot.storagePath]);
    } catch (storageErr) {
      console.warn('Notice deleting storage object:', storageErr);
    }
  }

  // 2. Log audit BEFORE deletion so snapshot details are preserved in audit trail
  await recordAuditLog({
    action: 'DELETE_DATASET',
    datasetId: snapshot.id,
    fileName: snapshot.fileName,
    module: snapshot.module,
    details: `Permanently deleted dataset "${snapshot.fileName}" (${snapshot.recordCount} rows, Valuation: ₹${snapshot.grandTotalClosing || 0}) by ${actorEmail}.`,
    userEmail: actorEmail,
    metadata: {
      recordCount: snapshot.recordCount,
      grandTotalClosing: snapshot.grandTotalClosing,
      uploadedAt: snapshot.uploadedAt,
      uploadedBy: snapshot.uploadedBy,
    },
  });

  // 3. Delete snapshot header from DB (Triggers ON DELETE CASCADE for linked transaction rows)
  const { error } = await supabase
    .from('snapshots')
    .delete()
    .eq('id', snapshot.id);

  if (error) {
    console.error('Failed to delete snapshot header:', error);
    throw error;
  }
};

/**
 * Helper to get currently logged in user email from localStorage
 */
export const getStoredUserEmail = (): string => {
  if (typeof window === 'undefined') return 'Executive User';
  try {
    const raw = localStorage.getItem('tally_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return parsed.email;
      if (parsed?.name) return parsed.name;
    }
  } catch (e) {
    // Ignore error
  }
  return 'Executive User';
};

/**
 * Helper to get user privilege role ('CFO' | 'Auditor' | 'Accountant')
 */
export const getStoredUserRole = (): 'CFO' | 'Auditor' | 'Accountant' | 'Finance Manager' | 'Admin' | 'Viewer' | string => {
  if (typeof window === 'undefined') return 'CFO';
  try {
    const raw = localStorage.getItem('tally_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.role) return parsed.role;
    }
  } catch (e) {
    // Ignore error
  }
  return 'CFO';
};
