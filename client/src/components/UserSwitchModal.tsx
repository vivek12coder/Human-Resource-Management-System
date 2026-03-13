import { useState, useEffect } from 'react';
import { Building2, ChevronDown, GitBranch, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { Branch, Company, User } from '../types';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Button, Modal, Badge } from './ui';

interface UserSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSwitchModal = ({ isOpen, onClose }: UserSwitchModalProps) => {
  const { user: currentUser, switchToUser, isSwitched, originalUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchingTargetId, setSwitchingTargetId] = useState('');
  const canSwitchAccounts = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isOpen && canSwitchAccounts) {
      fetchSwitchingData();
    }
  }, [isOpen, canSwitchAccounts]);

  const toArray = <T,>(payload: unknown, key: string): T[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as T[];
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      if (Array.isArray(record[key])) return record[key] as T[];
      if (Array.isArray(record.data)) return record.data as T[];
    }
    return [];
  };

  const getCompanyId = (value?: string | { _id: string; name?: string } | Company) =>
    typeof value === 'object' ? value?._id : value;

  const getCompanyName = (value?: string | { _id: string; name?: string } | Company) =>
    typeof value === 'object' ? value?.name : undefined;

  const getBranchId = (value?: string | Branch) =>
    typeof value === 'object' ? value?._id : value;

  const fetchSwitchingData = async () => {
    if (!currentUser || !canSwitchAccounts) return;

    setLoading(true);
    try {
      const [usersRes, branchesRes, companiesRes] = await Promise.all([
        api.get('/users?limit=500'),
        api.get('/branches?limit=500'),
        currentUser.role === 'SUPER_ADMIN' ? api.get('/companies?limit=500') : Promise.resolve(null),
      ]);

      const userRows = toArray<User>(usersRes.data?.data, 'users');
      const branchRows = toArray<Branch>(branchesRes.data?.data, 'branches').filter((b) => b.isActive);
      const currentCompanyId = getCompanyId(currentUser.company);

      let companyRows: Company[] = [];
      if (currentUser.role === 'SUPER_ADMIN') {
        companyRows = toArray<Company>(companiesRes?.data?.data, 'companies').filter((c) => c.isActive);
      } else if (currentCompanyId) {
        const branchCompany = branchRows.find((branch) => getCompanyId(branch.company) === currentCompanyId)?.company;
        const fallbackName = getCompanyName(branchCompany) || getCompanyName(currentUser.company) || 'My Company';
        companyRows = [
          {
            _id: currentCompanyId,
            name: fallbackName,
            code: 'COMP',
            isActive: true,
            createdAt: new Date(0).toISOString(),
          },
        ];
      }

      setUsers(userRows);
      setCompanies(companyRows);
      setBranches(branchRows);
      setExpandedCompanies(
        companyRows.reduce<Record<string, boolean>>((acc, company) => {
          acc[company._id] = false;
          return acc;
        }, {})
      );
    } catch {
      toast.error('Failed to load switch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (targetUserId: string, targetName: string) => {
    setSwitching(true);
    setSwitchingTargetId(targetUserId);
    try {
      await switchToUser(targetUserId);
      toast.success(`Switched to ${targetName}`);
      onClose();
    } catch {
      toast.error('Failed to switch user');
    } finally {
      setSwitching(false);
      setSwitchingTargetId('');
    }
  };

  const filteredUsers = users.filter((user) =>
    user._id !== currentUser?._id &&
    user.isActive &&
    user.role !== 'SUPER_ADMIN' &&
    (
      currentUser?.role === 'SUPER_ADMIN' ||
      getCompanyId(user.company) === getCompanyId(currentUser?.company)
    )
  );

  const rolePriority: Record<User['role'], number> = {
    BRANCH_ADMIN: 2,
    ADMIN: 1,
    JUNIOR_ADMIN: 3,
    HR: 4,
    MANAGER: 5,
    EMPLOYEE: 6,
    SUPER_ADMIN: 99,
  };

  const getPreferredUser = (companyId: string, branchId?: string) => {
    const matched = filteredUsers
      .filter((user) => {
        const userCompanyId = getCompanyId(user.company);
        const userBranchId = getBranchId(user.branch);

        if (userCompanyId !== companyId) return false;
        if (branchId) return userBranchId === branchId;
        return !userBranchId;
      })
      .sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);

    return matched[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Account"
      size="lg"
    >
      <div className="space-y-6">
        {/* Current User Info */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 via-emerald-500 to-green-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/25">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{currentUser?.name}</p>
              <p className="text-xs text-slate-400">{currentUser?.email}</p>
              <div className="mt-1">
                <Badge variant="primary" size="sm">
                  {currentUser?.role.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Already Switched Warning */}
        {isSwitched && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  You are currently switched in
                </p>
                <p className="text-xs text-amber-300 mt-1">
                  Original account: {originalUser?.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Company/Branch Tree */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto space-y-3 pr-1">
            {companies.length === 0 ? (
              <p className="text-center text-slate-400 py-4">
                No companies found
              </p>
            ) : (
              companies.map((company) => {
                const companyBranches = branches.filter((branch) => {
                  const branchCompanyId = getCompanyId(branch.company);
                  return branchCompanyId === company._id;
                });
                const companyUser = getPreferredUser(company._id);
                const isExpanded = expandedCompanies[company._id];

                return (
                  <div
                    key={company._id}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/30"
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCompanies((prev) => ({
                              ...prev,
                              [company._id]: !prev[company._id],
                            }))
                          }
                          className="flex items-center gap-2 text-left"
                        >
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                          <Building2 className="w-4 h-4 text-teal-400" />
                          <div>
                            <p className="text-sm font-semibold text-white">{company.name}</p>
                            <p className="text-xs text-slate-400">
                              {companyBranches.length} branches
                            </p>
                          </div>
                        </button>
                        <Button
                          size="sm"
                          onClick={() =>
                            companyUser &&
                            handleSwitch(companyUser._id, `${company.name} company account`)
                          }
                          disabled={!companyUser || switching}
                          isLoading={switching && switchingTargetId === companyUser?._id}
                          leftIcon={<Users className="w-4 h-4" />}
                        >
                          Switch
                        </Button>
                      </div>
                      {!companyUser && (
                        <p className="mt-2 text-xs text-amber-400">
                          No company-level admin account found
                        </p>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {companyBranches.length === 0 ? (
                          <p className="text-xs text-slate-400 pl-6">No branches in this company</p>
                        ) : (
                          companyBranches.map((branch) => {
                            const branchUser = getPreferredUser(company._id, branch._id);
                            return (
                              <div
                                key={branch._id}
                                className="ml-6 p-2 rounded-lg border border-slate-700/40 bg-slate-900/20"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-200 flex items-center gap-2">
                                      <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                                      <span className="truncate">{branch.name}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {branch.code || 'Branch'}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      branchUser &&
                                      handleSwitch(
                                        branchUser._id,
                                        `${branch.name} branch account`
                                      )
                                    }
                                    disabled={!branchUser || switching}
                                    isLoading={switching && switchingTargetId === branchUser?._id}
                                  >
                                    Switch
                                  </Button>
                                </div>
                                {!branchUser && (
                                  <p className="mt-1 text-xs text-amber-400">
                                    No branch-level user found
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400">
              {filteredUsers.length} active switchable users found across companies.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700/50">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={switching}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserSwitchModal;
