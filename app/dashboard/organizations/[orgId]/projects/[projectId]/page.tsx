"use client";

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

  useEffect(() => {
    // PRD 페이지로 리다이렉트
    router.replace(
      `/dashboard/organizations/${params.orgId}/projects/${params.projectId}/prd`
    );
  }, [params.orgId, params.projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
