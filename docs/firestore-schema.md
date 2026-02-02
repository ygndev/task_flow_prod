# Firestore Schema Documentation

This document describes the Firestore database schema for the TaskFlow MVP application.

## Collections and Document Structure

### `users/{uid}`

User documents store user profile and role information.

**Fields:**
- `email` (string, required) - User's email address
- `displayName` (string, required) - User's display name
- `role` (string, required) - User role: `'ADMIN'` or `'MEMBER'`
- `createdAt` (timestamp, required) - Document creation timestamp
- `updatedAt` (timestamp, required) - Last update timestamp

**Example:**
```json
{
  "email": "admin@example.com",
  "displayName": "Admin User",
  "role": "ADMIN",
  "createdAt": "2026-01-26T10:00:00Z",
  "updatedAt": "2026-01-26T10:00:00Z"
}
```

### `tasks/{taskId}`

Task documents represent work items that can be assigned to members.

**Fields:**
- `title` (string, required) - Task title
- `description` (string, required) - Task description
- `status` (string, required) - Task status: `'TODO'`, `'IN_PROGRESS'`, or `'DONE'`
- `assigneeUserId` (string, nullable) - UID of assigned member (null if unassigned)
- `createdByAdminId` (string, required) - UID of admin who created the task
- `createdAt` (timestamp, required) - Document creation timestamp
- `updatedAt` (timestamp, required) - Last update timestamp

**Example:**
```json
{
  "title": "Implement user authentication",
  "description": "Add login and registration functionality",
  "status": "IN_PROGRESS",
  "assigneeUserId": "user123",
  "createdByAdminId": "admin456",
  "createdAt": "2026-01-26T10:00:00Z",
  "updatedAt": "2026-01-26T14:30:00Z"
}
```

### `timeEntries/{timeEntryId}`

Time entry documents track time spent on tasks by members.

**Fields:**
- `taskId` (string, required) - Reference to task document ID
- `userId` (string, required) - UID of user who logged the time
- `startTime` (timestamp, required) - When the time entry started
- `endTime` (timestamp, nullable) - When the time entry ended (null if active)
- `durationSeconds` (number, nullable) - Calculated duration in seconds (null if active)
- `createdAt` (timestamp, required) - Document creation timestamp
- `updatedAt` (timestamp, required) - Last update timestamp

**Example:**
```json
{
  "taskId": "task789",
  "userId": "user123",
  "startTime": "2026-01-26T09:00:00Z",
  "endTime": "2026-01-26T10:30:00Z",
  "durationSeconds": 5400,
  "createdAt": "2026-01-26T09:00:00Z",
  "updatedAt": "2026-01-26T10:30:00Z"
}
```

## Access Patterns

### Admin Access Patterns

#### List All Tasks
- **Query**: `tasks` collection, ordered by `createdAt` descending
- **Use Case**: Admin dashboard showing all tasks
- **Filtering**: Optional filter by `status` field

#### Filter Tasks by Status
- **Query**: `tasks` collection where `status == <status>`
- **Use Case**: View tasks in specific status (TODO, IN_PROGRESS, DONE)
- **Index**: Single-field index on `status`

### Member Access Patterns

#### List Tasks Assigned to Me
- **Query**: `tasks` collection where `assigneeUserId == <myUid>`
- **Use Case**: Member dashboard showing their assigned tasks
- **Index**: Single-field index on `assigneeUserId`

#### Get My Active Time Entry
- **Query**: `timeEntries` collection where `userId == <myUid> AND endTime == null`
- **Use Case**: Check if member has an active timer running
- **Index**: Composite index on `userId` + `endTime`
- **Note**: API logic enforces only one active time entry per user

### Admin Reporting Patterns

#### Time Entries by Date Range
- **Query**: `timeEntries` collection where `startTime >= <startDate> AND startTime <= <endDate>`
- **Use Case**: Generate time reports for specific date ranges
- **Index**: Single-field index on `startTime` (range queries)

#### Time Entries by User
- **Query**: `timeEntries` collection where `userId == <uid>`
- **Use Case**: View all time entries for a specific user
- **Index**: Single-field index on `userId`

#### Time Entries by Task
- **Query**: `timeEntries` collection where `taskId == <taskId>`
- **Use Case**: View all time logged for a specific task
- **Index**: Single-field index on `taskId`

#### Combined: Time Entries by User and Date Range
- **Query**: `timeEntries` collection where `userId == <uid> AND startTime >= <startDate> AND startTime <= <endDate>`
- **Use Case**: User-specific time reports for date ranges
- **Index**: Composite index on `userId` + `startTime`

#### Combined: Time Entries by Task and Date Range
- **Query**: `timeEntries` collection where `taskId == <taskId> AND startTime >= <startDate> AND startTime <= <endDate>`
- **Use Case**: Task-specific time reports for date ranges
- **Index**: Composite index on `taskId` + `startTime`

## Recommended Firestore Indexes

### Single-Field Indexes

These are automatically created by Firestore, but listed for reference:

- `tasks.status`
- `tasks.assigneeUserId`
- `timeEntries.userId`
- `timeEntries.taskId`
- `timeEntries.startTime`
- `timeEntries.endTime`

### Composite Indexes

The following composite indexes need to be created manually or via `firestore.indexes.json`:

#### Tasks Collection

1. **Index**: `assigneeUserId` (Ascending) + `status` (Ascending)
   - **Purpose**: Efficiently query tasks assigned to a user filtered by status
   - **Query Example**: `tasks.where('assigneeUserId', '==', uid).where('status', '==', 'IN_PROGRESS')`

#### Time Entries Collection

1. **Index**: `userId` (Ascending) + `endTime` (Ascending)
   - **Purpose**: Find active time entries for a user (`endTime == null`)
   - **Query Example**: `timeEntries.where('userId', '==', uid).where('endTime', '==', null)`

2. **Index**: `userId` (Ascending) + `startTime` (Descending)
   - **Purpose**: Get user's time entries ordered by start time (most recent first)
   - **Query Example**: `timeEntries.where('userId', '==', uid).orderBy('startTime', 'desc')`

3. **Index**: `taskId` (Ascending) + `startTime` (Descending)
   - **Purpose**: Get task's time entries ordered by start time (most recent first)
   - **Query Example**: `timeEntries.where('taskId', '==', taskId).orderBy('startTime', 'desc')`

4. **Index**: `userId` (Ascending) + `startTime` (Ascending) + `endTime` (Ascending)
   - **Purpose**: Support complex queries filtering by user, date range, and completion status
   - **Query Example**: `timeEntries.where('userId', '==', uid).where('startTime', '>=', startDate).where('endTime', '!=', null)`

## Data Consistency Notes

### Server Timestamps

- **Always use server timestamps** for `createdAt` and `updatedAt` fields
- Use Firestore's `FieldValue.serverTimestamp()` to ensure consistent timestamps across clients
- Prevents clock skew issues and ensures accurate audit trails

### Active Time Entry Enforcement

- **Business Rule**: Each user can have only one active time entry at a time
- **Enforcement**: This is enforced in the API application layer, not at the database level
- **Implementation**: Before creating a new time entry, the API must:
  1. Query for existing active time entries (`userId == uid AND endTime == null`)
  2. If found, either reject the new entry or automatically stop the existing one
- **Rationale**: Firestore doesn't support unique constraints, so application-level validation is required

### Data Validation

- All required fields must be validated in the API layer before writing to Firestore
- Enum values (`role`, `status`) should be validated against allowed values
- Nullable fields should be explicitly set to `null` rather than omitted when not applicable

### Relationships

- `tasks.assigneeUserId` references `users/{uid}` (soft reference - no foreign key constraint)
- `tasks.createdByAdminId` references `users/{uid}` (must be a user with `role == 'ADMIN'`)
- `timeEntries.taskId` references `tasks/{taskId}` (soft reference)
- `timeEntries.userId` references `users/{uid}` (soft reference)

**Note**: Firestore doesn't enforce referential integrity. The API layer must validate that referenced documents exist before creating relationships.
