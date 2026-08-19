import { create } from 'zustand';
import * as api from './api';

export const useDashboardStore = create((set, get) => ({
  currentTab: 'overview',
  setTab: (tab) => set({ currentTab: tab }),

  // Overview Stats
  overview: null,
  overviewLoading: false,
  overviewError: null,
  fetchOverview: async () => {
    set({ overviewLoading: true, overviewError: null });
    try {
      const res = await api.getOverview();
      set({ overview: res.data.data, overviewLoading: false });
    } catch (err) {
      set({
        overviewError: err.response?.data?.message || 'Failed to fetch overview statistics',
        overviewLoading: false,
      });
    }
  },

  // Users Management
  users: [],
  usersPaging: null,
  usersLoading: false,
  usersError: null,
  usersLastParams: null,
  fetchUsers: async (params) => {
    const p = params ?? get().usersLastParams;
    set({ usersLastParams: p, usersLoading: true, usersError: null });
    try {
      const res = await api.getUsersList(p);
      // Backend returns `{ success: true, message: "...", data: [...], paging: ... }`
      set({
        users: res.data.data || [],
        usersPaging: res.data.paging || null,
        usersLoading: false,
      });
    } catch (err) {
      set({
        usersError: err.response?.data?.message || 'Failed to load users list',
        usersLoading: false,
      });
    }
  },
  addUser: async (userData) => {
    try {
      await api.createUser(userData);
      await get().fetchUsers();
      if (get().currentTab === 'overview') {
        get().fetchOverview();
      }
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Failed to add user',
        errors: data?.errors || null,
      };
    }
  },
  updateUser: async (id, updateData) => {
    try {
      await api.updateUser(id, updateData);
      await get().fetchUsers();
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Failed to update user',
        errors: data?.errors || null,
      };
    }
  },
  deleteUser: async (id) => {
    try {
      await api.deleteUser(id);
      await get().fetchUsers();
      if (get().currentTab === 'overview') {
        get().fetchOverview();
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to delete user',
      };
    }
  },

  // Organizations Management
  organizations: [],
  orgsPaging: null,
  orgsLoading: false,
  orgsError: null,
  currentOrg: null,
  currentOrgLoading: false,
  currentOrgError: null,

  fetchOrganizationByID: async (id) => {
    set({ currentOrgLoading: true, currentOrgError: null });
    try {
      const res = await api.getOrganizationByID(id);
      set({ currentOrg: res.data.data, currentOrgLoading: false });
    } catch (err) {
      set({
        currentOrgError: err.response?.data?.message || 'Failed to load organization details',
        currentOrgLoading: false,
      });
    }
  },

  fetchOrganizations: async (params) => {
    set({ orgsLoading: true, orgsError: null });
    try {
      const res = await api.getOrganizationsList(params);
      set({
        organizations: res.data.data || [],
        orgsPaging: res.data.paging || null,
        orgsLoading: false,
      });
    } catch (err) {
      set({
        orgsError: err.response?.data?.message || 'Failed to load organizations',
        orgsLoading: false,
      });
    }
  },
  addOrganization: async (orgData) => {
    try {
      await api.createOrganization(orgData);
      await get().fetchOrganizations();
      if (get().currentTab === 'overview') {
        get().fetchOverview();
      }
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Failed to create organization',
        errors: data?.errors || null,
      };
    }
  },
  updateOrganization: async (id, updateData) => {
    try {
      await api.updateOrganization(id, updateData);
      await get().fetchOrganizations();
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Failed to update organization',
        errors: data?.errors || null,
      };
    }
  },
  deleteOrganization: async (id) => {
    try {
      await api.deleteOrganization(id);
      await get().fetchOrganizations();
      if (get().currentTab === 'overview') {
        get().fetchOverview();
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to delete organization',
      };
    }
  },

  // Members Management per Organization
  members: [],
  membersPaging: null,
  membersLoading: false,
  membersError: null,
  fetchMembers: async (orgId, params) => {
    set({ membersLoading: true, membersError: null });
    try {
      const res = await api.getOrgMembers(orgId, params);
      set({
        members: res.data.data || [],
        membersPaging: res.data.paging || null,
        membersLoading: false,
      });
    } catch (err) {
      set({
        membersError: err.response?.data?.message || 'Failed to load organization members',
        membersLoading: false,
      });
    }
  },
  addMember: async (orgId, data) => {
    try {
      await api.addOrgMember(orgId, data);
      await get().fetchMembers(orgId);
      return { success: true };
    } catch (err) {
      const responseData = err.response?.data;
      return {
        success: false,
        message: responseData?.message || 'Failed to add member',
        errors: responseData?.errors || null,
      };
    }
  },
  updateMemberRole: async (orgId, memberId, role) => {
    try {
      await api.updateOrgMemberRole(orgId, memberId, role);
      await get().fetchMembers(orgId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update member role',
      };
    }
  },
  removeMember: async (orgId, memberId) => {
    try {
      await api.removeOrgMember(orgId, memberId);
      await get().fetchMembers(orgId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to remove member from organization',
      };
    }
  },

  // Analytics Detailed Data
  userGrowth: null,
  orgGrowth: null,
  usersByRole: null,
  membersByRole: null,
  sessionStats: null,
  recentUsers: null,
  topOrgs: null,
  analyticsLoading: false,
  analyticsError: null,

  fetchAnalytics: async (days = 30) => {
    set({ analyticsLoading: true, analyticsError: null });
    try {
      const [
        uGrowth,
        oGrowth,
        uByRole,
        mByRole,
        sStats,
        rUsers,
        tOrgs
      ] = await Promise.all([
        api.getUserGrowth({ period: 'daily', days }),
        api.getOrganizationGrowth({ period: 'daily', days }),
        api.getUsersByRole(),
        api.getMembersByRole(),
        api.getSessionStats(),
        api.getRecentUsers({ limit: 10 }),
        api.getTopOrganizations({ limit: 10 }),
      ]);

      set({
        userGrowth: uGrowth.data.data,
        orgGrowth: oGrowth.data.data,
        usersByRole: uByRole.data.data,
        membersByRole: mByRole.data.data,
        sessionStats: sStats.data.data,
        recentUsers: rUsers.data.data,
        topOrgs: tOrgs.data.data,
        analyticsLoading: false,
      });
    } catch (err) {
      set({
        analyticsError: err.response?.data?.message || 'Failed to load detailed analytics',
        analyticsLoading: false,
      });
    }
  },

  // User detail state
  currentUserDetails: null,
  currentUserSessions: [],
  currentUserMemberships: [],
  userDetailLoading: false,
  userDetailError: null,

  fetchUserDetails: async (id) => {
    set({ userDetailLoading: true, userDetailError: null });
    try {
      const [uRes, sessRes, memRes] = await Promise.all([
        api.getUserByID(id),
        api.getUserSessions(id),
        api.getUserMemberships(id),
      ]);
      set({
        currentUserDetails: uRes.data.data,
        currentUserSessions: sessRes.data.data || [],
        currentUserMemberships: memRes.data.data || [],
        userDetailLoading: false,
      });
    } catch (err) {
      set({
        userDetailError: err.response?.data?.message || 'Gagal memuat detail pengguna',
        userDetailLoading: false,
      });
    }
  },

  revokeSession: async (userId, sessionId) => {
    try {
      const res = await api.revokeUserSession(userId, sessionId);
      if (res.status === 200 || res.data?.success) {
        set((state) => ({
          currentUserSessions: state.currentUserSessions.filter((s) => s.id !== sessionId),
        }));
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Gagal menghentikan sesi' };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Gagal menghentikan sesi' };
    }
  },

  // Toast notifications state
  toast: null,
  showToast: (message, type = 'success') => {
    const id = Date.now();
    set({ toast: { id, message, type } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 4000);
  },
  clearToast: () => set({ toast: null }),

  // ── Teacher (org-scoped) state ──────────────────────────────────────────────
  teacherOverview: null,
  teacherOverviewLoading: false,
  teacherOverviewError: null,
  fetchTeacherOverview: async () => {
    set({ teacherOverviewLoading: true, teacherOverviewError: null });
    try {
      const res = await api.getTeacherOverview();
      set({ teacherOverview: res.data.data, teacherOverviewLoading: false });
    } catch (err) {
      set({
        teacherOverviewError: err.response?.data?.message || 'Gagal memuat ringkasan organisasi',
        teacherOverviewLoading: false,
      });
    }
  },

  teacherUsers: [],
  teacherUsersPaging: null,
  teacherUsersLoading: false,
  teacherUsersError: null,
  fetchTeacherUsers: async (params) => {
    set({ teacherUsersLoading: true, teacherUsersError: null });
    try {
      const res = await api.getTeacherUsers(params);
      set({
        teacherUsers: res.data.data || [],
        teacherUsersPaging: res.data.paging || null,
        teacherUsersLoading: false,
      });
    } catch (err) {
      set({
        teacherUsersError: err.response?.data?.message || 'Gagal memuat daftar anggota',
        teacherUsersLoading: false,
      });
    }
  },
  fetchTeacherUser: async (id) => {
    try {
      const res = await api.getTeacherUserByID(id);
      return { success: true, data: res.data.data };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Gagal memuat detail anggota',
      };
    }
  },
  addTeacherUser: async (data) => {
    try {
      await api.addTeacherUser(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan anggota',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherUser: async (id, data) => {
    try {
      await api.updateTeacherUser(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui anggota',
        errors: d?.errors || null,
      };
    }
  },
  removeTeacherUser: async (id) => {
    try {
      await api.removeTeacherUser(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal mengeluarkan anggota',
      };
    }
  },
  updateTeacherOrganization: async (data) => {
    try {
      const res = await api.updateTeacherOrganization(data);
      set((state) => ({
        teacherOverview: state.teacherOverview
          ? { ...state.teacherOverview, organization: res.data.data }
          : state.teacherOverview,
      }));
      return { success: true, data: res.data.data };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Gagal memperbarui organisasi',
        errors: data?.errors || null,
      };
    }
  },
  importTeacherUsers: async (file) => {
    try {
      const res = await api.importTeacherUsersCSV(file);
      return { success: true, data: res.data.data };
    } catch (err) {
      const data = err.response?.data;
      return {
        success: false,
        message: data?.message || 'Gagal mengimpor CSV',
        errors: data?.errors || null,
      };
    }
  },

  teacherAnalytics: null,
  teacherAnalyticsLoading: false,
  teacherAnalyticsError: null,
  fetchTeacherAnalytics: async (days = 30) => {
    set({ teacherAnalyticsLoading: true, teacherAnalyticsError: null });
    try {
      const res = await api.getTeacherAnalytics({ days });
      set({ teacherAnalytics: res.data.data, teacherAnalyticsLoading: false });
    } catch (err) {
      set({
        teacherAnalyticsError: err.response?.data?.message || 'Gagal memuat analitik organisasi',
        teacherAnalyticsLoading: false,
      });
    }
  },

  // ── Teacher Repositories ──────────────────────────────────────────────────────
  teacherRepositories: [],
  teacherRepositoriesPaging: null,
  teacherRepositoriesLoading: false,
  teacherRepositoriesError: null,
  fetchTeacherRepositories: async (params) => {
    set({ teacherRepositoriesLoading: true, teacherRepositoriesError: null });
    try {
      const res = await api.getTeacherRepositories(params);
      set({
        teacherRepositories: res.data.data || [],
        teacherRepositoriesPaging: res.data.paging || null,
        teacherRepositoriesLoading: false,
      });
    } catch (err) {
      set({
        teacherRepositoriesError: err.response?.data?.message || 'Gagal memuat repository',
        teacherRepositoriesLoading: false,
      });
    }
  },
  addTeacherRepository: async (data) => {
    try {
      await api.addTeacherRepository(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan repository',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherRepository: async (id, data) => {
    try {
      await api.updateTeacherRepository(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui repository',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherRepository: async (id) => {
    try {
      await api.deleteTeacherRepository(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus repository',
      };
    }
  },

  // ── Teacher Modules ───────────────────────────────────────────────────────────
  teacherModules: [],
  teacherModulesPaging: null,
  teacherModulesLoading: false,
  teacherModulesError: null,
  setTeacherModules: (modules) => set({ teacherModules: modules }),
  fetchTeacherModules: async (repoId, params) => {
    set({ teacherModulesLoading: true, teacherModulesError: null });
    try {
      const res = await api.getTeacherModules(repoId, params);
      set({
        teacherModules: res.data.data || [],
        teacherModulesPaging: res.data.paging || null,
        teacherModulesLoading: false,
      });
    } catch (err) {
      set({
        teacherModulesError: err.response?.data?.message || 'Gagal memuat modul',
        teacherModulesLoading: false,
      });
    }
  },
  addTeacherModule: async (repoId, data) => {
    try {
      await api.addTeacherModule(repoId, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan modul',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherModule: async (repoId, id, data) => {
    try {
      await api.updateTeacherModule(repoId, id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui modul',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherModule: async (repoId, id) => {
    try {
      await api.deleteTeacherModule(repoId, id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus modul',
      };
    }
  },

  // ── Teacher Topics ────────────────────────────────────────────────────────────
  teacherTopics: [],
  teacherTopicsPaging: null,
  teacherTopicsLoading: false,
  teacherTopicsError: null,
  fetchTeacherTopics: async (params) => {
    set({ teacherTopicsLoading: true, teacherTopicsError: null });
    try {
      const res = await api.getTeacherTopics(params);
      set({
        teacherTopics: res.data.data || [],
        teacherTopicsPaging: res.data.paging || null,
        teacherTopicsLoading: false,
      });
    } catch (err) {
      set({
        teacherTopicsError: err.response?.data?.message || 'Gagal memuat topik',
        teacherTopicsLoading: false,
      });
    }
  },
  addTeacherTopic: async (data) => {
    try {
      await api.addTeacherTopic(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan topik',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherTopic: async (id, data) => {
    try {
      await api.updateTeacherTopic(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui topik',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherTopic: async (id) => {
    try {
      await api.deleteTeacherTopic(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus topik',
      };
    }
  },

  // ── Teacher Difficulty Levels ──────────────────────────────────────────────────
  teacherDifficultyLevels: [],
  teacherDifficultyLevelsPaging: null,
  teacherDifficultyLevelsLoading: false,
  teacherDifficultyLevelsError: null,
  fetchTeacherDifficultyLevels: async (params) => {
    set({ teacherDifficultyLevelsLoading: true, teacherDifficultyLevelsError: null });
    try {
      const res = await api.getTeacherDifficultyLevels(params);
      set({
        teacherDifficultyLevels: res.data.data || [],
        teacherDifficultyLevelsPaging: res.data.paging || null,
        teacherDifficultyLevelsLoading: false,
      });
    } catch (err) {
      set({
        teacherDifficultyLevelsError: err.response?.data?.message || 'Gagal memuat tingkat kesulitan',
        teacherDifficultyLevelsLoading: false,
      });
    }
  },
  addTeacherDifficultyLevel: async (data) => {
    try {
      await api.addTeacherDifficultyLevel(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan tingkat kesulitan',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherDifficultyLevel: async (id, data) => {
    try {
      await api.updateTeacherDifficultyLevel(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui tingkat kesulitan',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherDifficultyLevel: async (id) => {
    try {
      await api.deleteTeacherDifficultyLevel(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus tingkat kesulitan',
      };
    }
  },

  // ── Teacher Question Banks ──────────────────────────────────────────────────
  teacherQuestionBanks: [],
  teacherQuestionBanksPaging: null,
  teacherQuestionBanksLoading: false,
  teacherQuestionBanksError: null,
  fetchTeacherQuestionBanks: async (params) => {
    set({ teacherQuestionBanksLoading: true, teacherQuestionBanksError: null });
    try {
      const res = await api.getTeacherQuestionBanks(params);
      set({
        teacherQuestionBanks: res.data.data || [],
        teacherQuestionBanksPaging: res.data.paging || null,
        teacherQuestionBanksLoading: false,
      });
    } catch (err) {
      set({
        teacherQuestionBanksError: err.response?.data?.message || 'Gagal memuat bank soal',
        teacherQuestionBanksLoading: false,
      });
    }
  },
  addTeacherQuestionBank: async (data) => {
    try {
      await api.addTeacherQuestionBank(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan bank soal',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherQuestionBank: async (id, data) => {
    try {
      await api.updateTeacherQuestionBank(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui bank soal',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherQuestionBank: async (id) => {
    try {
      await api.deleteTeacherQuestionBank(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus bank soal',
      };
    }
  },
  // ── Teacher Learning Paths ───────────────────────────────────────────────
  teacherLearningPaths: [],
  teacherLearningPathsPaging: null,
  teacherLearningPathsLoading: false,
  teacherLearningPathsError: null,
  fetchTeacherLearningPaths: async (params) => {
    set({ teacherLearningPathsLoading: true, teacherLearningPathsError: null });
    try {
      const res = await api.getTeacherLearningPaths(params);
      set({
        teacherLearningPaths: res.data.data || [],
        teacherLearningPathsPaging: res.data.paging || null,
        teacherLearningPathsLoading: false,
      });
    } catch (err) {
      set({
        teacherLearningPathsError: err.response?.data?.message || 'Gagal memuat learning path',
        teacherLearningPathsLoading: false,
      });
    }
  },
  addTeacherLearningPath: async (data) => {
    try {
      await api.addTeacherLearningPath(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan learning path',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherLearningPath: async (id, data) => {
    try {
      await api.updateTeacherLearningPath(id, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui learning path',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherLearningPath: async (id) => {
    try {
      await api.deleteTeacherLearningPath(id);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus learning path',
      };
    }
  },

  // ── Teacher Stages ───────────────────────────────────────────────────────
  teacherStages: [],
  teacherStagesLoading: false,
  teacherStagesError: null,
  fetchTeacherStages: async (pathId) => {
    set({ teacherStagesLoading: true, teacherStagesError: null });
    try {
      const res = await api.getTeacherStages(pathId);
      set({
        teacherStages: res.data.data || [],
        teacherStagesLoading: false,
      });
    } catch (err) {
      set({
        teacherStagesError: err.response?.data?.message || 'Gagal memuat tahap',
        teacherStagesLoading: false,
      });
    }
  },
  addTeacherStage: async (pathId, data) => {
    try {
      await api.addTeacherStage(pathId, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan tahap',
        errors: d?.errors || null,
      };
    }
  },
  updateTeacherStage: async (stageId, data) => {
    try {
      await api.updateTeacherStage(stageId, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal memperbarui tahap',
        errors: d?.errors || null,
      };
    }
  },
  deleteTeacherStage: async (stageId) => {
    try {
      await api.deleteTeacherStage(stageId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus tahap',
      };
    }
  },
  reorderTeacherStages: async (pathId, data) => {
    try {
      await api.reorderTeacherStages(pathId, data);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal mengurutkan ulang tahap',
      };
    }
  },
  assignTeacherQuestionBankToStage: async (stageId, data) => {
    try {
      await api.assignTeacherQuestionBankToStage(stageId, data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal menambahkan bank soal ke tahap',
        errors: d?.errors || null,
      };
    }
  },
  removeTeacherQuestionBankFromStage: async (stageId, qbId) => {
    try {
      await api.removeTeacherQuestionBankFromStage(stageId, qbId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Gagal menghapus bank soal dari tahap',
      };
    }
  },

  joinOrg: async (data) => {
    try {
      await api.joinOrganization(data);
      return { success: true };
    } catch (err) {
      const d = err.response?.data;
      return {
        success: false,
        message: d?.message || 'Gagal bergabung dengan organisasi',
        errors: d?.errors || null,
      };
    }
  },
}));
