# TaskFlow MVP Feature Enhancement - CHANGELOG

## Summary
Added 6 high-value MVP features to transform TaskFlow from a basic TODO app into a genuinely useful task management system, similar to Linear/Asana/Trello + Toggl Track.

---

## 🎯 Features Added

### 1. Priority System
- **Backend:**
  - Added `Priority` enum (LOW, MEDIUM, HIGH)
  - Updated `Task` entity to include `priority` field (default: MEDIUM)
  - Priority badge display in UI with color coding (green/yellow/red)
- **Frontend:**
  - `PriorityBadge` component with visual indicators
  - Priority selection in task creation/editing forms
  - Filter by priority in task list

### 2. Due Dates
- **Backend:**
  - Added `dueDate: Date | null` field to `Task` entity
  - Overdue detection logic
- **Frontend:**
  - `DueDateBadge` component with overdue warning (⚠️)
  - Due date input in task creation form
  - Sort by due date functionality
  - Visual highlighting for overdue tasks

### 3. Tags/Labels
- **Backend:**
  - Added `tags: string[]` field to `Task` entity
  - Tag filtering in search/filter API
- **Frontend:**
  - `Tags` component for displaying tag chips
  - Multi-tag input (comma-separated) in task creation
  - Filter by tag in task list
  - Tag chips displayed in task table

### 4. Search + Filters
- **Backend:**
  - Enhanced `ITaskRepository` with `searchAndFilter()` method
  - Server-side filtering by: status, priority, assignee, tag
  - Client-side text search (title/description)
  - Sorting by: dueDate, createdAt (asc/desc)
  - Query params: `?status=&priority=&tag=&q=&sortBy=&sortOrder=`
- **Frontend:**
  - `TaskFilters` component with:
    - Search input
    - Status dropdown
    - Priority dropdown
    - Tag dropdown (dynamically populated)
    - Sort by (dueDate/createdAt)
    - Sort order (asc/desc)
  - Filter state management
  - Real-time filter application

### 5. Activity Log (Audit Trail)
- **Backend:**
  - New `Activity` entity with `ActivityType` enum:
    - TASK_CREATED, TASK_ASSIGNED, TASK_STATUS_CHANGED
    - TASK_PRIORITY_CHANGED, TASK_DUE_DATE_CHANGED, TASK_TAGS_CHANGED
    - TIMER_STARTED, TIMER_STOPPED, COMMENT_ADDED
  - `FirestoreActivityRepository` storing in `tasks/{taskId}/activity` subcollection
  - `activity.service.ts` with RBAC (ADMIN: any task, MEMBER: assigned tasks)
  - Automatic activity logging on:
    - Task creation
    - Task assignment/unassignment
    - Status changes
    - Priority/due date/tags updates
    - Timer start/stop
    - Comment addition
  - API endpoint: `GET /api/tasks/:id/activity`
- **Frontend:**
  - Activity timeline in `TaskDetails` drawer
  - Chronological display of all task events
  - Shows actor, action, and timestamp

### 6. Comments System
- **Backend:**
  - New `Comment` entity
  - `FirestoreCommentRepository` storing in `tasks/{taskId}/comments` subcollection
  - `comment.service.ts` with RBAC:
    - ADMIN: can comment on any task
    - MEMBER: can only comment on assigned tasks
  - Automatic activity log entry when comment is added
  - API endpoints:
    - `POST /api/tasks/:id/comments` (create)
    - `GET /api/tasks/:id/comments` (list)
- **Frontend:**
  - Comments section in `TaskDetails` drawer
  - Add comment form
  - Threaded display with user ID and timestamp
  - Real-time updates after adding comment

---

## 📊 Data Model Updates

### Task Entity (Firestore: `tasks/{taskId}`)
**New Fields:**
- `priority: 'LOW' | 'MEDIUM' | 'HIGH'` (default: MEDIUM)
- `dueDate: Timestamp | null`
- `tags: string[]` (default: [])

**Existing Fields (preserved):**
- `title`, `description`, `status`, `assigneeUserId`, `createdByAdminId`
- `createdAt`, `updatedAt`

### New Subcollections

**`tasks/{taskId}/comments`**
```typescript
{
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**`tasks/{taskId}/activity`**
```typescript
{
  id: string;
  taskId: string;
  type: ActivityType;
  message: string;
  actorUserId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔌 API Endpoints

### Updated Endpoints

**`POST /api/tasks`** (ADMIN)
- Now accepts: `priority`, `dueDate`, `tags` in request body

**`PATCH /api/tasks/:id`** (ADMIN)
- Now accepts: `priority`, `dueDate`, `tags` in addition to existing fields
- Automatically logs activity for changed fields

**`GET /api/tasks`** (ADMIN/MEMBER)
- Query params:
  - `?status=TODO|IN_PROGRESS|DONE`
  - `?priority=LOW|MEDIUM|HIGH`
  - `?tag=<tag-name>`
  - `?q=<search-query>` (searches title/description)
  - `?sortBy=dueDate|createdAt`
  - `?sortOrder=asc|desc`

### New Endpoints

**`POST /api/tasks/:id/comments`** (Authenticated)
- Body: `{ text: string }`
- RBAC: ADMIN (any task), MEMBER (assigned tasks only)

**`GET /api/tasks/:id/comments`** (Authenticated)
- Returns: `Comment[]` sorted by createdAt (asc)
- RBAC: Same as POST

**`GET /api/tasks/:id/activity`** (Authenticated)
- Returns: `Activity[]` sorted by createdAt (desc)
- RBAC: ADMIN (any task), MEMBER (assigned tasks only)

---

## 🎨 UI/UX Improvements

### Task List Enhancements
- **Table columns now show:**
  - Title + Description (truncated)
  - Status badge (TODO/IN_PROGRESS/DONE)
  - Priority badge (LOW/MEDIUM/HIGH with colors)
  - Due date (with overdue ⚠️ indicator)
  - Tags (as chips)
  - Assignee
  - Created date
  - Actions (Assign/Timer buttons)

### Task Details Drawer
- **Right-side drawer** (500px width, responsive)
- **Sections:**
  1. **Task Info Card:**
     - Title, description
     - Status, priority, due date badges
     - Tags display
     - Assignee and creation date
  2. **Comments Section:**
     - Add comment form
     - Threaded comments list
     - User ID + timestamp per comment
  3. **Activity Timeline:**
     - Chronological list of all events
     - Shows actor, action, timestamp

### Filter Panel
- **`TaskFilters` component:**
  - Search box (searches title/description)
  - Status filter dropdown
  - Priority filter dropdown
  - Tag filter dropdown (auto-populated from existing tags)
  - Sort by (dueDate/createdAt)
  - Sort order (asc/desc)
  - Apply/Clear buttons

### Task Creation Form
- **New fields:**
  - Priority selector (LOW/MEDIUM/HIGH)
  - Due date picker
  - Tags input (comma-separated)

---

## 📁 Files Created

### Backend (API)

**Domain Layer:**
- `apps/api/src/domain/enums/Priority.ts`
- `apps/api/src/domain/entities/Comment.ts`
- `apps/api/src/domain/entities/Activity.ts`

**Data Layer:**
- `apps/api/src/data/repositories/interfaces/ICommentRepository.ts`
- `apps/api/src/data/repositories/interfaces/IActivityRepository.ts`
- `apps/api/src/data/repositories/implementations/FirestoreCommentRepository.ts`
- `apps/api/src/data/repositories/implementations/FirestoreActivityRepository.ts`

**Application Layer:**
- `apps/api/src/application/services/comment.service.ts`
- `apps/api/src/application/services/activity.service.ts`
- `apps/api/src/application/services/comment.service.test.ts`

**Presentation Layer:**
- `apps/api/src/presentation/controllers/comment.controller.ts`
- `apps/api/src/presentation/controllers/activity.controller.ts`

### Frontend (Web)

**Components:**
- `apps/web/src/components/PriorityBadge.tsx`
- `apps/web/src/components/DueDateBadge.tsx`
- `apps/web/src/components/Tags.tsx`
- `apps/web/src/components/TaskFilters.tsx`
- `apps/web/src/components/TaskDetails.tsx`

---

## 📝 Files Modified

### Backend (API)

**Domain:**
- `apps/api/src/domain/entities/Task.ts` - Added priority, dueDate, tags fields
- `apps/api/src/domain/enums/index.ts` - Export Priority enum
- `apps/api/src/domain/index.ts` - Export Comment and Activity entities

**Data:**
- `apps/api/src/data/repositories/interfaces/ITaskRepository.ts` - Added searchAndFilter method
- `apps/api/src/data/repositories/implementations/FirestoreTaskRepository.ts` - Implemented new fields and searchAndFilter

**Application:**
- `apps/api/src/application/services/task.service.ts` - Updated to handle new fields, filtering, activity logging
- `apps/api/src/application/services/timeEntry.service.ts` - Added activity logging for timer start/stop
- `apps/api/src/application/services/index.ts` - Export comment and activity services
- `apps/api/src/application/services/task.service.test.ts` - Updated mocks for new Task constructor
- `apps/api/src/application/services/timeEntry.service.test.ts` - Updated mocks and added activity service mocking

**Presentation:**
- `apps/api/src/presentation/dto/CreateTaskDTO.ts` - Added priority, dueDate, tags
- `apps/api/src/presentation/dto/UpdateTaskDTO.ts` - Added priority, dueDate, tags with validation
- `apps/api/src/presentation/controllers/task.controller.ts` - Updated to handle new fields and query params
- `apps/api/src/presentation/routes/task.routes.ts` - Added comment and activity routes

### Frontend (Web)

**Components:**
- `apps/web/src/components/Badge.tsx` - Added style prop support

**Pages:**
- `apps/web/src/pages/AdminTasks.tsx` - Complete redesign with filters, new fields, TaskDetails drawer
- `apps/web/src/pages/MemberTasks.tsx` - Complete redesign with filters, new fields, TaskDetails drawer

**Utils:**
- `apps/web/src/utils/formatDate.ts` - Added calculateElapsedSeconds helper

---

## ✅ Testing

### Backend Tests
- **All existing tests updated** to work with new Task constructor
- **New tests added:**
  - `comment.service.test.ts` - 5 tests covering RBAC rules:
    - ADMIN can comment on any task
    - MEMBER can comment on assigned tasks
    - MEMBER cannot comment on unassigned tasks
    - MEMBER cannot comment on tasks assigned to others
    - Comments listing works correctly

### Test Results
- **31 tests passing** (4 test files)
  - Task Service: 8 tests
  - Time Entry Service: 11 tests
  - Reports Service: 7 tests
  - Comment Service: 5 tests

---

## 🏗️ Architecture Notes

### RBAC Implementation
- **Comments:** ADMIN (any task), MEMBER (assigned tasks only)
- **Activity:** ADMIN (any task), MEMBER (assigned tasks only)
- **Filtering:** Server-side filtering respects role (MEMBER only sees assigned tasks)

### Activity Logging
- **Automatic logging** for:
  - Task lifecycle events (create, assign, status change)
  - Field updates (priority, due date, tags)
  - Time tracking (start/stop with duration)
  - Comments (when added)
- **Stored in subcollection:** `tasks/{taskId}/activity`
- **Sorted:** Most recent first (desc by createdAt)

### Search Implementation
- **Firestore limitations:** Text search not natively supported
- **Solution:** Client-side filtering after fetching results
- **Performance:** Acceptable for MVP (can be optimized with Algolia/Elasticsearch later)

---

## 🚀 Build Status

- ✅ **Backend:** `npm run build` - SUCCESS
- ✅ **Backend:** `npm run test:run` - 31/31 tests passing
- ✅ **Frontend:** `npm run build` - SUCCESS
- ✅ **No linter errors**

---

## 📋 Migration Notes

### Existing Data
- **Existing tasks** will have:
  - `priority: MEDIUM` (default)
  - `dueDate: null`
  - `tags: []`
- **No breaking changes** - all new fields are optional with defaults

### Firestore Indexes
- **Recommended indexes** (if needed for scale):
  - `tasks`: `assigneeUserId` + `status` (composite)
  - `tasks`: `priority` + `status` (composite)
  - `tasks`: `tags` (array-contains)
  - `tasks`: `dueDate` (for sorting)

---

## 🎉 Summary

TaskFlow now includes:
1. ✅ **Priority system** with visual badges
2. ✅ **Due dates** with overdue detection
3. ✅ **Tags/labels** with filtering
4. ✅ **Search + filters** (status, priority, tag, text, sort)
5. ✅ **Activity log** (automatic audit trail)
6. ✅ **Comments** (collaboration on tasks)

All features are **end-to-end implemented** (DB + API + UI) with proper RBAC, validation, and testing.
