export enum ContentBlockType {
  RichText = 'rich_text',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
  Image = 'image',
  Download = 'download',
  ExternalLink = 'external_link',
  EmbeddedContent = 'embedded_content',
  CodeExample = 'code_example',
  CodingActivity = 'coding_activity',
  Quiz = 'quiz',
  Assignment = 'assignment',
  Interactive = 'interactive',
  Presentation = 'presentation',
}

export enum PublicationState {
  Draft = 'draft',
  Review = 'review',
  Published = 'published',
  Archived = 'archived',
}

export enum ImportJobStatus {
  Pending = 'pending',
  Inventorying = 'inventorying',
  Analyzing = 'analyzing',
  AwaitingReview = 'awaiting_review',
  Approved = 'approved',
  Writing = 'writing',
  Verifying = 'verifying',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum ResourceType {
  Video = 'video',
  Audio = 'audio',
  PDF = 'pdf',
  Document = 'document',
  Presentation = 'presentation',
  Spreadsheet = 'spreadsheet',
  Image = 'image',
  HTML = 'html',
  Markdown = 'markdown',
  SourceCode = 'source_code',
  Archive = 'archive',
  Dataset = 'dataset',
  Unknown = 'unknown',
}

export enum LessonCompletionPolicy {
  AllBlocksCompleted = 'all_blocks_completed',
  RequiredBlocksCompleted = 'required_blocks_completed',
  VideoWatched = 'video_watched',
  ManualCompletion = 'manual_completion',
  TimeSpent = 'time_spent',
}

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  MultipleSelect = 'multiple_select',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
  Essay = 'essay',
  CodeSubmission = 'code_submission',
  FileUpload = 'file_upload',
  Matching = 'matching',
  Ordering = 'ordering',
}

export enum UserRole {
  Student = 'student',
  Instructor = 'instructor',
  Admin = 'admin',
}

export enum SyncStatus {
  Local = 'local',
  Synced = 'synced',
  PendingSync = 'pending_sync',
  Conflict = 'conflict',
}

export enum DownloadStatus {
  NotDownloaded = 'not_downloaded',
  Downloading = 'downloading',
  Downloaded = 'downloaded',
  Paused = 'paused',
  Failed = 'failed',
  Updating = 'updating',
}

export enum AIConfidenceLevel {
  Confirmed = 'confirmed',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Unknown = 'unknown',
}

export enum EvidenceSource {
  CourseManifest = 'course_manifest',
  Syllabus = 'syllabus',
  CourseIdentifier = 'course_identifier',
  ExplicitNumbering = 'explicit_numbering',
  DocumentStructure = 'document_structure',
  AIInference = 'ai_inference',
  UserProvided = 'user_provided',
}
