import { Workspace } from '../../_components/workspace';
export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return <Workspace path={path} />;
}
