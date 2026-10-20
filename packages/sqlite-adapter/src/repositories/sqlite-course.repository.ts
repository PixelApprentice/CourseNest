import type { Course, CourseVersion, Section, Lesson, ContentBlock } from '@coursenest/domain';
import type { CourseId, CourseVersionId, SectionId, LessonId, ContentBlockId } from '@coursenest/domain';
import type { 
  ICourseRepository, 
  ICourseVersionRepository, 
  ISectionRepository, 
  ILessonRepository, 
  IContentBlockRepository 
} from '@coursenest/database-contracts';
import type { ISqliteConnection } from '../database.js';

export class SqliteCourseRepository implements ICourseRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): Course {
    return {
      id: row.id as CourseId,
      title: row.title,
      description: row.description,
      language: row.language,
      instructorName: row.instructor_name,
      instructorId: row.instructor_id ?? undefined,
      subject: row.subject,
      tags: JSON.parse(row.tags || '[]'),
      thumbnailResourceId: row.thumbnail_resource_id ?? undefined,
      estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      sourceProvider: row.source_provider ?? undefined,
      sourceUrl: row.source_url ?? undefined,
      currentVersionId: row.current_version_id ?? undefined,
      localAvailability: row.local_availability,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: CourseId): Promise<Course | null> {
    const row = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findAll(options?: { limit?: number; offset?: number; search?: string }): Promise<Course[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let sql = 'SELECT * FROM courses';
    const params: unknown[] = [];

    if (options?.search) {
      sql += ' WHERE title LIKE ? OR subject LIKE ? OR instructor_name LIKE ?';
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params);
    return rows.map((r) => this.mapRow(r));
  }

  async create(course: Course): Promise<Course> {
    this.db.prepare(`
      INSERT INTO courses (
        id, title, description, language, instructor_name, instructor_id,
        subject, tags, thumbnail_resource_id, estimated_duration_minutes,
        learning_objectives, source_provider, source_url, current_version_id,
        local_availability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      course.id,
      course.title,
      course.description,
      course.language,
      course.instructorName,
      course.instructorId ?? null,
      course.subject,
      JSON.stringify(course.tags ?? []),
      course.thumbnailResourceId ?? null,
      course.estimatedDurationMinutes ?? null,
      JSON.stringify(course.learningObjectives ?? []),
      course.sourceProvider ?? null,
      course.sourceUrl ?? null,
      course.currentVersionId ?? null,
      course.localAvailability,
      course.createdAt,
      course.updatedAt,
    );
    return course;
  }

  async update(id: CourseId, updates: Partial<Course>): Promise<Course> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Course not found: ${id}`);

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    this.db.prepare(`
      UPDATE courses SET
        title = ?, description = ?, language = ?, instructor_name = ?,
        instructor_id = ?, subject = ?, tags = ?, thumbnail_resource_id = ?,
        estimated_duration_minutes = ?, learning_objectives = ?, source_provider = ?,
        source_url = ?, current_version_id = ?, local_availability = ?, updated_at = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.description,
      merged.language,
      merged.instructorName,
      merged.instructorId ?? null,
      merged.subject,
      JSON.stringify(merged.tags ?? []),
      merged.thumbnailResourceId ?? null,
      merged.estimatedDurationMinutes ?? null,
      JSON.stringify(merged.learningObjectives ?? []),
      merged.sourceProvider ?? null,
      merged.sourceUrl ?? null,
      merged.currentVersionId ?? null,
      merged.localAvailability,
      merged.updatedAt,
      id,
    );

    return merged;
  }

  async delete(id: CourseId): Promise<void> {
    this.db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  }

  async count(options?: { search?: string }): Promise<number> {
    if (options?.search) {
      const term = `%${options.search}%`;
      const row = this.db.prepare(`
        SELECT COUNT(*) as cnt FROM courses 
        WHERE title LIKE ? OR subject LIKE ? OR instructor_name LIKE ?
      `).get(term, term, term) as { cnt: number };
      return row.cnt;
    }
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM courses').get() as { cnt: number };
    return row.cnt;
  }
}

export class SqliteCourseVersionRepository implements ICourseVersionRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): CourseVersion {
    return {
      id: row.id as CourseVersionId,
      courseId: row.course_id as CourseId,
      versionNumber: row.version_number,
      manifestSchemaVersion: row.manifest_schema_version,
      contentFingerprint: row.content_fingerprint,
      state: row.state,
      changeSummary: row.change_summary ?? undefined,
      createdAt: row.created_at,
      publishedAt: row.published_at ?? undefined,
    };
  }

  async findById(id: CourseVersionId): Promise<CourseVersion | null> {
    const row = this.db.prepare('SELECT * FROM course_versions WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findByCourse(courseId: CourseId): Promise<CourseVersion[]> {
    const rows = this.db.prepare('SELECT * FROM course_versions WHERE course_id = ? ORDER BY created_at DESC').all(courseId);
    return rows.map((r) => this.mapRow(r));
  }

  async create(version: CourseVersion): Promise<CourseVersion> {
    this.db.prepare(`
      INSERT INTO course_versions (
        id, course_id, version_number, manifest_schema_version,
        content_fingerprint, state, change_summary, created_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      version.id,
      version.courseId,
      version.versionNumber,
      version.manifestSchemaVersion,
      version.contentFingerprint,
      version.state,
      version.changeSummary ?? null,
      version.createdAt,
      version.publishedAt ?? null,
    );
    return version;
  }

  async update(id: CourseVersionId, updates: Partial<CourseVersion>): Promise<CourseVersion> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`CourseVersion not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE course_versions SET
        version_number = ?, manifest_schema_version = ?, content_fingerprint = ?,
        state = ?, change_summary = ?, published_at = ?
      WHERE id = ?
    `).run(
      merged.versionNumber,
      merged.manifestSchemaVersion,
      merged.contentFingerprint,
      merged.state,
      merged.changeSummary ?? null,
      merged.publishedAt ?? null,
      id,
    );
    return merged;
  }
}

export class SqliteSectionRepository implements ISectionRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): Section {
    return {
      id: row.id as SectionId,
      courseVersionId: row.course_version_id as CourseVersionId,
      title: row.title,
      description: row.description ?? undefined,
      position: row.position,
      estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
      isOptional: Boolean(row.is_optional),
      prerequisiteSectionIds: JSON.parse(row.prerequisite_section_ids || '[]'),
    };
  }

  async findById(id: SectionId): Promise<Section | null> {
    const row = this.db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findByCourseVersion(courseVersionId: CourseVersionId): Promise<Section[]> {
    const rows = this.db.prepare('SELECT * FROM sections WHERE course_version_id = ? ORDER BY position ASC').all(courseVersionId);
    return rows.map((r) => this.mapRow(r));
  }

  async create(section: Section): Promise<Section> {
    this.db.prepare(`
      INSERT INTO sections (
        id, course_version_id, title, description, position,
        estimated_duration_minutes, is_optional, prerequisite_section_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      section.id,
      section.courseVersionId,
      section.title,
      section.description ?? null,
      section.position,
      section.estimatedDurationMinutes ?? null,
      section.isOptional ? 1 : 0,
      JSON.stringify(section.prerequisiteSectionIds ?? []),
    );
    return section;
  }

  async update(id: SectionId, updates: Partial<Section>): Promise<Section> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Section not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE sections SET
        title = ?, description = ?, position = ?,
        estimated_duration_minutes = ?, is_optional = ?, prerequisite_section_ids = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.description ?? null,
      merged.position,
      merged.estimatedDurationMinutes ?? null,
      merged.isOptional ? 1 : 0,
      JSON.stringify(merged.prerequisiteSectionIds ?? []),
      id,
    );
    return merged;
  }

  async delete(id: SectionId): Promise<void> {
    this.db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  }

  async reorder(courseVersionId: CourseVersionId, sectionIds: SectionId[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE sections SET position = ? WHERE id = ? AND course_version_id = ?');
    const updateAll = this.db.transaction((ids: SectionId[]) => {
      for (let i = 0; i < ids.length; i++) {
        stmt.run(i + 1, ids[i], courseVersionId);
      }
    });
    updateAll(sectionIds);
  }
}

export class SqliteLessonRepository implements ILessonRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): Lesson {
    return {
      id: row.id as LessonId,
      sectionId: row.section_id as SectionId,
      title: row.title,
      description: row.description ?? undefined,
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      position: row.position,
      estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
      completionPolicy: row.completion_policy,
      isRequired: Boolean(row.is_required),
      prerequisiteLessonIds: JSON.parse(row.prerequisite_lesson_ids || '[]'),
      revision: row.revision,
    };
  }

  async findById(id: LessonId): Promise<Lesson | null> {
    const row = this.db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findBySection(sectionId: SectionId): Promise<Lesson[]> {
    const rows = this.db.prepare('SELECT * FROM lessons WHERE section_id = ? ORDER BY position ASC').all(sectionId);
    return rows.map((r) => this.mapRow(r));
  }

  async create(lesson: Lesson): Promise<Lesson> {
    this.db.prepare(`
      INSERT INTO lessons (
        id, section_id, title, description, learning_objectives, position,
        estimated_duration_minutes, completion_policy, is_required,
        prerequisite_lesson_ids, revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lesson.id,
      lesson.sectionId,
      lesson.title,
      lesson.description ?? null,
      JSON.stringify(lesson.learningObjectives ?? []),
      lesson.position,
      lesson.estimatedDurationMinutes ?? null,
      lesson.completionPolicy,
      lesson.isRequired ? 1 : 0,
      JSON.stringify(lesson.prerequisiteLessonIds ?? []),
      lesson.revision,
    );
    return lesson;
  }

  async update(id: LessonId, updates: Partial<Lesson>): Promise<Lesson> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Lesson not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE lessons SET
        title = ?, description = ?, learning_objectives = ?, position = ?,
        estimated_duration_minutes = ?, completion_policy = ?, is_required = ?,
        prerequisite_lesson_ids = ?, revision = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.description ?? null,
      JSON.stringify(merged.learningObjectives ?? []),
      merged.position,
      merged.estimatedDurationMinutes ?? null,
      merged.completionPolicy,
      merged.isRequired ? 1 : 0,
      JSON.stringify(merged.prerequisiteLessonIds ?? []),
      merged.revision,
      id,
    );
    return merged;
  }

  async delete(id: LessonId): Promise<void> {
    this.db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  }

  async reorder(sectionId: SectionId, lessonIds: LessonId[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE lessons SET position = ? WHERE id = ? AND section_id = ?');
    const updateAll = this.db.transaction((ids: LessonId[]) => {
      for (let i = 0; i < ids.length; i++) {
        stmt.run(i + 1, ids[i], sectionId);
      }
    });
    updateAll(lessonIds);
  }
}

export class SqliteContentBlockRepository implements IContentBlockRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): ContentBlock {
    return {
      id: row.id as ContentBlockId,
      lessonId: row.lesson_id as LessonId,
      type: row.type,
      position: row.position,
      resourceId: row.resource_id ?? undefined,
      activityId: row.activity_id ?? undefined,
      displayMetadata: JSON.parse(row.display_metadata || '{}'),
      isRequired: Boolean(row.is_required),
      schemaVersion: row.schema_version,
    };
  }

  async findById(id: ContentBlockId): Promise<ContentBlock | null> {
    const row = this.db.prepare('SELECT * FROM content_blocks WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findByLesson(lessonId: LessonId): Promise<ContentBlock[]> {
    const rows = this.db.prepare('SELECT * FROM content_blocks WHERE lesson_id = ? ORDER BY position ASC').all(lessonId);
    return rows.map((r) => this.mapRow(r));
  }

  async create(block: ContentBlock): Promise<ContentBlock> {
    this.db.prepare(`
      INSERT INTO content_blocks (
        id, lesson_id, type, position, resource_id,
        activity_id, display_metadata, is_required, schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      block.id,
      block.lessonId,
      block.type,
      block.position,
      block.resourceId ?? null,
      block.activityId ?? null,
      JSON.stringify(block.displayMetadata ?? {}),
      block.isRequired ? 1 : 0,
      block.schemaVersion,
    );
    return block;
  }

  async update(id: ContentBlockId, updates: Partial<ContentBlock>): Promise<ContentBlock> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`ContentBlock not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE content_blocks SET
        type = ?, position = ?, resource_id = ?, activity_id = ?,
        display_metadata = ?, is_required = ?, schema_version = ?
      WHERE id = ?
    `).run(
      merged.type,
      merged.position,
      merged.resourceId ?? null,
      merged.activityId ?? null,
      JSON.stringify(merged.displayMetadata ?? {}),
      merged.isRequired ? 1 : 0,
      merged.schemaVersion,
      id,
    );
    return merged;
  }

  async delete(id: ContentBlockId): Promise<void> {
    this.db.prepare('DELETE FROM content_blocks WHERE id = ?').run(id);
  }

  async reorder(lessonId: LessonId, blockIds: ContentBlockId[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE content_blocks SET position = ? WHERE id = ? AND lesson_id = ?');
    const updateAll = this.db.transaction((ids: ContentBlockId[]) => {
      for (let i = 0; i < ids.length; i++) {
        stmt.run(i + 1, ids[i], lessonId);
      }
    });
    updateAll(blockIds);
  }
}
