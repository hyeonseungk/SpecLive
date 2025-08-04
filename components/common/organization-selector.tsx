"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useGlobalT } from "@/lib/i18n";
import supabase from "@/lib/supabase-browser";
import type { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { OrganizationCreateModal } from "./organization-create-modal";

type Organization = Tables<"organizations">;

interface OrganizationSelectorProps {
  user: User;
  selectedOrgId: string | null;
  onOrgChange: (orgId: string | null) => void;
  onOrgCreated: () => void;
}

export function OrganizationSelector({
  user,
  selectedOrgId,
  onOrgChange,
  onOrgCreated,
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = useGlobalT();

  useEffect(() => {
    loadOrganizations();
  }, [user.id]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      // 1. 사용자가 멤버십을 가진 프로젝트들의 조직 목록 가져오기
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select(
          `
          projects (
            organizations (*)
          )
        `
        )
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      // 2. 사용자가 소유한 조직들도 별도로 가져오기
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id);

      if (ownedError) throw ownedError;

      // 중복 제거하여 조직 목록 생성
      const uniqueOrgs = new Map<string, Organization>();

      // 멤버십을 통한 조직들 추가
      memberships?.forEach((membership) => {
        const org = (membership.projects as any)?.organizations;
        if (org) {
          uniqueOrgs.set(org.id, org);
        }
      });

      // 소유한 조직들 추가 (중복 제거됨)
      ownedOrgs?.forEach((org) => {
        uniqueOrgs.set(org.id, org);
      });

      const orgList = Array.from(uniqueOrgs.values()).sort((a, b) => {
        // 소유자인 조직을 먼저 정렬
        const aIsOwner = a.owner_id === user.id;
        const bIsOwner = b.owner_id === user.id;
        if (aIsOwner && !bIsOwner) return -1;
        if (!aIsOwner && bIsOwner) return 1;
        return a.name.localeCompare(b.name);
      });

      setOrganizations(orgList);

      // 선택된 조직이 없고 조직이 있으면 첫 번째 조직을 선택
      if (!selectedOrgId && orgList.length > 0) {
        onOrgChange(orgList[0].id);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadOrganizations();
    onOrgCreated();
    setShowCreateModal(false);
  };

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                🏢
              </div>
              <span>
                {loading
                  ? t("orgSelector.loading")
                  : selectedOrgId === null
                  ? t("orgSelector.all_orgs")
                  : selectedOrg
                  ? selectedOrg.name
                  : t("orgSelector.select_org")}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="start">
          <div className="p-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("orgSelector.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {/* 모든 조직 옵션 */}
            <DropdownMenuItem
              onClick={() => {
                onOrgChange(null);
                setIsOpen(false);
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs">
                  📋
                </div>
                <span>{t("orgSelector.all_orgs")}</span>
              </div>
              {selectedOrgId === null && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 조직 목록 */}
            <div className="px-2 py-1">
              <div className="text-xs text-muted-foreground font-medium">
                {t("orgSelector.list_header")}
              </div>
            </div>

            {filteredOrganizations.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {searchQuery
                  ? t("orgSelector.no_results")
                  : t("orgSelector.no_orgs")}
              </div>
            ) : (
              filteredOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => {
                    onOrgChange(org.id);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      🏢
                    </div>
                    <div>
                      <div className="font-medium">{org.name}</div>
                      {org.owner_id === user.id && (
                        <div className="text-xs text-muted-foreground">
                          {t("orgSelector.owner_badge")}
                        </div>
                      )}
                    </div>
                  </div>
                  {org.id === selectedOrgId && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            {/* 새 조직 생성 */}
            <DropdownMenuItem
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 text-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span>{t("orgSelector.create_org")}</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 조직 생성 모달 */}
      <OrganizationCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        user={user}
      />
    </>
  );
}
