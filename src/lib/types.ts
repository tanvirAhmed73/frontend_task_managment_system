export type AuthUserRole = "ADMIN" | "USER";

export type AuthUserView = {
  id: string;
  email: string;
  role: AuthUserRole;
  name: string | null;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUserView;
};

export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

export type CreateUserBody = {
  email: string;
  password: string;
  name?: string;
  role?: AuthUserRole;
};

export type AdminHealthResponse = {
  ok: boolean;
  scope: string;
};

export type TaskStatus = "PENDING" | "PROCESSING" | "DONE";

export type TaskUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

/** Task JSON from create/get/list/update (matches API / OpenAPI). */
export type TaskView = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: TaskUserSummary | null;
  created_by: TaskUserSummary;
  created_at: string;
  updated_at: string;
};

/** JSON body for POST /api/tasks — omit assignee_id when unassigned (do not send null). */
export type CreateTaskBody = {
  title: string;
  description: string;
  status?: TaskStatus;
  assignee_id?: string;
};

/** JSON body for PATCH /api/tasks/:id */
export type UpdateTaskBody = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignee_id?: string | null;
};

export type ListTasksQuery = {
  status?: TaskStatus;
  assignee_id?: string;
};

/** Active user row from GET /api/users (admin). */
export type ListedUserView = {
  id: string;
  email: string;
  name: string | null;
  role: AuthUserRole;
};

/** Socket.IO `task:assigned` payload (namespace /notifications). */
export type TaskAssignedNotificationPayload = {
  type: "TASK_ASSIGNED";
  message: string;
  task: {
    id: string;
    title: string;
    status: string;
  };
  assignedBy: {
    id: string;
    email: string;
    name: string | null;
  };
};

/** Socket.IO `task:completed` payload (admins only, namespace /notifications). */
export type TaskCompletedNotificationPayload = {
  type: "TASK_COMPLETED";
  message: string;
  task: {
    id: string;
    title: string;
    status: string;
  };
  completedBy: {
    id: string;
    email: string;
    name: string | null;
  };
};

export type TaskCommentAuthor = {
  id: string;
  email: string;
  name: string | null;
  role: AuthUserRole;
};

export type TaskCommentView = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: TaskCommentAuthor;
};

export type CreateTaskCommentBody = {
  body: string;
};

export type AuditAction =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ASSIGNED";

export type AuditLogActor = {
  id: string;
  email: string;
  name: string | null;
  role: AuthUserRole;
};

export type AuditLogView = {
  id: string;
  created_at: string;
  action: AuditAction | string;
  entity_type: string;
  entity_id: string;
  task_id: string | null;
  actor: AuditLogActor;
  payload: Record<string, unknown>;
};

export type AuditLogListResponse = {
  items: AuditLogView[];
  total: number;
  page: number;
  limit: number;
};

export type AuditLogListQuery = {
  page?: number;
  limit?: number;
};

/** Socket.IO `task:comment` payload (namespace /notifications). */
export type TaskCommentNotificationPayload = {
  type: "TASK_COMMENT_ADDED";
  task: {
    id: string;
    title: string;
  };
  comment: {
    id: string;
    body: string;
    created_at: string;
    author: TaskCommentAuthor;
  };
};
