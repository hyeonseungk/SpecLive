"use client";

import { FullScreenLoading } from "@/components/common/full-screen-loading";
import { useGlobalT } from "@/lib/i18n";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProjectPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const t = useGlobalT();

  useEffect(() => {
    // PRD 페이지로 리다이렉트
    router.replace(
      `/dashboard/organizations/${params.orgId}/projects/${params.projectId}/prd`
    );
  }, [params.orgId, params.projectId, router]);

  return <FullScreenLoading message={t("common.redirecting")} />;
}
