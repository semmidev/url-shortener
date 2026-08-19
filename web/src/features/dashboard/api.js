import client from '../../lib/client';

// --- Teacher (org-scoped) endpoints ---
// These all require the X-Organization-ID header, which is automatically added
// by the axios request interceptor from the activeOrg side-channel.

export async function getTeacherOverview() {
  return client.get('/teachers/overview');
}

export async function getTeacherUsers(params) {
  return client.get('/teachers/users', { params });
}

export async function getTeacherUserByID(id) {
  return client.get(`/teachers/users/${id}`);
}

export async function addTeacherUser(data) {
  return client.post('/teachers/users', data);
}

export async function updateTeacherUser(id, data) {
  return client.patch(`/teachers/users/${id}`, data);
}

export async function removeTeacherUser(id) {
  return client.delete(`/teachers/users/${id}`);
}

export async function updateTeacherOrganization(data) {
  return client.patch('/teachers/organization', data);
}

export async function leaveTeacherOrganization() {
  return client.delete('/teachers/organization/leave');
}

export async function getTeacherAnalytics(params) {
  return client.get('/teachers/analytics', { params });
}

export async function getTeacherItemAnalysis(bankId) {
  return client.get('/teachers/analytics/item-analysis', { params: { bank_id: bankId } });
}

export async function getTeacherErrorAnalysis(bankId) {
  return client.get('/teachers/analytics/error-analysis', { params: { bank_id: bankId } });
}

export async function getTeacherStudentProgress(userId) {
  return client.get('/teachers/analytics/student-progress', { params: { user_id: userId } });
}

export async function importTeacherUsersCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/teachers/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// --- Teacher Repositories ---
export async function getTeacherRepositories(params) {
  return client.get('/teachers/repositories', { params });
}

export async function getTeacherRepositoryByID(id) {
  return client.get(`/teachers/repositories/${id}`);
}

export async function addTeacherRepository(data) {
  return client.post('/teachers/repositories', data);
}

export async function updateTeacherRepository(id, data) {
  return client.patch(`/teachers/repositories/${id}`, data);
}

export async function deleteTeacherRepository(id) {
  return client.delete(`/teachers/repositories/${id}`);
}

// --- Teacher Modules ---
export async function getTeacherModules(repoId, params) {
  return client.get(`/teachers/repositories/${repoId}/modules`, { params });
}

export async function getTeacherModuleByID(repoId, id) {
  return client.get(`/teachers/repositories/${repoId}/modules/${id}`);
}

export async function addTeacherModule(repoId, data) {
  return client.post(`/teachers/repositories/${repoId}/modules`, data);
}

export async function updateTeacherModule(repoId, id, data) {
  return client.patch(`/teachers/repositories/${repoId}/modules/${id}`, data);
}

export async function deleteTeacherModule(repoId, id) {
  return client.delete(`/teachers/repositories/${repoId}/modules/${id}`);
}

export async function reorderTeacherModules(repoId, data) {
  return client.patch(`/teachers/repositories/${repoId}/modules/reorder`, data);
}

// --- Admin Analytics ---
export async function getOverview() {
  return client.get('/admin/overview');
}

export async function getUserGrowth(params) {
  return client.get('/admin/users/growth', { params });
}

export async function getUsersByRole() {
  return client.get('/admin/users/by-role');
}

export async function getRecentUsers(params) {
  return client.get('/admin/users/recent', { params });
}

export async function getOrganizationGrowth(params) {
  return client.get('/admin/organizations/growth', { params });
}

export async function getTopOrganizations(params) {
  return client.get('/admin/organizations/top', { params });
}

export async function getMembersByRole() {
  return client.get('/admin/memberships/by-role');
}

export async function getSessionStats() {
  return client.get('/admin/sessions/stats');
}

export async function getSystemMetrics() {
  return client.get('/admin/system-metrics', {
    headers: {
      'Accept': 'application/json'
    }
  });
}

export async function getAuditLogs(params) {
  return client.get('/admin/audit-logs', { params });
}

// --- Users Management ---
export async function getUsersList(params) {
  return client.get('/users', { params });
}

export async function getUserByID(id) {
  return client.get(`/users/${id}`);
}

export async function createUser(data) {
  // Creating a user is done via the register API
  return client.post('/auth/register', data);
}

export async function updateUser(id, data) {
  return client.patch(`/users/${id}`, data);
}

export async function deleteUser(id) {
  return client.delete(`/users/${id}`);
}

// --- Organizations Management ---
export async function getOrganizationsList(params) {
  return client.get('/organizations', { params });
}

export async function createOrganization(data) {
  return client.post('/organizations', data);
}

export async function joinOrganization(data) {
  return client.post('/organizations/join', data);
}

export async function getOrganizationByID(id) {
  return client.get(`/organizations/${id}`);
}

export async function updateOrganization(id, data) {
  return client.patch(`/organizations/${id}`, data);
}

export async function deleteOrganization(id) {
  return client.delete(`/organizations/${id}`);
}

// --- Memberships Management ---
export async function getOrgMembers(orgId, params) {
  return client.get(`/organizations/${orgId}/members`, { params });
}

export async function addOrgMember(orgId, data) {
  return client.post(`/organizations/${orgId}/members`, data);
}

export async function updateOrgMemberRole(orgId, memberId, role) {
  return client.patch(`/organizations/${orgId}/members/${memberId}`, { role });
}

export async function removeOrgMember(orgId, memberId) {
  return client.delete(`/organizations/${orgId}/members/${memberId}`);
}

// --- User Detail Specific endpoints ---
export async function getUserSessions(userId) {
  return client.get(`/users/${userId}/sessions`);
}

export async function revokeUserSession(userId, sessionId) {
  return client.delete(`/users/${userId}/sessions/${sessionId}`);
}

export async function getUserMemberships(userId) {
  return client.get(`/users/${userId}/memberships`);
}

// --- Teacher Topics ---
export async function getTeacherTopics(params) {
  return client.get('/teachers/topics', { params });
}

export async function getTeacherTopicByID(id) {
  return client.get(`/teachers/topics/${id}`);
}

export async function addTeacherTopic(data) {
  return client.post('/teachers/topics', data);
}

export async function updateTeacherTopic(id, data) {
  return client.patch(`/teachers/topics/${id}`, data);
}

export async function deleteTeacherTopic(id) {
  return client.delete(`/teachers/topics/${id}`);
}

// --- Teacher Difficulty Levels ---
export async function getTeacherDifficultyLevels(params) {
  return client.get('/teachers/difficulty-levels', { params });
}

export async function getTeacherDifficultyLevelByID(id) {
  return client.get(`/teachers/difficulty-levels/${id}`);
}

export async function addTeacherDifficultyLevel(data) {
  return client.post('/teachers/difficulty-levels', data);
}

export async function updateTeacherDifficultyLevel(id, data) {
  return client.patch(`/teachers/difficulty-levels/${id}`, data);
}

export async function deleteTeacherDifficultyLevel(id) {
  return client.delete(`/teachers/difficulty-levels/${id}`);
}

// --- Teacher Questions ---
export async function getTeacherQuestions(questionBankId, params) {
  return client.get(`/teachers/question-banks/${questionBankId}/questions`, { params });
}

export async function getTeacherQuestionByID(questionBankId, id) {
  return client.get(`/teachers/question-banks/${questionBankId}/questions/${id}`);
}

export async function addTeacherQuestion(questionBankId, data) {
  return client.post(`/teachers/question-banks/${questionBankId}/questions`, data);
}

export async function updateTeacherQuestion(questionBankId, id, data) {
  return client.patch(`/teachers/question-banks/${questionBankId}/questions/${id}`, data);
}

export async function deleteTeacherQuestion(questionBankId, id) {
  return client.delete(`/teachers/question-banks/${questionBankId}/questions/${id}`);
}

export async function reorderTeacherQuestions(questionBankId, data) {
  return client.patch(`/teachers/question-banks/${questionBankId}/questions/reorder`, data);
}

// --- Student Endpoints ---
export async function getStudentOverview() {
  return client.get('/students/overview');
}

export async function getStudentOrganizations() {
  return client.get('/students/organizations');
}

export async function leaveStudentOrganization() {
  return client.delete('/students/organization/leave');
}

export async function getStudentRepositories(params) {
  return client.get('/students/repositories', { params });
}

export async function getStudentQuestionBanks(params = {}) {
  return client.get('/students/question-banks', { params });
}

export async function getStudentAnalytics() {
  return client.get('/students/analytics');
}

export async function getStudentProgress() {
  return client.get('/students/progress');
}

// --- Teacher Question Banks ---
export async function getTeacherQuestionBanks(params) {
  return client.get('/teachers/question-banks', { params });
}

export async function getTeacherQuestionBankByID(id) {
  return client.get(`/teachers/question-banks/${id}`);
}

export async function addTeacherQuestionBank(data) {
  return client.post('/teachers/question-banks', data);
}

export async function updateTeacherQuestionBank(id, data) {
  return client.patch(`/teachers/question-banks/${id}`, data);
}

export async function deleteTeacherQuestionBank(id) {
  return client.delete(`/teachers/question-banks/${id}`);
}

// ── Student Module Pre-Test ─────────────────────────────────────────────────
export async function getStudentModulePreTests(moduleId) {
  return client.get(`/students/modules/${moduleId}/pre-tests`);
}

// ── Student Module Endpoints ────────────────────────────────────────────────
export async function getStudentModules(repoId, params) {
  return client.get(`/students/repositories/${repoId}/modules`, { params });
}

export async function markStudentModuleProgress(data) {
  return client.post('/students/modules/progress', data);
}

export async function getStudentModuleProgress(moduleId) {
  return client.get(`/students/modules/${moduleId}/progress`);
}

// ── Discussion Endpoints ────────────────────────────────────────────────────
export async function getTeacherDiscussions(moduleId) {
  return client.get(`/teachers/modules/${moduleId}/discussions`);
}

export async function createTeacherDiscussion(moduleId, data) {
  return client.post(`/teachers/modules/${moduleId}/discussions`, data);
}

export async function getStudentDiscussions(moduleId) {
  return client.get(`/students/modules/${moduleId}/discussions`);
}

export async function createStudentDiscussion(moduleId, data) {
  return client.post(`/students/modules/${moduleId}/discussions`, data);
}

// ── Teacher Exam Grading ───────────────────────────────────────────────────
export async function getTeacherGradingStudents(questionBankId) {
  return client.get(`/teachers/question-banks/${questionBankId}/grading`);
}

export async function getTeacherStudentAttempts(questionBankId, userId) {
  return client.get(`/teachers/question-banks/${questionBankId}/grading/${userId}`);
}

export async function getTeacherSessionForGrading(sessionId) {
  return client.get(`/teachers/exam/${sessionId}/grading`);
}

export async function getTeacherDiagnosticReport(sessionId) {
  return client.get(`/teachers/exam/${sessionId}/diagnostic`);
}

export async function gradeTeacherEssay(sessionId, data) {
  return client.post(`/teachers/exam/${sessionId}/grade`, data);
}

export async function completeTeacherEssayGrading(sessionId) {
  return client.post(`/teachers/exam/${sessionId}/complete-grading`);
}

// ── Notification Endpoints ──────────────────────────────────────────────
export async function getNotifications(params) {
  return client.get('/notifications', { params });
}

export async function getUnreadNotificationCount() {
  return client.get('/notifications/unread-count');
}

export async function markNotificationAsRead(id) {
  return client.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead() {
  return client.patch('/notifications/read-all');
}

// ── Teacher Grades Export ────────────────────────────────────────────────────
export async function exportTeacherGrades(questionBankId, attemptType, byQuestion = false) {
  return client.get(`/teachers/question-banks/${questionBankId}/grading/export`, {
    params: { attempt: attemptType, by_question: byQuestion },
    responseType: 'blob',
  });
}

// ── Teacher Question Import ──────────────────────────────────────────────────
export async function importTeacherQuestionsExcel(questionBankId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/teachers/question-banks/${questionBankId}/questions/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function importTeacherQuestionsAiken(questionBankId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post(`/teachers/question-banks/${questionBankId}/questions/import-aiken`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function downloadImportTemplate() {
  const res = await client.get('/teachers/question-banks/import/template', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'TEMPLATE-SOAL.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function downloadImportAikenTemplate() {
  const res = await client.get('/teachers/question-banks/import/template-aiken', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'TEMPLATE-SOAL-AIKEN.txt');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ── Student Exam Endpoints ──────────────────────────────────────────────────
export async function getStudentQuestionBankDetail(bankId) {
  return client.get(`/students/question-banks/${bankId}/detail`);
}

export async function getStudentAttemptHistory(bankId) {
  return client.get(`/students/question-banks/${bankId}/attempts`);
}

export async function startStudentExam(questionBankId, examType) {
  return client.post('/students/exam/start', { question_bank_id: questionBankId, exam_type: examType || 'post_test' });
}

export async function resumeStudentExam(sessionId) {
  return client.get(`/students/exam/${sessionId}/resume`);
}

export async function saveStudentAnswer(sessionId, data) {
  return client.post(`/students/exam/${sessionId}/answer`, data);
}

export async function submitStudentExam(sessionId) {
  return client.post(`/students/exam/${sessionId}/submit`);
}

export async function recordStudentFocusLoss(sessionId, data) {
  return client.post(`/students/exam/${sessionId}/focus-loss`, data);
}

export async function getStudentExamResult(sessionId) {
  return client.get(`/students/exam/${sessionId}/result`);
}

export async function getStudentDiagnosticReport(sessionId) {
  return client.get(`/students/exam/${sessionId}/diagnostic`);
}

// ── Teacher Learning Paths (Latihan Bertahap) ───────────────────────────────
export async function getTeacherLearningPaths(params) {
  return client.get('/teachers/learning-paths', { params });
}

export async function getTeacherLearningPathByID(id) {
  return client.get(`/teachers/learning-paths/${id}`);
}

export async function addTeacherLearningPath(data) {
  return client.post('/teachers/learning-paths', data);
}

export async function updateTeacherLearningPath(id, data) {
  return client.patch(`/teachers/learning-paths/${id}`, data);
}

export async function deleteTeacherLearningPath(id) {
  return client.delete(`/teachers/learning-paths/${id}`);
}

// ── Teacher Stages ─────────────────────────────────────────────────────────
export async function getTeacherStages(pathId) {
  return client.get(`/teachers/learning-paths/${pathId}/stages`);
}

export async function addTeacherStage(pathId, data) {
  return client.post(`/teachers/learning-paths/${pathId}/stages`, data);
}

export async function reorderTeacherStages(pathId, data) {
  return client.patch(`/teachers/learning-paths/${pathId}/stages/reorder`, data);
}

export async function updateTeacherStage(stageId, data) {
  return client.patch(`/teachers/stages/${stageId}`, data);
}

export async function deleteTeacherStage(stageId) {
  return client.delete(`/teachers/stages/${stageId}`);
}

// ── Teacher Stage Question Bank Assignments ────────────────────────────────
export async function assignTeacherQuestionBankToStage(stageId, data) {
  return client.post(`/teachers/stages/${stageId}/question-banks`, data);
}

export async function removeTeacherQuestionBankFromStage(stageId, qbId) {
  return client.delete(`/teachers/stages/${stageId}/question-banks/${qbId}`);
}

// ── Student Learning Paths ─────────────────────────────────────────────────
export async function getStudentLearningPaths() {
  return client.get('/students/learning-paths');
}

export async function getStudentLearningPathByID(id) {
  return client.get(`/students/learning-paths/${id}`);
}

export async function getStudentStageQuestionBanks(stageId) {
  return client.get(`/students/stages/${stageId}/question-banks`);
}

// ── Teacher Student Learning Path Progress ────────────────────────────────
export async function getTeacherStudentLearningPaths(userId) {
  return client.get(`/teachers/students/${userId}/learning-paths`);
}

// ── Leaderboard Endpoints ───────────────────────────────────────────────────
export async function getStudentLeaderboard(questionBankId, type = 'best') {
  return client.get(`/students/question-banks/${questionBankId}/leaderboard`, { params: { type } });
}

export async function getTeacherLeaderboard(questionBankId, type = 'best') {
  return client.get(`/teachers/question-banks/${questionBankId}/leaderboard`, { params: { type } });
}

// ── Site Settings Endpoints ──────────────────────────────────────────────
export async function getPublicSiteSettings() {
  return client.get('/public/settings');
}

export async function getAdminSiteSettings() {
  return client.get('/admin/settings');
}

export async function updateAdminSiteSettings(data) {
  return client.put('/admin/settings', data);
}
