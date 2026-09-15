import { notFound } from 'next/navigation';
import { Workspace } from '../../../_components/workspace';
import Login from '../../../login/page';

export function generateStaticParams(){return [
  {phase:'1',screen:[]},
  ...[[],['articles'],['articles','new'],['articles','demo-4'],['review'],['media'],['settings']].map(screen=>({phase:'2',screen})),
];}
export const dynamicParams=false;
export default async function PhasePreview({params}:{params:Promise<{phase:string;screen?:string[]}>}){
  const {phase,screen=[]}=await params;
  if(phase==='1')return <Login/>;
  if(phase==='2')return <Workspace path={screen} initialPreview/>;
  notFound();
}
