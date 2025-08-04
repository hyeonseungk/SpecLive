"use client";

import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { LanguageSelector } from "@/components/common/language-selector";
import { OrganizationSelector } from "@/components/common/organization-selector";
import { ProjectCreateModal } from "@/components/common/project-create-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGlobalT } from "@/lib/i18n";
import { useLangStore } from "@/lib/i18n-store";
import supabase from "@/lib/supabase-browser";
import type { Tables } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Organization = Tables<"organizations">;
type Project = Tables<"projects"> & {
  memberships: Tables<"memberships">[];
  created_at: string | null;
};

interface OrganizationPageProps {
  params: {
    orgId: string;
  };
}

export default function OrganizationPage({ params }: OrganizationPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userMembership, setUserMembership] =
    useState<Tables<"memberships"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const t = useGlobalT();
  const { locale } = useLangStore();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session?.user) {
        router.push("/");
        return;
      }

      await loadOrganizationData(session.user.id);
    };

    loadData();
  }, [params.orgId, router]);

  const loadOrganizationData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. 조직 정보 가져오기
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", params.orgId)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // 2. 해당 조직의 프로젝트들과 사용자의 멤버십 정보 가져오기
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(
          `
          *,
          memberships!inner (
            *
          )
        `
        )
        .eq("organization_id", params.orgId)
        .eq("memberships.user_id", userId);

      if (projectsError) throw projectsError;

      // 프로젝트 데이터 구조화
      const formattedProjects: Project[] =
        projectsData?.map((project) => ({
          ...project,
          memberships: Array.isArray(project.memberships)
            ? project.memberships
            : [project.memberships],
        })) || [];

      setProjects(formattedProjects);

      // 3. 사용자의 멤버십 정보 가져오기 (첫 번째 프로젝트 기준)
      if (formattedProjects.length > 0) {
        const firstProject = formattedProjects[0];
        setUserMembership(firstProject.memberships[0]);
      }
    } catch (error) {
      console.error("Error loading organization data:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    if (user) {
      loadOrganizationData(user.id);
    }
  };

  const handleOrgChange = (newOrgId: string | null) => {
    if (newOrgId) {
      router.push(`/dashboard/organizations/${newOrgId}`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return <FullScreenLoading message={t("common.loading")} />;
  }

  if (!organization) {
    return <FullScreenLoading message={t("org.not_found")} />;
  }

  return (
    <div className="h-full bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t("common.brand")}</h1>
            <OrganizationSelector
              user={user!}
              selectedOrgId={params.orgId}
              onOrgChange={handleOrgChange}
              onOrgCreated={handleModalSuccess}
            />
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={handleSignOut}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{organization.name}</h2>
          <p className="text-muted-foreground">{t("org.tagline")}</p>
        </div>

        {projects.length === 0 ? (
          // 프로젝트가 없는 경우 - 프로젝트 생성을 유도하는 UI
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4">
                {t("org.no_projects_title")}
              </h3>
              <p className="text-lg text-muted-foreground">
                {t("org.no_projects_desc")}
              </p>
            </div>

            <Card className="w-full max-w-md">
              <CardContent className="pt-8 pb-8">
                <Button
                  onClick={() => setShowProjectModal(true)}
                  className="w-full mb-6"
                  size="lg"
                >
                  {t("org.first_project_button")}
                </Button>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-3 font-medium">
                    {t("dashboard.after_title")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-left max-w-xs mx-auto">
                    <li>{t("dashboard.after_list.project")}</li>
                    <li>{t("dashboard.after_list.invite")}</li>
                    <li>{t("dashboard.after_list.manage")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 프로젝트가 있는 경우 - 프로젝트 목록 표시
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">
                  {t("org.total_prefix")}
                  {projects.length}
                  {t("org.total_suffix")}
                </h3>
              </div>
              <Button onClick={() => setShowProjectModal(true)}>
                {t("org.create_project")}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    router.push(
                      `/dashboard/organizations/${params.orgId}/projects/${project.id}`
                    )
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                          📁
                        </div>
                        {project.name}
                      </div>
                      {userMembership?.role === "admin" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          {t("org.admin_role")}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {project.created_at
                        ? new Date(project.created_at).toLocaleDateString(
                            locale
                          )
                        : ""}{" "}
                      {t("org.created_suffix")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t("org.card_hint")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 프로젝트 생성 모달 */}
      {user && organization && (
        <ProjectCreateModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSuccess={handleModalSuccess}
          user={user}
          organizationId={params.orgId}
        />
      )}
    </div>
  );
}
